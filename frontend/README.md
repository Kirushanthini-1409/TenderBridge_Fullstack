# TenderBridge frontend

React frontend for the application tracker, saved opportunities, JV directory, organization publishing portal, and approval console.

## Run locally

1. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. Use the public anon/publishable key, never a service-role key.
2. Run `npm install`.
3. Run `npm run dev`.

The frontend signs in with Supabase Auth and sends the current access token as a bearer token to the Express API. Sign-in and account creation are at `/login` and `/register`; users need a confirmed email when email confirmation is enabled in Supabase.

## Workspace roles

The backend accepts only trusted `app_metadata.role` values: `BUSINESS`, `ORGANIZATION`, or `ADMIN`. Registration does not assign a role, and the frontend never writes roles to user-editable metadata. A Supabase project administrator must provision the correct trusted role through the project's approved server-side admin process. After changing a role, sign out and sign back in to receive a refreshed token. Users without a role see an access message rather than receiving broad permissions.

## Local configuration

In the Supabase project dashboard, get the project URL and the public publishable key (or legacy anon key) from **Settings → API Keys**. Set them as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env.local`. The key beginning with `sb_publishable_` is appropriate for browser code; never use a secret or service-role key there. The current app API URL is `http://localhost:4000`. Restart the Vite development server after changing environment values.

The API origin must also appear in the backend's `CORS_ORIGINS` setting. For local development, the example allows `http://localhost:5173`.
