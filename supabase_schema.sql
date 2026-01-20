-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  full_name text,
  gender text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for playlists
create table playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  name text not null,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for playlist songs
create table playlist_songs (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references playlists(id) on delete cascade not null,
  song_id text not null,
  song_title text not null,
  artist text,
  thumbnail text,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for user history
create table user_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  song_id text not null,
  song_title text not null,
  language text,
  listened_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;
alter table playlists enable row level security;
alter table playlist_songs enable row level security;
alter table user_history enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Policies for playlists
create policy "Public playlists are viewable by everyone." on playlists
  for select using (is_public = true);

create policy "Users can view their own playlists." on playlists
  for select using (auth.uid() = user_id);

create policy "Users can insert their own playlists." on playlists
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own playlists." on playlists
  for update using (auth.uid() = user_id);

create policy "Users can delete their own playlists." on playlists
  for delete using (auth.uid() = user_id);

-- Policies for playlist_songs
create policy "Playlist songs are viewable by everyone if playlist is public." on playlist_songs
  for select using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and (playlists.is_public = true or playlists.user_id = auth.uid())
    )
  );

create policy "Users can insert songs to their own playlists." on playlist_songs
  for insert with check (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and playlists.user_id = auth.uid()
    )
  );

create policy "Users can delete songs from their own playlists." on playlist_songs
  for delete using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and playlists.user_id = auth.uid()
    )
  );

-- Policies for user_history
create policy "Users can view their own history." on user_history
  for select using (auth.uid() = user_id);

create policy "Users can insert their own history." on user_history
  for insert with check (auth.uid() = user_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, email, avatar_url)
  values (new.id, null, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
