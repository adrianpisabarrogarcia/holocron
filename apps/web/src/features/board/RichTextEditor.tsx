import { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Quote, Code } from 'lucide-react';
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
  const [isFocused, setIsFocused] = useState(false);

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
      </div>

      {/* EDITABLE CONTAINER */}
      <div className="relative min-h-[120px] max-h-[260px] overflow-y-auto p-3 text-sm">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            handleInput();
          }}
          className="outline-none min-h-[100px] prose prose-slate dark:prose-invert prose-sm max-w-none text-slate-800 dark:text-slate-100"
        />
        {!isFocused && (!value || value === '<br>' || value === '<div><br></div>') && (
          <div className="absolute top-3 left-3 text-slate-400 pointer-events-none select-none text-sm">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
