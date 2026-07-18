import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import {
  computeTaskAmount,
  computePaymentBreakdown,
} from "@laundry/shared";

const prisma = new PrismaClient();

const PASSWORD = "password123";

async function main() {
  console.log("Seed : nettoyage…");
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.application.deleteMany();
  await prisma.task.deleteMany();
  await prisma.sponsorship.deleteMany();
  await prisma.gdcVerification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await argon2.hash(PASSWORD);

  console.log("Seed : utilisateurs vérifiés…");
  const admin = await prisma.user.create({
    data: {
      nom: "Admin Plateforme",
      email: "admin@laundry.test",
      passwordHash,
      roles: ["DEMANDEUR", "TRAVAILLEUR"],
      verifStatus: "VERIFIED",
      accessMethod: "GENS_DE_CONFIANCE",
      isAdmin: true,
      noteMoyenne: 5,
    },
  });

  const alice = await prisma.user.create({
    data: {
      nom: "Alice Martin",
      email: "alice@laundry.test",
      passwordHash,
      roles: ["DEMANDEUR"],
      verifStatus: "VERIFIED",
      accessMethod: "SPONSORSHIP",
      bio: "Famille de 4, beaucoup de linge chaque semaine.",
      noteMoyenne: 4.8,
    },
  });

  const bob = await prisma.user.create({
    data: {
      nom: "Bob Durand",
      email: "bob@laundry.test",
      passwordHash,
      roles: ["TRAVAILLEUR"],
      verifStatus: "VERIFIED",
      accessMethod: "GENS_DE_CONFIANCE",
      bio: "Rapide et soigneux, spécialiste du pliage.",
      noteMoyenne: 4.6,
    },
  });

  const chloe = await prisma.user.create({
    data: {
      nom: "Chloé Petit",
      email: "chloe@laundry.test",
      passwordHash,
      roles: ["TRAVAILLEUR", "DEMANDEUR"],
      verifStatus: "VERIFIED",
      accessMethod: "SPONSORSHIP",
      noteMoyenne: 4.9,
    },
  });

  // Un compte PENDING avec 3/5 parrainages pour tester la progression.
  const dan = await prisma.user.create({
    data: {
      nom: "Dan Nouveau",
      email: "dan@laundry.test",
      passwordHash,
      roles: ["TRAVAILLEUR"],
      verifStatus: "PENDING",
    },
  });
  for (const sponsor of [admin, alice, chloe]) {
    await prisma.sponsorship.create({
      data: {
        sponsorId: sponsor.id,
        invitedUserId: dan.id,
        statut: "CONFIRMED",
      },
    });
  }

  console.log("Seed : annonces…");
  const t1Start = new Date("2026-07-20T09:00:00Z");
  const t1End = new Date("2026-07-20T12:00:00Z");
  const t1Amount = computeTaskAmount({
    heureDebut: t1Start,
    heureFin: t1End,
    tauxHoraire: 15,
  });
  const task1 = await prisma.task.create({
    data: {
      ownerId: alice.id,
      titre: "Lessive + pliage pour famille",
      description:
        "Environ 4 machines à laver, étendre et plier. Produits fournis.",
      type: "LES_DEUX",
      zone: "Paris 11e",
      heureDebut: t1Start,
      heureFin: t1End,
      tauxHoraire: 15,
      montantTotal: t1Amount,
      statut: "OUVERTE",
    },
  });

  const t2Start = new Date("2026-07-21T14:00:00Z");
  const t2End = new Date("2026-07-21T16:00:00Z");
  const task2 = await prisma.task.create({
    data: {
      ownerId: chloe.id,
      titre: "Pliage express",
      description: "Panier de linge propre à plier et ranger.",
      type: "PLIAGE",
      zone: "Lyon 3e",
      heureDebut: t2Start,
      heureFin: t2End,
      tauxHoraire: 13,
      montantTotal: computeTaskAmount({
        heureDebut: t2Start,
        heureFin: t2End,
        tauxHoraire: 13,
      }),
      statut: "TERMINEE",
      workerId: bob.id,
    },
  });

  console.log("Seed : candidatures…");
  await prisma.application.create({
    data: { taskId: task1.id, workerId: bob.id, message: "Disponible, je m'en occupe !" },
  });
  await prisma.application.create({
    data: { taskId: task1.id, workerId: chloe.id, message: "Je peux passer le matin." },
  });
  await prisma.application.create({
    data: {
      taskId: task2.id,
      workerId: bob.id,
      statut: "ACCEPTEE",
      message: "Pliage rapide garanti.",
    },
  });

  console.log("Seed : paiement + avis sur tâche terminée…");
  const breakdown = computePaymentBreakdown(Number(task2.montantTotal));
  await prisma.payment.create({
    data: {
      taskId: task2.id,
      payerId: chloe.id,
      payeeId: bob.id,
      montant: breakdown.montantTotal,
      commission: breakdown.commission,
      statut: "CAPTURED",
      stripeRef: "pi_test_seed_0001",
    },
  });
  await prisma.review.create({
    data: {
      taskId: task2.id,
      authorId: chloe.id,
      targetId: bob.id,
      note: 5,
      commentaire: "Travail impeccable, très rapide.",
    },
  });

  console.log("Seed terminé.");
  console.log(`Comptes de test (mot de passe: ${PASSWORD}) :`);
  console.log("  admin@laundry.test (admin, vérifié)");
  console.log("  alice@laundry.test (demandeur, vérifié)");
  console.log("  bob@laundry.test   (travailleur, vérifié)");
  console.log("  chloe@laundry.test (les deux, vérifié)");
  console.log("  dan@laundry.test   (PENDING, 3/5 parrainages)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
