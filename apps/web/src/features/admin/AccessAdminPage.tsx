import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { ProjectSummary, FolderSummary, ProjectMemberSummary, ProjectMembershipRole } from '@holocron/contracts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useBoardStore } from '../../store/useBoardStore';
import { useAdminStore } from '../../store/useAdminStore';
import { apiFetch, parseJsonError } from '../../lib/api';
import { fieldClassName } from '../../lib/constants';
import { cn } from '../../lib/cn';
import { Folder, Key, Trash2, Plus, RefreshCw, UserCheck, ShieldAlert } from 'lucide-react';

const membershipRoles: ProjectMembershipRole[] = ['MANAGER', 'CONTRIBUTOR', 'VIEWER'];
const scrumRoles = [
  { value: '', label: 'Sin asignar (Ninguno)' },
  { value: 'DEVELOPER', label: 'Developer (Desarrollador)' },
  { value: 'PRODUCT_OWNER', label: 'Product Owner' },
  { value: 'SCRUM_MASTER', label: 'Scrum Master' },
];

const inlineSelectClassName =
  'rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/20';

export function AccessAdminPage() {
  const { projects, folders, loadBoard } = useBoardStore();
  const { users, loadUsers } = useAdminStore();

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add member form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectMembershipRole>('CONTRIBUTOR');
  const [selectedScrumRole, setSelectedScrumRole] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Load initial data
  useEffect(() => {
    void loadBoard();
    void loadUsers();
  }, []);

  // Fetch members when target changes
  const fetchMembers = async (target: string) => {
    const [type, id] = target.split(':');
    setLoadingMembers(true);
    setError(null);
    try {
      const endpoint = type === 'folder' 
        ? `/api/folders/${id}/members` 
        : `/api/projects/${id}/members`;
      
      const response = await apiFetch(endpoint);
      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar miembros');
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (selectedTarget) {
      void fetchMembers(selectedTarget);
    } else {
      setMembers([]);
    }
  }, [selectedTarget]);

  // Flatten folders and projects in tree order
  const getHierarchicalTargets = () => {
    const list: Array<{
      type: 'project' | 'folder';
      id: string;
      name: string;
      depth: number;
    }> = [];

    const recurse = (parentId: string | null, depth: number) => {
      folders
        .filter((f) => f.parentFolderId === parentId)
        .forEach((f) => {
          list.push({ type: 'folder', id: f.id, name: f.name, depth });
          recurse(f.id, depth + 1);
        });

      projects
        .filter((p) => p.folderId === parentId)
        .forEach((p) => {
          list.push({ type: 'project', id: p.id, name: p.name, depth });
        });
    };

    recurse(null, 0);

    // Add orphaned projects
    projects.forEach((p) => {
      if (!list.some((item) => item.type === 'project' && item.id === p.id)) {
        list.push({ type: 'project', id: p.id, name: p.name, depth: 0 });
      }
    });

    return list;
  };

  // Add membership
  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTarget || !selectedUserId) return;
    const [type, id] = selectedTarget.split(':');
    
    setAddingMember(true);
    setError(null);
    try {
      const endpoint = type === 'folder'
        ? `/api/folders/${id}/members`
        : `/api/projects/${id}/members`;

      const bodyPayload = type === 'folder'
        ? { userId: selectedUserId, role: selectedRole }
        : { userId: selectedUserId, role: selectedRole, scrumRole: selectedScrumRole || null };

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      // Reset form
      setSelectedUserId('');
      setSelectedRole('CONTRIBUTOR');
      setSelectedScrumRole('');
      
      // Refresh list
      void fetchMembers(selectedTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al añadir miembro');
    } finally {
      setAddingMember(false);
    }
  };

  // Update role/scrumRole inline
  const handleUpdateRole = async (userId: string, newRole: ProjectMembershipRole, newScrumRole?: string | null) => {
    if (!selectedTarget) return;
    const [type, id] = selectedTarget.split(':');
    
    setError(null);
    try {
      const endpoint = type === 'folder'
        ? `/api/folders/${id}/members`
        : `/api/projects/${id}/members`;

      const bodyPayload = type === 'folder'
        ? { userId, role: newRole }
        : { userId, role: newRole, scrumRole: newScrumRole !== undefined ? newScrumRole : null };

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }
      
      // Refresh list
      void fetchMembers(selectedTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar rol');
    }
  };

  // Remove membership
  const handleRemoveMember = async (userId: string, name: string) => {
    if (!selectedTarget) return;
    if (!confirm(`¿Estás seguro de que quieres revocar el acceso a "${name}"?`)) return;
    const [type, id] = selectedTarget.split(':');
    
    setError(null);
    try {
      const endpoint = type === 'folder'
        ? `/api/folders/${id}/members/${userId}`
        : `/api/projects/${id}/members/${userId}`;

      const response = await apiFetch(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }
      
      // Refresh list
      void fetchMembers(selectedTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar miembro');
    }
  };

  // Calculate targets type and name
  const getSelectedInfo = () => {
    if (!selectedTarget) return null;
    const [type, id] = selectedTarget.split(':');
    if (type === 'folder') {
      const folder = folders.find(f => f.id === id);
      return { type: 'Carpeta', name: folder?.name || 'Carpeta Desconocida', isFolder: true };
    } else {
      const project = projects.find(p => p.id === id);
      return { type: 'Proyecto', name: project?.name || 'Proyecto Desconocido', isFolder: false };
    }
  };

  const selectedInfo = getSelectedInfo();

  // Filter users not already in the project/folder
  const availableUsers = users.filter((u) => {
    return !members.some((m) => m.userId === u.id);
  });

  return (
    <section className="grid gap-6 md:grid-cols-3 animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: HIERARCHY TREE */}
      <Card className="md:col-span-1 shadow-sm flex flex-col max-h-[calc(100vh-12rem)] overflow-y-auto">
        <CardHeader className="border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-indigo-650 shrink-0" />
            <CardTitle className="text-base">Proyectos y Carpetas</CardTitle>
          </div>
          <CardDescription>Selecciona un recurso para gestionar sus accesos</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 px-3 flex-1">
          <div className="space-y-1">
            {getHierarchicalTargets().map((item) => {
              const isSelected = selectedTarget === `${item.type}:${item.id}`;
              const indentClass = item.depth === 0 ? '' : `pl-${item.depth * 4}`;
              
              return (
                <button
                  key={`${item.type}:${item.id}`}
                  onClick={() => setSelectedTarget(`${item.type}:${item.id}`)}
                  className={cn(
                    'w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl text-xs transition duration-150 border border-transparent font-medium select-none',
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 font-bold border-indigo-100 dark:border-indigo-900/30 shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-900/40 hover:text-slate-900 dark:hover:text-slate-150'
                  )}
                  style={{ paddingLeft: `${item.depth * 14 + 10}px` }}
                >
                  <span className="shrink-0">{item.type === 'folder' ? '📁' : '📄'}</span>
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* RIGHT COLUMN: MEMBERS AND ASSIGNMENT */}
      <div className="md:col-span-2 space-y-6">
        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-sm text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
            {error}
          </div>
        )}

        {!selectedTarget ? (
          <Card className="flex flex-col items-center justify-center text-center p-12 min-h-[300px] border-dashed border-2">
            <UserCheck className="h-12 w-12 text-slate-400 dark:text-slate-650 mb-3 animate-pulse" />
            <CardTitle className="text-base text-slate-700 dark:text-slate-300">Ningún recurso seleccionado</CardTitle>
            <CardDescription className="max-w-xs mt-1">
              Haz clic en cualquier proyecto o carpeta de la lista izquierda para visualizar y cambiar sus permisos de acceso.
            </CardDescription>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                      {selectedInfo?.type}
                    </span>
                    <CardTitle className="text-lg font-black">{selectedInfo?.name}</CardTitle>
                  </div>
                  <CardDescription className="mt-1">
                    Control de accesos y responsabilidades directas en este recurso
                  </CardDescription>
                </div>
                
                <Button size="sm" variant="outline" disabled={loadingMembers} onClick={() => void fetchMembers(selectedTarget)}>
                  <RefreshCw className={cn('h-3.5 w-3.5', loadingMembers && 'animate-spin')} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              
              {/* INLINE ADD MEMBER FORM */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 p-4.5 rounded-2xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                  <Plus className="h-4.5 w-4.5 text-indigo-650" />
                  Añadir miembro a este {selectedInfo?.type.toLowerCase()}
                </h3>
                
                <form onSubmit={handleAddMember} className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 items-end">
                  <label className="block text-xs text-slate-655 dark:text-slate-355 sm:col-span-2 md:col-span-1.5">
                    <span className="mb-1 block font-semibold">Usuario</span>
                    <select
                      className={fieldClassName}
                      disabled={!availableUsers.length || addingMember}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      required
                      value={selectedUserId}
                    >
                      <option value="">Selecciona un usuario</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs text-slate-655 dark:text-slate-355">
                    <span className="mb-1 block font-semibold">Permiso</span>
                    <select
                      className={fieldClassName}
                      disabled={addingMember}
                      onChange={(e) => setSelectedRole(e.target.value as ProjectMembershipRole)}
                      value={selectedRole}
                    >
                      {membershipRoles.map((role) => (
                        <option key={role} value={role}>
                          {role === 'MANAGER' ? 'Gestor' : role === 'CONTRIBUTOR' ? 'Colaborador' : 'Lector'}
                        </option>
                      ))}
                    </select>
                  </label>

                  {!selectedInfo?.isFolder ? (
                    <label className="block text-xs text-slate-655 dark:text-slate-355">
                      <span className="mb-1 block font-semibold">Rol de Equipo</span>
                      <select
                        className={fieldClassName}
                        disabled={addingMember}
                        onChange={(e) => setSelectedScrumRole(e.target.value)}
                        value={selectedScrumRole}
                      >
                        {scrumRoles.map((sr) => (
                          <option key={sr.value} value={sr.value}>
                            {sr.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <Button
                    className="text-white w-full h-10 flex justify-center items-center font-bold"
                    variant="primary"
                    disabled={!selectedUserId || addingMember}
                    type="submit"
                  >
                    {addingMember ? 'Asignando...' : 'Asignar'}
                  </Button>
                </form>
              </div>

              {/* MEMBERS LIST TABLE */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Miembros Directos Asignados
                </h3>
                
                {loadingMembers ? (
                  <div className="flex justify-center py-10">
                    <RefreshCw className="h-7 w-7 animate-spin text-indigo-650" />
                  </div>
                ) : !members.length ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/5 dark:bg-slate-900/5">
                    <ShieldAlert className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">No hay ningún miembro asignado directamente.</p>
                    <p className="text-[10px] text-slate-405 dark:text-slate-550 mt-0.5">Utiliza el formulario de arriba para añadir el primero.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-slate-200/60 dark:border-slate-800/80 rounded-2xl">
                    <table className="min-w-full text-left text-xs text-slate-600 dark:text-slate-355">
                      <thead className="bg-slate-50 dark:bg-slate-900/65 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/80 dark:border-slate-800/80">
                        <tr>
                          <th className="px-5 py-3">Nombre</th>
                          <th className="px-5 py-3">Email</th>
                          <th className="px-5 py-3">Permiso</th>
                          {!selectedInfo?.isFolder && <th className="px-5 py-3">Rol Equipo</th>}
                          <th className="px-5 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 bg-white dark:bg-slate-900/20">
                        {members.map((m) => (
                          <tr key={m.userId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                            <td className="px-5 py-3 font-bold text-slate-950 dark:text-slate-100">{m.name}</td>
                            <td className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">{m.email}</td>
                            
                            {/* INLINE PERMISSION ROLE SELECT */}
                            <td className="px-5 py-3">
                              <select
                                className={cn(inlineSelectClassName, 'w-28 h-8')}
                                onChange={(e) => handleUpdateRole(m.userId, e.target.value as ProjectMembershipRole, m.scrumRole)}
                                value={m.role}
                              >
                                {membershipRoles.map((role) => (
                                  <option key={role} value={role}>
                                    {role === 'MANAGER' ? 'Gestor' : role === 'CONTRIBUTOR' ? 'Colaborador' : 'Lector'}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* INLINE SCRUM ROLE SELECT (only projects) */}
                            {!selectedInfo?.isFolder && (
                              <td className="px-5 py-3">
                                <select
                                  className={cn(inlineSelectClassName, 'w-40 h-8')}
                                  onChange={(e) => handleUpdateRole(m.userId, m.role, e.target.value)}
                                  value={m.scrumRole || ''}
                                >
                                  {scrumRoles.map((sr) => (
                                    <option key={sr.value} value={sr.value}>
                                      {sr.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            )}

                            {/* REMOVE ACCESS ACTION BUTTON */}
                            <td className="px-5 py-3 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 h-8 w-8 p-0 inline-flex items-center justify-center rounded-xl"
                                onClick={() => handleRemoveMember(m.userId, m.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        )}
      </div>

    </section>
  );
}
