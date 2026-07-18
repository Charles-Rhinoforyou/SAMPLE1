/**
 * Énumérations métier partagées entre le backend (Prisma) et le client (Expo).
 * Source de vérité unique — les valeurs DOIVENT rester alignées sur schema.prisma.
 */

export const Role = {
  DEMANDEUR: "DEMANDEUR",
  TRAVAILLEUR: "TRAVAILLEUR",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const VerifStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;
export type VerifStatus = (typeof VerifStatus)[keyof typeof VerifStatus];

export const AccessMethod = {
  SPONSORSHIP: "SPONSORSHIP",
  GENS_DE_CONFIANCE: "GENS_DE_CONFIANCE",
} as const;
export type AccessMethod = (typeof AccessMethod)[keyof typeof AccessMethod];

export const SponsorStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
} as const;
export type SponsorStatus = (typeof SponsorStatus)[keyof typeof SponsorStatus];

export const TaskType = {
  LESSIVE: "LESSIVE",
  PLIAGE: "PLIAGE",
  LES_DEUX: "LES_DEUX",
} as const;
export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TaskStatus = {
  OUVERTE: "OUVERTE",
  ATTRIBUEE: "ATTRIBUEE",
  EN_COURS: "EN_COURS",
  TERMINEE: "TERMINEE",
  PAYEE: "PAYEE",
  ANNULEE: "ANNULEE",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const AppStatus = {
  ENVOYEE: "ENVOYEE",
  ACCEPTEE: "ACCEPTEE",
  REFUSEE: "REFUSEE",
} as const;
export type AppStatus = (typeof AppStatus)[keyof typeof AppStatus];

export const PaymentStatus = {
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const NotificationType = {
  NEW_APPLICATION: "NEW_APPLICATION",
  APP_ACCEPTED: "APP_ACCEPTED",
  TASK_UPCOMING: "TASK_UPCOMING",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  NEW_REVIEW: "NEW_REVIEW",
} as const;
export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];
