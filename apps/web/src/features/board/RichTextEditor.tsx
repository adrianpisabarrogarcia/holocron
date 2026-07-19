import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Quote, Code, Image, Loader2, UserCircle } from 'lucide-react';
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
  members?: Array<{ userId: string; name: string; email: string; avatarUrl?: string | null }>;
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
  maxHeight = 'max-h-[420px]',
  members
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadFile } = useBoardStore();
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const searchLower = mentionSearch.toLowerCase();
    return members.filter(m => m.name.toLowerCase().includes(searchLower) || m.email.toLowerCase().includes(searchLower));
  }, [members, mentionSearch]);

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionSearch]);

  // Load initial value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const updateMentionPosition = useCallback((range: Range) => {
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current?.getBoundingClientRect();
    if (rect && editorRect) {
      setDropdownPosition({
        top: rect.bottom - editorRect.top + 5,
        left: rect.left - editorRect.left,
      });
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        
        if (node.nodeType === Node.TEXT_NODE) {
          const textBeforeCursor = node.textContent?.substring(0, range.startOffset) || '';
          const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
          
          if (match) {
            setShowMentions(true);
            setMentionSearch(match[1]);
            setSelectionRange(range.cloneRange());
            updateMentionPosition(range);
          } else {
            setShowMentions(false);
          }
        } else {
          setShowMentions(false);
        }
      }
    }
  };

  const insertMention = (member: { userId: string; name: string; email: string; avatarUrl?: string | null }) => {
    if (!selectionRange || !editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection) return;
    
    selection.removeAllRanges();
    selection.addRange(selectionRange);
    
    const node = selectionRange.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      const offset = selectionRange.startOffset;
      const match = text.substring(0, offset).match(/@([a-zA-Z0-9_]*)$/);
      
      if (match) {
        const startOffset = offset - match[0].length;
        selectionRange.setStart(node, startOffset);
        selectionRange.setEnd(node, offset);
        selectionRange.deleteContents();
        
        const mentionNode = document.createElement('span');
        mentionNode.className = 'inline-flex items-center px-1.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 font-semibold text-xs border border-indigo-150 dark:border-indigo-900/30 mr-1 select-all mention';
        mentionNode.contentEditable = 'false';
        mentionNode.textContent = `@${member.name}`;
        
        selectionRange.insertNode(mentionNode);
        
        const spaceNode = document.createTextNode('\u00A0');
        mentionNode.parentNode?.insertBefore(spaceNode, mentionNode.nextSibling);
        
        selectionRange.setStartAfter(spaceNode);
        selectionRange.setEndAfter(spaceNode);
        selection.removeAllRanges();
        selection.addRange(selectionRange);
        
        handleInput();
      }
    }
    
    setShowMentions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredMembers[mentionIndex]) {
          insertMention(filteredMembers[mentionIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
      }
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

    const text = e.clipboardData?.getData('text/plain');
    if (text) {
      const hasMarkdown = /[\*\#\_\[\]`]|\n\s*[\-\*\d]/.test(text);
      if (hasMarkdown) {
        e.preventDefault();
        const html = parseMarkdownToHtml(text);
        document.execCommand('insertHTML', false, html);
        handleInput();
      }
    }
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
          onKeyDown={handleKeyDown}
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

        {showMentions && filteredMembers.length > 0 && (
          <div 
            className="absolute z-50 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto w-64 p-1 flex flex-col gap-0.5"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {filteredMembers.map((member, index) => (
              <button
                key={member.userId}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  insertMention(member);
                }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors",
                  index === mentionIndex
                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                )}
              >
                {member.avatarUrl ? (
                  <img src={getApiUrl(member.avatarUrl)} alt={member.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                ) : (
                  <UserCircle className="w-5 h-5 shrink-0 opacity-70" />
                )}
                <span className="truncate flex-1 font-medium">{member.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
    </div>
  );
}

export function parseMarkdownToHtml(md: string): string {
  if (!md) return '';

  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```([\s\S]+?)```/g, (_, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Images
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:6px 0;display:block;" />');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  const lines = html.split('\n');
  const result: string[] = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isUlLine = line.startsWith('- ') || line.startsWith('* ');
    const isOlLine = /^\d+\.\s/.test(line);

    if (inUl && !isUlLine) {
      result.push('</ul>');
      inUl = false;
    }
    if (inOl && !isOlLine) {
      result.push('</ol>');
      inOl = false;
    }

    if (line.startsWith('# ')) {
      result.push(`<h1>${line.substring(2)}</h1>`);
    } else if (line.startsWith('## ')) {
      result.push(`<h2>${line.substring(3)}</h2>`);
    } else if (line.startsWith('### ')) {
      result.push(`<h3>${line.substring(4)}</h3>`);
    } else if (line.startsWith('&gt; ')) {
      result.push(`<blockquote>${line.substring(5)}</blockquote>`);
    } else if (isUlLine) {
      if (!inUl) {
        result.push('<ul>');
        inUl = true;
      }
      result.push(`<li>${line.substring(2)}</li>`);
    } else if (isOlLine) {
      if (!inOl) {
        result.push('<ol>');
        inOl = true;
      }
      const match = line.match(/^\d+\.\s(.*)/);
      result.push(`<li>${match ? match[1] : line}</li>`);
    } else if (line === '') {
      result.push('<br>');
    } else {
      if (line.startsWith('<pre>') || line.startsWith('</pre>') || line.startsWith('<li>') || line.startsWith('<ul>') || line.startsWith('<ol>')) {
        result.push(lines[i]);
      } else {
        result.push(`<p>${lines[i]}</p>`);
      }
    }
  }

  if (inUl) result.push('</ul>');
  if (inOl) result.push('</ol>');

  return result.join('\n');
}
