import { useRef, useState } from 'react';
import type { PageDetail } from '@holocron/contracts';
import { Button } from '../../components/ui/button';
import { fieldClassName } from '../../lib/constants';
import { cn } from '../../lib/cn';
import { getApiUrl } from '../../lib/api';
import { useBoardStore } from '../../store/useBoardStore';
import { compressImageToWebp } from '../board/AttachmentsSection';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MarkdownToolbar, type MarkdownToolbarAction } from './MarkdownToolbar';
import {
  wrapSelection,
  toggleLinePrefix,
  orderedList,
  setHeading,
  insertAtCursor,
  insertCodeBlock,
  insertTable,
  insertHorizontalRule,
  type MarkdownEditResult,
} from './markdownEditing';

type PageEditorProps = {
  page: PageDetail;
  onSave: (title: string, content: string) => Promise<void>;
  onCancel: () => void;
};

export function PageEditor({ page, onSave, onCancel }: PageEditorProps) {
  const { uploadFile } = useBoardStore();
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const applyEdit = (edit: (value: string, sel: { start: number; end: number }) => MarkdownEditResult) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const result = edit(content, { start, end });
    setContent(result.value);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(result.selection.start, result.selection.end);
    });
  };

  const handleToolbarAction = (action: MarkdownToolbarAction) => {
    switch (action) {
      case 'bold':
        applyEdit((v, sel) => wrapSelection(v, sel, '**', '**', 'texto en negrita'));
        break;
      case 'italic':
        applyEdit((v, sel) => wrapSelection(v, sel, '*', '*', 'texto en cursiva'));
        break;
      case 'strikethrough':
        applyEdit((v, sel) => wrapSelection(v, sel, '~~', '~~', 'texto tachado'));
        break;
      case 'inlineCode':
        applyEdit((v, sel) => wrapSelection(v, sel, '`', '`', 'código'));
        break;
      case 'codeBlock':
        applyEdit((v, sel) => insertCodeBlock(v, sel));
        break;
      case 'h1':
        applyEdit((v, sel) => setHeading(v, sel, 1));
        break;
      case 'h2':
        applyEdit((v, sel) => setHeading(v, sel, 2));
        break;
      case 'h3':
        applyEdit((v, sel) => setHeading(v, sel, 3));
        break;
      case 'bulletList':
        applyEdit((v, sel) => toggleLinePrefix(v, sel, '- '));
        break;
      case 'orderedList':
        applyEdit((v, sel) => orderedList(v, sel));
        break;
      case 'quote':
        applyEdit((v, sel) => toggleLinePrefix(v, sel, '> '));
        break;
      case 'link':
        applyEdit((v, sel) => {
          const hasSelection = sel.end > sel.start;
          const label = hasSelection ? v.slice(sel.start, sel.end) : 'texto del enlace';
          const text = `[${label}](https://)`;
          const urlStart = text.length - 1;
          return insertAtCursor(v, sel, text, urlStart, urlStart);
        });
        break;
      case 'table':
        applyEdit((v, sel) => insertTable(v, sel));
        break;
      case 'hr':
        applyEdit((v, sel) => insertHorizontalRule(v, sel));
        break;
    }
  };

  const uploadAndInsertImage = async (file: File) => {
    setUploadingImage(true);
    try {
      const base64Data = await compressImageToWebp(file);
      const dotIdx = file.name.lastIndexOf('.');
      const filename = (dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name) + '.webp';
      const { url } = await uploadFile(filename, base64Data);
      const imgUrl = getApiUrl(url);
      applyEdit((v, sel) => insertAtCursor(v, sel, `![${filename}](${imgUrl})\n`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadAndInsertImage(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await uploadAndInsertImage(file);
        return;
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    const file = Array.from(e.dataTransfer?.files ?? []).find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      await uploadAndInsertImage(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handleToolbarAction('bold');
    } else if (meta && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handleToolbarAction('italic');
    } else if (meta && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      handleToolbarAction('link');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      applyEdit((v, sel) => insertAtCursor(v, sel, '  '));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('El título no puede estar vacío');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(title.trim(), content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la página');
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la página"
          className={`${fieldClassName} text-lg font-bold`}
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200/60 dark:border-rose-800/40">
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-6 overflow-hidden">
        <div className="flex flex-col h-full rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <MarkdownToolbar onAction={handleToolbarAction} onImageClick={() => imageInputRef.current?.click()} uploadingImage={uploadingImage} />
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageInputChange} />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder="Escribí en Markdown... (pegá o soltá imágenes directamente acá)"
            className={cn(fieldClassName, 'flex-1 resize-none rounded-none border-0 font-mono text-sm leading-relaxed focus:ring-0')}
          />
        </div>
        <div className="h-full overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    </div>
  );
}
