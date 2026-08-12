import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  Minus,
} from 'lucide-react';
import { cn } from '../../lib/cn';

export type MarkdownToolbarAction =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'link'
  | 'bulletList'
  | 'orderedList'
  | 'quote'
  | 'inlineCode'
  | 'codeBlock'
  | 'table'
  | 'hr';

type MarkdownToolbarProps = {
  onAction: (action: MarkdownToolbarAction) => void;
  onImageClick: () => void;
  uploadingImage: boolean;
};

const buttonClassName =
  'p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition disabled:opacity-40 disabled:cursor-not-allowed';

export function MarkdownToolbar({ onAction, onImageClick, uploadingImage }: MarkdownToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 rounded-t-xl">
      <button type="button" title="Negrita (Ctrl+B)" className={buttonClassName} onClick={() => onAction('bold')}>
        <Bold className="h-4 w-4" />
      </button>
      <button type="button" title="Cursiva (Ctrl+I)" className={buttonClassName} onClick={() => onAction('italic')}>
        <Italic className="h-4 w-4" />
      </button>
      <button type="button" title="Tachado" className={buttonClassName} onClick={() => onAction('strikethrough')}>
        <Strikethrough className="h-4 w-4" />
      </button>

      <span className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

      <button type="button" title="Título 1" className={buttonClassName} onClick={() => onAction('h1')}>
        <Heading1 className="h-4 w-4" />
      </button>
      <button type="button" title="Título 2" className={buttonClassName} onClick={() => onAction('h2')}>
        <Heading2 className="h-4 w-4" />
      </button>
      <button type="button" title="Título 3" className={buttonClassName} onClick={() => onAction('h3')}>
        <Heading3 className="h-4 w-4" />
      </button>

      <span className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

      <button type="button" title="Lista con viñetas" className={buttonClassName} onClick={() => onAction('bulletList')}>
        <List className="h-4 w-4" />
      </button>
      <button type="button" title="Lista numerada" className={buttonClassName} onClick={() => onAction('orderedList')}>
        <ListOrdered className="h-4 w-4" />
      </button>
      <button type="button" title="Cita" className={buttonClassName} onClick={() => onAction('quote')}>
        <Quote className="h-4 w-4" />
      </button>

      <span className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

      <button type="button" title="Enlace (Ctrl+K)" className={buttonClassName} onClick={() => onAction('link')}>
        <LinkIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Insertar imagen"
        className={cn(buttonClassName, uploadingImage && 'animate-pulse')}
        onClick={onImageClick}
        disabled={uploadingImage}
      >
        <ImageIcon className="h-4 w-4" />
      </button>
      <button type="button" title="Código en línea" className={buttonClassName} onClick={() => onAction('inlineCode')}>
        <Code className="h-4 w-4" />
      </button>
      <button type="button" title="Bloque de código" className={buttonClassName} onClick={() => onAction('codeBlock')}>
        <Code className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <button type="button" title="Tabla" className={buttonClassName} onClick={() => onAction('table')}>
        <TableIcon className="h-4 w-4" />
      </button>
      <button type="button" title="Línea horizontal" className={buttonClassName} onClick={() => onAction('hr')}>
        <Minus className="h-4 w-4" />
      </button>
    </div>
  );
}
