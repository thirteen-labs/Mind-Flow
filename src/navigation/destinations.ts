import type { Icon } from '@tabler/icons-react-native';
import {
  IconCalendar,
  IconChartHistogram,
  IconHome,
  IconHomeFilled,
  IconLibrary,
  IconLibraryFilled,
  IconStack2,
  IconWriting,
  IconWritingFilled,
} from '@tabler/icons-react-native';

export interface Destination {
  key: string;
  label: string;
  /** Short label for the compact top-bar switcher. */
  shortLabel: string;
  href: string;
  icon: Icon;
  iconActive: Icon;
  /** Grouping in the sidebar. */
  group: 'Write' | 'Reflect';
}

/**
 * Primary tab destinations. These replace the floating bottom bar — they are
 * driven from the top-bar switcher and the sidebar's "Go to" section.
 */
export const PRIMARY_DESTINATIONS: Destination[] = [
  {
    key: 'home',
    label: 'Home',
    shortLabel: 'Home',
    href: '/(tabs)/home',
    icon: IconHome,
    iconActive: IconHomeFilled,
    group: 'Reflect',
  },
  {
    key: 'writer',
    label: 'Writer',
    shortLabel: 'Write',
    href: '/(tabs)/writer',
    icon: IconWriting,
    iconActive: IconWritingFilled,
    group: 'Write',
  },
  {
    key: 'library',
    label: 'Library',
    shortLabel: 'Library',
    href: '/(tabs)/library',
    icon: IconLibrary,
    iconActive: IconLibraryFilled,
    group: 'Reflect',
  },
];

/** Secondary screens reachable from the sidebar. */
export const SECONDARY_DESTINATIONS: Destination[] = [
  {
    key: 'calendar',
    label: 'Journal Calendar',
    shortLabel: 'Calendar',
    href: '/calendar',
    icon: IconCalendar,
    iconActive: IconCalendar,
    group: 'Reflect',
  },
  {
    key: 'insights',
    label: 'Insights',
    shortLabel: 'Insights',
    href: '/insights',
    icon: IconChartHistogram,
    iconActive: IconChartHistogram,
    group: 'Reflect',
  },
  {
    key: 'daily-notes',
    label: 'Daily Notes',
    shortLabel: 'Daily',
    href: '/daily-notes',
    icon: IconCalendar,
    iconActive: IconCalendar,
    group: 'Write',
  },
  {
    key: 'templates',
    label: 'Templates',
    shortLabel: 'Templates',
    href: '/templates',
    icon: IconStack2,
    iconActive: IconStack2,
    group: 'Write',
  },
];

export const ALL_DESTINATIONS = [...PRIMARY_DESTINATIONS, ...SECONDARY_DESTINATIONS];

/**
 * Resolves the active destination from the current pathname.
 *
 * Route groups like `(tabs)` never appear in the visible URL but do appear in
 * `usePathname()` on some platforms, so they are stripped before matching.
 * Matches on the destination key, which is unique across primary and
 * secondary destinations — nested screens like `/calendar/2024-01-01`
 * resolve to their root destination.
 */
export function activeDestinationKey(pathname: string): string | null {
  if (!pathname) return null;

  const segments = pathname
    .split('/')
    .filter(Boolean)
    .filter((s) => !(s.startsWith('(') && s.endsWith(')')));

  const root = segments[0];
  if (!root) return null;

  for (const dest of ALL_DESTINATIONS) {
    if (dest.key === root) return dest.key;
  }

  return null;
}