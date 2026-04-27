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

alter table playlist_songs
  add constraint playlist_songs_playlist_id_song_id_key unique (playlist_id, song_id);

-- Create a table for user history
create table user_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  song_id text not null,
  song_title text not null,
  artist text,
  thumbnail text,
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
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    username,
    gender,
    created_at
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    null,   -- keep username NULL, user will pick later
    null,   -- set later via onboarding
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        avatar_url = excluded.avatar_url;

  return new;
end;
$$;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create tables for the friends system
create table friend_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id) not null,
  receiver_id uuid references profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(sender_id, receiver_id)
);

create table friendships (
  id uuid default gen_random_uuid() primary key,
  user_low_id uuid references profiles(id) not null,
  user_high_id uuid references profiles(id) not null,
  accepted_by uuid references profiles(id) not null,
  accepted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_low_id, user_high_id)
);

create table user_presence (
  user_id uuid references profiles(id) primary key,
  status text not null default 'online',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table room_invites (
  id uuid default gen_random_uuid() primary key,
  room_id text not null,
  sender_id uuid references profiles(id) not null,
  receiver_id uuid references profiles(id) not null,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(room_id, sender_id, receiver_id)
);

alter table friend_requests enable row level security;
alter table friendships enable row level security;
alter table user_presence enable row level security;
alter table room_invites enable row level security;

-- Friend requests
create policy "Friend requests are viewable by sender or receiver." on friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send their own friend requests." on friend_requests
  for insert with check (auth.uid() = sender_id);

create policy "Users can delete their own friend requests." on friend_requests
  for delete using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Friendships
create policy "Friendships are viewable by both users." on friendships
  for select using (auth.uid() = user_low_id or auth.uid() = user_high_id);

create policy "Users can accept friendships for themselves." on friendships
  for insert with check (auth.uid() = accepted_by);

create policy "Users can delete their own friendships." on friendships
  for delete using (auth.uid() = user_low_id or auth.uid() = user_high_id);

-- Presence
create policy "Presence is viewable by everyone." on user_presence
  for select using (true);

create policy "Users can manage their own presence." on user_presence
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own presence." on user_presence
  for update using (auth.uid() = user_id);

create policy "Users can delete their own presence." on user_presence
  for delete using (auth.uid() = user_id);

-- Room invites
create policy "Room invites are viewable by sender or receiver." on room_invites
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send invites from their own account." on room_invites
  for insert with check (auth.uid() = sender_id);

create policy "Users can update room invites they received." on room_invites
  for update using (auth.uid() = receiver_id or auth.uid() = sender_id);

create policy "Users can delete room invites they sent or received." on room_invites
  for delete using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Enable Realtime for friends-system tables
alter publication supabase_realtime add table friend_requests;
alter publication supabase_realtime add table friendships;
alter publication supabase_realtime add table user_presence;
alter publication supabase_realtime add table room_invites;
