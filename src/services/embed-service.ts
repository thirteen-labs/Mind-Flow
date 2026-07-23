import type { SQLiteDatabase } from 'expo-sqlite';

export type EmbedType = 'youtube' | 'spotify' | 'github' | 'link';

export interface EmbedData {
  url: string;
  type: EmbedType;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
  html: string | null;
  cached_at: string;
}

export interface EmbedResult {
  embed: EmbedData | null;
  type: EmbedType;
  loading: boolean;
}

const DOMAIN_PATTERNS: Record<string, EmbedType> = {
  'youtube.com': 'youtube',
  'www.youtube.com': 'youtube',
  'm.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'spotify.com': 'spotify',
  'open.spotify.com': 'spotify',
  'github.com': 'github',
  'www.github.com': 'github',
};

function detectType(url: string): EmbedType {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    for (const [pattern, type] of Object.entries(DOMAIN_PATTERNS)) {
      const p = pattern.replace(/^www\./, '');
      if (host === p || host.endsWith('.' + p)) return type;
    }
  } catch { /* invalid url */ }
  return 'link';
}

function oEmbedUrl(url: string): string | null {
  const encoded = encodeURIComponent(url);
  const type = detectType(url);
  switch (type) {
    case 'youtube':
      return `https://www.youtube.com/oembed?url=${encoded}&format=json`;
    case 'spotify':
      return `https://open.spotify.com/oembed?url=${encoded}&format=json`;
    default:
      return null;
  }
}

function domainName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function fetchOEmbed(url: string): Promise<Partial<EmbedData>> {
  const endpoint = oEmbedUrl(url);
  if (!endpoint) return {};

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    const data = await res.json();
    return {
      title: data.title ?? null,
      description: data.description ?? null,
      thumbnail_url: data.thumbnail_url ?? data.thumbnail ?? null,
      author_name: data.author_name ?? null,
      html: data.html ?? null,
    };
  } catch {
    return {};
  }
}

function nowISO(): string {
  return new Date().toISOString();
}

export const EmbedService = {
  detectType,

  async getOrFetch(db: SQLiteDatabase, url: string): Promise<EmbedData> {
    const cached = await db.getFirstAsync<EmbedData>(
      'SELECT * FROM embeds WHERE url = ?',
      url
    );

    const type = detectType(url);

    if (cached) {
      const age = Date.now() - new Date(cached.cached_at).getTime();
      if (age < 86400000) return cached;
      const fresh = await fetchOEmbed(url);
      const updated: EmbedData = {
        url,
        type: fresh.html ? type : 'link',
        title: fresh.title ?? cached.title ?? domainName(url),
        description: fresh.description ?? cached.description ?? null,
        thumbnail_url: fresh.thumbnail_url ?? cached.thumbnail_url ?? null,
        author_name: fresh.author_name ?? cached.author_name ?? null,
        html: fresh.html ?? cached.html ?? null,
        cached_at: nowISO(),
      };
      await db.runAsync(
        'UPDATE embeds SET type=?, title=?, description=?, thumbnail_url=?, author_name=?, html=?, cached_at=? WHERE url=?',
        updated.type, updated.title, updated.description, updated.thumbnail_url,
        updated.author_name, updated.html, updated.cached_at, url
      );
      return updated;
    }

    const meta = await fetchOEmbed(url);
    const embed: EmbedData = {
      url,
      type: meta.html ? type : 'link',
      title: meta.title ?? domainName(url),
      description: meta.description ?? null,
      thumbnail_url: meta.thumbnail_url ?? null,
      author_name: meta.author_name ?? null,
      html: meta.html ?? null,
      cached_at: nowISO(),
    };

    await db.runAsync(
      'INSERT OR REPLACE INTO embeds (url, type, title, description, thumbnail_url, author_name, html, cached_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      embed.url, embed.type, embed.title, embed.description, embed.thumbnail_url,
      embed.author_name, embed.html, embed.cached_at
    );

    return embed;
  },
};

export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"']+(?:\/|\b)/gi;
  return [...new Set(text.match(urlRegex) ?? [])];
}
