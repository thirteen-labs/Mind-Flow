import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { IconChevronLeft, IconFileText, IconBraces, IconCheck, IconShare } from '@tabler/icons-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JournalService, type JournalEntry } from '@/services/journal-service';
import { ExportService, type ExportFormat } from '@/services/export-service';

type DateRange = 'today' | 'week' | 'month' | 'all';

const RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Entries',
};

const FORMAT_OPTIONS: { key: ExportFormat; label: string; icon: React.ComponentType<{ size: number; color: string }>; desc: string }[] = [
  { key: 'markdown', label: 'Markdown', icon: IconFileText, desc: '.md — Raw text with formatting' },
  { key: 'html', label: 'HTML', icon: IconFileText, desc: '.html — Styled web page' },
  { key: 'json', label: 'JSON', icon: IconBraces, desc: '.json — Structured data' },
  { key: 'pdf', label: 'PDF', icon: IconFileText, desc: '.pdf — Print-ready document' },
];

function getDateRange(range: DateRange): { from: string; to: string } | null {
  if (range === 'all') return null;
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let from: Date;

  switch (range) {
    case 'today':
      return { from: to, to };
    case 'week': {
      const dayOfWeek = now.getDay();
      from = new Date(now);
      from.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      break;
    }
    case 'month': {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
  }

  return {
    from: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`,
    to,
  };
}

export default function ExportScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedRange, setSelectedRange] = useState<DateRange>('today');
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(['markdown']);
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const dr = getDateRange(selectedRange);
        let result: JournalEntry[];
        if (dr) {
          result = await JournalService.getJournalsByDateRange(db, dr.from, dr.to);
        } else {
          result = await JournalService.getAllJournals(db);
        }
        if (mounted) {
          setEntries(result.filter((e) => e.content.trim()));
        }
      } catch {
        if (mounted) setEntries([]);
      }
    })();
    return () => { mounted = false; };
  }, [db, selectedRange]);

  const toggleFormat = (format: ExportFormat) => {
    setSelectedFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  const handleExport = async () => {
    if (!entries || !entries.length) {
      Alert.alert('No entries', 'No entries found for the selected range.');
      return;
    }
    if (!selectedFormats.length) {
      Alert.alert('Select format', 'Please select at least one export format.');
      return;
    }

    setExporting(true);
    try {
      for (const format of selectedFormats) {
        await ExportService.export({
          entries,
          format,
          filename: `mindflow_${selectedRange}`,
          themeColors: {
            background: theme.background,
            text: theme.text,
            primary: theme.primary,
            fontFamily: theme.fontFamily,
          },
        });
      }
      Alert.alert('Exported', `Exported ${entries.length} entries in ${selectedFormats.length} format(s).`);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    }
    setExporting(false);
  };

  const range = getDateRange(selectedRange);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerAction}>
          <IconChevronLeft size={20} color={theme.tint} />
          <ThemedText type="default" themeColor="tint">Back</ThemedText>
        </Pressable>
        <ThemedText type="title">Export</ThemedText>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.sectionTitle}>
            Date Range
          </ThemedText>
          <View style={styles.chips}>
            {(Object.keys(RANGE_LABELS) as DateRange[]).map((range) => (
              <Pressable
                key={range}
                onPress={() => setSelectedRange(range)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selectedRange === range ? theme.primary : theme.backgroundElement,
                    borderColor: selectedRange === range ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selectedRange === range ? '#FFFFFF' : theme.text,
                    fontWeight: selectedRange === range ? '600' : '400',
                  }}
                >
                  {RANGE_LABELS[range]}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {range && (
            <ThemedText type="small" themeColor="textMuted" style={styles.rangeDetail}>
              {range.from} – {range.to}
            </ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.sectionTitle}>
            Format
          </ThemedText>
          {FORMAT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => toggleFormat(opt.key)}
              style={[
                styles.formatRow,
                {
                  backgroundColor: selectedFormats.includes(opt.key) ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: selectedFormats.includes(opt.key) ? theme.primary : theme.border,
                },
              ]}
            >
              <View style={styles.formatIcon}>
                <opt.icon size={22} color={selectedFormats.includes(opt.key) ? theme.primary : theme.textMuted} />
              </View>
              <View style={styles.formatInfo}>
                <ThemedText type="default">{opt.label}</ThemedText>
                <ThemedText type="small" themeColor="textMuted">{opt.desc}</ThemedText>
              </View>
              <View style={[
                styles.checkbox,
                {
                  borderColor: selectedFormats.includes(opt.key) ? theme.primary : theme.border,
                  backgroundColor: selectedFormats.includes(opt.key) ? theme.primary : 'transparent',
                },
              ]}>
                {selectedFormats.includes(opt.key) && (
                  <IconCheck size={14} color="#FFFFFF" />
                )}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          {entries === null ? (
            <ActivityIndicator color={theme.textMuted} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.entryCount}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} to export
            </ThemedText>
          )}
        </View>

        <Pressable
          onPress={handleExport}
          disabled={exporting || entries === null || !entries.length}
          style={[
            styles.exportButton,
            {
              backgroundColor: (exporting || entries === null || !entries.length) ? theme.textMuted : theme.primary,
            },
          ]}
        >
          {exporting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <IconShare size={20} color="#FFFFFF" />
              <Text style={styles.exportButtonText}>
                Export{selectedFormats.length > 1 ? ` (${selectedFormats.length} formats)` : ''}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.five,
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  rangeDetail: {
    marginTop: Spacing.half,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  formatIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryCount: {
    textAlign: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.three,
    marginTop: Spacing.three,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
