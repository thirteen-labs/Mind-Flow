import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SegmentItem {
  key: string;
  label: string;
}

interface SegmentedProps {
  items: SegmentItem[];
  activeKey: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Segmented control with a spring-animated indicator.
 *
 * This is the pattern that replaced the floating bottom tab bar: the same
 * "sliding pill" affordance, relocated into the top bar so the bottom of the
 * screen stays clear for the editor's formatting strip.
 */
export function Segmented({ items, activeKey, onChange, style, accessibilityLabel }: SegmentedProps) {
  const theme = useTheme();
  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.key === activeKey)
  );

  const progress = useSharedValue(activeIndex);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    progress.value = withSpring(activeIndex, { damping: 18, stiffness: 220 });
  }, [activeIndex, progress]);

  const segmentWidth = trackWidth > 0 ? (trackWidth - 4) / items.length : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * segmentWidth }],
    width: segmentWidth,
  }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={[
        styles.track,
        { backgroundColor: withAlpha(theme.text, theme.isDark ? 0.08 : 0.06) },
        style,
      ]}
    >
      {segmentWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            indicatorStyle,
            { backgroundColor: theme.isDark ? withAlpha(theme.primary, 0.22) : withAlpha(theme.primary, 0.14) },
          ]}
        />
      )}
      {items.map((item, index) => {
        const active = index === activeIndex;
        return (
          <Segment
            key={item.key}
            item={item}
            active={active}
            onPress={() => {
              if (!active) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }
              onChange(item.key);
            }}
          />
        );
      })}
    </View>
  );
}

function Segment({
  item,
  active,
  onPress,
}: {
  item: SegmentItem;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 160 });
  }, [active, progress]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: 0.65 + progress.value * 0.35,
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      accessibilityHint={`Switch to ${item.label}`}
      style={({ pressed }) => [styles.segment, pressed && { opacity: 0.7 }]}
    >
      <Animated.View style={textStyle}>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: active ? theme.text : theme.textSecondary,
              fontWeight: active ? '700' : '500',
            },
          ]}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: 999,
    minHeight: 44,
  },
  indicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 999,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 14,
    letterSpacing: -0.1,
  },
});