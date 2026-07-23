# Code Review Checklist

Before accepting any code changes, verify:

## Correctness
- [ ] Compiles without TypeScript errors
- [ ] No lint warnings
- [ ] Follows existing patterns in the codebase
- [ ] Handles loading, empty, and error states

## Expo / React Native
- [ ] No React Native Web imports that break native
- [ ] Platform-specific files use `.native.tsx` / `.web.tsx` convention
- [ ] No inline styles — uses theme tokens
- [ ] Avoids unnecessary re-renders (useMemo, useCallback where appropriate)
- [ ] SQLite queries are parameterized (no string interpolation)

## Styling
- [ ] Uses ThemedText / ThemedView instead of base RN components
- [ ] Follows spacing and radius tokens from theme
- [ ] Responsive layout works on phone and tablet

## Performance
- [ ] FlatList for long lists, not ScrollView
- [ ] Images use expo-image with blurhash placeholders
- [ ] Debounced saves / searches
