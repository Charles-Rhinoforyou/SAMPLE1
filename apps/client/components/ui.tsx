import React from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { colors, radius, spacing, typography, MIN_TOUCH } from "../theme/tokens";

/** Carte de surface élevée, réutilisable web + mobile. */
export function Card({
  children,
  style,
  glow,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
}) {
  return (
    <View style={[styles.card, glow && styles.cardGlow, style]}>{children}</View>
  );
}

/** Bouton avec variantes néon. */
export function Button({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "accent" | "ghost";
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "accent" && styles.btnAccent,
        variant === "ghost" && styles.btnGhost,
        pressed && styles.btnPressed,
      ]}
    >
      <Text
        style={[
          styles.btnLabel,
          variant === "ghost" && { color: colors.cyan },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Badge / puce d'état. */
export function Badge({
  label,
  tone = "cyan",
}: {
  label: string;
  tone?: "cyan" | "magenta" | "violet" | "success" | "warning";
}) {
  const tint = {
    cyan: colors.cyan,
    magenta: colors.magenta,
    violet: colors.violet,
    success: colors.success,
    warning: colors.warning,
  }[tone];
  return (
    <View style={[styles.badge, { borderColor: tint }]}>
      <Text style={[styles.badgeText, { color: tint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardGlow: {
    borderColor: colors.violet,
    shadowColor: colors.violet,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  btn: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: colors.cyan },
  btnAccent: { backgroundColor: colors.magenta },
  btnGhost: { borderWidth: 1, borderColor: colors.cyan, backgroundColor: "transparent" },
  btnPressed: { opacity: 0.8 },
  btnLabel: { ...typography.label, color: "#06121A" },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { ...typography.caption },
});
