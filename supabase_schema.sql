-- Run this in Supabase → SQL Editor

-- Checkins table
create table if not exists checkins (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  weight       numeric(5,1) not null,
  note         text default '',
  app_id       bigint,
  created_at   timestamptz default now(),
  unique (user_id, date)
);

-- User plans table (one row per user)
create table if not exists user_plans (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  data         jsonb not null,
  updated_at   timestamptz default now()
);

-- Enable Row Level Security
alter table checkins enable row level security;
alter table user_plans enable row level security;

-- RLS policies: users can only access their own rows
create policy "checkins: own rows only" on checkins
  for all using (auth.uid() = user_id);

create policy "user_plans: own row only" on user_plans
  for all using (auth.uid() = user_id);
