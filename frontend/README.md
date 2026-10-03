# TenderBridge frontend

React + Vite frontend scaffold for the Member 3 application tracker, saved tenders, JV directory, private organization publishing portal, and admin approval queue.

## Run locally

1. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend URL.
2. Run `npm install`.
3. Run `npm run dev`.

The app shell and pages are isolated under `src/`. Connect the shared authentication provider and role guards from Member 1 before merging routes into the team application. Service methods that depend on backend contracts not present in the repository deliberately report that the contract is missing. Proposed routes in `member3Service.js` are not verified backend implementations.
