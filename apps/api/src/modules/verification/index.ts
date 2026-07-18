import { config } from "../../config.js";
import {
  IdentityVerificationProvider,
  ManualGdcProvider,
  TrustFullyGdcProvider,
} from "./provider.js";

/** Sélectionne le provider de vérification selon la configuration. */
export function createIdentityProvider(): IdentityVerificationProvider {
  if (config.gdc.provider === "trustfully") {
    return new TrustFullyGdcProvider(config.gdc.apiBaseUrl, config.gdc.apiKey);
  }
  return new ManualGdcProvider();
}

export * from "./provider.js";
