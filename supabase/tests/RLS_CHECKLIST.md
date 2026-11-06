# Supabase RLS verification

Run these checks after applying the migration and before inviting applicants.

- Confirm row level security is enabled on public.oriel_user_workspaces.
- Confirm anon has no table privileges.
- Confirm authenticated has SELECT, INSERT, UPDATE and DELETE privileges, with every operation restricted by auth.uid() = user_id.
- Create two test users and two workspaces. Authenticate as user A and verify that only A's row can be selected, updated or deleted.
- Attempt to insert a row with user_id set to user B while authenticated as A; it must fail.
- Attempt to update user_id on A's row to B; it must fail.
- Repeat the checks with an unauthenticated request; it must not read or write any workspace.
- Do not use a service_role key in browser-side tests; it bypasses RLS and would invalidate the test.
