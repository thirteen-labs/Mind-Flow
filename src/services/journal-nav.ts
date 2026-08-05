import { router } from 'expo-router';

import { type JournalEntryType } from '@/services/journal-service';

export type { JournalEntryType };

export type WriterMode = JournalEntryType | 'template';

export interface JournalNavParams {
  entryId?: string;
  templateId?: string;
  date?: string;
  type?: WriterMode;
  sketchUri?: string;
  content?: string;
  requestId?: string;
}

let pendingParams: JournalNavParams | null = null;

/**
 * Navigates to the writer tab with params that would otherwise be dropped by
 * NativeTabs when navigating from a screen outside the tab navigator.
 * Each call generates a fresh requestId so the writer resets to a clean
 * instance even if it is already mounted.
 */
export function openJournal(params: JournalNavParams = {}) {
  pendingParams = {
    ...params,
    requestId: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };
  router.push('/(tabs)/writer');
}

export function consumeJournalParams(): JournalNavParams | null {
  const params = pendingParams;
  pendingParams = null;
  return params;
}
