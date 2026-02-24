-- ============================================
-- Room System Schema (Add-on to existing schema)
-- Run this AFTER the main supabase_schema.sql
-- ============================================

-- Create rooms table
create table rooms (
  id text primary key,
  name text not null,
  admin_id uuid references profiles(id) not null,
  is_private boolean default false,
  password text, -- plain text for simplicity; hash in production
  current_song_id text,
  current_song_data jsonb, -- cached song metadata
  is_playing boolean default false,
  current_time_sec float default 0,
  last_sync_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create room members table
create table room_members (
  id uuid default gen_random_uuid() primary key,
  room_id text references rooms(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  has_control boolean default false,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(room_id, user_id)
);

-- Enable RLS
alter table rooms enable row level security;
alter table room_members enable row level security;

-- Policies for rooms
create policy "Rooms are viewable by everyone." on rooms
  for select using (true);

create policy "Authenticated users can create rooms." on rooms
  for insert with check (auth.uid() = admin_id);

create policy "Room admin can update their room." on rooms
  for update using (auth.uid() = admin_id);

create policy "Room admin can delete their room." on rooms
  for delete using (auth.uid() = admin_id);

-- Policies for room_members
create policy "Room members are viewable by everyone." on room_members
  for select using (true);

create policy "Users can join rooms." on room_members
  for insert with check (auth.uid() = user_id);

create policy "Users can leave rooms." on room_members
  for delete using (auth.uid() = user_id);

create policy "Room admin can manage members." on room_members
  for update using (
    exists (
      select 1 from rooms
      where rooms.id = room_members.room_id
      and rooms.admin_id = auth.uid()
    )
  );

create policy "Room admin can remove members." on room_members
  for delete using (
    exists (
      select 1 from rooms
      where rooms.id = room_members.room_id
      and rooms.admin_id = auth.uid()
    )
  );

-- Enable Realtime for rooms table
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_members;
