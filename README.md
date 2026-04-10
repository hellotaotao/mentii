# Mentii

Mentii is a Mentimeter-style real-time audience interaction app built with React, Vite, TypeScript, Tailwind CSS, and Supabase.

## What ships today

- Host console at `/host/:sessionId`
- Big-screen presentation view at `/present/:sessionId`
- Audience join + voting flow at `/` and `/vote/:sessionCode`
- Multiple choice, word cloud, open-ended, scales, Q&A, and quiz question types
- Supabase Realtime sync for slide changes, votes, and participant presence
- RLS-protected raw votes with aggregated result RPCs

## Local development

### Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop
- Supabase CLI

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start local Supabase:

   ```bash
   supabase start
   ```

3. Create `.env.local`:

   ```bash
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=your-local-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
   ```

   You can pull the local keys directly from Supabase:

   ```bash
   supabase status -o env
   ```

4. Reset the database and apply migrations:

   ```bash
   npm run db:reset
   npm run db:types
   ```

5. Seed the demo session:

   ```bash
   npm run seed
   ```

   This creates a demo session with code `482176`, one multiple-choice slide, and one word-cloud slide.

6. Start the frontend:

   ```bash
   npm run dev
   ```

## Verification

Run the repo checks from the project root:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run verify:rls
```

## Playwright end-to-end test

Install the browser binary once:

```bash
npx playwright install chromium
```

Then run the acceptance flow:

```bash
npm run test:e2e
```

The Playwright test uses a generated Supabase magic link for the host, creates a fresh session through the real UI, joins from two independent phone-sized browser contexts, verifies live vote updates, checks persistence after presenter refresh, and exercises the word-cloud slide handoff.

## Production deployment

### Supabase cloud

1. Authenticate the CLI:

   ```bash
   supabase login
   ```

    If you prefer non-interactive auth, set `SUPABASE_ACCESS_TOKEN` in your shell first.

2. Create a Supabase project.
3. Confirm the CLI can see it:

   ```bash
   supabase projects list
   ```

4. Link the project locally:

   ```bash
   supabase link --project-ref <your-project-ref>
   ```

5. Push the schema:

   ```bash
   supabase db push
   ```

6. If you want to verify the hosted schema from this machine, regenerate types against the linked project:

   ```bash
   supabase gen types typescript --linked > src/types/database.ts
   ```

7. In Supabase Auth settings, allow your Vercel production URL and local dev URL as redirect URLs for magic-link sign-in.

### Vercel

1. Authenticate the CLI if you want to deploy from a terminal:

   ```bash
   npx vercel login
   ```

    If you prefer token-based auth, set `VERCEL_TOKEN` first.

2. Confirm the account is active:

   ```bash
   npx vercel whoami
   ```

3. Import the repository into Vercel, or run `npx vercel link` from this folder.
4. Keep the framework preset as Vite.
5. Set these environment variables in Vercel:

   ```bash
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

   CLI example:

   ```bash
   npx vercel env add VITE_SUPABASE_URL production
   npx vercel env add VITE_SUPABASE_ANON_KEY production
   ```

6. Deploy:

   ```bash
   npx vercel deploy --prod
   ```

`SUPABASE_SERVICE_ROLE_KEY` is only needed for local scripts such as seeding and Playwright auth helpers. Do not expose it to the browser or ship it as a public Vercel environment variable.

### One-command authenticated deploy

`npm run deploy:cloud` now reads `~/.mentii-deploy.env` automatically when that file exists. The minimum required values are:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`
- `VERCEL_TOKEN`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional values:

- `VERCEL_SCOPE` if the deployment should target a specific Vercel team/scope
- `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` if you also want the script to persist the two public `VITE_*` variables into the Vercel project via the REST API before deploying

Example `~/.mentii-deploy.env`:

```bash
SUPABASE_ACCESS_TOKEN=...
SUPABASE_DB_PASSWORD=...
SUPABASE_PROJECT_ID=...
VERCEL_TOKEN=...
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
# Optional:
# VERCEL_SCOPE=your-team-slug
# VERCEL_ORG_ID=team_xxx
# VERCEL_PROJECT_ID=prj_xxx
```

Then run:

```bash
npm run deploy:cloud
```

The script always passes the public Supabase values to the Vercel build and runtime environment for the production deployment. If `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are also present, it will additionally upsert those same public values into the Vercel project before deploying. Keep `SUPABASE_SERVICE_ROLE_KEY` local.

## Adding a new question type

1. Create a new folder in `src/components/questions/<TypeName>/` with `Editor.tsx`, `BigScreen.tsx`, and `Phone.tsx`.
2. Register the type in `src/types/questions.ts`:
   - add the `QuestionType`
   - add default config + parser
   - mark whether the host editor is ready
3. Wire the editor into `src/routes/HostConsole.tsx`.
4. Wire the big-screen renderer into `src/routes/BigScreen.tsx`.
5. Wire the audience renderer + submit flow into `src/routes/VotePage.tsx`.
6. Extend Supabase aggregation/RLS support if the new type needs different vote validation or result shapes.
7. Add Vitest coverage and update the Playwright acceptance flow if the new type becomes part of the MVP path.
