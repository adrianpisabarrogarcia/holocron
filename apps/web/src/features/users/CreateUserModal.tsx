import { FormEvent } from 'react';
import type { PlatformRole } from '@holocron/contracts';
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
  newUserPassword: string;
  onNewUserPasswordChange: (val: string) => void;
  newUserRole: PlatformRole;
  onNewUserRoleChange: (val: PlatformRole) => void;
  createUserPending: boolean;
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
  newUserPassword,
  onNewUserPasswordChange,
  newUserRole,
  onNewUserRoleChange,
  createUserPending,
}: CreateUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
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
            <label className="block text-sm text-slate-650 dark:text-slate-355">
              <span className="mb-1 block font-medium">Nombre completo</span>
              <input className={fieldClassName} onChange={(event) => onNewUserNameChange(event.target.value)} required type="text" value={newUserName} placeholder="Ej: Adrian Garcia" />
            </label>
            <label className="block text-sm text-slate-650 dark:text-slate-355">
              <span className="mb-1 block font-medium">Email</span>
              <input className={fieldClassName} onChange={(event) => onNewUserEmailChange(event.target.value)} required type="email" value={newUserEmail} placeholder="adrian@holocron.local" />
            </label>
            <label className="block text-sm text-slate-650 dark:text-slate-355">
              <span className="mb-1 block font-medium">Contraseña</span>
              <input className={fieldClassName} minLength={8} onChange={(event) => onNewUserPasswordChange(event.target.value)} required type="password" value={newUserPassword} placeholder="Mínimo 8 caracteres" />
            </label>
            <label className="block text-sm text-slate-650 dark:text-slate-355">
              <span className="mb-1 block font-medium">Rol del sistema</span>
              <select className={fieldClassName} onChange={(event) => onNewUserRoleChange(event.target.value as PlatformRole)} value={newUserRole}>
                {platformRoles.map((role) => (
                  <option key={role} value={role}>
                    {role === 'ADMIN' ? 'Administrador' : 'Miembro Estándar'}
                  </option>
                ))}
              </select>
            </label>
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
    </div>
  );
}
