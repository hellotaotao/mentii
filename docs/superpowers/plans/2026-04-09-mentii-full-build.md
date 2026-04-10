# Mentii Full Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Mentii application beyond Phase 0 so hosts can create sessions, presenters can run live questions, audiences can join anonymously and vote in realtime, and the remaining question types ship in the registry architecture.

**Architecture:** Keep a single Vite SPA with React Router and a question-type registry. Build feature slices around shared session/question/result hooks on top of Supabase tables, Realtime subscriptions, RLS-protected voting, and the aggregate RPC. Deliver the requested phases sequentially: multiple-choice host flow first, then presenter, then audience, then presenter controls, then word cloud, then polish, then end-to-end coverage and deployment assets, and finally the remaining Phase 2 types.

**Tech Stack:** React, Vite, TypeScript, Tailwind CSS, React Router, Supabase JS, Supabase Realtime, Recharts, qrcode.react, lucide-react, Playwright

---

## File Structure

- `src/types/questions.ts` — shared question/session/result types and question-type registry contracts.
- `src/lib/supabaseQueries.ts` — focused database access helpers for sessions, questions, votes, reset flows, and aggregated results.
- `src/lib/realtime.ts` — channel subscription helpers for sessions, votes, and presence.
- `src/lib/sessionCode.ts` — code formatting helpers and join URL generation.
- `src/hooks/useSession.ts` — route-level session loading and realtime synchronization.
- `src/hooks/useQuestionResults.ts` — aggregated result polling/realtime refresh logic.
- `src/hooks/useParticipantPresence.ts` — presenter-side unique participant count presence helper.
- `src/components/layout/*.tsx` — shell pieces like split panes, empty states, mobile frames, and top/bottom bars.
- `src/components/questions/<type>/Editor.tsx` — host-side editing UI.
- `src/components/questions/<type>/BigScreen.tsx` — presenter-side visualization.
- `src/components/questions/<type>/Phone.tsx` — audience-side voting UI.
- `src/components/SessionCodeBar.tsx` — persistent top bar with formatted code, join message, and QR code.
- `src/components/PresenterControls.tsx` — hover-reveal presenter controls and shortcuts state.
- `src/components/SlideList.tsx` — host slide list with reorder and selection.
- `src/routes/HostConsole.tsx` — session editor with slide list, preview, and property tabs.
- `src/routes/BigScreen.tsx` — live presenter route with question rendering and controls.
- `src/routes/JoinPage.tsx` — join flow and join-code bootstrap.
- `src/routes/VotePage.tsx` — anonymous audience route with presenter-paced states.
- `src/routes/HostAuthGate.tsx` — simple host email sign-in guard for magic-link auth.
- `src/test/**` and `playwright/**` — unit/integration coverage and acceptance flow tests.
- `supabase/migrations/*.sql` — schema extensions needed for resets, Q&A upvotes, quiz timers/leaderboard, and helper RPCs.

### Task 1: Phase 1a host console and shared question registry

**Files:**
- Create: `src/types/questions.ts`
- Create: `src/lib/supabaseQueries.ts`
- Create: `src/lib/sessionCode.ts`
- Create: `src/components/SlideList.tsx`
- Create: `src/components/questions/MultipleChoice/Editor.tsx`
- Modify: `src/routes/HostConsole.tsx`
- Modify: `src/App.tsx`
- Test: `src/routes/HostConsole.test.tsx`

- [ ] Define shared question/session registry types and helper defaults.
- [ ] Add focused query helpers for creating sessions, reading ordered questions, upserting question config, deleting questions, and reordering slides.
- [ ] Add a host console test that covers creating a session, selecting a slide, editing title/options, and persisting to Supabase mocks.
- [ ] Implement the split-pane host console with left slide list, center preview shell, and right tabbed property panel.
- [ ] Add multiple-choice editor support for title, options, and chart type.
- [ ] Verify with `npm test -- src/routes/HostConsole.test.tsx`, `npm run build`, and `npm run lint`.

### Task 2: Phase 1b presenter multiple-choice route

**Files:**
- Create: `src/hooks/useSession.ts`
- Create: `src/hooks/useQuestionResults.ts`
- Create: `src/components/SessionCodeBar.tsx`
- Create: `src/components/questions/MultipleChoice/BigScreen.tsx`
- Modify: `src/routes/BigScreen.tsx`
- Test: `src/routes/BigScreen.test.tsx`

- [ ] Add route-level session loading and current-question resolution helpers.
- [ ] Add presenter big-screen tests for session code rendering, question title rendering, and aggregated multiple-choice results.
- [ ] Implement the persistent top code bar with QR code and formatted code.
- [ ] Implement animated bar/donut/pie rendering using Recharts and smooth transitions.
- [ ] Wire Supabase Realtime so presenter view refreshes on session row changes and vote inserts.
- [ ] Verify with `npm test -- src/routes/BigScreen.test.tsx`, `npm run build`, and `npm run lint`.

### Task 3: Phase 1c anonymous join and multiple-choice voting flow

