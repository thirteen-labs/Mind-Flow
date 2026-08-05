import { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
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
const INDICATOR_INSET_X = 6;
const INDICATOR_INSET_Y = 8;
const PILL_PADDING_X = 8;
const PILL_WIDTH_RATIO = 0.96;

interface TabButtonProps {
  tab: TabDef;
  active: boolean;
  onPress: () => void;
}

function TabButton({ tab, active, onPress }: TabButtonProps) {
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
  const { width: windowWidth } = useWindowDimensions();

  const pillWidth = windowWidth * PILL_WIDTH_RATIO;
  const tabWidth = (pillWidth - PILL_PADDING_X * 2) / TABS.length;

  const indicatorX = useSharedValue(PILL_PADDING_X + INDICATOR_INSET_X);
  const indicatorW = useSharedValue(tabWidth - INDICATOR_INSET_X * 2);

  useEffect(() => {
    indicatorX.value = withSpring(PILL_PADDING_X + tabWidth * state.index + INDICATOR_INSET_X, {
      damping: 18,
      stiffness: 200,
    });
    indicatorW.value = withSpring(tabWidth - INDICATOR_INSET_X * 2, { damping: 18, stiffness: 200 });
  }, [state.index, tabWidth, indicatorX, indicatorW]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: indicatorX.value,
    width: indicatorW.value,
  }));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.shadowWrap}>
        <BlurView
          tint={theme.isDark ? 'dark' : 'light'}
          intensity={75}
          blurMethod="dimezisBlurViewSdk31Plus"
          style={[styles.pill, { width: pillWidth, borderColor: theme.border }]}
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
    paddingHorizontal: PILL_PADDING_X,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    height: TAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: INDICATOR_INSET_Y,
    height: TAB_SIZE - INDICATOR_INSET_Y * 2,
    borderRadius: 999,
  },
});
