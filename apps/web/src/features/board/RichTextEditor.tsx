import { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Image, Paperclip, Link2, Quote, Code } from 'lucide-react';
import { useBoardStore } from '../../store/useBoardStore';
import { getApiUrl } from '../../lib/api';
import { cn } from '../../lib/cn';

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
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

export function RichTextEditor({ value, onChange, placeholder = 'Escribe aquí la descripción...' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { uploadFile } = useBoardStore();

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

  // Compress image client-side to WebP and max width 1200px
  const compressImageToWebp = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context error'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', 0.7));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let base64Data = '';
      let filename = file.name;

      if (file.type.startsWith('image/')) {
        // Compress and convert to WebP
        base64Data = await compressImageToWebp(file);
        // Change extension to webp
        const dotIdx = filename.lastIndexOf('.');
        filename = (dotIdx !== -1 ? filename.substring(0, dotIdx) : filename) + '.webp';
      } else {
        // Read as normal base64 file
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      }

      const { url } = await uploadFile(filename, base64Data);
      const fileUrl = getApiUrl(url);

      if (file.type.startsWith('image/')) {
        // Insert Image element
        document.execCommand(
          'insertHTML',
          false,
          `<img src="${fileUrl}" alt="${filename}" class="max-w-full rounded-xl my-2 border border-slate-200/80 dark:border-slate-800/80" />`
        );
      } else {
        // Insert download link button
        document.execCommand(
          'insertHTML',
          false,
          `<a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-indigo-650 hover:underline font-bold dark:text-indigo-400 my-1 bg-indigo-50/50 dark:bg-indigo-950/30 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-xs">📎 Descargar ${filename}</a>`
        );
      }
      handleInput();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir el archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
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

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1.5" />

        {/* Upload Buttons */}
        <button
          type="button"
          title="Insertar imagen (WebP comprimida)"
          disabled={uploading}
          onClick={() => fileInputRef.current?.setAttribute('accept', 'image/*') || fileInputRef.current?.click()}
          className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition duration-150 disabled:opacity-50"
        >
          <Image className="h-4 w-4" />
        </button>

        <button
          type="button"
          title="Adjuntar archivo"
          disabled={uploading}
          onClick={() => fileInputRef.current?.removeAttribute('accept') || fileInputRef.current?.click()}
          className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition duration-150 disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {uploading && (
          <span className="text-[10px] text-indigo-600 font-bold ml-2 animate-pulse">
            Subiendo archivo...
          </span>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* EDITABLE CONTAINER */}
      <div className="relative min-h-[140px] max-h-[300px] overflow-y-auto p-3 text-sm">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            handleInput();
          }}
          className="outline-none min-h-[120px] prose prose-slate dark:prose-invert prose-sm max-w-none text-slate-800 dark:text-slate-100"
        />
        {!isFocused && (!value || value === '<br>' || value === '<div><br></div>') && (
          <div className="absolute top-3 left-3 text-slate-400 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
