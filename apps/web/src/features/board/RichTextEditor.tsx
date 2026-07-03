import { useRef, useEffect, useState, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Quote, Code, Image, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useBoardStore } from '../../store/useBoardStore';
import { getApiUrl } from '../../lib/api';
import { compressImageToWebp } from './AttachmentsSection';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  editorMinHeight?: string;
  maxHeight?: string;
};

const TOOLBAR_BUTTONS = [
  { icon: Bold, command: 'bold', title: 'Negrita' },
  { icon: Italic, command: 'italic', title: 'Cursiva' },
  { icon: Underline, command: 'underline', title: 'Subrayado' },
  { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Cita' },
  { icon: Code, command: 'formatBlock', value: 'pre', title: 'Bloque de Código' },
  { icon: List, command: 'insertUnorderedList', title: 'Lista viñetas' },
  { icon: ListOrdered, command: 'insertOrderedList', title: 'Lista numerada' },
];

const MAX_IMAGE_MB = 7;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí la descripción...',
  minHeight = 'min-h-[300px]',
  editorMinHeight = 'min-h-[280px]',
  maxHeight = 'max-h-[420px]'
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadFile } = useBoardStore();
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);

  // Load initial value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      setSelectedImg(target as HTMLImageElement);
    } else {
      setSelectedImg(null);
    }
  };

  const handleCommand = (command: string, val: string = '') => {
    document.execCommand(command, false, val);
    handleInput();
  };

  const handleLink = () => {
    const url = prompt('Introduce la URL:');
    if (url) {
      document.execCommand('createLink', false, url);
      handleInput();
    }
  };

  const uploadAndInsertImage = useCallback(async (file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(`La imagen supera el límite de ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const base64Data = await compressImageToWebp(file);
      const dotIdx = file.name.lastIndexOf('.');
      const filename = (dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name) + '.webp';
      const { url } = await uploadFile(filename, base64Data);
      const imgUrl = getApiUrl(url);
      // Restore focus to editor before inserting
      editorRef.current?.focus();
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${imgUrl}" alt="${filename}" style="max-width:100%;border-radius:8px;margin:6px 0;display:block;" />`
      );
      handleInput();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  }, [uploadFile]);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAndInsertImage(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Ctrl+V / paste handler
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault(); // block default paste of raw data URL
        const file = item.getAsFile();
        if (file) {
          await uploadAndInsertImage(file);
        }
        return;
      }
    }
    // Non-image paste: let browser handle normally
  }, [uploadAndInsertImage]);

  return (
    <div className={cn(
      'flex flex-col rounded-xl border bg-white dark:bg-slate-950 overflow-hidden transition-colors',
      isFocused
        ? 'border-indigo-400 dark:border-indigo-700'
        : 'border-slate-200 dark:border-slate-800'
    )}>
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1.5 shrink-0">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.title}
            type="button"
            title={btn.title}
            onClick={() => handleCommand(btn.command, btn.value)}
            className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition duration-150"
          >
            <btn.icon className="h-4 w-4" />
          </button>
        ))}

        <button
          type="button"
          title="Insertar enlace"
          onClick={handleLink}
          className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition duration-150"
        >
          <Link2 className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Image upload button */}
        <button
          type="button"
          title="Insertar imagen (WebP comprimida, máx 7 MB)"
          disabled={uploading}
          onClick={() => imageInputRef.current?.click()}
          className="p-1.5 rounded text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition duration-150 disabled:opacity-40"
        >
          {uploading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Image className="h-4 w-4" />
          }
        </button>
      </div>

      {uploadError && (
        <p className="px-3 pt-1.5 text-[11px] text-rose-500 font-medium">{uploadError}</p>
      )}

      {/* Selected Image Resize Toolbar */}
      {selectedImg && (
        <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/30 p-1.5 px-3 text-xs shrink-0 select-none animate-in slide-in-from-top-2 duration-150">
          <span className="font-bold text-indigo-700 dark:text-indigo-400 mr-2">Tamaño de Imagen:</span>
          <button
            type="button"
            onClick={() => {
              selectedImg.style.width = '25%';
              selectedImg.style.height = 'auto';
              handleInput();
            }}
            className={cn(
              "px-2 py-0.5 rounded font-bold transition",
              selectedImg.style.width === '25%' 
                ? "bg-indigo-600 text-white" 
                : "text-indigo-650 hover:bg-indigo-100/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            )}
          >
            Pequeño (25%)
          </button>
          <button
            type="button"
            onClick={() => {
              selectedImg.style.width = '50%';
              selectedImg.style.height = 'auto';
              handleInput();
            }}
            className={cn(
              "px-2 py-0.5 rounded font-bold transition",
              selectedImg.style.width === '50%' 
                ? "bg-indigo-600 text-white" 
                : "text-indigo-650 hover:bg-indigo-100/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            )}
          >
            Medio (50%)
          </button>
          <button
            type="button"
            onClick={() => {
              selectedImg.style.width = '75%';
              selectedImg.style.height = 'auto';
              handleInput();
            }}
            className={cn(
              "px-2 py-0.5 rounded font-bold transition",
              selectedImg.style.width === '75%' 
                ? "bg-indigo-600 text-white" 
                : "text-indigo-650 hover:bg-indigo-100/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            )}
          >
            Grande (75%)
          </button>
          <button
            type="button"
            onClick={() => {
              selectedImg.style.width = '100%';
              selectedImg.style.height = 'auto';
              handleInput();
            }}
            className={cn(
              "px-2 py-0.5 rounded font-bold transition",
              (!selectedImg.style.width || selectedImg.style.width === '100%') 
                ? "bg-indigo-600 text-white" 
                : "text-indigo-650 hover:bg-indigo-100/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            )}
          >
            Total (100%)
          </button>
          <div className="w-px h-4 bg-indigo-200 dark:bg-indigo-900/50 mx-1" />
          <button
            type="button"
            onClick={() => {
              selectedImg.remove();
              setSelectedImg(null);
              handleInput();
            }}
            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-0.5 rounded font-bold transition ml-auto"
          >
            Eliminar
          </button>
        </div>
      )}

      {/* EDITABLE CONTAINER */}
      <div 
        onClick={handleEditorClick}
        className={cn("relative overflow-y-auto p-3 text-sm", minHeight, maxHeight)}
      >
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            handleInput();
          }}
          className={cn("outline-none prose prose-slate dark:prose-invert prose-sm max-w-none text-slate-800 dark:text-slate-100", editorMinHeight)}
        />
        {!isFocused && (!value || value === '<br>' || value === '<div><br></div>') && (
          <div className="absolute top-3 left-3 text-slate-400 pointer-events-none select-none text-sm">
            {placeholder}
          </div>
        )}
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
    </div>
  );
}
