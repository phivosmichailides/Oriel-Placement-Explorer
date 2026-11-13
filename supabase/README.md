# Oriel Placement Desk — cloud accounts

The cloud layer uses Supabase Auth and a private Postgres workspace table. The existing browser-only application remains usable without an account.

## What is saved

The account workspace synchronises the applicant's own saved data:

- Placement Desk profile, weighting choices, shortlist, manual ranks, notes and comparisons
- Imported Oriel CSV snapshot, if the applicant has uploaded one
- Onboarding answers and commute starting point
- Oriel Simulation columns and zoom
- My Outcome record
- Appearance palette, light/dark mode, layout and display preferences
- Optional research workspace data

The built-in programme catalogue and postcode-coordinate cache are not copied into each account. The commute starting point is personal data and is only stored in the signed-in user's private workspace.

## Backend setup

1. Create a Supabase project.
2. Apply the SQL migration in supabase/migrations/20261106000000_create_oriel_user_workspaces.sql.
3. In Authentication → URL Configuration, set the production Site URL to:
   https://placementatlas.co.uk/
4. Add https://placementatlas.co.uk/ as an exact Redirect URL. Remove the retired https://phivosmichailides.github.io/Oriel-Placement-Explorer/ address after migration. Add a local development URL only if you actually use one. Google OAuth and email magic-link redirects must both return to the branded production URL.
5. In Authentication → Providers, enable Google. Google OAuth requires an OAuth client ID and client secret created in Google Cloud. In Google Cloud, register Supabase's callback URL shown in the Supabase Google provider settings as an authorised redirect URI. Do not put the Google client secret in this repository.
6. Copy the Supabase Project URL and the browser-safe publishable key (or legacy anon key) into supabase-config.js.
7. Deploy the GitHub Pages site again.

The browser client must use only the publishable/anon key. Never expose the Supabase service_role key or a database password.

## Applicant data isolation

The migration enables Row Level Security, revokes table access from the anonymous role, and grants authenticated access only. Each SELECT, INSERT, UPDATE and DELETE policy checks auth.uid() against user_id. Do not remove these policies.

The workspace is a single JSONB document per applicant so the current app can be synchronised without changing its existing data model. The browser validates the workspace version and restores only the allow-listed local-storage keys.

## First sign-in and migration

- If an applicant has local data and no cloud workspace yet, the first sign-in migrates that browser's saved workspace to the account.
- If the account already has a workspace and the current browser has meaningful local data, the app asks which copy to keep. It never silently overwrites one with the other.
- If the browser has no meaningful local data, the cloud workspace is restored automatically.
- Subsequent changes are saved automatically after a short debounce.
- Signing out clears visible account data from the shared browser after confirming the latest changes have synchronised; the private Supabase copy remains available when the applicant signs in again.
- A newer remote edit and unsynchronised local edits trigger a conflict choice rather than an automatic last-write-wins overwrite.

## Manual verification checklist

1. Create two test accounts.
2. Save a different shortlist and simulation in each account.
3. Sign out and sign into the other account on the same browser; verify that the first account's choices are not visible.
4. Sign into account A in a second browser; verify that its profile, shortlist, notes and simulation restore.
5. Change one field in each browser before either sync completes; verify that the conflict choice appears.
6. Open the table as an unauthenticated user; SELECT/INSERT/UPDATE/DELETE must be denied.
7. Open the table as account A and attempt to read or update account B's user_id; no row belonging to B should be visible or writable.
8. Verify that the service_role key is not present in any frontend file or network request.

## Current deployment status

The frontend cloud integration is prepared, but it is not live until a Supabase project is connected, the migration is applied, Google Auth is configured, and the Project URL and publishable key are added to supabase-config.js.

## Direct Google Identity Services button (no paid custom domain)

The optional Google Identity Services integration uses Google's official browser button and passes the signed Google ID token to Supabase using `auth.signInWithIdToken`. It does not navigate through the random Supabase host during normal Google sign-in.

