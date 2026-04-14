# Deployment

This repo is now set up for separate frontend and backend deployments:

- `client/` deploys as the Vite frontend
- `server/` deploys as the Express API

## Client Deployment

Build the frontend from the `client` directory.

Required environment variable:

```env
VITE_API_URL=https://your-server-domain.com
```

Notes:

- Do not include a trailing slash in `VITE_API_URL`
- the frontend will call `${VITE_API_URL}/api/...`
- local development still works through the Vite proxy without `VITE_API_URL`

## Server Deployment

Deploy the API from the `server` directory.

Required environment variables:

```env
MONGO_URI=mongodb://username:password@host:27017/expence
JWT_SECRET=replace-this-with-a-long-random-secret
CLIENT_URL=https://your-client-domain.com
```

Optional cookie settings for separate domains:

```env
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=
```

Use `COOKIE_SAME_SITE=none` when the client and server are on different sites and you need cookie-based login to work across them. Leave `COOKIE_DOMAIN` empty unless you intentionally want to share cookies across subdomains.

The frontend now also keeps a bearer token as a fallback for browsers that are strict about third-party cookies, but `COOKIE_SAME_SITE=none` is still recommended for the smoothest cross-site session handling.

## Recommended Setup

1. Deploy `server/` first and copy its public URL.
2. Set `VITE_API_URL` in the client deployment to that server URL.
3. Set `CLIENT_URL` in the server deployment to the final client URL.
4. If client and server are on different domains, set `COOKIE_SAME_SITE=none` on the server and use HTTPS on both.

## Demo Seed

The API seeds a demo account on startup:

```text
Email: demo@fintrack.app
Password: demo1234
```

## Local Build Check

```bash
pnpm --dir server build
pnpm --dir client build
```
