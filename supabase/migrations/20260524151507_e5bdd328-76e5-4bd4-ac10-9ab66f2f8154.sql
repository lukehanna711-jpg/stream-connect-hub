
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text,
  avatar_color text not null default '#ff5500',
  member_since timestamptz not null default now(),
  favourite_show text,
  last_watched_show text,
  last_watched_private boolean not null default false,
  is_subscribed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Trigger to auto-create profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1));
  -- ensure uniqueness by appending random suffix if needed
  if exists (select 1 from public.profiles where username = uname) then
    uname := uname || '_' || substr(replace(new.id::text,'-',''),1,6);
  end if;
  insert into public.profiles (id, username, email, avatar_color)
  values (new.id, uname, new.email, '#' || lpad(to_hex((random()*16777215)::int),6,'0'));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- FRIENDSHIPS (stored both directions for easy querying)
create table public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);
alter table public.friendships enable row level security;
create policy "see own friendships" on public.friendships for select to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "insert own friendships" on public.friendships for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own friendships" on public.friendships for delete to authenticated using (auth.uid() = user_id);

-- FRIEND REQUESTS
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);
alter table public.friend_requests enable row level security;
create policy "see own requests" on public.friend_requests for select to authenticated using (auth.uid() = from_user or auth.uid() = to_user);
create policy "create requests" on public.friend_requests for insert to authenticated with check (auth.uid() = from_user);
create policy "update incoming requests" on public.friend_requests for update to authenticated using (auth.uid() = to_user);
create policy "delete own requests" on public.friend_requests for delete to authenticated using (auth.uid() = from_user or auth.uid() = to_user);

-- DIRECT MESSAGES
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  content text,
  show_rec jsonb,
  created_at timestamptz not null default now()
);
alter table public.direct_messages enable row level security;
create policy "see own dms" on public.direct_messages for select to authenticated using (auth.uid() = from_user or auth.uid() = to_user);
create policy "send dms" on public.direct_messages for insert to authenticated with check (auth.uid() = from_user);

-- BLOCKS
create table public.blocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "see own blocks" on public.blocks for select to authenticated using (auth.uid() = user_id);
create policy "create own blocks" on public.blocks for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own blocks" on public.blocks for delete to authenticated using (auth.uid() = user_id);

-- WATCH HISTORY
create table public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id text not null,
  show_title text not null,
  episode int not null,
  watched_at timestamptz not null default now()
);
alter table public.watch_history enable row level security;
create policy "see own history" on public.watch_history for select to authenticated using (auth.uid() = user_id);
create policy "insert own history" on public.watch_history for insert to authenticated with check (auth.uid() = user_id);

-- WATCH PARTIES
create table public.watch_parties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  show_id text not null,
  show_title text not null,
  episode int not null default 1,
  is_playing boolean not null default true,
  current_time_sec int not null default 0,
  controls_locked boolean not null default false,
  status text not null default 'active' check (status in ('pending','active','ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.watch_parties enable row level security;

create table public.party_members (
  party_id uuid not null references public.watch_parties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','joined','declined','left')),
  joined_at timestamptz,
  invited_at timestamptz not null default now(),
  primary key (party_id, user_id)
);
alter table public.party_members enable row level security;

-- helper: is current user a member of party
create or replace function public.is_party_member(_party uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.party_members where party_id = _party and user_id = auth.uid()
  ) or exists (
    select 1 from public.watch_parties where id = _party and host_id = auth.uid()
  );
$$;

create policy "party visible to members" on public.watch_parties for select to authenticated
  using (host_id = auth.uid() or public.is_party_member(id));
create policy "host can create party" on public.watch_parties for insert to authenticated with check (host_id = auth.uid());
create policy "host updates party" on public.watch_parties for update to authenticated using (host_id = auth.uid());
create policy "members update playback when unlocked" on public.watch_parties for update to authenticated
  using (public.is_party_member(id) and controls_locked = false);

create policy "members see party_members" on public.party_members for select to authenticated
  using (public.is_party_member(party_id));
create policy "host invites" on public.party_members for insert to authenticated
  with check (
    exists (select 1 from public.watch_parties p where p.id = party_id and p.host_id = auth.uid())
    or user_id = auth.uid()
  );
create policy "member updates own status" on public.party_members for update to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.watch_parties p where p.id = party_id and p.host_id = auth.uid()));
create policy "member can leave" on public.party_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.watch_parties p where p.id = party_id and p.host_id = auth.uid()));

create table public.party_messages (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.watch_parties(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  username text,
  content text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.party_messages enable row level security;
create policy "members read party chat" on public.party_messages for select to authenticated
  using (public.is_party_member(party_id));
create policy "members write party chat" on public.party_messages for insert to authenticated
  with check (public.is_party_member(party_id) and (user_id = auth.uid() or is_system = true));

-- Enable realtime
alter publication supabase_realtime add table public.watch_parties;
alter publication supabase_realtime add table public.party_members;
alter publication supabase_realtime add table public.party_messages;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.profiles;