**Files:**
- Modify: `src/routes/JoinPage.tsx`
- Modify: `src/routes/VotePage.tsx`
- Create: `src/components/questions/MultipleChoice/Phone.tsx`
- Create: `src/routes/VotePage.test.tsx`
- Modify: `src/lib/participantId.ts`
- Modify: `src/lib/supabaseQueries.ts`

- [ ] Add audience tests for join by code, waiting state, active question rendering, vote submission, and thank-you state.
- [ ] Implement join-page lookup by session code and query-string bootstrap.
- [ ] Implement presenter-paced audience route state machine: waiting, active, voted, moved-on toast, and voting-closed.
- [ ] Implement anonymous multiple-choice vote submission using stored participant IDs and the existing votes table.
- [ ] Verify with `npm test -- src/routes/VotePage.test.tsx`, `npm run build`, and `npm run lint`.

### Task 4: Phase 1d presenter controls and synchronized navigation

**Files:**
- Create: `src/components/PresenterControls.tsx`
- Modify: `src/routes/BigScreen.tsx`
- Modify: `src/routes/VotePage.tsx`
- Modify: `src/lib/supabaseQueries.ts`
- Test: `src/components/PresenterControls.test.tsx`

- [ ] Add presenter-control tests for prev/next navigation, hide results, close voting, reset results, and keyboard shortcuts.
- [ ] Implement hover-reveal bottom control bar with idle fade-out behavior.
- [ ] Implement presenter navigation updates that mutate `current_question_id`, `voting_open`, and `results_hidden`.
- [ ] Add audience auto-navigation when presenter changes slide.
- [ ] Implement reset-results behavior for the current question.
- [ ] Verify with `npm test -- src/components/PresenterControls.test.tsx`, `npm run build`, and `npm run lint`.

### Task 5: Phase 1e word cloud question type

**Files:**
- Create: `src/components/questions/WordCloud/Editor.tsx`
- Create: `src/components/questions/WordCloud/BigScreen.tsx`
- Create: `src/components/questions/WordCloud/Phone.tsx`
- Modify: `src/types/questions.ts`
- Modify: `src/lib/supabaseQueries.ts`
- Modify: `src/routes/HostConsole.tsx`
- Modify: `src/routes/BigScreen.tsx`
- Modify: `src/routes/VotePage.tsx`
- Test: `src/components/questions/WordCloud/*.test.tsx`

- [ ] Add registry support for word-cloud config and results shapes.
- [ ] Add tests for word-cloud editing, free-text submission, repeated submissions, and rendered word scaling.
- [ ] Implement editor, presenter visualization, and phone input components.
- [ ] Reuse the aggregate RPC and realtime refresh path for word-cloud updates.
- [ ] Verify with targeted word-cloud tests plus `npm run build` and `npm run lint`.

### Task 6: Phase 1f polish, share, presence, and responsive behavior

**Files:**
- Create: `src/hooks/useParticipantPresence.ts`
- Modify: `src/components/SessionCodeBar.tsx`
- Modify: `src/routes/BigScreen.tsx`
- Modify: `src/routes/HostConsole.tsx`
- Modify: `src/routes/VotePage.tsx`
- Test: `src/routes/BigScreen.test.tsx`

- [ ] Add presence counting for unique participants connected to a session.
- [ ] Add share-link copy affordance and QR improvements on host/presenter surfaces.
- [ ] Improve mobile layout and visual separation between phone and big-screen views.
- [ ] Tighten animation polish for bars and word clouds.
- [ ] Verify with targeted presenter tests, `npm run build`, and `npm run lint`.

### Task 7: Phase 1g Playwright and deployment assets

**Files:**
- Create: `playwright.config.ts`
- Create: `playwright/acceptance.spec.ts`
- Modify: `package.json`
- Modify: `README.md`
- Create: `vercel.json`
- Test: `npx playwright test`

- [ ] Add Playwright dependencies and configuration for the three-browser acceptance flow.
- [ ] Add an acceptance test covering host creation, present, join, vote, slide advance, and word cloud behavior.
- [ ] Add Vercel deployment configuration and complete README sections for production deployment and adding new question types.
- [ ] Verify with `npx playwright test`, `npm run build`, and `npm run lint`.

### Task 8: Phase 2 remaining question types

**Files:**
- Create: `src/components/questions/OpenEnded/*`
- Create: `src/components/questions/Scales/*`
- Create: `src/components/questions/QA/*`
- Create: `src/components/questions/Quiz/*`
- Modify: `src/types/questions.ts`
- Modify: `src/lib/supabaseQueries.ts`
- Modify: `supabase/migrations/*.sql`
- Test: `src/components/questions/**/*.test.tsx`

- [ ] Extend the schema/helpers for open-ended cards, scales aggregates, Q&A submissions/upvotes/answered state, and quiz timing/leaderboard data.
- [ ] Add registry entries and host/editor/presenter/phone components for each remaining type.
- [ ] Add targeted tests for each type’s aggregation and UI rendering.
- [ ] Re-run the full suite: unit tests, Playwright, build, lint, and typecheck.
