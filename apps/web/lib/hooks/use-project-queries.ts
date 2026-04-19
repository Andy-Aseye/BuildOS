'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

const REFETCH_MS = 30_000;

export type ProjectDetail = {
  id: string;
  code: string;
  name: string;
  clientName: string;
  description: string | null;
  status: string;
  budgetGhs: string | number | null;
  budgetUsd: string | number | null;
  fxRateGhsUsd: string | number | null;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  members: {
    id: string;
    role: string;
    user: { id: string; name: string | null; role: string; whatsappPhone: string | null; lastActiveAt: string | null };
  }[];
  phases: unknown[];
  _count?: { costEntries: number; dailyLogs: number };
};

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<ProjectDetail>(`/projects/${projectId}`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export type BudgetSummary = {
  totalSpentGhs: number;
  totalSpentUsd: number;
  breakdown: { category: string; totalGhs: number; totalUsd: number }[];
  budgetGhs: number | null;
  budgetUsd: number | null;
  percentConsumedGhs: number | null;
  percentConsumedUsd: number | null;
  /** Present when API returns it; otherwise UI derives bands from % consumed. */
  alertBands?: { ghs: 'none' | 'warning' | 'critical'; usd: 'none' | 'warning' | 'critical' };
};

export function useBudgetSummary(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['project', projectId, 'costs', 'summary'],
    queryFn: () => api.get<BudgetSummary>(`/projects/${projectId}/costs/summary`),
    enabled: !!projectId && enabled,
    refetchInterval: REFETCH_MS,
  });
}

export type CostEntryRow = {
  id: string;
  description: string;
  category: string;
  currency: string;
  amount: string | number;
  status: string;
  source: string;
  entryDate: string;
  loggedBy: { id: string; name: string | null };
  confirmedBy: { id: string; name: string | null } | null;
  rejectionReason: string | null;
};

export function useCosts(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['project', projectId, 'costs'],
    queryFn: () => api.get<CostEntryRow[]>(`/projects/${projectId}/costs`),
    enabled: !!projectId && enabled,
    refetchInterval: REFETCH_MS,
  });
}

