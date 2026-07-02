export type HealthResponse = {
  status: 'ok';
};

export type PlatformRole = 'ADMIN' | 'MEMBER';

export type ProjectMembershipRole = 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  platformRole: PlatformRole;
  assignedProjects?: string[];
  assignedFolders?: string[];
};

export type AuthResponse = {
  accessToken: string;
  user: AuthenticatedUser;
};

export type ProjectColumnSummary = {
  id: string;
  projectId: string;
  name: string;
  emoji: string | null;
  position: number;
};

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  membershipRole: ProjectMembershipRole | null;
  taskCount: number;
  completedTaskCount: number;
  startDate?: string | null;
  endDate?: string | null;
  folderId?: string | null;
  columns?: ProjectColumnSummary[];
};

export type ScrumRole = 'DEVELOPER' | 'PRODUCT_OWNER' | 'SCRUM_MASTER';

export type ProjectMemberSummary = {
  userId: string;
  email: string;
  name: string;
  platformRole: PlatformRole;
  role: ProjectMembershipRole;
  scrumRole: ScrumRole | null;
};

export type FolderMemberSummary = {
  userId: string;
  email: string;
  name: string;
  platformRole: PlatformRole;
  role: ProjectMembershipRole;
};

export type UpsertProjectMemberInput = {
  userId: string;
  role: ProjectMembershipRole;
  scrumRole?: ScrumRole | null;
};

export type UpsertFolderMemberInput = {
  userId: string;
  role: ProjectMembershipRole;
};

export type TaskSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isBlocked: boolean;
  blockedReason: string | null;
};

export type FolderSummary = {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
};
