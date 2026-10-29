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

1. Create a persistent MongoDB Atlas database and allow your backend host to connect to it.
2. Deploy `backend` as a Node service on Render with **Root Directory** `backend`, **Build Command** `npm install`, and **Start Command** `npm start`.
3. Set Render environment variables: `NODE_ENV=production`, `USE_MEMORY_DB=false`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL=https://YOUR-NETLIFY-SITE.netlify.app`, and `SCHOOL_ID`. Add `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` temporarily, then run `npm run create-admin` in the Render shell using those same environment values. Do not set `USE_MEMORY_DB=true` in production.
4. Set Netlify environment variable `NEXT_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` if using the map. Trigger a new frontend deploy after setting these variables.
5. Open `https://YOUR-RENDER-SERVICE.onrender.com/api/health`; it must return `{"status":"ok"}`. Then use the administrator email and password you created—not the local demo credentials.

A deployed Netlify frontend cannot reach `localhost:5001` on your Mac. The API must be publicly deployed and the frontend must be rebuilt with its URL.

## 3. Basic workflow

1. Sign in at the Admin dashboard with the bootstrapped administrator.
2. Create buses and routes, then create driver accounts and assign each driver to a bus and route.
3. Parents create accounts from the Parent tracker sign-in panel.
4. From the Admin dashboard, assign each parent account to its bus.
5. The driver signs in, verifies the assignment, and starts the trip to share GPS.
6. A parent can track only the bus assigned to their account. Location updates require an authenticated Socket.IO connection.

## Current limitations

This is a development prototype, not yet a production-ready school transport system. Before deployment, implement and test full school-level tenant isolation across every database query, parent/student identity verification, route-stop management, trip scheduling, traffic-aware ETA, notifications, rate limiting, audit logs, and production monitoring. The displayed ETA is a rough distance-based estimate, not a navigation/traffic ETA. Test with non-sensitive demo accounts and a persistent staging database before using real student data.


## 3. Deploy a public interview demo

Netlify hosts only the Next.js frontend. The Express API and MongoDB must also be hosted; \`localhost\` URLs work only on your own computer.

1. Create a MongoDB Atlas database and copy its Node.js connection string. Keep it private.
2. In Render, create a Web Service from this repository with **Root Directory** \`backend\`, **Build Command** \`npm install\`, and **Start Command** \`npm start\`. Alternatively, use the repository's \`render.yaml\` blueprint.
3. Set Render environment variables: \`NODE_ENV=production\`, \`USE_MEMORY_DB=false\`, \`MONGODB_URI\` (Atlas connection string), \`JWT_SECRET\` (long random secret), \`CLIENT_URL=https://mybus99.netlify.app\`, and \`SCHOOL_ID=school-demo\`. Do not commit secrets.
4. Wait for the Render service to start, then open \`https://YOUR-API.onrender.com/api/health\`. It must return \`{"status":"ok"}\`.
5. Create the production administrator in the Render Shell using \`npm run create-admin\` with \`ADMIN_NAME\`, \`ADMIN_EMAIL\`, \`ADMIN_PASSWORD\` (at least 12 characters), and \`SCHOOL_ID=school-demo\` environment variables. Do not use development demo credentials in production.
6. In Netlify → **Site configuration → Environment variables**, set \`NEXT_PUBLIC_API_URL=https://YOUR-API.onrender.com\` (the actual Render URL, no trailing slash and no \`/api\` suffix). Trigger a new production deploy; Next.js reads this value at build time.
7. Test admin sign-in, create/assign a bus and driver, then sign in as a parent and allow location access on the driver's device. Browser geolocation requires HTTPS, which Netlify provides.

The frontend intentionally refuses a localhost API URL in production. If the backend URL is missing or still points to localhost, set the Netlify variable and redeploy. A successful frontend deployment alone does not create the production database or user accounts.
