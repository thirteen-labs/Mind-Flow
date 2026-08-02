import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JournalService } from '@/services/journal-service';

type TabType = 'all' | 'drafts' | 'published' | 'ideas';

interface Document {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'idea';
  wordCount: number;
  date: string;
}

function getStatusColor(status: string, theme: any): string {
  switch (status) {
    case 'draft': return theme.warning;
    case 'published': return theme.success;
    case 'idea': return theme.tint;
    default: return theme.textMuted;
  }
}

export default function WriterScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await JournalService.getRecentJournals(db, 50);
      const docs: Document[] = entries.map(entry => ({
        id: entry.id,
        title: entry.content.split('\n')[0] || 'Untitled',
        content: entry.content,
        status: 'draft' as const,
        wordCount: entry.word_count,
        date: entry.date,
      }));
      
      let filteredDocs = docs;
      if (activeTab === 'drafts') {
        filteredDocs = docs.filter(d => d.status === 'draft');
      } else if (activeTab === 'published') {
        filteredDocs = docs.filter(d => d.status === 'published');
      } else if (activeTab === 'ideas') {
        filteredDocs = docs.filter(d => d.status === 'idea');
      }
      
      setDocuments(filteredDocs);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [db, activeTab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [activeTab, loadDocuments]);

  const renderDocument = useCallback(({ item, index }: { item: Document; index: number }) => {
    const date = new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/reading?date=${item.date}`);
          }}
          style={[styles.documentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.documentHeader}>
            <ThemedText type="default" numberOfLines={1} style={styles.documentTitle}>
              {item.title}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status, theme) }]}>
              <ThemedText type="small" style={styles.statusText}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" themeColor="textMuted">
            {date} · {item.wordCount} words
          </ThemedText>
        </Pressable>
      </Animated.View>
    );
  }, [theme]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'drafts', label: 'Drafts' },
    { key: 'published', label: 'Published' },
    { key: 'ideas', label: 'Ideas' },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify()}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Writer</ThemedText>
        </ThemedView>
      </Animated.View>

      {/* Tabs */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
              style={[
                styles.tab,
                activeTab === tab.key && { backgroundColor: theme.primary },
              ]}
            >
              <ThemedText
                type="small"
                style={[
                  styles.tabText,
                  activeTab === tab.key && { color: '#FFFFFF' },
                ]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Documents List */}
      {loading ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.textMuted} />
        </ThemedView>
      ) : (
        <FlatList
          data={documents}
          renderItem={renderDocument}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.documentsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyState}>
              <SymbolView name="doc.text" size={48} tintColor={theme.textMuted} />
              <ThemedText type="default" themeColor="textSecondary">
                No documents yet
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                Tap the + button to create one
              </ThemedText>
            </Animated.View>
          }
        />
      )}

      {/* FAB */}
      <Animated.View entering={FadeInRight.delay(300).springify()}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/reading');
          }}
          style={[styles.fab, { backgroundColor: theme.primary }]}
        >
          <SymbolView name="plus" size={24} tintColor="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.four,
    padding: Spacing.one,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  tabText: {
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentsList: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  documentCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.two,
    gap: Spacing.two,
    borderCurve: 'continuous',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentTitle: {
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.two,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderCurve: 'continuous',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
});
