# Expo SDK 56 Rules

Always consult https://docs.expo.dev/versions/v56.0.0/ before writing code.

## Key Differences in SDK 56

- `expo-sqlite` uses synchronous API with `useSQLiteContext` hook
- `expo-router` uses `Stack`, `Tabs` from `expo-router` directly
- `@expo/ui` requires `Host` component as root
- Typed routes via `experiments.typedRoutes: true`
- React Compiler enabled via `experiments.reactCompiler: true`

## Import Conventions

```typescript
// Expo Router
import { Link, router, Stack, Tabs } from 'expo-router';

// SQLite
import { useSQLiteContext } from 'expo-sqlite';

// Theme
import { useTheme } from '@/hooks/use-theme';

// Components
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
```

## File Naming

- Screens: `kebab-case.tsx` (route files)
- Components: `kebab-case.tsx`
- Hooks: `use-kebab-case.ts`
- Services: `kebab-service.ts`
- Constants: `kebab-case.ts`
