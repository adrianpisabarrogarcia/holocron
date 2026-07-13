import { FormEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../../lib/useEscapeKey';
import type { PlatformRole, WorkspaceSummary } from '@holocron/contracts';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { UserCog, X, UserCircle, Camera, Loader2 } from 'lucide-react';
import { fieldClassName } from '../../lib/constants';
import { useBoardStore } from '../../store/useBoardStore';
import { getApiUrl } from '../../lib/api';
import { compressImageToWebp } from '../board/AttachmentsSection';

type EditUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  name: string;
  onNameChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
  role: PlatformRole;
  onRoleChange: (val: PlatformRole) => void;
  avatarUrl: string | null;
  onAvatarUrlChange: (val: string | null) => void;
  pending: boolean;
  workspaces: WorkspaceSummary[];
  selectedWorkspaceIds: string[];
  onSelectedWorkspaceIdsChange: (ids: string[]) => void;
};

const platformRoles: PlatformRole[] = ['ADMIN', 'MEMBER'];

export function EditUserModal({
  isOpen,
  onClose,
  onSubmit,
  name,
  onNameChange,
  email,
  onEmailChange,
  role,
  onRoleChange,
  avatarUrl,
  onAvatarUrlChange,
  pending,
  workspaces,
  selectedWorkspaceIds,
  onSelectedWorkspaceIdsChange,
}: EditUserModalProps) {
  const { uploadFile } = useBoardStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      if (file.type.startsWith('image/')) {
        const base64Data = await compressImageToWebp(file, 200);
        const dotIdx = file.name.lastIndexOf('.');
        const filename = (dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name) + '.webp';
        
        const { url } = await uploadFile(filename, base64Data);
        onAvatarUrlChange(url);
      } else {
        alert("Por favor selecciona una imagen válida.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      setAvatarUploading(false);
    }
  };

  useEscapeKey(onClose, isOpen);
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm p-4 w-screen h-screen">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200 outline-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
        
        <CardHeader className="p-0 mb-4 flex flex-row items-center gap-3">
          <UserCog className="h-5 w-5 text-indigo-655" />
          <div>
            <CardTitle className="text-base">Editar Usuario</CardTitle>
            <CardDescription>Modifica los datos del usuario en la plataforma</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <form className="space-y-4" onSubmit={onSubmit}>
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800/40">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="relative group h-20 w-20 rounded-full overflow-hidden border-2 border-indigo-100 dark:border-indigo-900 bg-slate-50 dark:bg-slate-955 flex items-center justify-center shadow-md shrink-0">
                {avatarUploading ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                ) : avatarUrl ? (
                  <img
                    src={getApiUrl(avatarUrl)}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-12 w-12 text-slate-400" />
                )}
                
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-[10px] text-white font-bold gap-1 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>CAMBIAR</span>
                </button>
              </div>
              <span className="text-[10px] text-slate-450 dark:text-slate-550 font-bold uppercase tracking-wider">Foto de Perfil</span>
            </div>

            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Nombre completo</span>
              <input className={fieldClassName} onChange={(event) => onNameChange(event.target.value)} required type="text" value={name} placeholder="Ej: Adrian Garcia" />
            </label>
            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Email</span>
              <input className={fieldClassName} onChange={(event) => onEmailChange(event.target.value)} required type="email" value={email} placeholder="adrian@holocron.local" />
            </label>

            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Rol del sistema</span>
              <select className={fieldClassName} onChange={(event) => onRoleChange(event.target.value as PlatformRole)} value={role}>
                {platformRoles.map((r) => (
                  <option key={r} value={r}>
                    {r === 'ADMIN' ? 'Administrador' : 'Miembro Estándar'}
                  </option>
                ))}
              </select>
            </label>

            {/* Workspace selector */}
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-slate-655 dark:text-slate-355">Asignar a Workspaces</span>
              <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                {workspaces.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay workspaces creados aún.</p>
                ) : (
                  workspaces.map((ws) => {
                    const isChecked = selectedWorkspaceIds.includes(ws.id);
                    return (
                      <label key={ws.id} className="flex items-center gap-2.5 text-sm text-slate-655 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onSelectedWorkspaceIdsChange([...selectedWorkspaceIds, ws.id]);
                            } else {
                              onSelectedWorkspaceIdsChange(selectedWorkspaceIds.filter((id) => id !== ws.id));
                            }
                          }}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="font-medium">{ws.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="text-white" variant="primary" disabled={pending} type="submit">
                {pending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>,
    document.body
  );
}
