import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { X, Bell, Loader2 } from 'lucide-react';
import { apiFetch, parseJsonError } from '../../lib/api';

type ProjectNotificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
};

export function ProjectNotificationModal({ isOpen, onClose, projectId, projectName }: ProjectNotificationModalProps) {
  const [notifPrefs, setNotifPrefs] = useState({
    onTaskAssigned: null as boolean | null,
    onTaskUnassigned: null as boolean | null,
    onTaskStatusChanged: null as boolean | null,
    onCommentAdded: null as boolean | null,
  });
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      loadNotifs();
    }
  }, [isOpen]);

  const loadNotifs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifPrefs({
          onTaskAssigned: data.onTaskAssigned,
          onTaskUnassigned: data.onTaskUnassigned,
          onTaskStatusChanged: data.onTaskStatusChanged,
          onCommentAdded: data.onCommentAdded,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setPending(true);

    try {
      const res = await apiFetch(`/api/projects/${projectId}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifPrefs)
      });
      if (!res.ok) {
        throw new Error(await parseJsonError(res));
      }
      setSuccessMsg("Notificaciones del proyecto actualizadas.");
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar notificaciones');
    } finally {
      setPending(false);
    }
  };

  const TriStateCheckbox = ({ label, value, onChange }: { label: string, value: boolean | null, onChange: (v: boolean | null) => void }) => {
    return (
      <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        <select
          className="text-sm rounded border-slate-300 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-1"
          value={value === null ? 'default' : value ? 'true' : 'false'}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'default') onChange(null);
            else onChange(val === 'true');
          }}
        >
          <option value="default">Global (por defecto)</option>
          <option value="true">Notificar</option>
          <option value="false">No notificar</option>
        </select>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm p-4 w-screen h-screen">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200 outline-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
        
        <CardHeader className="p-0 mb-6 flex flex-row items-center gap-3">
          <Bell className="h-5 w-5 text-indigo-650" />
          <div>
            <CardTitle className="text-base">Notificaciones del Proyecto</CardTitle>
            <CardDescription className="text-xs">{projectName}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-indigo-500" /></div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-slate-500 mb-4">Puedes sobrescribir tus preferencias globales de notificación para este proyecto.</p>
                <TriStateCheckbox 
                  label="Al ser asignado a una tarea" 
                  value={notifPrefs.onTaskAssigned} 
                  onChange={v => setNotifPrefs({...notifPrefs, onTaskAssigned: v})} 
                />
                <TriStateCheckbox 
                  label="Al ser desasignado" 
                  value={notifPrefs.onTaskUnassigned} 
                  onChange={v => setNotifPrefs({...notifPrefs, onTaskUnassigned: v})} 
                />
                <TriStateCheckbox 
                  label="Cambios de estado" 
                  value={notifPrefs.onTaskStatusChanged} 
                  onChange={v => setNotifPrefs({...notifPrefs, onTaskStatusChanged: v})} 
                />
                <TriStateCheckbox 
                  label="Comentarios y menciones" 
                  value={notifPrefs.onCommentAdded} 
                  onChange={v => setNotifPrefs({...notifPrefs, onCommentAdded: v})} 
                />
              </div>
            )}

            {errorMsg && (
              <p className="text-xs font-bold text-rose-500">{errorMsg}</p>
            )}
            {successMsg && (
              <p className="text-xs font-bold text-emerald-500">{successMsg}</p>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button className="text-white" variant="primary" disabled={pending || loading} type="submit">
                {pending ? 'Guardando...' : 'Guardar Preferencias'}
              </Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>,
    document.body
  );
}
