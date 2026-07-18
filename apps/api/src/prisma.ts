import { PrismaClient } from "@prisma/client";

/** Instance Prisma unique, réutilisée (évite l'épuisement du pool en dev/HMR). */
export const prisma = new PrismaClient();
