import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  IconHome,
  IconHomeFilled,
  IconWriting,
  IconWritingFilled,
  IconLayoutGrid,
  IconLayoutGridFilled,
  IconLibrary,
  IconLibraryFilled,
  type Icon,
} from '@tabler/icons-react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TabDef {
  name: string;
  label: string;
  icon: Icon;
  iconActive: Icon;
}

const TABS: TabDef[] = [
  { name: 'home', label: 'Home', icon: IconHome, iconActive: IconHomeFilled },
  { name: 'writer', label: 'Writer', icon: IconWriting, iconActive: IconWritingFilled },
  { name: 'planner', label: 'Planner', icon: IconLayoutGrid, iconActive: IconLayoutGridFilled },
  { name: 'library', label: 'Library', icon: IconLibrary, iconActive: IconLibraryFilled },
];

const PILL_HEIGHT = 60;
const TAB_SIZE = 44;
const INDICATOR_INSET_X = 7;
const INDICATOR_INSET_Y = 8;

interface TabButtonProps {
  tab: TabDef;
  active: boolean;
  onPress: () => void;
  onLayout: (e: any) => void;
}

function TabButton({ tab, active, onPress, onLayout }: TabButtonProps) {
  const theme = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [active, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.82 + progress.value * 0.24 }],
  }));

  const IconComponent = active ? tab.iconActive : tab.icon;

  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
      style={styles.tabButton}
    >
      <Animated.View style={iconStyle}>
        <IconComponent size={22} strokeWidth={2} color={active ? theme.tabActive : theme.tabInactive} />
      </Animated.View>
    </Pressable>
  );
}

export function FloatingTabBar({ state, navigation }: { state: any; navigation: any }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [measures, setMeasures] = useState<Record<string, { x: number; width: number }>>({});
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  const activeKey = state.routes[state.index]?.key;

  useEffect(() => {
    const m = measures[activeKey];
    if (m) {
      indicatorX.value = withSpring(m.x + INDICATOR_INSET_X, { damping: 18, stiffness: 200 });
      indicatorW.value = withSpring(m.width - INDICATOR_INSET_X * 2, { damping: 18, stiffness: 200 });
    }
  }, [activeKey, measures, indicatorX, indicatorW]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.shadowWrap}>
        <BlurView
          tint={theme.isDark ? 'dark' : 'light'}
          intensity={75}
          blurMethod="dimezisBlurViewSdk31Plus"
          style={[styles.pill, { borderColor: theme.border }]}
        >
          <Animated.View
            style={[styles.indicator, indicatorStyle, { backgroundColor: `${theme.primary}22` }]}
          />
          {TABS.map((tab, index) => {
            const isActive = index === state.index;
            const key = state.routes[index]?.key ?? tab.name;
            return (
              <TabButton
                key={tab.name}
                tab={tab}
                active={isActive}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: key,
                    canPreventDefault: true,
                  });
                  if (!event.defaultPrevented) {
                    navigation.navigate(tab.name);
                  }
                }}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  setMeasures((prev) => {
                    const prevM = prev[key];
                    if (prevM && prevM.x === x && prevM.width === width) return prev;
                    return { ...prev, [key]: { x, width } };
                  });
                }}
              />
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  shadowWrap: {
    borderRadius: 999,
    boxShadow: '0 10px 32px rgba(0, 0, 0, 0.25)',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_HEIGHT,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    gap: 2,
  },
  tabButton: {
    width: 52,
    height: TAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: INDICATOR_INSET_Y,
    height: TAB_SIZE - INDICATOR_INSET_Y * 2,
    borderRadius: 999,
  },
});
