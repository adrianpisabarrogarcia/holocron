import { useEffect, useState } from 'react';
import type { WorkspaceSummary, WorkspaceMemberSummary } from '@holocron/contracts';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { apiFetch, parseJsonError, getApiUrl } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/cn';
import { fieldClassName } from '../../lib/constants';
import {
  Plus,
  Settings,
  Trash2,
  Users,
  Building2,
  ChevronRight,
  Pencil,
  UserPlus,
  X,
  Upload,
  ImageIcon,
} from 'lucide-react';

type Tab = 'workspaces' | 'members';

export function WorkspacesAdminPage() {
  const { workspaces, loading, loadWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace } =
    useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<Tab>('workspaces');
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceSummary | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create workspace form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [createPending, setCreatePending] = useState(false);

  // Edit workspace form
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [editPending, setEditPending] = useState(false);

  // Invite member form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'WORKSPACE_ADMIN' | 'MEMBER'>('MEMBER');
  const [invitePending, setInvitePending] = useState(false);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const handleSelectWorkspace = async (ws: WorkspaceSummary) => {
    setSelectedWorkspace(ws);
    setActiveTab('members');
    setMembersLoading(true);
    setMembersError(null);
    try {
      const res = await apiFetch(`/workspaces/${ws.slug}/members`);
      if (!res.ok) throw new Error(await parseJsonError(res));
      setMembers(await res.json() as WorkspaceMemberSummary[]);
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : 'Error cargando miembros');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatePending(true);
    setError(null);
    try {
      await createWorkspace({ name: newName, slug: newSlug, description: newDescription, primaryColor: newColor });
      setNotice(`Workspace "${newName}" creado.`);
      setShowCreateForm(false);
      setNewName(''); setNewSlug(''); setNewDescription(''); setNewColor('#6366f1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear workspace');
    } finally {
      setCreatePending(false);
    }
  };

  const handleEditWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) return;
    setEditPending(true);
    setError(null);
    try {
      await updateWorkspace(selectedWorkspace.slug, {
        name: editName,
        description: editDescription,
        primaryColor: editColor,
        ...(editLogoUrl !== null && { logoUrl: editLogoUrl }),
      });
      setNotice(`Workspace actualizado.`);
      setShowEditForm(false);
      // Refresh selected
      setSelectedWorkspace((prev) =>
        prev
          ? { ...prev, name: editName, description: editDescription, primaryColor: editColor, logoUrl: editLogoUrl ?? prev.logoUrl }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar workspace');
    } finally {
      setEditPending(false);
    }
  };

  const handleUploadLogo = async (file: File) => {
    setLogoUploading(true);
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await apiFetch('/api/tasks/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, base64Data: base64 }),
      });
      if (!res.ok) throw new Error(await parseJsonError(res));
      const { url } = (await res.json()) as { url: string };
      setEditLogoUrl(url);
      setEditLogoPreview(getApiUrl(url));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleDeleteWorkspace = async (ws: WorkspaceSummary) => {
    if (!confirm(`¿Eliminar workspace "${ws.name}"? Esto eliminará todos sus proyectos y carpetas.`)) return;
    try {
      await deleteWorkspace(ws.slug);
      setNotice(`Workspace "${ws.name}" eliminado.`);
      if (selectedWorkspace?.slug === ws.slug) {
        setSelectedWorkspace(null);
        setActiveTab('workspaces');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar workspace');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) return;
    setInvitePending(true);
    setError(null);
    try {
      const res = await apiFetch(`/workspaces/${selectedWorkspace.slug}/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, workspaceRole: inviteRole }),
      });
      if (!res.ok) throw new Error(await parseJsonError(res));
      setNotice(`Usuario ${inviteEmail} invitado.`);
      setShowInviteForm(false);
      setInviteEmail(''); setInviteName('');
      // Reload members
      await handleSelectWorkspace(selectedWorkspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al invitar usuario');
    } finally {
      setInvitePending(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!selectedWorkspace) return;
    if (!confirm(`¿Eliminar a ${name} del workspace?`)) return;
    try {
      const res = await apiFetch(`/workspaces/${selectedWorkspace.slug}/members/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await parseJsonError(res));
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      setNotice(`${name} eliminado del workspace.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar miembro');
    }
  };

  const handleChangeMemberRole = async (userId: string, workspaceRole: 'WORKSPACE_ADMIN' | 'MEMBER') => {
    if (!selectedWorkspace) return;
    try {
      const res = await apiFetch(`/workspaces/${selectedWorkspace.slug}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceRole }),
      });
      if (!res.ok) throw new Error(await parseJsonError(res));
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, workspaceRole } : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar rol');
    }
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      {/* Notices */}
      {notice && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 p-3 text-sm text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            Gestión de Workspaces
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Administra todos los workspaces de la plataforma</p>
        </div>
        <Button size="sm" variant="primary" className="text-white" onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4" />
          <span>Nuevo Workspace</span>
        </Button>
      </div>

      {/* Tabs */}
      {selectedWorkspace && (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
          {(['workspaces', 'members'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                activeTab === tab
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {tab === 'workspaces' ? 'Workspaces' : `Miembros de "${selectedWorkspace.name}"`}
            </button>
          ))}
        </div>
      )}

      {/* Create Workspace Form */}
      {showCreateForm && (
        <Card>
          <CardHeader className="border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Crear nuevo Workspace</CardTitle>
              <button onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleCreateWorkspace} className="space-y-4 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nombre</label>
                  <input className={fieldClassName} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Acme Corp" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Slug (URL)</label>
                  <input className={fieldClassName} value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="acme-corp" required pattern="[a-z0-9-]+" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Descripción</label>
                <input className={fieldClassName} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Descripción opcional..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Color primario</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-9 w-14 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">{newColor}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" variant="primary" className="text-white" disabled={createPending}>
                  {createPending ? 'Creando...' : 'Crear Workspace'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Workspaces List Tab */}
      {activeTab === 'workspaces' && (
        <Card>
          <CardHeader className="border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
            <CardTitle>Todos los Workspaces</CardTitle>
            <CardDescription>Haz clic en un workspace para gestionar sus miembros</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-400">Cargando...</div>
            ) : workspaces.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">No hay workspaces creados aún.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {workspaces.map((ws) => (
                  <div key={ws.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition group">
                    <button
                      className="flex items-center gap-4 text-left flex-1"
                      onClick={() => handleSelectWorkspace(ws)}
                    >
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0 overflow-hidden"
                        style={{ backgroundColor: ws.primaryColor ?? '#6366f1' }}
                      >
                        {ws.logoUrl ? (
                          <img src={getApiUrl(ws.logoUrl)} alt={ws.name} className="h-full w-full object-cover" />
                        ) : (
                          ws.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{ws.name}</p>
                        <p className="text-xs text-slate-400">/{ws.slug} · {ws.memberCount ?? 0} miembros · {ws.projectCount ?? 0} proyectos</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-indigo-500 transition" />
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedWorkspace(ws);
                          setEditName(ws.name);
                          setEditDescription(ws.description ?? '');
                          setEditColor(ws.primaryColor ?? '#6366f1');
                          setEditLogoUrl(null);
                          setEditLogoPreview(ws.logoUrl ? getApiUrl(ws.logoUrl) : null);
                          setShowEditForm(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                        title="Editar workspace"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkspace(ws)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        title="Eliminar workspace"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Workspace Modal inline */}
      {showEditForm && selectedWorkspace && (
        <Card>
          <CardHeader className="border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Editar Workspace: {selectedWorkspace.name}</CardTitle>
              <button onClick={() => setShowEditForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleEditWorkspace} className="space-y-4 max-w-lg">
              {/* Logo upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Logo del workspace</label>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div
                    className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0 overflow-hidden"
                    style={{ backgroundColor: editColor || (selectedWorkspace.primaryColor ?? '#6366f1') }}
                  >
                    {editLogoPreview ? (
                      <img src={editLogoPreview} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      selectedWorkspace.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Upload button */}
                  <label className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed cursor-pointer transition text-sm font-medium',
                    logoUploading
                      ? 'opacity-50 pointer-events-none border-slate-300 dark:border-slate-700 text-slate-400'
                      : 'border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                  )}>
                    {logoUploading ? (
                      <><span className="h-3.5 w-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />Subiendo...</>
                    ) : (
                      <><Upload className="h-3.5 w-3.5" />Subir imagen</>  
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadLogo(f); }}
                    />
                  </label>
                  {editLogoPreview && (
                    <button
                      type="button"
                      onClick={() => { setEditLogoUrl(''); setEditLogoPreview(null); }}
                      className="text-xs text-rose-500 hover:text-rose-700 transition"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nombre</label>
                <input className={fieldClassName} value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Descripción</label>
                <input className={fieldClassName} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Color primario</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-9 w-14 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">{editColor}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" variant="primary" className="text-white" disabled={editPending || logoUploading}>
                  {editPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && selectedWorkspace && (
        <Card>
          <CardHeader className="border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  Miembros de &ldquo;{selectedWorkspace.name}&rdquo;
                </CardTitle>
                <CardDescription>Gestiona los usuarios y sus roles en este workspace</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowInviteForm(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                <span>Invitar</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Invite Form */}
            {showInviteForm && (
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <form onSubmit={handleInviteMember} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className={fieldClassName} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email *" type="email" required />
                    <input className={fieldClassName} value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Nombre (si es nuevo usuario)" />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'WORKSPACE_ADMIN' | 'MEMBER')}
                      className={fieldClassName}
                    >
                      <option value="MEMBER">Miembro</option>
                      <option value="WORKSPACE_ADMIN">Admin del Workspace</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" className="text-white" size="sm" disabled={invitePending}>
                      {invitePending ? 'Invitando...' : 'Invitar'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowInviteForm(false)}>Cancelar</Button>
                  </div>
                </form>
              </div>
            )}

            {membersLoading ? (
              <div className="p-6 text-center text-sm text-slate-400">Cargando miembros...</div>
            ) : membersError ? (
              <div className="p-6 text-center text-sm text-rose-500">{membersError}</div>
            ) : members.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">No hay miembros en este workspace.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img src={getApiUrl(member.avatarUrl)} alt={member.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={member.workspaceRole}
                        onChange={(e) => handleChangeMemberRole(member.userId, e.target.value as 'WORKSPACE_ADMIN' | 'MEMBER')}
                        className={cn(fieldClassName, 'py-1 text-xs w-40')}
                      >
                        <option value="MEMBER">Miembro</option>
                        <option value="WORKSPACE_ADMIN">Admin</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.userId, member.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
