# Mentii

Mentii is a Mentimeter-style real-time audience interaction app built with React, Vite, TypeScript, Tailwind CSS, and Supabase.

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

3. Create a local environment file from the running Supabase instance:

   ```bash
   eval "$(supabase status -o env | sed 's/^/export /')"
   cat > .env.local <<EOF
   VITE_SUPABASE_URL=${API_URL}
   VITE_SUPABASE_ANON_KEY=${ANON_KEY}
   SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
   EOF
   ```

4. Rebuild the database and regenerate types:

   ```bash
   npm run db:reset
   npm run db:types
   ```

5. Seed demo data:

   ```bash
   npm run seed
   ```

6. Start the frontend:

   ```bash
   npm run dev
   ```

## Phase 0 verification

```bash
npm test
npm run verify:rls
npm run build
npm run typecheck
npm run lint
```
