# Dino Stream - Mobile-First Video Player

A production-style video player application inspired by mobile YouTube interactions, built with Next.js App Router and TypeScript.

## Live Links

- Repository: `https://github.com/Niraj1412/Dino-Frontend`
- Live Demo: `https://dino-frontend-azure.vercel.app/`

Replace the placeholders above before submission.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- ReactPlayer (YouTube embeds)
- React Virtuoso (virtualized lists)
- Playwright (E2E tests)

## What This Project Demonstrates

- Interaction design for mobile and desktop video playback
- Gesture-driven UX (drag to minimize, swipe related sheet)
- Stateful architecture using a central store (Zustand)
- Performance-aware rendering (virtualization, memoization, RAF sync)
- Polished UI system with dark/light theme support

## Core Features

- Grouped video feed by category
- Virtualized scrolling feed for large lists
- Video cards with thumbnail, title, duration, and category badge
- Animated transition from feed card to player surface
- Full-page player with custom controls:
  - Play/Pause
  - Skip -10s / +10s
  - Seek bar
  - Current time / total duration
- Related video list filtered by current category
- Instant related-video switching with autoplay
- Drag-down minimize to persistent bottom mini-player
- Mini-player restore and close controls
- Auto-play next video with 2-second cancelable countdown
- Skip animation feedback
- Loading skeletons and playback error boundary
- Picture-in-Picture toggle with graceful unsupported fallback
- ARIA labels and live-region announcements for key updates
- Desktop UX upgrades:
  - Sticky category rail + optimized feed shell
  - Larger split card layout
  - Split-view player with persistent right related-video sidebar

## Assignment Coverage

- [x] Home page grouped feed and card metadata
- [x] Smooth transitions and responsive UI
- [x] Full-page autoplay player with custom controls
- [x] Related list with same-category filtering and instant switching
- [x] Drag-to-minimize persistent mini-player flow
- [x] Virtualization for feed and related list
- [x] Auto-play next countdown with cancel
- [x] PiP integration
- [x] GPU-friendly animations + requestAnimationFrame sync
- [x] Gesture velocity handling and touch gesture tuning
- [x] Loading skeletons and error boundary
- [x] Accessibility labels and dark mode
- [ ] MP4/HLS playback pipeline (current implementation focuses on YouTube via ReactPlayer)
- [ ] External dataset ingestion from assignment JSON (current implementation uses local seeded library)

## Architecture Overview

- `src/store/player-store.ts`
  - Source of truth for player mode (`full`, `mini`, `hidden`), playback state, current time, duration, skip feedback, and PiP state.
- `src/components/player/player-layer.tsx`
  - Global player overlay, gestures, controls, transitions, mini-player behavior, autoplay-next logic.
- `src/components/feed/home-feed.tsx`
  - Virtualized grouped feed, category filtering, route transitions.
- `src/components/player/related-sheet.tsx`
  - Mobile swipe-up related list.
- `src/components/player/related-sidebar.tsx`
  - Desktop persistent related list panel.
- `src/store/video-metadata-store.ts`
  - Client metadata hydration and local cache.
- `src/app/api/youtube-metadata/route.ts`
  - Optional server endpoint to fetch YouTube durations/titles via Data API.

## Project Structure

```txt
src/
  app/
    api/youtube-metadata/route.ts
    layout.tsx
    page.tsx
    watch/[id]/page.tsx
  components/
    dev/
      perf-overlay.tsx
    feed/
      home-feed.tsx
      video-card.tsx
    player/
      player-layer.tsx
      related-sheet.tsx
      related-sidebar.tsx
      video-error-boundary.tsx
    shell/
      app-shell.tsx
    theme/
      theme-controller.tsx
      theme-toggle.tsx
  data/
    videos.ts
  lib/
    cn.ts
    time.ts
    youtube.ts
  store/
    player-store.ts
    theme-store.ts
    video-metadata-store.ts
  types/
    video.ts
tests/
  e2e/
    player-gestures.spec.ts
playwright.config.ts
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Run dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

### 3. Lint and build

```bash
npm run lint
npm run build
```

### 4. Run E2E tests

```bash
npm run test:e2e
```

Headed mode:

```bash
npm run test:e2e:headed
```

## Environment Variables

Optional: enable real YouTube metadata sync.

Create `.env.local`:

```bash
YOUTUBE_DATA_API_KEY=your_key_here
```

Without this key, feed durations fall back to local seed values and runtime duration capture.

## Deployment (Vercel)

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

### Option B: Vercel Dashboard

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Import the project in Vercel.
3. Keep framework preset as `Next.js`.
4. Deploy.
5. Add `YOUTUBE_DATA_API_KEY` in Vercel Project Settings if needed.

## Demo Script (For Evaluators)

1. Open home feed and switch categories.
2. Tap a card to show feed-to-player transition.
3. Use custom controls (play/pause, +/-10s, seek).
4. Open related list and switch to another video.
5. Drag down to minimize, browse feed, restore player.
6. Wait for video end and show autoplay-next countdown with cancel.
7. Toggle PiP and theme mode.
8. On desktop, show split player with persistent related sidebar.

## Submission Checklist

- [ ] Public GitHub repository link
- [ ] Live deployed URL
- [x] README with setup, architecture, and feature list
- [ ] Optional short demo video (recommended)

## Notes

- Browser autoplay and YouTube embed policies can differ between browsers.
- PiP support for YouTube embeds depends on browser/provider capabilities.
- This project emphasizes interaction quality, animation smoothness, and state architecture.
