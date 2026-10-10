# TenderBridge frontend

React frontend for the application tracker, saved opportunities, JV directory, organization publishing portal, and approval console.

## Run locally

1. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend URL, usually `http://localhost:4000`.
2. Run `npm install`.
3. Run `npm run dev`.

The feature service methods call the routes documented in `backend/README.md`. Authentication UI and session management belong to Member 1. When that implementation is present, connect its current Supabase access token through `setApiTokenProvider()` in `src/services/api.js`; the backend requires a bearer token with a trusted `app_metadata.role` claim (`BUSINESS`, `ORGANIZATION`, or `ADMIN`). Do not accept workspace roles from user-editable metadata.

The API origin must also appear in the backend's `CORS_ORIGINS` setting. For local development, the example allows `http://localhost:5173`.
