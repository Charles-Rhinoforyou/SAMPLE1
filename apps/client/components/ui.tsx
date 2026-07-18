import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  colors,
  gradients,
  radius,
  spacing,
  typography,
  MIN_TOUCH,
} from "../theme/tokens";

/** Entrée en fondu + léger glissé, respectant reduce-motion via durée courte. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Champ de saisie étiqueté, thème sombre. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View style={{ gap: spacing.xs, width: "100%" }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

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

/** Bouton avec variantes néon (dégradés pour primary/accent). */
export function Button({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "accent" | "ghost";
}) {
  if (variant === "ghost") {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.btn,
          styles.btnGhost,
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={[styles.btnLabel, { color: colors.cyan }]}>{label}</Text>
      </Pressable>
    );
  }
  const colorsGrad =
    variant === "accent" ? gradients.accent : gradients.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.btnPressed]}
    >
      <LinearGradient
        colors={colorsGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btn}
      >
        <Text style={styles.btnLabel}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/** Sélecteur segmenté (choix exclusif), thème sombre. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ gap: spacing.xs, width: "100%" }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.segment}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="button"
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text
                style={[
                  styles.segmentText,
                  active && { color: "#06121A" },
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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

/** Sélecteur de note 1–5 en étoiles. */
export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange?: (n: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.xs }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={onChange ? () => onChange(n) : undefined}
          accessibilityRole="button"
          accessibilityLabel={`${n} étoile${n > 1 ? "s" : ""}`}
        >
          <Text style={{ fontSize: 28, color: n <= value ? colors.warning : colors.textMuted }}>
            ★
          </Text>
        </Pressable>
      ))}
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
  fieldLabel: { ...typography.label, color: colors.textSecondary },
  input: {
    minHeight: MIN_TOUCH,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { ...typography.caption },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  segmentItemActive: { backgroundColor: colors.cyan },
  segmentText: { ...typography.label, color: colors.textSecondary },
});
