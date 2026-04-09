# Mentii Global Architecture and Phase 0 Foundation Design

## Problem Statement

Build a production-ready Mentimeter-style audience interaction web app with a React + Vite + TypeScript frontend, Tailwind CSS styling, Supabase for backend/auth/realtime, and a phased delivery model that ships the MVP first and adds question types later.

The current workspace is empty and not yet a git repository, so Phase 0 must establish both the repository baseline and the technical foundation needed for later phases.

## Scope Boundary

This design covers:

1. The global system architecture the whole app will follow.
2. The implementation boundary for Phase 0 only.

Implementation after Phase 0 will continue in separate phase-by-phase execution cycles.

## Goals

1. Keep one frontend application with clear route boundaries for host, presenter, and audience.
2. Keep Supabase as the only backend and realtime system.
3. Make question types pluggable so new types can be added without rewriting route logic.
4. Enforce anonymous voting privacy: raw votes stay private, aggregated results stay public through controlled RPCs.
5. Make the database reproducible from scratch with migrations and a seed flow.

## Non-Goals for Phase 0

1. No finished host editor behavior.
2. No finished presenter controls or realtime UI synchronization.
3. No end-to-end audience voting flow yet.
4. No Playwright acceptance suite yet.
5. No production deployment yet.

## System Architecture

### Frontend

- One Vite SPA using React Router.
- Primary routes:
  - `/`
  - `/vote/:sessionCode`
  - `/host/new`
  - `/host/:sessionId`
  - `/present/:sessionId`
- Shared application shell kept minimal; each route owns its own layout and state needs.

### Question Type Model

Question types live under `src/components/questions/<type>/` with three role-specific files:

- `Editor.tsx`
- `BigScreen.tsx`
- `Phone.tsx`

A central registry maps question type keys to:

- editor component
- presenter component
- audience component
- type-specific config parsing/defaults

This keeps later additions localized to the new type and the registry entry.

### Backend

Supabase owns:

- Postgres schema
- row level security
- magic link auth for hosts
- realtime subscriptions
- RPCs for aggregated results

No custom API server will be added.

## Data and Security Model

### Tables

Core tables remain:

- `sessions`
- `questions`
- `votes`

`questions.config` stays the extension point for type-specific behavior such as:

- multiple choice options
- chart preferences
- pacing options
- limits and toggles

### Public vs Private Data

- Hosts can read and mutate their own sessions and questions.
- Anonymous joiners can read only the public session and question data needed to participate.
- Anonymous clients cannot read raw `votes`.
- Presenter and host result views consume aggregated data only.

### Vote Submission Rules

To support both single-response and multi-response question types without changing the client contract, the database will enforce vote semantics:

- single-response types replace a participant's previous response for that question
- multi-response types append additional rows

This will be implemented with database-side vote rule logic so the enforcement does not rely only on frontend behavior.

### Aggregated Results

`get_question_results(question_id uuid)` returns only aggregated data shaped for the question type. This preserves privacy while keeping presenter updates simple.

### Participant Identity

Audience clients generate an anonymous UUID once and store it in local storage as `participant_id`. The frontend sends that ID with Supabase requests so policies can validate write ownership for anonymous vote inserts.

## Realtime Model

Supabase Realtime is the only realtime layer.

- `sessions` changes drive:
  - current question updates
  - voting open/closed state
  - hidden results state
- `votes` inserts drive:
  - result refreshes
  - host-side preview refreshes
- participant counts will use Realtime Presence instead of a custom table

## Phase Breakdown

### Phase 0

Foundation only:

- initialize git repository baseline
- scaffold Vite + React + TypeScript + Tailwind
- wire React Router skeleton
- configure Supabase local development
- add migrations, RLS, result RPC, and seed flow
- generate database types
- add environment template and core scripts
- document local setup in README

### Phase 1

Incremental delivery in the requested order:

1. Host console with multiple choice CRUD
2. Big screen with multiple choice realtime results
3. Join and vote flow for multiple choice
4. Presenter navigation and synchronized audience movement
5. Word cloud across host/presenter/phone
6. Polish
7. Playwright and deployment

### Phase 2

Add remaining question types one at a time behind the existing registry structure.

## Phase 0 Deliverables

1. Git repository initialized with an ignore strategy that supports worktrees.
2. Working React application scaffold with route placeholders.
3. Supabase configuration and reproducible SQL migrations.
4. Seed script that creates:
   - one demo session
   - one multiple choice question
   - one word cloud question
5. Generated database typings committed into `src/types/database.ts`.
6. README sections for local development and database workflow.

## Error Handling Principles

1. Database permissions should fail closed.
2. Missing environment variables should fail fast during startup.
3. Unsupported question type configs should be surfaced explicitly in the app rather than silently ignored.
4. Seed and migration commands should be idempotent or clearly fail with actionable errors.

## Verification Strategy for Phase 0

Phase 0 is considered complete when:

1. the app boots locally
2. the database can be recreated from migrations
3. the seed command inserts usable demo data
4. anonymous clients cannot read raw votes
5. aggregated results RPC returns expected data
6. build and typecheck succeed

## Decision Summary

Recommended architecture:

- single SPA
- Supabase-only backend
- pluggable question registry
- privacy-preserving aggregated results
- phase-by-phase implementation starting with infrastructure
