import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography, radius } from "../theme/tokens";
import {
  Card,
  Button,
  Badge,
  TextField,
  Segmented,
  StarRating,
  FadeIn,
} from "../components/ui";

/** Page de démonstration du design system (thème sombre néon). */
export default function DesignSystem() {
  const [seg, setSeg] = React.useState("a");
  const [note, setNote] = React.useState(4);
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <FadeIn>
            <Text style={styles.h1}>Design system</Text>
            <Text style={styles.muted}>
              Composants réutilisés à l'identique sur web et Android.
            </Text>
          </FadeIn>

          <FadeIn delay={60}>
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.section}>Boutons</Text>
              <Button label="Primaire" variant="primary" />
              <Button label="Accent" variant="accent" />
              <Button label="Fantôme" variant="ghost" />
            </Card>
          </FadeIn>

          <FadeIn delay={120}>
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.section}>Badges</Text>
              <View style={styles.row}>
                <Badge label="Cyan" tone="cyan" />
                <Badge label="Magenta" tone="magenta" />
                <Badge label="Violet" tone="violet" />
                <Badge label="Succès" tone="success" />
                <Badge label="Alerte" tone="warning" />
              </View>
            </Card>
          </FadeIn>

          <FadeIn delay={180}>
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.section}>Saisie & sélection</Text>
              <TextField label="Champ texte" value="" onChangeText={() => {}} placeholder="Exemple" />
              <Segmented
                label="Sélecteur segmenté"
                value={seg}
                onChange={setSeg}
                options={[
                  { value: "a", label: "Un" },
                  { value: "b", label: "Deux" },
                  { value: "c", label: "Trois" },
                ]}
              />
              <Text style={styles.muted}>Notation</Text>
              <StarRating value={note} onChange={setNote} />
            </Card>
          </FadeIn>

          <FadeIn delay={240}>
            <View style={styles.swatchRow}>
              {[
                ["Cyan", colors.cyan],
                ["Magenta", colors.magenta],
                ["Violet", colors.violet],
                ["Succès", colors.success],
                ["Alerte", colors.warning],
              ].map(([name, c]) => (
                <View key={name} style={styles.sw}>
                  <View style={[styles.swBox, { backgroundColor: c }]} />
                  <Text style={styles.swLab}>{name}</Text>
                </View>
              ))}
            </View>
          </FadeIn>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, alignItems: "center" },
  container: { width: "100%", maxWidth: 560, gap: spacing.md },
  h1: { ...typography.h1, color: colors.textPrimary },
  section: { ...typography.h3, color: colors.textPrimary },
  muted: { ...typography.body, color: colors.textSecondary },
  row: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  swatchRow: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  sw: { gap: spacing.xs, alignItems: "center" },
  swBox: { width: 56, height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  swLab: { ...typography.caption, color: colors.textMuted },
});
