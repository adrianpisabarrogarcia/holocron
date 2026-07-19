import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { User, X, Camera, Loader2, UserCircle, Bell } from 'lucide-react';
import { fieldClassName } from '../../lib/constants';
import { useBoardStore } from '../../store/useBoardStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getApiUrl, apiFetch, parseJsonError } from '../../lib/api';
import { compressImageToWebp } from '../board/AttachmentsSection';

type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateProfile } = useAuthStore();
  const { uploadFile } = useBoardStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'notifications'>('general');

  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [notifPrefs, setNotifPrefs] = useState({
    onTaskAssigned: true,
    onTaskUnassigned: true,
    onTaskStatusChanged: true,
    onCommentAdded: true,
  });
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen && activeTab === 'notifications') {
      loadNotifs();
    }
  }, [isOpen, activeTab]);

  const loadNotifs = async () => {
    setLoadingNotifs(true);
    try {
      const res = await apiFetch('/api/users/profile/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifPrefs({
          onTaskAssigned: data.onTaskAssigned ?? true,
          onTaskUnassigned: data.onTaskUnassigned ?? true,
          onTaskStatusChanged: data.onTaskStatusChanged ?? true,
          onCommentAdded: data.onCommentAdded ?? true,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  if (!isOpen || !user) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setErrorMsg(null);
    try {
      if (file.type.startsWith('image/')) {
        const base64Data = await compressImageToWebp(file, 200);
        const dotIdx = file.name.lastIndexOf('.');
        const filename = (dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name) + '.webp';
        
        const { url } = await uploadFile(filename, base64Data);
        setAvatarUrl(url);
      } else {
        setErrorMsg("Por favor selecciona una imagen válida.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSubmitProfile = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    setPending(true);
    try {
      await updateProfile(name, avatarUrl);
      setSuccessMsg("Perfil actualizado correctamente.");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar el perfil');
    } finally {
      setPending(false);
    }
  };

  const handleSubmitNotifs = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setPending(true);

    try {
      const res = await apiFetch('/api/users/profile/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifPrefs)
      });
      if (!res.ok) {
        throw new Error(await parseJsonError(res));
      }
      setSuccessMsg("Notificaciones actualizadas.");
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar notificaciones');
    } finally {
      setPending(false);
    }
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
        
        <CardHeader className="p-0 mb-4 flex flex-row items-center gap-3">
          <User className="h-5 w-5 text-indigo-650" />
          <div>
            <CardTitle className="text-base">Mi Perfil</CardTitle>
            <CardDescription>Consulta y edita tu configuración</CardDescription>
          </div>
        </CardHeader>

        <div className="flex space-x-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            className={`pb-2 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            onClick={() => { setActiveTab('general'); setErrorMsg(null); setSuccessMsg(null); }}
          >
            Información General
          </button>
          <button
            type="button"
            className={`pb-2 text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            onClick={() => { setActiveTab('notifications'); setErrorMsg(null); setSuccessMsg(null); }}
          >
            Notificaciones
          </button>
        </div>

        <CardContent className="p-0">
          {activeTab === 'general' ? (
            <form className="space-y-4" onSubmit={handleSubmitProfile}>
              <div className="flex flex-col items-center gap-2 pb-2">
                <div className="relative group">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl.startsWith('http') ? avatarUrl : getApiUrl(avatarUrl)} 
                      alt={name} 
                      className="h-20 w-20 rounded-full object-cover border-2 border-indigo-500/20"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border-2 border-indigo-550/20">
                      <UserCircle className="h-12 w-12" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-900/40 group-hover:bg-slate-900/60 transition rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100"
                    title="Cambiar Foto"
                  >
                    {avatarUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  className="hidden" 
                  accept="image/*"
                />
                <span className="text-[11px] text-slate-400">Clic en la foto para cambiarla</span>
              </div>

              <label className="block text-sm text-slate-655 dark:text-slate-355">
                <span className="mb-1 block font-medium">Nombre completo</span>
                <input 
                  className={fieldClassName} 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="Tu nombre completo"
                />
              </label>

              <label className="block text-sm text-slate-655 dark:text-slate-355 opacity-70">
                <span className="mb-1 block font-medium">Email (No editable)</span>
                <input 
                  className={fieldClassName} 
                  type="email" 
                  value={user.email} 
                  readOnly 
                  disabled
                />
              </label>

              {errorMsg && (
                <p className="text-xs font-bold text-rose-500">{errorMsg}</p>
              )}
              {successMsg && (
                <p className="text-xs font-bold text-emerald-500">{successMsg}</p>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                  Cancelar
                </Button>
                <Button
                  className="text-white"
                  variant="primary"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmitNotifs}>
              {loadingNotifs ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-indigo-500" /></div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 mb-2">Preferencias globales de notificaciones por email.</p>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={notifPrefs.onTaskAssigned} onChange={e => setNotifPrefs({...notifPrefs, onTaskAssigned: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300" />
                    Al ser asignado a una tarea
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={notifPrefs.onTaskUnassigned} onChange={e => setNotifPrefs({...notifPrefs, onTaskUnassigned: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300" />
                    Al ser desasignado de una tarea
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={notifPrefs.onTaskStatusChanged} onChange={e => setNotifPrefs({...notifPrefs, onTaskStatusChanged: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300" />
                    Cuando cambie el estado de mi tarea
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={notifPrefs.onCommentAdded} onChange={e => setNotifPrefs({...notifPrefs, onCommentAdded: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300" />
                    Al recibir un comentario o mención
                  </label>
                </div>
              )}
              {errorMsg && (
                <p className="text-xs font-bold text-rose-500">{errorMsg}</p>
              )}
              {successMsg && (
                <p className="text-xs font-bold text-emerald-500">{successMsg}</p>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                  Cancelar
                </Button>
                <Button className="text-white" variant="primary" disabled={pending || loadingNotifs} type="submit">
                  {pending ? 'Guardando...' : 'Guardar Preferencias'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </div>
    </div>,
    document.body
  );
}
