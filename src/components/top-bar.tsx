import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import {
  IconFeather,
  IconMenu2,
  IconPlus,
  IconSearch,
  IconSettings2,
} from '@tabler/icons-react-native';

import { IconButton } from '@/components/ui/icon-button';
import { GlassView } from '@/components/ui/glass-view';
import { Segmented } from '@/components/ui/segmented';
import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PRIMARY_DESTINATIONS, activeDestinationKey } from '@/navigation/destinations';
import { toggleSidebar } from '@/store/sidebar';

/**
 * App chrome for the three primary destinations.
 *
 * The floating bottom tab bar used to live here. It is gone: navigation now
 * happens in the top bar via a segmented switcher, and secondary screens live
 * in the sidebar's "Go to" section. That frees the bottom of the screen for
 * the editor formatting strip and keeps thumb reach out of the equation.
 *
 * The bar renders as a glass material (native Liquid Glass on iOS 26+, blur
 * elsewhere, tinted translucency on web) with a hairline separator, per the
 * ECC liquid-glass direction: glass on interactive chrome only, never nested.
 */
export default function TopBar() {
  const theme = useTheme();
  const pathname = usePathname();

  const segments = useMemo(
    () => PRIMARY_DESTINATIONS.map((d) => ({ key: d.key, label: d.shortLabel })),
    []
  );

  const activeKey = activeDestinationKey(pathname) ?? PRIMARY_DESTINATIONS[0].key;

  const handleSegmentChange = (key: string) => {
    const dest = PRIMARY_DESTINATIONS.find((d) => d.key === key);
    if (!dest) return;
    router.navigate(dest.href as never);
  };

  return (
    <GlassView
      tier="regular"
      intensity={70}
      bordered={false}
      style={[
        styles.container,
        {
          // Only the fallback tiers paint a fill; native glass supplies its own.
          backgroundColor: theme.isDark
            ? withAlpha(theme.background, 0.78)
            : withAlpha(theme.background, 0.9),
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View style={styles.row}>
        <IconButton
          onPress={toggleSidebar}
          accessibilityLabel="Open navigation sidebar"
          accessibilityHint="Shows notes, destinations, and quick actions"
        >
          <IconMenu2 size={21} color={theme.text} />
        </IconButton>

        <Pressable
          onPress={() => router.navigate('/(tabs)/home' as never)}
          accessibilityRole="button"
          accessibilityLabel="MindFlow home"
          hitSlop={8}
          style={({ pressed }) => [styles.brand, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.logo, { backgroundColor: withAlpha(theme.primary, 0.14) }]}>
            <IconFeather size={15} color={theme.primary} strokeWidth={2.4} />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.appName, { color: theme.text, fontFamily: theme.fontFamily }]}
          >
            Mind<Text style={{ color: theme.primary }}>Flow</Text>
          </Text>
        </Pressable>

        <View style={styles.spacer} />

        <IconButton
          onPress={() => router.navigate('/(tabs)/writer' as never)}
          accessibilityLabel="New note"
          accessibilityHint="Opens the writer"
          prominent
          size={38}
          style={styles.newButton}
        >
          <IconPlus size={20} color="#FFFFFF" />
        </IconButton>

        <IconButton
          onPress={() => router.navigate('/search' as never)}
          accessibilityLabel="Search notes"
          accessibilityHint="Search across all notes"
        >
          <IconSearch size={20} color={theme.text} />
        </IconButton>

        <IconButton
          onPress={() => router.navigate('/settings' as never)}
          accessibilityLabel="Settings"
          accessibilityHint="Opens app settings"
        >
          <IconSettings2 size={20} color={theme.text} />
        </IconButton>
      </View>

      <Segmented
        items={segments}
        activeKey={activeKey}
        onChange={handleSegmentChange}
        style={styles.segmented}
        accessibilityLabel="Main sections"
      />
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginLeft: Spacing.one,
    minHeight: 44,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  spacer: {
    flex: 1,
  },
  newButton: {
    marginRight: Spacing.one,
  },
  segmented: {
    marginHorizontal: Spacing.one,
  },
});