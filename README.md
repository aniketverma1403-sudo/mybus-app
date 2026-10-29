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

- `MONGODB_URI`: your database connection string (required when `USE_MEMORY_DB=false`)
- `JWT_SECRET`: a long, random secret (never commit it)
- `CLIENT_URL=http://localhost:3000`
- `USE_MEMORY_DB=true` for a quick local demo, or `false` for persistent MongoDB
- `PORT=5001` (choose another free port if 5001 is already occupied)
- `SCHOOL_ID=school-demo`

**Quick local demo:** use `USE_MEMORY_DB=true`, start `npm run dev`, and sign in with `admin@school.com` / `Demo@1234`. This development-only demo database is in memory and all demo data disappears when the backend stops. Never use these credentials in production.

**Persistent database / production:** set `USE_MEMORY_DB=false`, `MONGODB_URI`, `JWT_SECRET`, and a stable `SCHOOL_ID`. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 12 characters, then run `npm run create-admin` against that same database before starting the API. The script can update an existing administrator but refuses to promote a parent or driver account. Production does not auto-create demo accounts. Remove `ADMIN_PASSWORD` from the environment after bootstrap.

The API and Socket.IO server run at `http://localhost:5001` by default. If you see `EADDRINUSE`, another process already owns that port: stop the older backend process or set `PORT` to a free port and make the frontend API URL match. Public registration creates parent accounts only; it cannot create administrator or driver accounts.

## 2. Configure and start the frontend

Create `frontend/.env.local` from `frontend/.env.local.example`. Set `NEXT_PUBLIC_API_URL=http://localhost:5001` and set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to a restricted Google Maps JavaScript API key. Restart Next.js after changing environment variables.

```sh
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Check `http://localhost:5001/api/health` returns `{"status":"ok"}` before attempting sign-in. Keep database credentials and JWT secrets out of Git; only the browser-restricted Maps key and public API base URL belong in `NEXT_PUBLIC_` variables.

## 4. Deployment (Netlify + Render)

**Why local sign-in can work while Netlify sign-in fails:** local development can use a temporary in-memory database and the demo admin. Netlify is a separate hosted frontend and cannot access your computer's `localhost:5001`; it needs a separately hosted API connected to a persistent database, with a production admin account.

1. Create a persistent MongoDB Atlas database and allow your backend host to connect to it.
2. In Render, create a new Blueprint from this repository using `render.yaml`, or create a Node web service manually with **Root Directory** `backend`, **Build Command** `npm install`, **Start Command** `npm start`, and **Health Check Path** `/api/health`.
3. Set Render environment variables: `NODE_ENV=production`, `USE_MEMORY_DB=false`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `SCHOOL_ID=school-demo`. `CLIENT_URL` must be the exact Netlify site origin, such as `https://your-site.netlify.app`, with no trailing slash. For a deploy-preview domain, include it as another comma-separated origin only if you use it. Do not set `USE_MEMORY_DB=true` in production.
4. Create the admin in the Render Shell against the production database. Set the required variables for that command and run it, for example: `ADMIN_NAME='Demo Interview Admin' ADMIN_EMAIL='your-admin@example.com' ADMIN_PASSWORD='use-a-unique-long-password' SCHOOL_ID='school-demo' npm run create-admin`. Use a real email format and a unique password you choose; never use the local demo password in production. Do not put this password in GitHub or in the frontend.
5. Copy the actual public service URL shown by Render. Test `https://YOUR-RENDER-SERVICE.onrender.com/api/health`; it must return `{"status":"ok"}`.
6. In Netlify → **Site configuration → Environment variables**, set `NEXT_PUBLIC_API_URL` to that actual Render service URL (no trailing slash). Keep `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` if using the map. Trigger **Clear cache and deploy site** or a new deploy so Next.js rebuilds with the value.
7. Open the deployed Netlify URL in a private/incognito window and sign in using the production admin email/password from step 4. Do not use `admin@school.com` / `Demo@1234` unless you explicitly created that account in the persistent production database.

`CLIENT_URL` must match the Netlify site's exact origin, including `https://`. The backend now strips trailing slashes from configured origins. A deployed Netlify frontend cannot reach `localhost:5001` on your Mac. If the health endpoint works but login fails, inspect the browser DevTools → Network request to `/api/auth/login`: `Failed to fetch` usually means a wrong API URL/CORS/network issue; HTTP `401` means the credentials are not in that production database; HTTP `500` means backend configuration/database/auth setup needs checking.

## 3. Basic workflow

1. Sign in at the Admin dashboard with the bootstrapped administrator.
2. Create buses and routes, then create driver accounts and assign each driver to a bus and route.
3. Parents create accounts from the Parent tracker sign-in panel.
4. From the Admin dashboard, assign each parent account to its bus.
5. The driver signs in, verifies the assignment, and starts the trip to share GPS.
6. A parent can track only the bus assigned to their account. Location updates require an authenticated Socket.IO connection.

## Current limitations

This is a development prototype, not yet a production-ready school transport system. Before deployment, implement and test full school-level tenant isolation across every database query, parent/student identity verification, route-stop management, trip scheduling, traffic-aware ETA, notifications, rate limiting, audit logs, and production monitoring. The displayed ETA is a rough distance-based estimate, not a navigation/traffic ETA. Test with non-sensitive demo accounts and a persistent staging database before using real student data.
