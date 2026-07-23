# Component Tree & Design System

## Design Tokens

All tokens derive from the active theme and are provided via React context.

- `colors.background`, `colors.text`, `colors.primary`, `colors.secondary`, `colors.muted`, `colors.border`, `colors.card`, `colors.notification`
- `spacing.xs` (4), `spacing.sm` (8), `spacing.md` (16), `spacing.lg` (24), `spacing.xl` (32)
- `typography.fontFamily`, `typography.heading`, `typography.body`, `typography.caption`
- `radius.sm`, `radius.md`, `radius.lg`, `radius.full`

## Core Components (existing)

| Component | File | Description |
|-----------|------|-------------|
| ThemedText | `src/components/themed-text.tsx` | Text with theme-aware colors |
| ThemedView | `src/components/themed-view.tsx` | View with theme-aware background |
| AnimatedIcon | `src/components/animated-icon.tsx` | Animated icon component |
| AppTabs | `src/components/app-tabs.tsx` | Tab navigation |
| ExternalLink | `src/components/external-link.tsx` | Opens URLs externally |
| HintRow | `src/components/hint-row.tsx` | Hint/info row |
| WebBadge | `src/components/web-badge.tsx` | Web-only badge |

## Components to Build (v1.0)

### Writer Screen
- `JournalEditor` — Rich text / markdown editor
- `JournalSection` — Section block (Morning, Afternoon, etc.)
- `InsertMenu` — Floating action button menu
- `EditorToolbar` — Formatting toolbar

### Planner Screen
- `InfiniteCanvas` — Skia-based infinite canvas
- `PlannerNode` — Individual node on canvas
- `ConnectionLine` — Edge between nodes
- `CanvasToolbar` — Drawing/selection toolbar
- `NodeEditor` — Inline node editing

### Search Screen
- `SearchBar` — Search input with autocomplete
- `SearchResults` — Results list with filters
- `FilterChips` — Filter pill buttons

### Calendar Screen
- `MonthView` — Calendar grid
- `DayCell` — Individual day with heatmap
- `DayPreview` — Quick preview on tap

### Library Screen
- `MediaGrid` — Grid of media items
- `MediaItem` — Single media thumbnail
- `LibraryFilters` — Type filters

### Settings Screen
- `SettingsRow` — Single setting item
- `ThemePreview` — Theme color preview
- `FontPicker` — Font selection

### Shared / UI
- `Card` — Universal card component
- `MoodPicker` — Mood selection
- `TagChip` — Tag display
- `StreakIndicator` — Writing streak
- `EmptyState` — Empty state placeholder
- `ModalSheet` — Bottom sheet modal
- `Toast` — Toast notification

## Screens (Route Components)

- `WriterScreen` — wraps JournalEditor
- `PlannerScreen` — wraps InfiniteCanvas
- `SearchScreen` — wraps SearchBar + SearchResults
- `CalendarScreen` — wraps MonthView
- `LibraryScreen` — wraps MediaGrid
- `SettingsScreen` — wraps Settings rows
- `ExportScreen` — export options
- `EntryDetailScreen` — full journal entry view
