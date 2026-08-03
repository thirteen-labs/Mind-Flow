# MindFlow

A beautiful, offline-first journaling app built with Expo. Write freely with markdown, organize thoughts, track insights, and export your entries — all stored locally on your device.

## Features

- **Markdown Editor** — Rich formatting (bold, italic, headings, lists, code blocks, tables, images, links) with undo/redo
- **Daily Journaling** — Auto-saving per-day entries with word count
- **Reading Mode** — Clean typography-focused view for distraction-free reading
- **Full-Text Search** — Fast FTS5-powered search across all entries with snippets
- **Rich Embeds** — Auto-detect YouTube, Spotify, and GitHub URLs and show rich previews
- **Insights & Analytics** — Writing streaks, word count history (7d/30d/90d charts), monthly activity, best writing day
- **Export** — Export entries as Markdown (`.md`), HTML (`.html`), JSON (`.json`), or PDF (`.pdf`) via the system share sheet
- **Daily Reminders** — Configurable morning, evening, and streak notifications
- **8 Themes** — Midnight, Paper Journal, Aurora, Forest, Ocean, Sunset, Cyberpunk, Moonlight
- **Media Library** — Attach and browse images, videos, and audio in your entries
- **Offline-First** — All data stored in SQLite locally; no account or internet required

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Expo](https://expo.dev) SDK 56 |
| Routing | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based) |
| Database | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) with FTS5 |
| Storage | [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) |
| Notifications | [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) |
| Icons | [@tabler/icons-react-native](https://tabler.io/icons) (cross-platform) |
| Fonts | Inter, JetBrains Mono, Playfair Display |
| Export | [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/), [expo-print](https://docs.expo.dev/versions/latest/sdk/print/) |

## Getting Started

```bash
npm install
npx expo start
```

Open in:
- [Expo Go](https://expo.dev/go) (quick preview)
- [iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Android Emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` / `npx expo start` | Start the dev server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking (`tsc --noEmit --skipLibCheck`) |

## Project Structure

```
src/
├── app/                    # Expo Router pages
│   ├── (tabs)/             # Bottom tab screens
│   │   ├── home.tsx        # Dashboard with stats & recent entries
│   │   ├── writer.tsx      # Daily journal editor
│   │   ├── planner.tsx     # Coming soon
│   │   ├── library.tsx     # Media library
│   │   └── settings.tsx    # Theme & notification settings
│   ├── _layout.tsx         # Root layout (SQLite provider, fonts, routing)
│   ├── onboarding.tsx      # First-launch onboarding
│   ├── insights.tsx        # Writing analytics & charts
│   ├── reading.tsx         # Reading mode for entries
│   └── export.tsx          # Export screen
├── components/
│   ├── editor/             # Markdown editor with formatting toolbar
│   ├── markdown-renderer.tsx # Reading-mode markdown renderer
│   ├── embed-card.tsx      # Rich embed preview card
│   ├── embed-list.tsx      # Auto-extract & render embeds
│   ├── insights/           # Charts & stat cards
│   ├── theme-provider.tsx  # Theme context
│   └── ...                 # Shared components
├── constants/
│   ├── theme.ts            # Spacing, fonts, layout constants
│   └── themes.ts           # 8 color themes
├── hooks/
│   ├── use-journal.ts      # Today's journal + stats hooks
│   ├── use-settings.ts     # Settings with notification sync
│   └── use-theme.ts        # Theme context hook
└── services/
    ├── database.ts         # SQLite migrations (journals, FTS5, embeds, settings)
    ├── journal-service.ts  # Journal CRUD, search, stats, insights
    ├── embed-service.ts    # oEmbed fetching & caching
    ├── notification-service.ts # Daily reminder scheduling
    ├── settings-service.ts # Key-value settings store
    ├── export-service.ts   # Markdown/HTML/JSON/PDF export
    └── media-service.ts    # Media import & scanning
```

## Themes

| Theme | Style |
|-------|-------|
| Midnight | Dark, blue accent |
| Paper Journal | Light, warm paper tones |
| Aurora | Dark, purple accent |
| Forest | Dark, green accent |
| Ocean | Light, blue accent |
| Sunset | Light, warm orange accent |
| Cyberpunk | Dark, magenta/cyan accent |
| Moonlight | Dark, monochrome |

## License

MIT
