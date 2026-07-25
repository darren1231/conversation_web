-- Row Level Security — every user may only read/write their own rows.

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_tags enable row level security;
alter table public.attachments enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
drop policy if exists "contacts_select_own" on public.contacts;
create policy "contacts_select_own"
  on public.contacts for select
  using (auth.uid() = user_id);

drop policy if exists "contacts_insert_own" on public.contacts;
create policy "contacts_insert_own"
  on public.contacts for insert
  with check (auth.uid() = user_id);

drop policy if exists "contacts_update_own" on public.contacts;
create policy "contacts_update_own"
  on public.contacts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "contacts_delete_own" on public.contacts;
create policy "contacts_delete_own"
  on public.contacts for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own"
  on public.conversations for select
  using (auth.uid() = user_id);

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own"
  on public.conversations for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.contacts c
      where c.id = contact_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
  on public.messages for select
  using (auth.uid() = user_id);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations conv
      where conv.id = conversation_id and conv.user_id = auth.uid()
    )
  );

drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
  on public.messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
  on public.messages for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- conversation_tags
-- ---------------------------------------------------------------------------
drop policy if exists "conversation_tags_select_own" on public.conversation_tags;
create policy "conversation_tags_select_own"
  on public.conversation_tags for select
  using (auth.uid() = user_id);

drop policy if exists "conversation_tags_insert_own" on public.conversation_tags;
create policy "conversation_tags_insert_own"
  on public.conversation_tags for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations conv
      where conv.id = conversation_id and conv.user_id = auth.uid()
    )
  );

drop policy if exists "conversation_tags_delete_own" on public.conversation_tags;
create policy "conversation_tags_delete_own"
  on public.conversation_tags for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- attachments
-- ---------------------------------------------------------------------------
drop policy if exists "attachments_select_own" on public.attachments;
create policy "attachments_select_own"
  on public.attachments for select
  using (auth.uid() = user_id);

drop policy if exists "attachments_insert_own" on public.attachments;
create policy "attachments_insert_own"
  on public.attachments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations conv
      where conv.id = conversation_id and conv.user_id = auth.uid()
    )
  );

drop policy if exists "attachments_update_own" on public.attachments;
create policy "attachments_update_own"
  on public.attachments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "attachments_delete_own" on public.attachments;
create policy "attachments_delete_own"
  on public.attachments for delete
  using (auth.uid() = user_id);
