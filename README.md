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

Create the first administrator securely. Set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 12 characters), and a stable `SCHOOL_ID` in `backend/.env`, then run:

```sh
npm run create-admin
# If upgrading an existing database, migrate legacy buses before using the new school-scoped admin dashboard:
npm run migrate-bus-schools
npm run dev
```

The API and Socket.IO server run at `http://localhost:5001`. Remove the temporary `ADMIN_PASSWORD` value after creating the account. Public registration creates parent accounts only; it cannot create administrator or driver accounts. The school ID is assigned by the server for routes and driver accounts; parent registration cannot choose a school ID.

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
2. Create buses and routes. Add at least one route stop using `Stop name, latitude, longitude` (one stop per line), then create driver accounts and assign each driver to a bus and route.
3. Create parent accounts from the Admin dashboard so each account is explicitly linked to this school.
4. From the Admin dashboard, assign each parent account to its bus.
5. Create student accounts by selecting a parent/guardian and a bus. Students sign in at `/student/dashboard` to view their assigned bus.
6. The driver signs in, verifies the assignment, and starts the trip to share GPS.
7. Parents and students can track only the bus assigned to their own account. Location updates require an authenticated Socket.IO connection.

## Current status and remaining production work

This remains a development prototype and must not yet be used as the sole source of emergency or school-transport information. Admin bus/route/driver/parent queries are now scoped to the administrator's `schoolId`; buses created after this update carry a school ID. If upgrading an existing database, run `npm run migrate-bus-schools` and inspect its skipped records before relying on the dashboard. The migration derives a bus school from its assigned route or driver and deliberately skips records where neither has a school ID.

The admin dashboard can create routes with ordered stops and review/resolve driver delay and SOS reports. The driver dashboard can recover an active trip after refresh and resume GPS sharing. Still required before production: guardian identity verification and multi-child parent assignment/selection, secure invitation and password-reset flows (the current admin-created parent accounts use a temporary password workflow), route editing/deletion UI, scheduled and return trips, parent push/SMS notifications, route/traffic-aware ETA, durable GPS history and retention policy, rate limiting, audit logs, CI/build and end-to-end tests, monitoring, database backup/restore drills, and production hosting configuration. The displayed ETA remains a rough distance-based estimate, not a navigation/traffic ETA. Test with non-sensitive demo accounts and a persistent staging database before using real student data.
