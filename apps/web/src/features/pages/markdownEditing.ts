export type MarkdownSelection = { start: number; end: number };

export type MarkdownEditResult = { value: string; selection: MarkdownSelection };

function getSelectedLinesRange(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = value.indexOf('\n', end > start ? end - 1 : end);
  if (lineEnd === -1) lineEnd = value.length;
  return { lineStart, lineEnd };
}

export function wrapSelection(value: string, sel: MarkdownSelection, before: string, after: string, placeholder: string): MarkdownEditResult {
  const selectedText = value.slice(sel.start, sel.end);
  const text = selectedText || placeholder;
  const newValue = value.slice(0, sel.start) + before + text + after + value.slice(sel.end);
  const newStart = sel.start + before.length;
  const newEnd = newStart + text.length;
  return { value: newValue, selection: { start: newStart, end: newEnd } };
}

export function toggleLinePrefix(value: string, sel: MarkdownSelection, prefix: string): MarkdownEditResult {
  const { lineStart, lineEnd } = getSelectedLinesRange(value, sel.start, sel.end);
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const contentLines = lines.filter((line) => line.trim() !== '');
  const allPrefixed = contentLines.length > 0 && contentLines.every((line) => line.startsWith(prefix));
  const newLines = lines.map((line) => {
    if (line.trim() === '') return line;
    return allPrefixed ? line.slice(prefix.length) : prefix + line;
  });
  const newBlock = newLines.join('\n');
  const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  return { value: newValue, selection: { start: lineStart, end: lineStart + newBlock.length } };
}

export function orderedList(value: string, sel: MarkdownSelection): MarkdownEditResult {
  const { lineStart, lineEnd } = getSelectedLinesRange(value, sel.start, sel.end);
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  let n = 1;
  const newLines = lines.map((line) => {
    if (line.trim() === '') return line;
    const withoutMarker = line.replace(/^\d+\.\s+/, '');
    return `${n++}. ${withoutMarker}`;
  });
  const newBlock = newLines.join('\n');
  const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  return { value: newValue, selection: { start: lineStart, end: lineStart + newBlock.length } };
}

export function setHeading(value: string, sel: MarkdownSelection, level: number): MarkdownEditResult {
  const { lineStart, lineEnd } = getSelectedLinesRange(value, sel.start, sel.end);
  const line = value.slice(lineStart, lineEnd);
  const match = line.match(/^(#{1,6})\s+/);
  const stripped = match ? line.slice(match[0].length) : line;
  const currentLevel = match ? match[1].length : 0;
  const newLine = currentLevel === level ? stripped : '#'.repeat(level) + ' ' + stripped;
  const newValue = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
  return { value: newValue, selection: { start: lineStart, end: lineStart + newLine.length } };
}

export function insertAtCursor(value: string, sel: MarkdownSelection, text: string, selectFrom?: number, selectTo?: number): MarkdownEditResult {
  const newValue = value.slice(0, sel.start) + text + value.slice(sel.end);
  const start = selectFrom !== undefined ? sel.start + selectFrom : sel.start + text.length;
  const end = selectTo !== undefined ? sel.start + selectTo : start;
  return { value: newValue, selection: { start, end } };
}

export function insertCodeBlock(value: string, sel: MarkdownSelection): MarkdownEditResult {
  const selectedText = value.slice(sel.start, sel.end);
  const needsNewlineBefore = sel.start > 0 && value[sel.start - 1] !== '\n';
  const prefix = needsNewlineBefore ? '\n' : '';
  const body = selectedText || 'código';
  const text = `${prefix}\`\`\`\n${body}\n\`\`\`\n`;
  const newValue = value.slice(0, sel.start) + text + value.slice(sel.end);
  const bodyStart = sel.start + prefix.length + 4;
  const bodyEnd = bodyStart + body.length;
  return { value: newValue, selection: { start: bodyStart, end: bodyEnd } };
}

export function insertTable(value: string, sel: MarkdownSelection): MarkdownEditResult {
  const needsNewlineBefore = sel.start > 0 && value[sel.start - 1] !== '\n';
  const prefix = needsNewlineBefore ? '\n\n' : '';
  const table = `${prefix}| Columna 1 | Columna 2 |\n| --- | --- |\n| Valor | Valor |\n`;
  const newValue = value.slice(0, sel.start) + table + value.slice(sel.end);
  const cursor = sel.start + table.length;
  return { value: newValue, selection: { start: cursor, end: cursor } };
}

export function insertHorizontalRule(value: string, sel: MarkdownSelection): MarkdownEditResult {
  const needsNewlineBefore = sel.start > 0 && value[sel.start - 1] !== '\n';
  const text = `${needsNewlineBefore ? '\n\n' : ''}---\n\n`;
  const newValue = value.slice(0, sel.start) + text + value.slice(sel.end);
  const cursor = sel.start + text.length;
  return { value: newValue, selection: { start: cursor, end: cursor } };
}