export function useUpdateCostStatus(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      costId,
      status,
      rejectionReason,
    }: {
      costId: string;
      status: 'CONFIRMED' | 'REJECTED';
      rejectionReason?: string;
    }) =>
      api.patch<CostEntryRow>(`/projects/${projectId}/costs/${costId}`, {
        status,
        ...(rejectionReason ? { rejectionReason } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'costs'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'costs', 'summary'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export type DiaryLog = {
  id: string;
  logDate: string;
  rawContent: string;
  aiSummary: string | null;
  source: string;
  submittedBy: { id: string; name: string | null; role: string };
  photos: { id: string; storageUrl: string; caption: string | null }[];
};

export type DiaryPage = {
  data: DiaryLog[];
  meta: { limit: number; hasMore: boolean; nextCursor?: string };
};

export function useDiary(projectId: string, limit = 30) {
  return useQuery({
    queryKey: ['project', projectId, 'diary', limit],
    queryFn: () =>
      api.get<DiaryPage>(`/projects/${projectId}/diary?limit=${limit}`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export type DiaryPhoto = {
  id: string;
  storageUrl: string;
  caption: string | null;
  takenAt: string | null;
  dailyLog: { id: string; logDate: string };
};

export function useDiaryPhotos(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'diary', 'photos'],
    queryFn: () => api.get<DiaryPhoto[]>(`/projects/${projectId}/diary/photos`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export type PhaseRow = {
  id: string;
  name: string;
  order: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  percentComplete: number;
  status: string;
  notes: string | null;
};

export function usePhases(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'phases'],
    queryFn: () => api.get<PhaseRow[]>(`/projects/${projectId}/phases`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export type ProjectSummary = {
  id: string;
  code: string;
  name: string;
  clientName: string;
  status: string;
};

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<ProjectSummary[]>('/projects'),
    refetchInterval: REFETCH_MS,
  });
}

export type CreatePhaseInput = {
  name: string;
  order: number;
  plannedStart?: string;
  plannedEnd?: string;
  notes?: string;
};

export type UpdatePhaseInput = {
  name?: string;
  order?: number;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  percentComplete?: number;
  status?: string;
  notes?: string | null;
};

export function useCreatePhase(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePhaseInput) =>
      api.post<PhaseRow>(`/projects/${projectId}/phases`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'phases'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useUpdatePhase(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phaseId, body }: { phaseId: string; body: UpdatePhaseInput }) =>
      api.patch<PhaseRow>(`/projects/${projectId}/phases/${phaseId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'phases'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useDeletePhase(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phaseId: string) => api.delete(`/projects/${projectId}/phases/${phaseId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'phases'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export type FileRow = {
  id: string;
  name: string;
  folder: string;
  storageUrl: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'files'],
    queryFn: () => api.get<FileRow[]>(`/projects/${projectId}/files`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export function useUploadFile(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      return api.postForm<FileRow>(`/projects/${projectId}/files/upload`, fd);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'files'] });
    },
  });
}

export function useDeleteFile(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) =>
      api.delete(`/projects/${projectId}/files/${fileId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'files'] });
    },
  });
}

export type AttendanceSummary = {
  days: { date: string; workerCount: number }[];
  totalWorkerDays: number;
  averageDailyCount: number;
};

export function useAttendanceSummary(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'attendance', 'summary'],
    queryFn: () =>
      api.get<AttendanceSummary>(`/projects/${projectId}/attendance/summary`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

// ── Attendance logs (full list) ─────────────────────────────

export type AttendanceLogRow = {
  id: string;
  logDate: string;
  workerCount: number;
  confirmedAt: string | null;
  createdAt: string;
  reportedBy: { id: string; name: string | null };
};

export function useAttendanceLogs(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'attendance'],
    queryFn: () => api.get<AttendanceLogRow[]>(`/projects/${projectId}/attendance`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export function useCreateAttendance(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { workerCount: number; logDate: string }) =>
      api.post<AttendanceLogRow>(`/projects/${projectId}/attendance`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'attendance'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'attendance', 'summary'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

// ── Diary create ────────────────────────────────────────────

export function useCreateDiaryEntry(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      rawContent: string;
      logDate: string;
      weather?: string;
      activities?: string[];
      incidents?: string[];
    }) => api.post(`/projects/${projectId}/diary`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'diary'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

// ── Tenant & org users ─────────────────────────────────────

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
};

export function useCurrentTenant() {
  return useQuery({
    queryKey: ['tenant', 'current'],
    queryFn: () => api.get<TenantRow>('/tenants/current'),
    refetchInterval: 60_000,
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; logoUrl?: string; primaryColor?: string }) =>
      api.patch<TenantRow>('/tenants/current', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tenant', 'current'] });
    },
  });
}

export type OrgUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  whatsappPhone: string | null;
  isActive: boolean;
  lastActiveAt: string | null;
  createdAt: string;
};

export function useOrgUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<OrgUserRow[]>('/users'),
    refetchInterval: 60_000,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: Partial<OrgUserRow> }) =>
      api.patch<OrgUserRow>(`/users/${userId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ── Invites ────────────────────────────────────────────────

export type InviteRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { name: string | null };
};

export type InviteValidation = {
  email: string;
  name: string | null;
  role: string;
  tenantName: string;
};

export function useInvites() {
  return useQuery({
    queryKey: ['invites'],
    queryFn: () => api.get<InviteRow[]>('/invites'),
    refetchInterval: 60_000,
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; name?: string; phone?: string; role: string }) =>
      api.post<InviteRow>('/invites', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invites'] });
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => api.delete(`/invites/${inviteId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invites'] });
    },
  });
}

export function useValidateInvite(token: string) {
  return useQuery({
    queryKey: ['invite', 'validate', token],
    queryFn: () => api.get<InviteValidation>(`/invites/validate/${token}`),
    enabled: !!token,
    retry: false,
  });
}

// ── Project create / update / members / manual cost ─────────

export type CreateProjectInput = {
  name: string;
  clientName: string;
  description?: string;
  budgetGhs?: number;
  budgetUsd?: number;
  fxRateGhsUsd?: number;
  startDate?: string;
  expectedEndDate?: string;
};

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectInput) =>
      api.post<ProjectDetail>('/projects', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export type UpdateProjectInput = {
  name?: string;
  clientName?: string;
  description?: string;
  status?: string;
  budgetGhs?: number;
  budgetUsd?: number;
  fxRateGhsUsd?: number;
  startDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
};

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProjectInput) =>
      api.patch<ProjectDetail>(`/projects/${projectId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
      void qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { userId: string; role: string }) =>
      api.post(`/projects/${projectId}/members`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

const COST_CATEGORIES = [
  'MATERIALS',
  'LABOUR',
  'EQUIPMENT',
  'SUBCONTRACTORS',
  'TRANSPORT',
  'MISCELLANEOUS',
] as const;

export type ManualCostInput = {
  description: string;
  category: (typeof COST_CATEGORIES)[number];
  currency: 'GHS' | 'USD';
  amount: number;
  fxRateAtEntry?: number;
  entryDate?: string;
};

export function useCreateManualCost(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ManualCostInput) =>
      api.post(`/projects/${projectId}/costs`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'costs'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'costs', 'summary'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

// ── RFIs ───────────────────────────────────────────────────

export type RfiRow = {
  id: string;
  referenceNo: string;
  title: string;
  description: string;
  status: string;
  dueDate: string;
  response: string | null;
  respondedAt: string | null;
  closedAt: string | null;
  raisedBy: { id: string; name: string | null; email: string | null };
  assignedTo: { id: string; name: string | null; email: string | null } | null;
  project?: { id: string; code: string; name: string };
};

export function useProjectRfis(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'rfis'],
    queryFn: () => api.get<RfiRow[]>(`/projects/${projectId}/rfis`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export type TenantRfisQuery = {
  overdueOnly?: boolean;
  openOnly?: boolean;
  status?: string;
  projectId?: string;
};

export function useTenantRfis(query: TenantRfisQuery) {
  const sp = new URLSearchParams();
  if (query.overdueOnly) sp.set('overdueOnly', 'true');
  if (query.openOnly) sp.set('openOnly', 'true');
  if (query.status) sp.set('status', query.status);
  if (query.projectId) sp.set('projectId', query.projectId);
  const qs = sp.toString();
  return useQuery({
    queryKey: ['rfis', 'tenant', query],
    queryFn: () => api.get<RfiRow[]>(qs ? `/rfis?${qs}` : '/rfis'),
    refetchInterval: REFETCH_MS,
  });
}

export type CreateRfiInput = {
  title: string;
  description: string;
  dueDate: string;
  assignedToId?: string;
  linkedDrawingId?: string;
};

export type UpdateRfiInput = {
  title?: string;
  description?: string;
  dueDate?: string;
  status?: string;
  response?: string;
  assignedToId?: string;
  clearAssigned?: boolean;
};

export function useCreateRfi(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRfiInput) =>
      api.post<RfiRow>(`/projects/${projectId}/rfis`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'rfis'] });
      void qc.invalidateQueries({ queryKey: ['rfis', 'tenant'] });
    },
  });
}

export function useUpdateRfi(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfiId, body }: { rfiId: string; body: UpdateRfiInput }) =>
      api.patch<RfiRow>(`/projects/${projectId}/rfis/${rfiId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'rfis'] });
      void qc.invalidateQueries({ queryKey: ['rfis', 'tenant'] });
    },
  });
}

// ── Drawing reviews ────────────────────────────────────────

export type DrawingRevisionRow = {
  id: string;
  revisionNumber: string;
  storageUrl: string;
  fileSize: number;
  mimeType: string;
  comments: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; email: string | null };
};

export type DrawingReviewRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: { id: string; name: string | null; email: string | null } | null;
  reviewer: { id: string; name: string | null; email: string | null } | null;
  revisions: DrawingRevisionRow[];
};

export function useDrawingReviews(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'drawing-reviews'],
    queryFn: () =>
      api.get<DrawingReviewRow[]>(`/projects/${projectId}/drawing-reviews`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export function useCreateDrawingReview(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      api.post<DrawingReviewRow>(`/projects/${projectId}/drawing-reviews`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'drawing-reviews'] });
    },
  });
}

export function useUpdateDrawingReview(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      drawingId,
      body,
    }: {
      drawingId: string;
      body: { title?: string; description?: string; status?: string; reviewerId?: string | null };
    }) =>
      api.patch<DrawingReviewRow>(
        `/projects/${projectId}/drawing-reviews/${drawingId}`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'drawing-reviews'] });
    },
  });
}

export function useAddDrawingRevision(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      drawingId,
      file,
      comments,
    }: {
      drawingId: string;
      file: File;
      comments?: string;
    }) => {
      const fd = new FormData();
      fd.append('file', file);
      if (comments?.trim()) fd.append('comments', comments.trim());
      return api.postForm<DrawingRevisionRow>(
        `/projects/${projectId}/drawing-reviews/${drawingId}/revisions`,
        fd,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'drawing-reviews'] });
    },
  });
}

// ── Materials requests ───────────────────────────────────

export type MaterialsLine = {
  id: string;
  description: string;
  quantity: string | number;
  unit: string;
  estimatedUnitCost: string | number | null;
  deliveredQuantity: string | number | null;
  deliveredAt: string | null;
};

export type MaterialsRequestRow = {
  id: string;
  status: string;
  currency: string;
  estimatedTotal: string | number;
  notes: string | null;
  requiresOwnerApproval: boolean;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  requestedBy: { id: string; name: string | null; email: string | null };
  approvedBy: { id: string; name: string | null; email: string | null } | null;
  items: MaterialsLine[];
};

export function useMaterialsRequests(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'materials-requests'],
    queryFn: () =>
      api.get<MaterialsRequestRow[]>(`/projects/${projectId}/materials-requests`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export type MaterialsLineInput = {
  description: string;
  quantity: number;
  unit: string;
  estimatedUnitCost?: number;
};

export function useCreateMaterialsRequest(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      currency: 'GHS' | 'USD';
      notes?: string;
      requiresOwnerApproval?: boolean;
      items: MaterialsLineInput[];
    }) =>
      api.post<MaterialsRequestRow>(
        `/projects/${projectId}/materials-requests`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'materials-requests'] });
    },
  });
}

export type UpdateMaterialsInput = {
  status?: string;
  notes?: string;
  requiresOwnerApproval?: boolean;
  rejectionReason?: string;
  items?: MaterialsLineInput[];
  costEntryId?: string;
};

export function useUpdateMaterialsRequest(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, body }: { requestId: string; body: UpdateMaterialsInput }) =>
      api.patch<MaterialsRequestRow>(
        `/projects/${projectId}/materials-requests/${requestId}`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'materials-requests'] });
    },
  });
}

export function useRecordDelivery(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      itemId,
      deliveredQuantity,
    }: {
      requestId: string;
      itemId: string;
      deliveredQuantity: number;
    }) =>
      api.patch<MaterialsLine>(
        `/projects/${projectId}/materials-requests/${requestId}/items/${itemId}/delivery`,
        { deliveredQuantity },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'materials-requests'] });
    },
  });
}

// ── Delay logs ─────────────────────────────────────────────

export type DelayLogRow = {
  id: string;
  delayDate: string;
  durationHours: string | number;
  cause: string;
  description: string;
  reviewedByPM: boolean;
  causeOverrideNote: string | null;
  linkedRFIId: string | null;
  createdAt: string;
  updatedAt: string;
  reportedBy: { id: string; name: string | null; email: string | null };
};

export function useDelayLogs(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'delays'],
    queryFn: () => api.get<DelayLogRow[]>(`/projects/${projectId}/delays`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export function useCreateDelayLog(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      delayDate: string;
      durationHours: number;
      cause: string;
      description: string;
      linkedRFIId?: string;
    }) => api.post<DelayLogRow>(`/projects/${projectId}/delays`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'delays'] });
    },
  });
}

export function useUpdateDelayLog(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      delayId,
      body,
    }: {
      delayId: string;
      body: {
        delayDate?: string;
        durationHours?: number;
        cause?: string;
        description?: string;
        reviewedByPM?: boolean;
        causeOverrideNote?: string;
        linkedRFIId?: string | null;
      };
    }) => api.patch<DelayLogRow>(`/projects/${projectId}/delays/${delayId}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'delays'] });
    },
  });
}

