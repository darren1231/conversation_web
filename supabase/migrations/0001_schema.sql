-- 人際對話成長日誌 (Conversation Growth Log) — core schema
-- Run in order: 0001_schema.sql -> 0002_rls.sql -> 0003_storage.sql

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: 1 row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- contacts: 聊天人物
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) > 0),
  avatar_url text,
  relationship_type text check (
    relationship_type in (
      'friend', 'colleague', 'language_exchange', 'dating', 'family', 'other'
    )
  ),
  platform text,
  met_through text,
  interests text,
  personality text,
  background text,
  status text check (
    status in ('active', 'cooling_down', 'reconnecting', 'ended', 'unknown')
  ) default 'active',
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_user_id_idx on public.contacts (user_id);
create index if not exists contacts_user_updated_idx
  on public.contacts (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- conversations: 每一次對話紀錄
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  occurred_at timestamptz not null default now(),
  platform text,
  context text,
  goal text,
  my_mood text,
  their_mood text,
  outcome text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on public.conversations (user_id);
create index if not exists conversations_contact_id_idx
  on public.conversations (contact_id);
create index if not exists conversations_user_occurred_idx
  on public.conversations (user_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- messages: 每一則聊天訊息
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender text not null check (sender in ('me', 'them')),
  message_type text not null default 'text' check (
    message_type in ('text', 'image', 'voice', 'sticker', 'link', 'in_person')
  ),
  content text,
  occurred_date date,
  occurred_time time,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists messages_user_id_idx on public.messages (user_id);
create index if not exists messages_conversation_id_idx
  on public.messages (conversation_id);
create index if not exists messages_conversation_sort_idx
  on public.messages (conversation_id, sort_order, created_at);

-- ---------------------------------------------------------------------------
-- conversation_tags: 對話標籤
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  tag text not null check (char_length(trim(tag)) > 0),
  created_at timestamptz not null default now(),
  unique (conversation_id, tag)
);

create index if not exists conversation_tags_user_id_idx
  on public.conversation_tags (user_id);
create index if not exists conversation_tags_conversation_id_idx
  on public.conversation_tags (conversation_id);
create index if not exists conversation_tags_tag_idx
  on public.conversation_tags (tag);

-- ---------------------------------------------------------------------------
-- attachments: 聊天截圖附件 (metadata only — binary lives in Storage)
-- ---------------------------------------------------------------------------
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists attachments_user_id_idx on public.attachments (user_id);
create index if not exists attachments_conversation_id_idx
  on public.attachments (conversation_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.contacts;
create trigger set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.conversations;
create trigger set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.messages;
create trigger set_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- auto-create a profile row whenever a new auth user signs up (e.g. via
-- Google OAuth). Runs as SECURITY DEFINER so it can write into public.profiles
-- despite the caller not having a session yet.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
