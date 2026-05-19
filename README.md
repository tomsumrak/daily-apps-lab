# Daily Apps Lab

Daily Apps Lab is a single full-stack web application for hosting many small
daily apps under one shared account system.

The first version includes:

- Public landing page
- Email/password signup and signin
- HTTP-only cookie sessions signed with `jose`
- Protected apps dashboard
- Placeholder mini-app routes under `/apps/[slug]`
- Prisma/Postgres schema for users and flexible app records
- Render Blueprint config for one web service and one Postgres database

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Postgres
- Prisma
- `bcryptjs` for password hashing
- `jose` for session tokens
- `zod` for validation

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to a local Postgres database and set `AUTH_SECRET` to a long
random string.

Create the database tables:

```bash
npm run prisma:migrate
```

Run the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Useful Scripts

```bash
npm run prisma:validate
npm run typecheck
npm run lint
npm run build
```

## Deployment

`render.yaml` defines:

- One Render Web Service
- One Render Postgres database
- `DATABASE_URL` connected from the Render database
- Generated `AUTH_SECRET`
- `npm run prisma:deploy` as the pre-deploy migration step

Mini-apps should be added inside this same Next.js application under
`/apps/[slug]`. App-specific data should be stored in `AppRecord` with `userId`,
`appSlug`, `recordType`, and JSON `data`.