// ── Progress reports (persisted) ───────────────────────────

export type ProgressReportRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  generatedById: string;
  narrativeSummary: string;
  storageUrl: string;
  sentToEmail: string | null;
  sentAt: string | null;
};

export function useProgressReports(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'progress-reports'],
    queryFn: () =>
      api.get<ProgressReportRow[]>(`/projects/${projectId}/progress-reports`),
    enabled: !!projectId,
    refetchInterval: REFETCH_MS,
  });
}

export function useGenerateNarrative(projectId: string) {
  return useMutation({
    mutationFn: (body: { periodStart: string; periodEnd: string }) =>
      api.post<{ narrative: string }>(
        `/projects/${projectId}/progress-reports/generate-narrative`,
        body,
      ),
  });
}

export function useCreateProgressReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      file: File;
      periodStart: string;
      periodEnd: string;
      narrativeSummary: string;
    }) => {
      const fd = new FormData();
      fd.append('file', args.file);
      fd.append('periodStart', args.periodStart);
      fd.append('periodEnd', args.periodEnd);
      fd.append('narrativeSummary', args.narrativeSummary);
      return api.postForm<ProgressReportRow>(
        `/projects/${projectId}/progress-reports`,
        fd,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'progress-reports'] });
    },
  });
}

export function useUpdateProgressReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      body,
    }: {
      reportId: string;
      body: { sentToEmail?: string };
    }) =>
      api.patch<ProgressReportRow>(
        `/projects/${projectId}/progress-reports/${reportId}`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'progress-reports'] });
    },
  });
}

