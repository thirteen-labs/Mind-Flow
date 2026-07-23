# Routes & Navigation

## Route Structure (Expo Router)

```
app/
├── _layout.tsx          # Root layout (navigation container)
├── index.tsx            # Home redirect or today's journal
├── (tabs)/
│   ├── _layout.tsx      # Bottom tab navigator
│   ├── writer.tsx       # Writer screen
│   ├── planner.tsx      # Planner screen
│   ├── search.tsx       # Search screen
│   └── me.tsx           # Profile / Settings hub
├── calendar/
│   └── [date].tsx       # Calendar day view
├── library/
│   └── index.tsx        # Library / assets browser
├── settings/
│   ├── index.tsx        # Settings main
│   ├── themes.tsx       # Theme picker
│   ├── fonts.tsx        # Font settings
│   ├── backup.tsx       # Backup & sync
│   └── about.tsx        # About screen
├── export/
│   └── index.tsx        # Export options
└── entry/
    └── [id].tsx         # Journal entry detail
```

## Navigation Types

- **Bottom Tabs**: Writer, Planner, Search, Me (primary navigation)
- **Stack**: Modal screens, settings, entry detail
- **Drawer** (future): Optional left drawer for power users

## Deep Links

Scheme: `mindflow://`

```
mindflow://writer
mindflow://planner
mindflow://calendar/2026-07-22
mindflow://entry/{id}
mindflow://search?q={query}
```
