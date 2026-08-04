import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  IconCalendar,
  IconCalendarFilled,
  IconFeather,
  IconSearch,
  IconSearchFilled,
  IconSettings2,
  IconSettingsFilled,
  type Icon,
} from '@tabler/icons-react-native';

import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function withAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface TopBarButtonProps {
  active: boolean;
  icon: Icon;
  iconActive: Icon;
  label: string;
  onPress: () => void;
}

function TopBarButton({ active, icon: Icon, iconActive: IconActive, label, onPress }: TopBarButtonProps) {
  const theme = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 15, stiffness: 240 });
  }, [active, progress]);

  const activeBg = withAlpha(theme.primary, 0.14);
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['rgba(0, 0, 0, 0)', activeBg]),
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.9 + progress.value * 0.14 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={styles.iconButton}
    >
      <Animated.View style={[styles.iconBg, bgStyle]}>
        <Animated.View style={iconStyle}>
          <View style={styles.iconStack}>
            <Icon size={20} color={theme.textMuted} />
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
              <IconActive size={20} color={theme.tint} />
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function TopBar() {
  const theme = useTheme();
  const pathname = usePathname();

  const isCalendar = pathname.includes('calendar');
  const isSearch = pathname.includes('search');
  const isSettings = pathname.includes('settings');

  return (
    <ThemedView
      type="surface"
      style={[styles.container, { borderColor: theme.border }]}
    >
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: withAlpha(theme.primary, 0.14) }]}>
          <IconFeather size={16} color={theme.primary} strokeWidth={2.4} />
        </View>
        <Text style={[styles.appName, { color: theme.text, fontFamily: theme.fontFamily }]}>
          Mind
          <Text style={{ color: theme.primary }}>Flow</Text>
        </Text>
      </View>

      <View style={styles.actions}>
        <TopBarButton
          active={isCalendar}
          icon={IconCalendar}
          iconActive={IconCalendarFilled}
          label="Calendar"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/calendar');
          }}
        />
        <TopBarButton
          active={isSearch}
          icon={IconSearch}
          iconActive={IconSearchFilled}
          label="Search"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/search');
          }}
        />
        <TopBarButton
          active={isSettings}
          icon={IconSettings2}
          iconActive={IconSettingsFilled}
          label="Settings"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/settings');
          }}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  iconButton: {
    padding: 2,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStack: {
    width: 20,
    height: 20,
  },
});