export { COST_CATEGORIES };

// ── Global search ───────────────────────────────────────────

export type SearchResults = {
  projects: { id: string; name: string; code: string; clientName: string; status: string }[];
  rfis: { id: string; referenceNo: string; title: string; status: string; projectId: string }[];
  users: { id: string; name: string | null; email: string | null; role: string }[];
};

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  });
}

// ── Notifications ───────────────────────────────────────────

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function useNotifications(limit = 30) {
  return useQuery({
    queryKey: ['notifications', limit],
    queryFn: () => api.get<NotificationRow[]>(`/notifications?limit=${limit}`),
    refetchInterval: 15_000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 15_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ── AI Query (Chat) ─────────────────────────────────────────

export type AiChatMessage = { role: 'user' | 'assistant'; content: string };

export type AiQueryResult = {
  answer: string;
  sql: string;
  rows: Record<string, unknown>[];
  rowCount: number;
  error?: string | null;
};

export type AiChatHistoryMessage = {
  id: string;
  role: string;
  content: string;
  sqlQuery?: string | null;
  resultData?: { rows: Record<string, unknown>[]; rowCount: number } | null;
  createdAt: string;
};

export function useAiQuery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { question: string }) =>
      api.post<AiQueryResult>('/ai-query', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai-chat-history'] });
    },
  });
}

