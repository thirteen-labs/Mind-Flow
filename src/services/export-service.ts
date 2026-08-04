import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { JournalEntry } from '@/services/journal-service';

export type ExportFormat = 'markdown' | 'html' | 'json' | 'pdf';

interface ExportOptions {
  entries: JournalEntry[];
  format: ExportFormat;
  filename?: string;
  themeColors?: {
    background: string;
    text: string;
    primary: string;
    fontFamily: string;
  };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownToHtml(md: string): string {
  let html = escapeHtml(md);
  // code blocks
  html = html.replace(/&lt;pre&gt;&lt;code&gt;([\s\S]*?)&lt;\/code&gt;&lt;\/pre&gt;/g, '<pre><code>$1</code></pre>');
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  // hr
  html = html.replace(/^---$/gm, '<hr>');
  // headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  // inline
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  // wrap paragraphs
  const lines = html.split('\n');
  const result: string[] = [];
  let inPre = false;
  for (const line of lines) {
    if (line.startsWith('<pre>')) { inPre = true; result.push(line); continue; }
    if (inPre) { result.push(line); if (line.startsWith('</pre>')) inPre = false; continue; }
    if (/^<h[1-6]/.test(line) || /^<hr/.test(line) || /^<img/.test(line) || /^<ul/.test(line) || /^<ol/.test(line) || /^<li/.test(line)) {
      result.push(line);
    } else if (/^<\/[ou]l>/.test(line)) {
      result.push(line);
    } else if (/^\- /.test(line) || /^\d+\. /.test(line)) {
      result.push(line);
    } else if (/^<blockquote/.test(line)) {
      result.push(line);
    } else if (line.trim()) {
      result.push(`<p>${line}</p>`);
    } else {
      result.push(line);
    }
  }
  return result.join('\n');
}

function buildHtmlDocument(
  entries: JournalEntry[],
  colors?: { background: string; text: string; primary: string; fontFamily: string }
): string {
  const bg = colors?.background ?? '#FFFFFF';
  const text = colors?.text ?? '#000000';
  const primary = colors?.primary ?? '#208AEF';
  const font = colors?.fontFamily ?? 'Inter';

  const entryHtml = entries.map((entry) => {
    const date = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const heading = entry.title || date;
    return `
      <article>
        <header>
          <h2>${heading}</h2>
          <span class="meta">${date} · ${entry.word_count} words</span>
        </header>
        <div class="content">${markdownToHtml(entry.content)}</div>
      </article>
    `;
  }).join('\n<hr class="entry-sep">\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MindFlow Journal Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${font}, -apple-system, sans-serif;
      background: ${bg};
      color: ${text};
      line-height: 1.6;
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    h1 { font-size: 24px; margin: 24px 0 8px; }
    h2 { font-size: 21px; margin: 20px 0 4px; color: ${primary}; }
    h3 { font-size: 19px; margin: 16px 0 4px; }
    article { margin-bottom: 32px; }
    article header { margin-bottom: 12px; }
    .meta { color: #888; font-size: 14px; }
    .content { margin-top: 8px; }
    .content p { margin-bottom: 12px; }
    .content pre {
      background: #f5f5f5; padding: 16px; border-radius: 8px;
      overflow-x: auto; font-size: 14px; margin: 12px 0;
    }
    .content code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
    .content pre code { background: none; padding: 0; }
    .content blockquote {
      border-left: 3px solid ${primary};
      padding: 8px 16px;
      margin: 12px 0;
      color: #666;
      background: ${bg === '#FFFFFF' ? '#f9f9f9' : '#111'};
      border-radius: 0 4px 4px 0;
    }
    .content img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
    .content a { color: ${primary}; }
    .content ul, .content ol { padding-left: 24px; margin: 8px 0; }
    .content li { margin-bottom: 4px; }
    hr.entry-sep { border: none; border-top: 1px solid #ddd; margin: 32px 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
  </style>
</head>
<body>
  <h1>MindFlow Journal</h1>
  <p class="meta">Exported on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  ${entryHtml}
</body>
</html>`;
}

function buildJsonExport(entries: JournalEntry[]): string {
  return JSON.stringify(
    {
      app: 'MindFlow',
      exportedAt: new Date().toISOString(),
      totalEntries: entries.length,
      entries: entries.map((e) => ({
        date: e.date,
        title: e.title,
        wordCount: e.word_count,
        content: e.content,
        mood: e.mood,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      })),
    },
    null,
    2
  );
}

export const ExportService = {
  async export({ entries, format, filename, themeColors }: ExportOptions): Promise<string> {
    if (!entries.length) throw new Error('No entries to export');

    const baseName = sanitizeFilename(filename ?? 'mindflow_export');
    let content: string;
    let extension: string;
    let mimeType: string;

    switch (format) {
      case 'markdown': {
        extension = 'md';
        mimeType = 'text/markdown';
        content = entries
          .map((e) => {
            const date = new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            });
            return `# ${e.title || date}\n\n${e.content}\n\n---\n*${e.word_count} words · ${date}*\n`;
          })
          .join('\n\n');
        break;
      }
      case 'html': {
        extension = 'html';
        mimeType = 'text/html';
        content = buildHtmlDocument(entries, themeColors);
        break;
      }
      case 'json': {
        extension = 'json';
        mimeType = 'application/json';
        content = buildJsonExport(entries);
        break;
      }
      case 'pdf': {
        extension = 'pdf';
        mimeType = 'application/pdf';
        const html = buildHtmlDocument(entries, themeColors);
        const { uri } = await Print.printToFileAsync({ html });
        // printToFileAsync returns a URI, we can share it directly
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType, UTI: 'com.adobe.pdf' });
        }
        return uri;
      }
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const file = new File(Paths.cache, `${baseName}.${extension}`);
    file.write(content);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType });
    }

    return file.uri;
  },

  async exportMultipleFormats(entries: JournalEntry[], formats: ExportFormat[], themeColors?: ExportOptions['themeColors']): Promise<string[]> {
    return Promise.all(
      formats.map((format) =>
        ExportService.export({ entries, format, themeColors })
      )
    );
  },
};
