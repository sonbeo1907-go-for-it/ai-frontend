# Smart Learning Assistant — Sprint 1 Frontend

Product-level Next.js frontend for the Sprint 1 API in `ai-planning-backend`.

The visual system follows the supplied adaptive-learning template: compact top navigation, a
neutral slate workspace, and restrained emerald/indigo accents. Mock data, fake role switching,
and post-MVP template features are intentionally excluded.

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS
- Lucide icons
- Same-origin proxy to the Spring Boot API
- Prettier formatting for readable, reviewable source

## Local setup

1. Start the backend on `http://localhost:8080`.
2. Copy `.env.example` to `.env.local`.
3. Optionally set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` when Google authentication is enabled in the backend.
4. Start the frontend:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Code quality commands

```bash
npm run format:check
npm run lint
npx tsc --noEmit
npm run build
```

## Authentication design

- The access JWT is held in browser memory, not local storage.
- The backend refresh token remains in its HttpOnly cookie.
- `/api/v1/*` is proxied through Next.js to `BACKEND_URL`, allowing cookie rotation without exposing the refresh token to JavaScript.
- Expired access tokens trigger one serialized refresh and one request retry.

## Implemented Sprint 1 screens

- Email/password registration and login
- Google Identity Services login when configured
- Password reset request and confirmation
- Mandatory first-access profile setup
- Resumable Roadmap onboarding
- Personal Material upload/text entry/list/archive
- Manual Roadmap and RoadmapVersion authoring
- Milestone and Topic create/edit/reorder/delete
- Roadmap version activation and history
- Manual Daily Plan and version history
- Task checklist, progress outcomes, and Pomodoro recording
- Profile editing and password change

The ADMIN workspace intentionally does not fabricate provider data: the current Sprint 1 backend has no implemented ADMIN controller.
