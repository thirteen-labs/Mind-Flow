export interface FormatResult {
  text: string;
  cursor: number;
}

function getLineStart(text: string, pos: number): number {
  const before = text.slice(0, pos);
  const lastNewline = before.lastIndexOf('\n');
  return lastNewline + 1;
}

function getLineEnd(text: string, pos: number): number {
  const after = text.slice(pos);
  const nextNewline = after.indexOf('\n');
  return nextNewline === -1 ? text.length : pos + nextNewline;
}

function replaceRange(text: string, start: number, end: number, replacement: string): string {
  return text.slice(0, start) + replacement + text.slice(end);
}

function wrapSelection(text: string, start: number, end: number, wrapper: string): FormatResult {
  const wrapped = `${wrapper}${text.slice(start, end)}${wrapper}`;
  return {
    text: replaceRange(text, start, end, wrapped),
    cursor: start + wrapped.length,
  };
}

function insertAt(text: string, pos: number, insertion: string): FormatResult {
  return {
    text: replaceRange(text, pos, pos, insertion),
    cursor: pos + insertion.length,
  };
}

function toggleLinePrefix(text: string, pos: number, prefix: string): FormatResult {
  const lineStart = getLineStart(text, pos);
  const lineEnd = getLineEnd(text, pos);
  const line = text.slice(lineStart, lineEnd);

  if (line.startsWith(prefix)) {
    const newText = replaceRange(text, lineStart, lineEnd, line.slice(prefix.length));
    return { text: newText, cursor: pos - prefix.length };
  }
  const newText = replaceRange(text, lineStart, lineEnd, `${prefix}${line}`);
  return { text: newText, cursor: pos + prefix.length };
}

export function toggleBold(text: string, start: number, end: number): FormatResult {
  if (start === end) return insertAt(text, start, '****');
  return wrapSelection(text, start, end, '**');
}

export function toggleItalic(text: string, start: number, end: number): FormatResult {
  if (start === end) return insertAt(text, start, '__');
  return wrapSelection(text, start, end, '_');
}

export function toggleInlineCode(text: string, start: number, end: number): FormatResult {
  if (start === end) return insertAt(text, start, '``');
  return wrapSelection(text, start, end, '`');
}

export function toggleStrikethrough(text: string, start: number, end: number): FormatResult {
  if (start === end) return insertAt(text, start, '~~~~');
  return wrapSelection(text, start, end, '~~');
}

export function insertHeading(text: string, pos: number, level: number): FormatResult {
  const prefix = '#'.repeat(level) + ' ';
  return toggleLinePrefix(text, pos, prefix);
}

export function insertBlockquote(text: string, pos: number): FormatResult {
  return toggleLinePrefix(text, pos, '> ');
}

export function insertBulletList(text: string, pos: number): FormatResult {
  return toggleLinePrefix(text, pos, '- ');
}

export function insertNumberedList(text: string, pos: number): FormatResult {
  return toggleLinePrefix(text, pos, '1. ');
}

export function insertChecklist(text: string, pos: number): FormatResult {
  return toggleLinePrefix(text, pos, '- [ ] ');
}

export function insertDivider(text: string, pos: number): FormatResult {
  return insertAt(text, pos, '\n---\n');
}

export function insertImage(text: string, start: number, end: number, uri: string, alt?: string): FormatResult {
  const altText = alt || 'media';
  const markdown = `![${altText}](${uri})`;
  return {
    text: replaceRange(text, start, end, markdown),
    cursor: start + markdown.length,
  };
}



export function insertLink(text: string, start: number, end: number, url?: string): FormatResult {
  const selected = text.slice(start, end) || 'link text';
  const href = url || 'https://';
  const markdown = `[${selected}](${href})`;
  return {
    text: replaceRange(text, start, end, markdown),
    cursor: start + markdown.length,
  };
}

export function insertCodeBlock(text: string, pos: number, language?: string): FormatResult {
  const lang = language ? language : '';
  const block = `\n\`\`\`${lang}\n\n\`\`\`\n`;
  return insertAt(text, pos, block);
}

export function insertTable(text: string, pos: number): FormatResult {
  const table = '\n| Header | Header |\n|--------|--------|\n| Cell | Cell |\n';
  return insertAt(text, pos, table);
}

export interface UndoEntry {
  text: string;
  selection: { start: number; end: number };
}

export function createUndoStack(limit = 50) {
  const stack: UndoEntry[] = [];
  let pointer = -1;

  return {
    push(entry: UndoEntry) {
      stack.splice(pointer + 1);
      stack.push(entry);
      if (stack.length > limit) stack.shift();
      pointer = stack.length - 1;
    },
    undo(): UndoEntry | null {
      if (pointer < 0) return null;
      const entry = stack[pointer];
      pointer--;
      return entry;
    },
    redo(): UndoEntry | null {
      if (pointer + 1 >= stack.length) return null;
      pointer++;
      return stack[pointer];
    },
    get canUndo() { return pointer >= 0; },
    get canRedo() { return pointer + 1 < stack.length; },
  };
}
