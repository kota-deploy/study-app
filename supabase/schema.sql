-- 学習ノート（Phase 2）: 学習データを1ユーザー1行で保存するテーブル
-- Supabase の「SQL Editor」に貼り付けて、1回だけ実行する

create table if not exists public.user_state (
  user_id uuid primary key references auth.users,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- 行単位のアクセス制御（Row Level Security）を有効にする
alter table public.user_state enable row level security;

-- ログインした本人の行だけを、読む・作る・更新することができる
-- （delete のポリシーは作らないので、削除はできない。anon ロールには何も許可しない）
create policy "user_state_select_own" on public.user_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_state_insert_own" on public.user_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_state_update_own" on public.user_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
