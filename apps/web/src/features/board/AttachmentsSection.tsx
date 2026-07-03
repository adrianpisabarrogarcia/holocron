import { useRef, useState } from 'react';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { useBoardStore } from '../../store/useBoardStore';
import { getApiUrl } from '../../lib/api';

export type Attachment = {
  filename: string;
  url: string;      // full absolute URL to display/download
  isImage: boolean;
};

type AttachmentsSectionProps = {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
};

const MAX_FILE_MB = 7;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

function getFileEmoji(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return '📄';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📽️';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return '🎬';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
  return '📎';
}

export function compressImageToWebp(file: File, maxDim = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX = maxDim;
        if (width > height && width > MAX) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else if (height > MAX) {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas error')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.75));
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export function AttachmentsSection({ attachments, onChange }: AttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { uploadFile, deleteUpload } = useBoardStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_FILE_BYTES) {
      setError(`El archivo supera el límite de ${MAX_FILE_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      let base64Data: string;
      let filename = file.name;

      if (isImage) {
        base64Data = await compressImageToWebp(file);
        const dotIdx = filename.lastIndexOf('.');
        filename = (dotIdx !== -1 ? filename.substring(0, dotIdx) : filename) + '.webp';
      } else {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = () => reject(new Error('Error de lectura'));
          reader.readAsDataURL(file);
        });
      }

      const { url } = await uploadFile(filename, base64Data);
      onChange([...attachments, { filename, url: getApiUrl(url), isImage }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = async (index: number) => {
    const att = attachments[index];
    // Extract filename from URL: last segment after /uploads/
    const parts = att.url.split('/uploads/');
    const filename = parts[1] ?? '';
    onChange(attachments.filter((_, i) => i !== index));
    if (filename) {
      try {
        await deleteUpload(filename);
      } catch {
        // Silently ignore — file may already be gone
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-650 dark:text-slate-355">Adjuntos</span>
        <div className="flex items-center gap-2">
          {uploading && (
            <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" /> Subiendo...
            </span>
          )}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-650 dark:hover:text-indigo-400 transition disabled:opacity-50 bg-white dark:bg-slate-950"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Adjuntar
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-rose-500 font-medium">{error}</p>
      )}

      {attachments.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {attachments.map((att, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-xs"
            >
              {att.isImage ? (
                <img
                  src={att.url}
                  alt={att.filename}
                  className="h-8 w-8 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <span className="text-base shrink-0">{getFileEmoji(att.filename)}</span>
              )}
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate font-medium text-indigo-650 dark:text-indigo-400 hover:underline"
              >
                {att.filename}
              </a>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="ml-auto shrink-0 rounded p-0.5 text-slate-400 hover:text-rose-500 transition"
                title="Eliminar adjunto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {attachments.length === 0 && !uploading && (
        <p className="text-[11px] text-slate-400 dark:text-slate-600">
          Sin adjuntos. Cualquier tipo de archivo, máx. {MAX_FILE_MB} MB.
        </p>
      )}

      <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
    </div>
  );
}
