-- Oriel Placement Desk: one private workspace per authenticated applicant.
-- Apply through the Supabase SQL editor or as a Supabase migration.
create table if not exists public.oriel_user_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workspace jsonb not null default '{"version":1,"storage":{}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.oriel_user_workspaces enable row level security;

-- Do not expose applicant workspaces to anonymous visitors.
revoke all on table public.oriel_user_workspaces from anon, authenticated;
grant select, insert, update, delete on table public.oriel_user_workspaces to authenticated;

drop policy if exists "Applicants can read their own workspace" on public.oriel_user_workspaces;
create policy "Applicants can read their own workspace"
  on public.oriel_user_workspaces
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Applicants can create their own workspace" on public.oriel_user_workspaces;
create policy "Applicants can create their own workspace"
  on public.oriel_user_workspaces
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Applicants can update their own workspace" on public.oriel_user_workspaces;
create policy "Applicants can update their own workspace"
  on public.oriel_user_workspaces
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Applicants can delete their own workspace" on public.oriel_user_workspaces;
create policy "Applicants can delete their own workspace"
  on public.oriel_user_workspaces
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists oriel_user_workspaces_updated_at_idx
  on public.oriel_user_workspaces (updated_at desc);

create or replace function public.set_oriel_workspace_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_oriel_workspace_updated_at on public.oriel_user_workspaces;
create trigger set_oriel_workspace_updated_at
  before update on public.oriel_user_workspaces
  for each row execute function public.set_oriel_workspace_updated_at();

comment on table public.oriel_user_workspaces is
  'Private Oriel Placement Desk workspace. RLS restricts every row to its owning auth.users account.';
