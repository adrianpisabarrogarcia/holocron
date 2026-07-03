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
  avatarUrl?: string | null;
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
  avatarUrl?: string | null;
};

export type FolderMemberSummary = {
  userId: string;
  email: string;
  name: string;
  platformRole: PlatformRole;
  role: ProjectMembershipRole;
  avatarUrl?: string | null;
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

export type UserMiniSummary = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type SprintSummary = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  projectId: string;
  position: number;
};

export type TaskSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isBlocked: boolean;
  blockedReason: string | null;
  owners: UserMiniSummary[];
  assignees: UserMiniSummary[];
  sprintId: string | null;
  startDate: string | null;
  endDate: string | null;
  estimatedHours: number | null;
  timeSpent: number;
  timerStartedAt: string | null;
};

export type FolderSummary = {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
};

export type CommentSummary = {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: UserMiniSummary;
};
