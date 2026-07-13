import { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../../lib/useEscapeKey';
import type { PlatformRole, WorkspaceSummary } from '@holocron/contracts';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { UserPlus, X } from 'lucide-react';
import { fieldClassName } from '../../lib/constants';

type CreateUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  newUserName: string;
  onNewUserNameChange: (val: string) => void;
  newUserEmail: string;
  onNewUserEmailChange: (val: string) => void;
  newUserRole: PlatformRole;
  onNewUserRoleChange: (val: PlatformRole) => void;
  createUserPending: boolean;
  workspaces: WorkspaceSummary[];
  selectedWorkspaceIds: string[];
  onSelectedWorkspaceIdsChange: (ids: string[]) => void;
};

const platformRoles: PlatformRole[] = ['ADMIN', 'MEMBER'];

export function CreateUserModal({
  isOpen,
  onClose,
  onSubmit,
  newUserName,
  onNewUserNameChange,
  newUserEmail,
  onNewUserEmailChange,
  newUserRole,
  onNewUserRoleChange,
  createUserPending,
  workspaces,
  selectedWorkspaceIds,
  onSelectedWorkspaceIdsChange,
}: CreateUserModalProps) {
  useEscapeKey(onClose, isOpen);
  if (!isOpen) return null;

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
          <UserPlus className="h-5 w-5 text-indigo-650" />
          <div>
            <CardTitle className="text-base">Crear Nuevo Usuario</CardTitle>
            <CardDescription>Registra un usuario en la plataforma</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Nombre completo</span>
              <input className={fieldClassName} onChange={(event) => onNewUserNameChange(event.target.value)} required type="text" value={newUserName} placeholder="Ej: Adrian Garcia" />
            </label>
            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Email</span>
              <input className={fieldClassName} onChange={(event) => onNewUserEmailChange(event.target.value)} required type="email" value={newUserEmail} placeholder="adrian@holocron.local" />
            </label>

            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Rol del sistema</span>
              <select className={fieldClassName} onChange={(event) => onNewUserRoleChange(event.target.value as PlatformRole)} value={newUserRole}>
                {platformRoles.map((role) => (
                  <option key={role} value={role}>
                    {role === 'ADMIN' ? 'Administrador' : 'Miembro Estándar'}
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
              <Button className="text-white" variant="primary" disabled={createUserPending} type="submit">
                {createUserPending ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>,
    document.body
  );
}
