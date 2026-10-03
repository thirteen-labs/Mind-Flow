import { Pressable, StyleSheet } from 'react-native';
import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { PRIMARY_DESTINATIONS } from '@/navigation/destinations';

const segments = PRIMARY_DESTINATIONS.map((d) => ({
  key: d.key,
  label: d.shortLabel,
  href: d.href as '/(tabs)/home' | '/(tabs)/writer' | '/(tabs)/library',
}));

/**
 * Web variant of the top-bar switcher.
 *
 * On web there is no safe-area inset and no thumb reach problem, so the same
 * segmented switcher is rendered inline at the top of the document rather
 * than pinned to the bottom of the viewport.
 */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList style={styles.list} aria-label="Main sections">
        <ThemedView type="backgroundElement" style={styles.track}>
          {segments.map((segment) => (
            <TabTrigger key={segment.key} name={segment.key} href={segment.href} asChild>
              <Segment label={segment.label} />
            </TabTrigger>
          ))}
        </ThemedView>
      </TabList>
    </Tabs>
  );
}

/**
 * Receives its navigation from the parent `TabTrigger` via slot props —
 * `onPress` switches the tab and `isFocused` drives the highlight. These
 * must be forwarded to the underlying Pressable; a previous version dropped
 * them and the web tabs did nothing when pressed.
 */
function Segment({ label, isFocused, href, ...props }: TabTriggerSlotProps & { label: string }) {
  void href;
  const active = !!isFocused;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.segment,
        active && { backgroundColor: 'rgba(128, 128, 128, 0.18)' },
        pressed && { opacity: 0.7 },
      ]}
    >
      <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  list: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  track: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 2,
    gap: 2,
    marginHorizontal: 'auto',
  },
  segment: {
    paddingHorizontal: Spacing.three,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
});