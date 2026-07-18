/// <reference types="expo/types" />

// Variables d'environnement publiques exposées au bundle Expo.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
