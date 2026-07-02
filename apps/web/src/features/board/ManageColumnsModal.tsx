import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, X, Settings } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { fieldClassName } from '../../lib/constants';

type ColumnItem = {
  id?: string;
  name: string;
  emoji?: string | null;
  position: number;
};

type ManageColumnsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnItem[];
  onSave: (columns: ColumnItem[]) => Promise<void>;
  pending?: boolean;
};

export function ManageColumnsModal({
  isOpen,
  onClose,
  columns: initialColumns,
  onSave,
  pending = false,
}: ManageColumnsModalProps) {
  const [columns, setColumns] = useState<ColumnItem[]>(() =>
    [...initialColumns].sort((a, b) => a.position - b.position)
  );
  const [newColName, setNewColName] = useState('');
  const [newColEmoji, setNewColEmoji] = useState('📌');

  if (!isOpen) return null;

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    const nameExists = columns.some((c) => c.name.toLowerCase() === newColName.trim().toLowerCase());
    if (nameExists) {
      alert('Ya existe una columna con ese nombre');
      return;
    }
    const newCol: ColumnItem = {
      name: newColName.trim(),
      emoji: newColEmoji.trim() || null,
      position: columns.length,
    };
    setColumns([...columns, newCol]);
    setNewColName('');
    setNewColEmoji('📌');
  };

  const handleRemoveColumn = (index: number) => {
    if (columns.length <= 1) {
      alert('Debes tener al menos una columna');
      return;
    }
    const updated = columns.filter((_, i) => i !== index).map((col, idx) => ({
      ...col,
      position: idx,
    }));
    setColumns(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === columns.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...columns];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Recalculate positions
    const reordered = updated.map((col, idx) => ({
      ...col,
      position: idx,
    }));

    setColumns(reordered);
  };

  const handleNameChange = (index: number, name: string) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], name };
    setColumns(updated);
  };

  const handleEmojiChange = (index: number, emoji: string) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], emoji };
    setColumns(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (columns.length === 0) return;
    try {
      await onSave(columns);
      onClose();
    } catch (err) {
      alert('Error al guardar columnas');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 transition duration-150"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-indigo-650 shrink-0" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Configurar Columnas del Proyecto
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Añade, reordena o elimina las columnas de tu tablero. Si eliminas una columna, las tareas que contenga se moverán a la primera columna.
        </p>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* COLUMN LIST CONTAINER */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-5">
            {columns.map((col, index) => (
              <div
                key={col.id || `temp-${index}`}
                className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50"
              >
                {/* Emoji Input */}
                <input
                  type="text"
                  maxLength={2}
                  className="w-11 h-10 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 text-center text-lg outline-none transition focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 text-slate-800 dark:text-slate-100 shrink-0"
                  value={col.emoji || ''}
                  onChange={(e) => handleEmojiChange(index, e.target.value)}
                  placeholder="📌"
                />

                {/* Name Input */}
                <input
                  type="text"
                  required
                  className={`${fieldClassName} flex-1 text-sm py-1.5`}
                  value={col.name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  placeholder="Nombre de la columna"
                />

                {/* Move Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === columns.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveColumn(index)}
                    className="p-1 text-rose-500 hover:text-rose-700 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded ml-1"
                    title="Eliminar columna"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ADD COLUMN SECTION */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={2}
                placeholder="📌"
                value={newColEmoji}
                onChange={(e) => setNewColEmoji(e.target.value)}
                className="w-11 h-10 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 text-center text-lg outline-none transition focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 text-slate-800 dark:text-slate-100 shrink-0"
              />
              <input
                type="text"
                placeholder="Nueva columna..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className={`${fieldClassName} flex-1 text-sm py-1.5`}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddColumn}>
                <Plus className="h-4 w-4 mr-1" />
                Añadir
              </Button>
            </div>
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" className="text-white" disabled={pending || columns.length === 0}>
              {pending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
