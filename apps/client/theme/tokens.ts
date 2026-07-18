/**
 * Design tokens — thème sombre « futuriste néon ».
 * Source de vérité couleurs/typo/espacements pour web + Android.
 * Contrastes visés AA sur fond sombre.
 */

export const colors = {
  // Fonds
  bg: "#0A0A14",
  bgElevated: "#141426",
  surface: "#1B1B33",
  surfaceAlt: "#232345",

  // Accents néon
  cyan: "#22E3FF",
  magenta: "#FF2FD0",
  violet: "#8A5CFF",
  cyanDim: "#0E7A8C",

  // Texte
  textPrimary: "#F5F6FF",
  textSecondary: "#A9AECB",
  textMuted: "#6C7196",

  // États
  success: "#3DF5A0",
  warning: "#FFC24B",
  danger: "#FF5C7A",

  // Bordures / overlays
  border: "#2A2A4A",
  overlay: "rgba(10, 10, 20, 0.7)",
} as const;

/** Dégradés maîtrisés pour boutons/bannières (utilisables via expo-linear-gradient). */
export const gradients = {
  primary: [colors.cyan, colors.violet] as const,
  accent: [colors.magenta, colors.violet] as const,
  glow: [colors.violet, colors.cyan] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 32, fontWeight: "800" as const, letterSpacing: 0.4 },
  h2: { fontSize: 24, fontWeight: "700" as const },
  h3: { fontSize: 19, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "600" as const, letterSpacing: 0.3 },
  caption: { fontSize: 12, fontWeight: "500" as const },
} as const;

/** Points de rupture responsive (mobile / tablette / desktop). */
export const breakpoints = {
  tablet: 720,
  desktop: 1080,
} as const;

/** Taille de cible tactile minimale (accessibilité). */
export const MIN_TOUCH = 44;
