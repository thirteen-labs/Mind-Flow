import { useCallback, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';

const { width } = Dimensions.get('window');

const ONBOARDING_FLAG = (() => {
  try {
    return `${documentDirectory}.onboarded`;
  } catch {
    return null;
  }
})();

const pages = [
  {
    id: 'welcome',
    gradient: 'linear-gradient(135deg, #0F0C29, #302B63, #24243E)',
    accent: '#7C5CFC',
    title: 'MindFlow',
    subtitle: 'Write. Connect. Grow.',
    body: 'A digital thinking environment that feels like a premium journal.',
  },
  {
    id: 'write',
    gradient: 'linear-gradient(135deg, #0D1B2A, #1B3A5C, #2E5984)',
    accent: '#4A9EFF',
    title: 'Start Writing',
    subtitle: 'Every day already exists.',
    body: 'Open the app and write. No folders. No setup. Just your thoughts.',
  },
  {
    id: 'grow',
    gradient: 'linear-gradient(135deg, #1A0A1E, #3B1D4A, #5C2D72)',
    accent: '#C084FC',
    title: 'You Are Ready',
    subtitle: 'Your second brain is waiting.',
    body: 'Thoughts become notes. Notes become projects. Projects become knowledge.',
  },
];

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (page < pages.length - 1) {
      const next = page + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setPage(next);
    }
  };

  const completeOnboarding = useCallback(async () => {
    try {
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        'onboarded', '1'
      );
    } catch {
      // db insert failed, fallback to filesystem
    }
    try {
      if (ONBOARDING_FLAG) {
        await writeAsStringAsync(ONBOARDING_FLAG, '1');
      }
    } catch {
      // filesystem write failed, continuing anyway
    }
    router.dismissAll();
    router.replace('/');
  }, [db]);

  const handleSkip = () => {
    completeOnboarding();
  };

  const handleGetStarted = () => {
    completeOnboarding();
  };

  const isLast = page === pages.length - 1;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          setPage(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      >
        {pages.map((p, i) => (
          <View key={p.id} style={{ width }}>
            <View style={[styles.page, { experimental_backgroundImage: p.gradient }]}>
              <Animated.View
                entering={FadeInDown.delay(200).duration(600)}
                style={styles.content}
              >
                {i === 0 && (
                  <View style={[styles.logoCircle, { backgroundColor: p.accent }]}>
                    <Text style={styles.logoText}>M</Text>
                  </View>
                )}

                {i === 1 && (
                  <View style={styles.iconRow}>
                    {['square.and.pencil', 'text.quote', 'doc.text'].map((s) => (
                      <View key={s} style={[styles.iconPill, { backgroundColor: p.accent }]}>
                        <Text style={styles.iconChar}>{s === 'square.and.pencil' ? '✎' : s === 'text.quote' ? '❝' : '¶'}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {i === 2 && (
                  <View style={styles.iconRow}>
                    <View style={[styles.iconPill, { backgroundColor: p.accent }]}>
                      <Text style={styles.iconChar}>✦</Text>
                    </View>
                  </View>
                )}

                <Text style={styles.title}>{p.title}</Text>
                <Text style={styles.subtitle}>{p.subtitle}</Text>
                <Text style={styles.body}>{p.body}</Text>
              </Animated.View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? '#FFFFFF' : 'rgba(255,255,255,0.3)' },
                i === page && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          {!isLast && (
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}

          {isLast ? (
            <Pressable onPress={handleGetStarted} style={styles.startButton}>
              <Text style={styles.startText}>Get Started</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleNext} style={styles.nextButton}>
              <Text style={styles.nextText}>Next</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  iconPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconChar: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 24,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 24,
  },
  startText: {
    color: '#1A0A1E',
    fontSize: 16,
    fontWeight: '600',
  },
});
