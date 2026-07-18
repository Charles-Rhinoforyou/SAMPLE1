import type {
  SponsorshipProgress,
  EligibilityResult,
  RegisterInput,
  LoginInput,
  GdcVerificationInput,
  CreateTaskInput,
  TaskType,
  TaskStatus,
} from "@laundry/shared";
import { api } from "./client";

export interface TaskSummary {
  id: string;
  titre: string;
  description: string;
  type: TaskType;
  zone: string;
  heureDebut: string;
  heureFin: string;
  tauxHoraire: string;
  montantTotal: string;
  statut: TaskStatus;
  workerId: string | null;
  owner?: { id: string; nom: string; noteMoyenne: number };
  _count?: { applications: number };
}

export interface TaskApplication {
  id: string;
  workerId: string;
  message: string | null;
  statut: "ENVOYEE" | "ACCEPTEE" | "REFUSEE";
  worker: {
    id: string;
    nom: string;
    noteMoyenne: number;
    bio: string | null;
    photoUrl: string | null;
  };
}

export interface TaskDetail extends TaskSummary {
  applications: TaskApplication[];
}

export interface PublicUser {
  id: string;
  nom: string;
  email: string;
  roles: string[];
  verifStatus: "PENDING" | "VERIFIED" | "REJECTED";
  accessMethod: string | null;
  noteMoyenne: number;
  invitationCode: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse extends PublicUser {
  eligibility: {
    progress: SponsorshipProgress;
    result: EligibilityResult;
  };
}

export const endpoints = {
  register: (body: RegisterInput) =>
    api<AuthResponse>("/auth/register", { method: "POST", body }),
  login: (body: LoginInput) =>
    api<AuthResponse>("/auth/login", { method: "POST", body }),
  me: () => api<MeResponse>("/auth/me"),
  refresh: (refreshToken: string) =>
    api<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    }),
  notifications: () =>
    api<{ items: NotificationItem[]; unread: number }>("/notifications"),
  markNotificationRead: (id: string) =>
    api(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () =>
    api("/notifications/read-all", { method: "POST" }),
  submitGdc: (body: GdcVerificationInput) =>
    api<{ status: string; message: string }>("/verification/gdc", {
      method: "POST",
      body,
    }),
  adminVerifications: () =>
    api<
      Array<{
        id: string;
        gdcProfile: string;
        proofUrl: string;
        user: { nom: string; email: string };
      }>
    >("/admin/verifications"),
  reviewVerification: (id: string, decision: "APPROVE" | "REJECT") =>
    api(`/admin/verifications/${id}/review`, {
      method: "POST",
      body: { decision },
    }),

  // Tâches / annonces
  createTask: (body: CreateTaskInput) =>
    api<TaskSummary>("/tasks", { method: "POST", body }),
  listTasks: (filter?: {
    type?: TaskType;
    zone?: string;
    tauxMin?: number;
    tauxMax?: number;
  }) => {
    const q = new URLSearchParams();
    if (filter?.type) q.set("type", filter.type);
    if (filter?.zone) q.set("zone", filter.zone);
    if (filter?.tauxMin != null) q.set("tauxMin", String(filter.tauxMin));
    if (filter?.tauxMax != null) q.set("tauxMax", String(filter.tauxMax));
    const qs = q.toString();
    return api<TaskSummary[]>(`/tasks${qs ? `?${qs}` : ""}`);
  },
  myTasks: () => api<TaskSummary[]>("/tasks/mine"),
  getTask: (id: string) => api<TaskDetail>(`/tasks/${id}`),
  applyToTask: (id: string, message?: string) =>
    api(`/tasks/${id}/applications`, { method: "POST", body: { message } }),
  acceptApplication: (taskId: string, appId: string) =>
    api(`/tasks/${taskId}/applications/${appId}/accept`, { method: "POST" }),
  startTask: (id: string) => api(`/tasks/${id}/start`, { method: "POST" }),
  completeTask: (id: string) => api(`/tasks/${id}/complete`, { method: "POST" }),
  cancelTask: (id: string) => api(`/tasks/${id}/cancel`, { method: "POST" }),

  // Notation
  createReview: (taskId: string, note: number, commentaire?: string) =>
    api<{ noteMoyenne: number }>(`/tasks/${taskId}/reviews`, {
      method: "POST",
      body: { note, commentaire },
    }),
  taskReviews: (taskId: string) =>
    api<ReviewItem[]>(`/tasks/${taskId}/reviews`),

  // Messagerie
  getMessages: (taskId: string) =>
    api<MessageItem[]>(`/tasks/${taskId}/messages`),
  sendMessage: (taskId: string, contenu: string) =>
    api<MessageItem>(`/tasks/${taskId}/messages`, {
      method: "POST",
      body: { contenu },
    }),

  // Paiement (Stripe Connect)
  onboardConnect: () =>
    api<{ accountId: string; url: string; mode: string }>(
      "/payments/connect/onboard",
      { method: "POST" }
    ),
  connectStatus: () =>
    api<{
      onboarded: boolean;
      chargesEnabled?: boolean;
      payoutsEnabled?: boolean;
    }>("/payments/connect/status"),
  payTask: (taskId: string) =>
    api<{
      paymentId: string;
      clientSecret: string | null;
      mode: string;
      breakdown: {
        montantTotal: number;
        commission: number;
        reversementTravailleur: number;
      };
    }>(`/tasks/${taskId}/pay`, { method: "POST" }),
  captureTask: (taskId: string) =>
    api<{ status: string }>(`/tasks/${taskId}/capture`, { method: "POST" }),
  paymentReceipt: (taskId: string) =>
    api<{
      montant: string;
      commission: string;
      statut: string;
      stripeRef: string | null;
    }>(`/payments/task/${taskId}`),
};

export interface ReviewItem {
  id: string;
  authorId: string;
  targetId: string;
  note: number;
  commentaire: string | null;
  createdAt: string;
  author: { id: string; nom: string };
}

export interface MessageItem {
  id: string;
  taskId: string;
  senderId: string;
  contenu: string;
  createdAt: string;
  sender: { id: string; nom: string };
}

export interface NotificationItem {
  id: string;
  type: string;
  payload: { message?: string; [k: string]: unknown };
  lu: boolean;
  createdAt: string;
}
