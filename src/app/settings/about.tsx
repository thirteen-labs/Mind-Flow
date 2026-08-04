import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { IconChevronLeft, IconArrowUpRight, IconWorld, IconMail, IconLock, IconFileText } from '@tabler/icons-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <ThemedText type="default" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="default">{value}</ThemedText>
    </View>
  );
}

function LinkRow({ icon: Icon, label, url }: { icon: React.ComponentType<{ size: number; color: string }>; label: string; url: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={[styles.linkRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
    >
      <Icon size={18} color={theme.text} />
      <ThemedText type="default">{label}</ThemedText>
      <IconArrowUpRight size={14} color={theme.textMuted} />
    </Pressable>
  );
}

export default function AboutScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={{ flex: 1, paddingTop: 6 }}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <IconChevronLeft size={18} color={theme.text} />
        </Pressable>
        <ThemedText type="title">About</ThemedText>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <ThemedText type="subtitle" style={styles.appName}>MindFlow</ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.tagline}>
            Write. Connect. Grow.
          </ThemedText>
        </View>

        <ThemedText type="small" themeColor="textMuted" style={styles.description}>
          MindFlow is a digital thinking environment that combines journaling, note-taking, knowledge
          management, and visual planning into a single offline-first experience.
        </ThemedText>

        <ThemedView style={[styles.infoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Released" value="2026" />
          <InfoRow label="Platform" value="iOS, Android, Web" />
          <InfoRow label="Data" value="Stored locally on device" />
          <InfoRow label="Engines" value="Expo SDK 56, React Native" />
        </ThemedView>

        <View style={styles.links}>
          <LinkRow icon={IconWorld} label="Website" url="https://mindflow.app" />
          <LinkRow icon={IconMail} label="Support" url="mailto:support@mindflow.app" />
          <LinkRow icon={IconLock} label="Privacy Policy" url="https://mindflow.app/privacy" />
          <LinkRow icon={IconFileText} label="Terms of Service" url="https://mindflow.app/terms" />
        </View>

        <ThemedText type="small" themeColor="textMuted" style={styles.footer}>
          Made with care. No account required. Your data stays yours.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.five,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.four,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
  },
  tagline: {
    letterSpacing: 2,
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.two,
  },
  infoCard: {
    width: '100%',
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  links: {
    width: '100%',
    gap: Spacing.two,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  footer: {
    textAlign: 'center',
    paddingTop: Spacing.three,
  },
});
