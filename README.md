# School Bus Tracker

A Next.js + Express + MongoDB prototype for school administrators, drivers, and parents.

## Requirements

- Node.js 20+
- A persistent MongoDB database for real use (local MongoDB or MongoDB Atlas)
- Google Maps JavaScript API key (for the parent map)

## 1. Configure and start the backend

```sh
cd backend
cp .env.example .env
npm install
```

Set these values in `backend/.env`:

- `MONGODB_URI`: your database connection string
- `JWT_SECRET`: a long, random secret (do not commit it)
- `CLIENT_URL=http://localhost:3000`
- `USE_MEMORY_DB=false` when using a persistent database

Create the first administrator securely. Add temporary `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 12 characters), and optionally `SCHOOL_ID` to `backend/.env`, then run:

```sh
npm run create-admin
npm run dev
```

The API and Socket.IO server run at `http://localhost:5001`. Remove the temporary `ADMIN_PASSWORD` value after creating the account. Public registration creates parent accounts only; it cannot create administrator or driver accounts.

## 2. Configure and start the frontend

Create `frontend/.env.local` from `frontend/.env.local.example`, then set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to a restricted Google Maps JavaScript API key.

```sh
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Keep API keys and database/JWT secrets out of Git; only the browser-restricted Maps key belongs in a `NEXT_PUBLIC_` variable.

## 3. Basic workflow

1. Sign in at the Admin dashboard with the bootstrapped administrator.
2. Create buses and routes, then create driver accounts and assign each driver to a bus and route.
3. Parents create accounts from the Parent tracker sign-in panel.
4. From the Admin dashboard, assign each parent account to its bus.
5. The driver signs in, verifies the assignment, and starts the trip to share GPS.
6. A parent can track only the bus assigned to their account. Location updates require an authenticated Socket.IO connection.

## Current limitations

This is a development prototype, not yet a production-ready school transport system. Before deployment, implement and test full school-level tenant isolation across every database query, parent/student identity verification, route-stop management, trip scheduling, traffic-aware ETA, notifications, rate limiting, audit logs, and production monitoring. The displayed ETA is a rough distance-based estimate, not a navigation/traffic ETA. Test with non-sensitive demo accounts and a persistent staging database before using real student data.
