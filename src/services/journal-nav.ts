import { router } from 'expo-router';

export interface JournalNavParams {
  date?: string;
  sketchUri?: string;
}

let pendingParams: JournalNavParams | null = null;

/**
 * Navigates to the writer tab with params that would otherwise be dropped by
 * NativeTabs when navigating from a screen outside the tab navigator.
 */
export function openJournal(params: JournalNavParams = {}) {
  pendingParams = { ...params };
  router.push('/(tabs)/writer');
}

export function consumeJournalParams(): JournalNavParams | null {
  const params = pendingParams;
  pendingParams = null;
  return params;
}
