import type {
  SponsorshipProgress,
  EligibilityResult,
  RegisterInput,
  LoginInput,
  GdcVerificationInput,
} from "@laundry/shared";
import { api } from "./client";

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
};