export function useAiChatHistory() {
  return useQuery({
    queryKey: ['ai-chat-history'],
    queryFn: () => api.get<AiChatHistoryMessage[]>('/ai-query/history'),
    staleTime: Infinity,
    refetchInterval: false,
  });
}

export function useClearAiChatHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/ai-query/history'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai-chat-history'] });
    },
  });
}

// ── Bulk Import ─────────────────────────────────────────────

export function useImportCosts(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Record<string, unknown>[]) =>
      api.post<{ imported: number }>(`/projects/${projectId}/import/costs`, { rows }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'costs'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'costs', 'summary'] });
    },
  });
}

export function useImportAttendance(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Record<string, unknown>[]) =>
      api.post<{ imported: number }>(`/projects/${projectId}/import/attendance`, { rows }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'attendance'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'attendance', 'summary'] });
    },
  });
}

export function useImportMaterials(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { rows: Record<string, unknown>[]; currency?: string }) =>
      api.post<{ imported: number }>(`/projects/${projectId}/import/materials`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'materials-requests'] });
    },
  });
}

// ── Remove project member ───────────────────────────────────

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

// ── Delete hooks for entities ───────────────────────────────

export function useDeleteCost(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (costId: string) =>
      api.delete(`/projects/${projectId}/costs/${costId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'costs'] });
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'costs', 'summary'] });
    },
  });
}

export function useDeleteMaterialsRequest(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      api.delete(`/projects/${projectId}/materials-requests/${requestId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'materials-requests'] });
    },
  });
}

export function useDeleteDelayLog(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (delayId: string) =>
      api.delete(`/projects/${projectId}/delays/${delayId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'delays'] });
    },
  });
}

export function useDeleteProgressReport(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) =>
      api.delete(`/projects/${projectId}/progress-reports/${reportId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project', projectId, 'progress-reports'] });
    },
  });
}
