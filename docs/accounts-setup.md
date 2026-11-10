# Google accounts and profiles

The app implements Google OAuth with Supabase SSR cookie sessions. Catalog and
Journal demo reads continue to use their separate anonymous client. Profile data
is private to its owner and uses the authenticated client.

## Apply the database migration

Open the intended Supabase project's SQL Editor and run the complete contents of
`supabase/migrations/0012_accounts.sql` as the database owner. This creates
`account_profiles`, its owner-only read policy, the profile RPCs, and the username trigger.
No service-role secret is needed by the app. The migration does not change species
or Journal content and has not been automatically applied to the hosted project.
It uses a separate `account_profiles` table because the hosted project already
exposes an unrelated `profiles` table with a different column structure. Existing
profile data is not overwritten or migrated by this change.

The schema stores `username_created_at` for the first assignment and
`username_changed_at` for the latest change. The database trigger sets both from
the server clock, keeps the creation date, and rejects username changes until
seven full days have elapsed. Updating other profile fields does not restart the
timer. Usernames use 3–24 lowercase ASCII letters, numbers, or underscores,
starting with a letter, and a unique constraint prevents duplicate assignments.
Authenticated API callers have no direct INSERT/UPDATE/DELETE privileges; writes
go through `ensure_my_account_profile` and `save_my_account_profile`, which derive the owner from
the session rather than from client input. Their Google provider check reads
server-controlled app metadata.

## Enable Google only

1. In Google Cloud Console, configure an OAuth consent screen and a Web application
   OAuth client. Add the Supabase project's Google callback URL shown in its Auth
   provider settings (`https://PROJECT_REF.supabase.co/auth/v1/callback`) as an
   authorized redirect URI. Configure test users if the Google app is in testing.
2. Supabase Dashboard → Authentication → Sign In / Providers → Google: enable it
   and save the Google client ID and client secret. Keep the secret in the
   Supabase dashboard; do not add it to a public environment variable or Git.
3. Disable Email and every other provider, including anonymous sign-ins. The app
   only exposes Google and rejects other providers in protected account routes
   and profile RPCs; dashboard configuration also prevents non-Google signup via
   the underlying Auth API. Existing non-Google users are not converted or deleted.
4. Authentication → URL Configuration: set Site URL to the app origin and add
   the exact app callback URLs you use to Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://127.0.0.1:3100/auth/callback`
   - `https://YOUR_PRODUCTION_HOST/auth/callback` when deployed.
5. Optionally set `NEXT_PUBLIC_SITE_URL` in `.env.local` to the app origin. When
   absent, login uses the originating form request. Keep the existing Supabase
   URL and anonymous key. Restart the development server after environment edits.

## Acceptance checks against the real project

1. Open `/id/login`. Only the Google button should appear.
2. Sign in with a new Google account. Callback must reach `/id/onboarding`.
3. Confirm other app routes redirect to onboarding until a username is saved.
4. Save a valid username. `/id/profile` and sidebar must reflect the database row.
5. Refresh or reopen the browser. The cookie session should retain the account.
6. Open Edit profile. Username is read-only with the next allowed date in WIB;
   changing name, location, and bio should persist and leave the lock unchanged.
7. Another Google account cannot claim the same username or read this profile.
8. Sign out. Protected profile URLs must redirect to login.

Profile metrics, journal history, collections, levels, and badges are not backed
by personal activity tables in this repo. They display honest empty states,
without reusing synthetic Journal demo records as personal history.

Reference: https://supabase.com/docs/guides/auth/social-sign-in/auth-google
and https://supabase.com/docs/guides/auth/server-side/creating-a-client
