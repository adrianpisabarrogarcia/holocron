import { FormEvent } from 'react';
import type { ProjectMembershipRole } from '@holocron/contracts';
import { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Users, X } from 'lucide-react';
import { fieldClassName } from '../../lib/constants';

type AssignMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  users: Array<{ email: string; id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  folders: Array<{ id: string; name: string }>;
  selectedUserId: string;
  onSelectedUserIdChange: (val: string) => void;
  membershipProjectId: string;
  onMembershipProjectIdChange: (val: string) => void;
  selectedMembershipRole: ProjectMembershipRole;
  onSelectedMembershipRoleChange: (val: ProjectMembershipRole) => void;
  selectedScrumRole: string;
  onSelectedScrumRoleChange: (val: string) => void;
  usersPending: boolean;
};

const membershipRoles: ProjectMembershipRole[] = ['MANAGER', 'CONTRIBUTOR', 'VIEWER'];
const scrumRoles = [
  { value: '', label: 'Sin asignar (Ninguno)' },
  { value: 'DEVELOPER', label: 'Developer (Desarrollador)' },
  { value: 'PRODUCT_OWNER', label: 'Product Owner' },
  { value: 'SCRUM_MASTER', label: 'Scrum Master' },
];

export function AssignMemberModal({
  isOpen,
  onClose,
  onSubmit,
  users,
  projects,
  folders,
  selectedUserId,
  onSelectedUserIdChange,
  membershipProjectId,
  onMembershipProjectIdChange,
  selectedMembershipRole,
  onSelectedMembershipRoleChange,
  selectedScrumRole,
  onSelectedScrumRoleChange,
  usersPending,
}: AssignMemberModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
        
        <CardHeader className="p-0 mb-4 flex flex-row items-center gap-3">
          <Users className="h-5 w-5 text-indigo-650" />
          <div>
            <CardTitle className="text-base">Asignar Miembro a Proyecto</CardTitle>
            <CardDescription>Concede acceso de lectura/escritura a un proyecto</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Usuario</span>
              <select
                className={fieldClassName}
                disabled={!users.length || usersPending}
                onChange={(event) => onSelectedUserIdChange(event.target.value)}
                required
                value={selectedUserId}
              >
                <option value="">Selecciona un usuario</option>
                {users.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Asignar a (Proyecto o Carpeta)</span>
              <select
                className={fieldClassName}
                disabled={(!projects.length && !folders.length) || usersPending}
                onChange={(event) => onMembershipProjectIdChange(event.target.value)}
                required
                value={membershipProjectId}
              >
                <option value="">Selecciona un proyecto o una carpeta</option>
                {projects.length > 0 && (
                  <optgroup label="Proyectos">
                    {projects.map((project) => (
                      <option key={project.id} value={`project:${project.id}`}>
                        {project.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {folders.length > 0 && (
                  <optgroup label="Carpetas">
                    {folders.map((folder) => (
                      <option key={folder.id} value={`folder:${folder.id}`}>
                        📁 {folder.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Rol en el proyecto</span>
              <select
                className={fieldClassName}
                disabled={usersPending}
                onChange={(event) => onSelectedMembershipRoleChange(event.target.value as ProjectMembershipRole)}
                value={selectedMembershipRole}
              >
                {membershipRoles.map((role) => (
                  <option key={role} value={role}>
                    {role === 'MANAGER' ? 'Gestor (Manager)' : role === 'CONTRIBUTOR' ? 'Colaborador' : 'Lector (Viewer)'}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-655 dark:text-slate-355">
              <span className="mb-1 block font-medium">Rol Scrum / Rol de Equipo</span>
              <select
                className={fieldClassName}
                disabled={usersPending}
                onChange={(event) => onSelectedScrumRoleChange(event.target.value)}
                value={selectedScrumRole}
              >
                {scrumRoles.map((sr) => (
                  <option key={sr.value} value={sr.value}>
                    {sr.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="text-white" variant="primary" disabled={!membershipProjectId || !selectedUserId || usersPending} type="submit">
                {usersPending ? 'Asignando...' : 'Asignar Miembro'}
              </Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>
  );
}
