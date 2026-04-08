# Deployment

## Vercel

This project is set up to deploy on Vercel with:

- a static Vite frontend from `client/dist`
- a serverless Express API exposed through `api/[...path].ts`

## Prerequisites

Before deploying, make sure you have:

- a MongoDB database reachable from Vercel
- a strong JWT secret
- a Vercel project connected to this repository

## Build Setup

The repo already includes `vercel.json` with the expected settings:

- framework: `vite`
- build command: `pnpm --dir client build`
- output directory: `client/dist`
- API runtime: `nodejs20.x`

You usually do not need to change these manually in the Vercel UI.

## Environment Variables

Set these in the Vercel project settings:

- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`

Example:

```env
MONGO_URI=mongodb://username:password@host:27017/expence
JWT_SECRET=replace-this-with-a-long-random-secret
CLIENT_URL=https://your-app.vercel.app
```

## Recommended Vercel Settings

In Vercel:

1. Create a new project from this repo.
2. Keep the package manager as `pnpm`.
3. Add the environment variables above for Production.
4. Deploy.

## Important Notes

- `CLIENT_URL` should match the final public site URL exactly.
- Cookies are marked `secure` in production, so authentication should be tested on the real HTTPS deployment.
- The API bootstraps MongoDB and seeds the demo user when the function starts.
- The seeded demo account is:

```text
Email: demo@fintrack.app
Password: demo1234
```

## Local Build Check

You can verify both parts before deploying:

```bash
pnpm --dir server build
pnpm --dir client build
```

## Troubleshooting

If login does not persist:

- confirm `CLIENT_URL` matches the deployed frontend domain
- confirm the site is being accessed over HTTPS
- confirm the API is being called through the same Vercel deployment

If MongoDB fails to connect:

- verify `MONGO_URI`
- ensure your MongoDB network access rules allow Vercel
- if using Atlas, prefer a connection string compatible with your environment
