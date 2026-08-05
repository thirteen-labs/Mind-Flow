import { Linking, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ImageViewer } from '@/components/media/image-viewer';
import { VideoPlayer } from '@/components/media/video-player';
import { AudioPlayer } from '@/components/media/audio-player';

interface MarkdownRendererProps {
  content: string;
}

interface Block {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'codeblock' | 'blockquote' | 'audio_block'
    | 'ul' | 'ol' | 'hr'
    | 'paragraph' | 'empty';
  text: string;
  items?: string[];
  lang?: string;
  audioSrc?: string;
  audioTitle?: string;
}

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // empty line
    if (/^\s*$/.test(line)) {
      blocks.push({ type: 'empty', text: '' });
      i++;
      continue;
    }

    // heading
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      blocks.push({ type: `h${hMatch[1].length}` as Block['type'], text: hMatch[2] });
      i++;
      continue;
    }

    // codeblock
    const cbMatch = line.match(/^(```|~~~)(\w*)/);
    if (cbMatch) {
      const lang = cbMatch[2];
      const closer = cbMatch[1];
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith(closer)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closer
      blocks.push({ type: 'codeblock', text: codeLines.join('\n'), lang });
      continue;
    }

    // hr
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr', text: '' });
      i++;
      continue;
    }

    // blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const quoteText = quoteLines.join('\n');
      // Check if blockquote contains audio
      const audioInQuote = quoteText.match(/<audio\s+src="([^"]+)"[^>]*><\/audio>/);
      if (audioInQuote) {
        const titleMatch = quoteText.match(/^\*\*(.+?)\*\*/);
        blocks.push({
          type: 'audio_block',
          text: quoteText,
          audioSrc: audioInQuote[1],
          audioTitle: titleMatch?.[1] || '',
        });
      } else {
        blocks.push({ type: 'blockquote', text: quoteText });
      }
      continue;
    }

    // unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s/, ''));
        i++;
      }
      blocks.push({ type: 'ul', text: '', items });
      continue;
    }

    // ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ type: 'ol', text: '', items });
      continue;
    }

    // paragraph — collect consecutive non-empty lines
    const paraLines: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) && !/^```/.test(lines[i]) && !/^>/.test(lines[i]) && !/^[-*+]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i]) && !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
  }

  return blocks;
}

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // colored text <span style="color:#xxx">text</span>
    const colorMatch = remaining.match(/^<span\s+style="color:([^"]+)">(.+?)<\/span>/);
    if (colorMatch) {
      nodes.push({ type: 'color', text: colorMatch[2], color: colorMatch[1] });
      remaining = remaining.slice(colorMatch[0].length);
      continue;
    }

    // underline <u>text</u>
    const underlineMatch = remaining.match(/^<u>(.+?)<\/u>/);
    if (underlineMatch) {
      nodes.push({ type: 'underline', text: underlineMatch[1] });
      remaining = remaining.slice(underlineMatch[0].length);
      continue;
    }

    // highlight ==text==
    const highlightMatch = remaining.match(/^==(.+?)==/);
    if (highlightMatch) {
      nodes.push({ type: 'highlight', text: highlightMatch[1] });
      remaining = remaining.slice(highlightMatch[0].length);
      continue;
    }

    // video <video src="..." controls></video>
    const videoMatch = remaining.match(/^<video\s+src="([^"]+)"[^>]*><\/video>/);
    if (videoMatch) {
      nodes.push({ type: 'video', src: videoMatch[1] });
      remaining = remaining.slice(videoMatch[0].length);
      continue;
    }

    // audio <audio src="..." controls></audio>
    const audioMatch = remaining.match(/^<audio\s+src="([^"]+)"[^>]*><\/audio>/);
    if (audioMatch) {
      nodes.push({ type: 'audio', src: audioMatch[1], title: '' });
      remaining = remaining.slice(audioMatch[0].length);
      continue;
    }

    // image ![alt](url)
    const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      nodes.push({ type: 'image', alt: imgMatch[1], url: imgMatch[2] });
      remaining = remaining.slice(imgMatch[0].length);
      continue;
    }

    // link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      nodes.push({ type: 'link', text: linkMatch[1], url: linkMatch[2] });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // bold **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (boldMatch) {
      nodes.push({ type: 'bold', text: boldMatch[2] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // italic *text* or _text_ (but not **)
    const italicMatch = remaining.match(/^(\*|_)(.+?)\1(?![*_])/);
    if (italicMatch) {
      nodes.push({ type: 'italic', text: italicMatch[2] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // strikethrough ~~text~~
    const strikeMatch = remaining.match(/^~~(.+?)~~/);
    if (strikeMatch) {
      nodes.push({ type: 'strikethrough', text: strikeMatch[1] });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push({ type: 'code', text: codeMatch[1] });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // plain text up to next special char
    const nextSpecial = remaining.search(/[\[!*_~`<]/);
    if (nextSpecial === 0) {
      // special char that didn't match anything — consume it
      nodes.push({ type: 'text', text: remaining[0] });
      remaining = remaining.slice(1);
    } else if (nextSpecial > 0) {
      nodes.push({ type: 'text', text: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    } else {
      nodes.push({ type: 'text', text: remaining });
      remaining = '';
    }
  }

  return nodes;
}

type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'underline'; text: string }
  | { type: 'strikethrough'; text: string }
  | { type: 'highlight'; text: string }
  | { type: 'code'; text: string }
  | { type: 'color'; text: string; color: string }
  | { type: 'link'; text: string; url: string }
  | { type: 'image'; alt: string; url: string }
  | { type: 'video'; src: string }
  | { type: 'audio'; src: string; title: string };

function InlineContent({ nodes, theme }: { nodes: InlineNode[]; theme: any }) {
  return (
    <Text>
      {nodes.map((node, i) => {
        switch (node.type) {
          case 'text':
            return <Text key={i}>{node.text}</Text>;
          case 'bold':
            return <Text key={i} style={{ fontWeight: '700' }}>{node.text}</Text>;
          case 'italic':
            return <Text key={i} style={{ fontStyle: 'italic' }}>{node.text}</Text>;
          case 'underline':
            return <Text key={i} style={{ textDecorationLine: 'underline' }}>{node.text}</Text>;
          case 'strikethrough':
            return <Text key={i} style={{ textDecorationLine: 'line-through' }}>{node.text}</Text>;
          case 'highlight':
            return <Text key={i} style={[styles.highlight, { backgroundColor: `${theme.accent}30` }]}>{node.text}</Text>;
          case 'code':
            return (
              <Text key={i} style={[styles.inlineCode, { backgroundColor: theme.backgroundElement, color: theme.primary }]}>
                {node.text}
              </Text>
            );
          case 'color':
            return <Text key={i} style={{ color: node.color }}>{node.text}</Text>;
          case 'link':
            return (
              <Text
                key={i}
                style={{ color: theme.primary }}
                onPress={() => Linking.openURL(node.url)}
              >
                {node.text}
              </Text>
            );
          case 'image':
            return <ImageViewer key={i} uri={node.url} />;
          case 'video':
            return <VideoPlayer key={i} uri={node.src} />;
          case 'audio':
            return <AudioPlayer key={i} uri={node.src} title={node.title} />;
        }
      })}
    </Text>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const theme = useTheme();
  const blocks = parseBlocks(content);

  return (
    <View style={styles.container}>
      {blocks.map((block, bi) => {
        switch (block.type) {
          case 'empty':
            return <View key={bi} style={{ height: Spacing.one }} />;

          case 'h1':
            return (
              <Text key={bi} style={[styles.h1, { color: theme.text, fontFamily: theme.fontFamily }]}>
                <InlineContent nodes={parseInline(block.text)} theme={theme} />
              </Text>
            );
          case 'h2':
            return (
              <Text key={bi} style={[styles.h2, { color: theme.text, fontFamily: theme.fontFamily }]}>
                <InlineContent nodes={parseInline(block.text)} theme={theme} />
              </Text>
            );
          case 'h3':
            return (
              <Text key={bi} style={[styles.h3, { color: theme.text, fontFamily: theme.fontFamily }]}>
                <InlineContent nodes={parseInline(block.text)} theme={theme} />
              </Text>
            );
          case 'h4':
          case 'h5':
          case 'h6':
            return (
              <Text key={bi} style={[styles.h4, { color: theme.text, fontFamily: theme.fontFamily }]}>
                <InlineContent nodes={parseInline(block.text)} theme={theme} />
              </Text>
            );

          case 'paragraph':
            return (
              <Text key={bi} style={[styles.paragraph, { color: theme.text, fontFamily: theme.fontFamily }]}>
                <InlineContent nodes={parseInline(block.text)} theme={theme} />
              </Text>
            );

          case 'blockquote':
            return (
              <View key={bi} style={[styles.blockquote, { borderLeftColor: theme.primary, backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.blockquoteText, { color: theme.textSecondary, fontFamily: theme.fontFamily }]}>
                  <InlineContent nodes={parseInline(block.text)} theme={theme} />
                </Text>
              </View>
            );

          case 'audio_block':
            return (
              <AudioPlayer
                key={bi}
                uri={block.audioSrc || ''}
                title={block.audioTitle}
              />
            );

          case 'codeblock':
            return (
              <View key={bi} style={[styles.codeblock, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                {block.lang ? (
                  <Text style={[styles.codeLang, { color: theme.textMuted }]}>{block.lang}</Text>
                ) : null}
                <Text style={[styles.codeText, { color: theme.text, fontFamily: theme.fontFamily }]}>
                  {block.text}
                </Text>
              </View>
            );

          case 'hr':
            return <View key={bi} style={[styles.hr, { backgroundColor: theme.border }]} />;

          case 'ul':
            return (
              <View key={bi} style={styles.list}>
                {block.items?.map((item, ii) => (
                  <View key={ii} style={styles.listItem}>
                    <Text style={[styles.bullet, { color: theme.textMuted }]}>•</Text>
                    <Text style={[styles.listItemText, { color: theme.text, fontFamily: theme.fontFamily }]} numberOfLines={0}>
                      <InlineContent nodes={parseInline(item)} theme={theme} />
                    </Text>
                  </View>
                ))}
              </View>
            );

          case 'ol':
            return (
              <View key={bi} style={styles.list}>
                {block.items?.map((item, ii) => (
                  <View key={ii} style={styles.listItem}>
                    <Text style={[styles.bullet, { color: theme.textMuted }]}>{ii + 1}.</Text>
                    <Text style={[styles.listItemText, { color: theme.text, fontFamily: theme.fontFamily }]} numberOfLines={0}>
                      <InlineContent nodes={parseInline(item)} theme={theme} />
                    </Text>
                  </View>
                ))}
              </View>
            );

          default:
            return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  h2: {
    fontSize: 21,
    fontWeight: '600',
    lineHeight: 28,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  h3: {
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 26,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: Spacing.two,
    marginBottom: Spacing.half,
  },
  paragraph: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: Spacing.one,
  },
  blockquote: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginVertical: Spacing.one,
  },
  blockquoteText: {
    fontSize: 16,
    lineHeight: 24,
  },
  codeblock: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    marginVertical: Spacing.one,
  },
  codeLang: {
    fontSize: 12,
    marginBottom: Spacing.one,
    fontVariant: ['small-caps'],
  },
  codeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inlineCode: {
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  highlight: {
    paddingHorizontal: 2,
    borderRadius: 3,
  },
  inlineImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: Spacing.one,
  },
  hr: {
    height: 1,
    marginVertical: Spacing.three,
  },
  list: {
    gap: Spacing.one,
    marginVertical: Spacing.one,
  },
  listItem: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  bullet: {
    fontSize: 17,
    lineHeight: 26,
    width: 16,
    textAlign: 'right',
  },
  listItemText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 26,
  },
});
