# Phase 1 Implementation Plan

## Goal

Build the core Writer experience: a working journal with daily entries, markdown editing, persistence to SQLite, and the Midnight theme.

## Scope

- Project scaffolding (Expo Router tabs)
- Theme system (Midnight + Paper Journal)
- SQLite database setup with journals table
- Writer screen with daily entry
- Basic markdown editor (or rich text)
- Entry list / calendar access

## Steps

### Step 1: Navigation Scaffolding
- Set up bottom tab layout: Writer, Planner, Search, Me
- Create placeholder screens for Planner, Search, Me
- Wire up Expo Router with typed routes

### Step 2: Theme System
- Implement ThemeProvider context
- Define Midnight and Paper Journal themes
- Update ThemedText, ThemedView to consume theme
- Add theme switcher in Me/Settings

### Step 3: Database Layer
- Set up expo-sqlite with WASM (for web compatibility)
- Create database initialization with journals table
- Create hooks: `useJournal(date)`, `useJournals()`, `useSaveJournal()`
- Create JournalService (CRUD operations)

### Step 4: Writer Screen UI
- Header: date display, search icon, theme toggle, more menu
- Body: sections (Morning, Afternoon, Evening, etc.)
- Content area: TextInput-based simple editor
- Auto-focus on tap; save on blur
- Word count display

### Step 5: Journal Persistence
- Auto-save on content change (debounced)
- Load journal for today on mount
- Create journal for today if none exists
- Handle offline gracefully

### Step 6: Calendar Access
- Simple month grid in Calendar tab
- Tap a date → navigate to writer for that date
- Highlight days with entries

### Step 7: Polish
- Splash screen alignment
- Loading states
- Empty states
- Basic error handling

## Files to Create

```
src/
├── app/
│   ├── _layout.tsx              # Root layout with ThemeProvider
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Bottom tab navigator
│   │   ├── writer.tsx           # Writer screen
│   │   ├── planner.tsx          # Planner placeholder
│   │   ├── search.tsx           # Search placeholder
│   │   └── me.tsx               # Profile / Settings hub
│   ├── calendar/
│   │   └── index.tsx            # Calendar view
│   └── settings/
│       ├── index.tsx            # Settings
│       └── themes.tsx           # Theme picker
├── components/
│   ├── journal-editor.tsx       # Editor component
│   ├── journal-section.tsx      # Section block
│   ├── theme-picker.tsx         # Theme selector UI
│   └── ...
├── constants/
│   ├── themes.ts                # Theme definitions
│   └── database.ts              # DB init SQL
├── hooks/
│   ├── use-theme.ts             # Theme context hook
│   ├── use-journal.ts           # Journal CRUD hook
│   └── use-database.ts          # DB access hook
└── services/
    └── journal-service.ts       # Journal data access layer
```

## Dependencies (already installed)

- expo-sqlite ✓
- expo-router ✓
- @expo/ui ✓
- react-native-reanimated ✓
- react-native-gesture-handler ✓

## Timeline Estimate

| Step | Effort |
|------|--------|
| 1. Navigation | 30 min |
| 2. Theme system | 45 min |
| 3. Database layer | 45 min |
| 4. Writer screen | 1.5 hr |
| 5. Persistence | 1 hr |
| 6. Calendar | 45 min |
| 7. Polish | 45 min |
| **Total** | **~6 hr** |
