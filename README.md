# School Bus Tracker

A real-time MERN school transportation tracker with admin, driver, and parent interfaces.

## Requirements

- Node.js 20+
- MongoDB Atlas or local MongoDB
- Google Maps JavaScript API key

## Backend

```sh
cd backend
cp .env.example .env
npm install
npm run dev
```

Configure `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL` in `.env`. The API runs on `http://localhost:5000`.

## Frontend

```sh
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Enable Maps JavaScript API and Advanced Markers in Google Cloud, then add the API key to `.env.local`.

## Quick API workflow

1. Register an admin with `POST /api/auth/register` and role `admin`.
2. Log in with `POST /api/auth/login` to obtain a JWT.
3. Use the JWT to create buses and routes in the admin dashboard.
4. Register a driver, then assign its user ID as a bus driver and use the driver dashboard.
5. Open the parent tracker and enter the MongoDB bus ID.

WebSocket rooms are keyed by bus ID. Socket events:

- `join-bus-room`
- `update-location`
- `bus-location`