1. In Google Cloud > Google Auth Platform > Clients, open the existing **Web application** OAuth client and copy its **Client ID** (not the client secret).
2. Add `https://placementatlas.co.uk` (without trailing slash) to **Authorised JavaScript origins** for that client; keep the existing Supabase callback URL under **Authorised redirect URIs** until the replacement is verified.
3. Paste the public Client ID into `googleClientId` in `supabase-config.js`. Keep Google enabled in Supabase > Authentication > Providers. Do not change Supabase's provider secret or disable nonce validation.
4. Confirm the Google Auth Platform app is published to External production and that branding/approved domains are complete.
5. In a fresh private window on `https://placementatlas.co.uk/`, open Sign in. The official Google button should load; sign in with a test account and verify your private workspace is saved. Then test returning Google and email users, and cross-device sync.

If the Client ID is absent, the existing OAuth button remains available. If Google Identity Services cannot load, a labelled fallback offers the original redirect-based login. `google-identity.js` generates a cryptographic nonce and SHA-256 hash for token validation. No service secret is exposed to the browser.

## Email and password accounts

Placement Atlas supports email/password signup and login, Google, optional
passwordless email sign-in, and password recovery via Supabase Auth.
Passwords must never be stored in localStorage, workspace records, or logs.

Production setup:
1. In Supabase Authentication → Sign In / Providers → Email, enable Email
   and Confirm email.
2. In Authentication → URL Configuration set the Site URL to
   `https://placementatlas.co.uk/` and allow both
   `https://placementatlas.co.uk/` and
   `https://placementatlas.co.uk/?atlas_auth=recovery` as redirect URLs.
3. Configure custom SMTP and keep the Supabase `{{ .ConfirmationURL }}`
   variable in **Confirm sign up** and **Reset password**. In **Magic link
   or OTP**, include BOTH `{{ .ConfirmationURL }}` (one-tap link) and
   `{{ .Token }}` (six-digit code). The frontend uses `verifyOtp` with
   `type: 'email'`. Do not remove either placeholder.
4. In Authentication → Sign In / Providers → Email, set minimum password
   length to **12** to match the frontend. Review email OTP expiry (e.g.
   10 minutes), rate limits and CAPTCHA / attack protection settings.
   Passwords are handled by Supabase; no frontend storage of passwords.
5. Review security notification emails (Password changed and Sign-in method
   changed) and enable appropriate notifications in the dashboard.
6. Test signup → confirmation → password sign-in, wrong password, forgot-
   password reset link → password update, optional email-link sign-in,
   six-digit code sign-in (including invalid and expired codes), request
   another code, Google sign-in, and workspace sync/sign-out.
7. The signed-in Profile → Account security action sends a password-change
   link to the current registered email address. The link expires and leads
   back to the recovery form; it does not change the password immediately.

The reset link returns to the site with `atlas_auth=recovery`; the app also
listens for the `PASSWORD_RECOVERY` authentication event.

## Cloudflare Turnstile (existing widget)

Frontend widget: `atlas-turnstile.js` uses the public existing Cloudflare
Turnstile site key `0x4AAAAAAF_H_KvCURq8Ixkp` and renders explicitly in
the account modal. Supabase Auth receives `captchaToken` with signup,
password login, password reset, email link/code, and Google ID-token login.
Consumed tokens are reset after requests. Profile password management opens
the same protected recovery form.

**Supabase Auth is the server-side verifier, not GitHub Pages.** This is a
static website and cannot directly perform a secret-bearing Siteverify call.

Before activating CAPTCHA in production:
1. Check the existing Cloudflare widget allows `placementatlas.co.uk`.
2. Retrieve its private secret from the Turnstile dashboard. Never commit it
   or insert it into frontend code.
3. In Supabase Authentication → Attack Protection, choose **Turnstile by
   Cloudflare** (not hCaptcha), enter the matching secret privately, and save.
4. Ensure the website's latest deployment is live first.
5. Test email/password signup, login, wrong password, reset email,
   passwordless link/code requests, the signed-in Profile reset flow,
   and native Google sign-in. Verify retries after a consumed token.
6. Check Supabase Auth logs and Turnstile Analytics for verification results.
   If the frontend or backend configuration is incomplete, disable CAPTCHA
   temporarily to avoid locking legitimate users out.

The public site key is not a secret. The private Turnstile secret belongs
only in Supabase's protected dashboard settings. No new Worker is required.
