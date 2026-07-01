import { FormEvent, useState } from 'react';
import { useBoardStore } from '../../store/useBoardStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Folder } from 'lucide-react';
import { cn } from '../../lib/cn';
import { fieldClassName } from '../../lib/constants';

export function CreateProjectCard() {
  const { createProject } = useBoardStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('PLANNING');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setPending(true);
    try {
      await createProject(name, description || undefined, status);
      setName('');
      setDescription('');
      setStatus('PLANNING');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proyecto');
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-4 mb-4">
        <Folder className="h-5 w-5 text-indigo-650" />
        <div>
          <CardTitle className="text-base">Crear Proyecto</CardTitle>
          <CardDescription>Añade una nueva área de trabajo</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-slate-650 dark:text-slate-355">
            <span className="mb-1 block font-medium">Nombre del proyecto</span>
            <input
              className={fieldClassName}
              type="text"
              placeholder="Ej: Sprint 3 Desarrollo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-slate-650 dark:text-slate-355">
            <span className="mb-1 block font-medium">Descripción</span>
            <textarea
              className={cn(fieldClassName, 'resize-none h-20')}
              placeholder="Detalles sobre los objetivos o tareas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="block text-sm text-slate-650 dark:text-slate-355">
            <span className="mb-1 block font-medium">Estado inicial</span>
            <select className={fieldClassName} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PLANNING">Planificación</option>
              <option value="ACTIVE">Activo</option>
              <option value="ON_HOLD">En Pausa</option>
            </select>
          </label>
          {error && <div className="text-xs text-rose-500">{error}</div>}
          <Button type="submit" variant="primary" className="w-full text-white" disabled={pending}>
            {pending ? 'Creando...' : 'Crear Proyecto'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
