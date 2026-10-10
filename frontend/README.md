# TenderBridge frontend

React frontend for the application tracker, saved opportunities, JV directory, organization publishing portal, and approval console.

## Run locally

1. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend URL.
2. Run `npm install`.
3. Run `npm run dev`.

The app uses the existing `src/` project tree, shared navigation, route table, and shared UI components. Authentication files in the current project are empty, so protected role routes and the auth token provider need to be connected when the shared authentication implementation is available. Service methods for undefined backend contracts report the integration gap without returning fake success data. Service calls based on proposed routes still need confirmation against the implemented API.
