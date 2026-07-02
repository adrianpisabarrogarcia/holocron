import { FormEvent, useState } from 'react';
import type { PlatformRole, ProjectMembershipRole } from '@holocron/contracts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/cn';
import { fieldClassName } from '../../lib/constants';
import { CreateUserModal } from '../users/CreateUserModal';
import { AssignMemberModal } from '../users/AssignMemberModal';
import { ProjectsAdminPage } from './ProjectsAdminPage';
import { RefreshCw, UserPlus, Users, Download } from 'lucide-react';

export type AdminPageProps = {
  adminNotice: string | null;
  createUserPending: boolean;
  handleAssignMembership: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleCreateUser: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  membershipProjectId: string;
  newUserEmail: string;
  newUserName: string;
  newUserPassword: string;
  newUserRole: PlatformRole;
  onMembershipProjectIdChange: (value: string) => void;
  onNewUserEmailChange: (value: string) => void;
  onNewUserNameChange: (value: string) => void;
  onNewUserPasswordChange: (value: string) => void;
  onNewUserRoleChange: (value: PlatformRole) => void;
  onRefreshUsers: () => void;
  onSelectedMembershipRoleChange: (value: ProjectMembershipRole) => void;
  onSelectedScrumRoleChange: (value: string) => void;
  onSelectedUserIdChange: (value: string) => void;
  projects: Array<{ id: string; name: string }>;
  folders: Array<{ id: string; name: string }>;
  selectedMembershipRole: ProjectMembershipRole;
  selectedScrumRole: string;
  selectedUserId: string;
  users: Array<{ email: string; id: string; name: string; platformRole: PlatformRole; assignedProjects?: string[] }>;
  usersError: string | null;
  usersLoading: boolean;
  usersPending: boolean;
};

export function AdminPage({
  adminNotice,
  createUserPending,
  handleAssignMembership,
  handleCreateUser,
  membershipProjectId,
  newUserEmail,
  newUserName,
  newUserPassword,
  newUserRole,
  onMembershipProjectIdChange,
  onNewUserEmailChange,
  onNewUserNameChange,
  onNewUserPasswordChange,
  onNewUserRoleChange,
  onRefreshUsers,
  onSelectedMembershipRoleChange,
  onSelectedScrumRoleChange,
  onSelectedUserIdChange,
  projects,
  folders,
  selectedMembershipRole,
  selectedScrumRole,
  selectedUserId,
  users,
  usersError,
  usersLoading,
  usersPending,
}: AdminPageProps) {
  // Modal toggle states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // Client-side search state
  const [searchQuery, setSearchQuery] = useState('');

  // Handle submissions and close modal on success
  const onCreateUserSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await handleCreateUser(e);
      setIsUserModalOpen(false);
    } catch {
      // Keep modal open if error
    }
  };

  const onAssignMemberSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await handleAssignMembership(e);
      setIsAssignModalOpen(false);
    } catch {
      // Keep modal open if error
    }
  };

  // Filter users based on query
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  // Export Users to Excel (via CSV with UTF-8 BOM)
  const exportToExcel = () => {
    const headers = ['Nombre', 'Email', 'Rol del Sistema', 'Proyectos Asignados', 'ID de Cuenta'];
    const rows = filteredUsers.map((u) => [
      u.name,
      u.email,
      u.platformRole,
      u.assignedProjects && u.assignedProjects.length > 0 ? u.assignedProjects.join(', ') : 'Ninguno',
      u.id,
    ]);

    const csvContent =
      '\uFEFF' + // UTF-8 BOM to prevent accent issues in Excel
      [
        headers.join(';'),
        ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(';')),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `holocron_usuarios_${new Date().toISOString().substring(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      {adminNotice ? (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
          {adminNotice}
        </div>
      ) : null}
      
      {usersError ? (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-sm text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
          {usersError}
        </div>
      ) : null}

      {/* TOOLBAR */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search bar */}
        <div className="relative w-full md:max-w-xs">
          <input
            className={cn(fieldClassName, 'pr-10')}
            placeholder="Buscar usuario por nombre o email..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" disabled={usersLoading} onClick={onRefreshUsers} type="button">
            <RefreshCw className={cn('h-3.5 w-3.5', usersLoading && 'animate-spin')} />
            <span>{usersLoading ? 'Actualizando...' : 'Recargar'}</span>
          </Button>
          <Button size="sm" variant="outline" onClick={exportToExcel} type="button">
            <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Exportar Excel</span>
          </Button>
          <Button size="sm" variant="primary" className="text-white" onClick={() => setIsUserModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span>Nuevo Usuario</span>
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setIsAssignModalOpen(true)}>
            <Users className="h-4 w-4" />
            <span>Asignar Miembro</span>
          </Button>
        </div>
      </div>

      {/* PREMIUM USERS TABLE */}
      <Card>
        <CardHeader className="border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
          <CardTitle>Directorio de Cuentas</CardTitle>
          <CardDescription>Visualiza y administra todos los accesos del sistema</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600 dark:text-slate-355">
              <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 dark:border-slate-800/80">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Rol del Sistema</th>
                  <th className="px-6 py-4">Proyectos Asignados</th>
                  <th className="px-6 py-4">ID de Cuenta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 bg-white/30 dark:bg-slate-900/10">
                {filteredUsers.map((member) => {
                  // Get initials
                  const initials = member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                  
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition duration-150">
                      {/* Avatar & Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 font-extrabold text-xs flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 leading-snug">{member.name}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* Email */}
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-405 font-medium">
                        {member.email}
                      </td>
                      
                      {/* Role Badges */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-wide border',
                          member.platformRole === 'ADMIN'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30'
                            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-305 dark:border-slate-700/60'
                        )}>
                          {member.platformRole}
                        </span>
                      </td>

                      {/* Assigned Projects */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {member.assignedProjects && member.assignedProjects.length > 0 ? (
                            member.assignedProjects.map((projName) => (
                              <span key={projName} className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-indigo-750 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 px-2 py-0.5 text-xs font-semibold">
                                {projName}
                              </span>
                            ))
                          ) : (
                            <span className="italic text-xs text-slate-400 dark:text-slate-500">
                              Ninguno
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ID */}
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {member.id}
                      </td>
                    </tr>
                  );
                })}
                
                {!usersLoading && !filteredUsers.length ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-slate-400 dark:text-slate-500" colSpan={5}>
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE USER MODAL */}
      <CreateUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={onCreateUserSubmit}
        newUserName={newUserName}
        onNewUserNameChange={onNewUserNameChange}
        newUserEmail={newUserEmail}
        onNewUserEmailChange={onNewUserEmailChange}
        newUserPassword={newUserPassword}
        onNewUserPasswordChange={onNewUserPasswordChange}
        newUserRole={newUserRole}
        onNewUserRoleChange={onNewUserRoleChange}
        createUserPending={createUserPending}
      />

      {/* ASSIGN PROJECT MEMBERSHIP MODAL */}
      <AssignMemberModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSubmit={onAssignMemberSubmit}
        users={users}
        projects={projects}
        folders={folders}
        selectedUserId={selectedUserId}
        onSelectedUserIdChange={onSelectedUserIdChange}
        membershipProjectId={membershipProjectId}
        onMembershipProjectIdChange={onMembershipProjectIdChange}
        selectedMembershipRole={selectedMembershipRole}
        onSelectedMembershipRoleChange={onSelectedMembershipRoleChange}
        selectedScrumRole={selectedScrumRole}
        onSelectedScrumRoleChange={onSelectedScrumRoleChange}
        usersPending={usersPending}
      />
    </section>
  );
}
