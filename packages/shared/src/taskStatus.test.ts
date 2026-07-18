import { describe, it, expect } from "vitest";
import {
  canTransition,
  nextStates,
  assertTransition,
  isTerminal,
} from "./taskStatus.js";
import { TaskStatus } from "./enums.js";

describe("canTransition", () => {
  it("owner peut attribuer une tâche ouverte", () => {
    expect(
      canTransition(TaskStatus.OUVERTE, TaskStatus.ATTRIBUEE, "OWNER")
    ).toBe(true);
  });

  it("worker ne peut PAS attribuer une tâche", () => {
    expect(
      canTransition(TaskStatus.OUVERTE, TaskStatus.ATTRIBUEE, "WORKER")
    ).toBe(false);
  });

  it("worker peut démarrer une tâche attribuée", () => {
    expect(
      canTransition(TaskStatus.ATTRIBUEE, TaskStatus.EN_COURS, "WORKER")
    ).toBe(true);
  });

  it("le système capture le paiement d'une tâche terminée", () => {
    expect(
      canTransition(TaskStatus.TERMINEE, TaskStatus.PAYEE, "SYSTEM")
    ).toBe(true);
  });

  it("interdit un saut d'état OUVERTE -> TERMINEE", () => {
    expect(
      canTransition(TaskStatus.OUVERTE, TaskStatus.TERMINEE, "OWNER")
    ).toBe(false);
  });

  it("interdit de sortir d'un état terminal", () => {
    expect(
      canTransition(TaskStatus.PAYEE, TaskStatus.OUVERTE, "OWNER")
    ).toBe(false);
  });
});

describe("nextStates", () => {
  it("liste les états possibles depuis ATTRIBUEE pour le worker", () => {
    const s = nextStates(TaskStatus.ATTRIBUEE, "WORKER");
    expect(s).toContain(TaskStatus.EN_COURS);
    expect(s).toContain(TaskStatus.ANNULEE);
  });

  it("un état terminal n'a aucune suite", () => {
    expect(nextStates(TaskStatus.PAYEE)).toEqual([]);
  });
});

describe("assertTransition", () => {
  it("lève sur transition interdite", () => {
    expect(() =>
      assertTransition(TaskStatus.OUVERTE, TaskStatus.PAYEE, "OWNER")
    ).toThrow();
  });

  it("ne lève pas sur transition valide", () => {
    expect(() =>
      assertTransition(TaskStatus.EN_COURS, TaskStatus.TERMINEE, "WORKER")
    ).not.toThrow();
  });
});

describe("isTerminal", () => {
  it("PAYEE et ANNULEE sont terminaux", () => {
    expect(isTerminal(TaskStatus.PAYEE)).toBe(true);
    expect(isTerminal(TaskStatus.ANNULEE)).toBe(true);
    expect(isTerminal(TaskStatus.OUVERTE)).toBe(false);
  });
});
