import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { sponsorshipProgress, computeTaskAmount } from "@laundry/shared";
import { colors, spacing, typography, radius } from "../theme/tokens";
import { Card, Button, Badge, FadeIn } from "../components/ui";
import { useResponsive } from "../components/useResponsive";

/**
 * Écran d'accueil = page de démonstration du design system (Phase 2/7).
 * Tourne à l'identique en web et Android, mise en page responsive.
 */
export default function Home() {
  const router = useRouter();
  const { device, columns } = useResponsive();

  // Démo : la logique métier partagée alimente directement l'UI.
  const progress = sponsorshipProgress(3);
  const montantDemo = computeTaskAmount({
    heureDebut: "2026-07-20T09:00:00Z",
    heureFin: "2026-07-20T12:00:00Z",
    tauxHoraire: 15,
  });

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.container, { maxWidth: 1100 }]}>
          {/* Hero */}
          <FadeIn>
          <View style={styles.hero}>
            <Badge label={`Aperçu ${device}`} tone="violet" />
            <Text style={styles.title}>Lessive & Pliage</Text>
            <Text style={styles.subtitle}>
              La mise en relation particulier-à-particulier pour votre linge.
              Publiez une tâche, choisissez un profil de confiance, payez en
              sécurité, notez.
            </Text>
            <View style={styles.ctaRow}>
              <Button
                label="Créer un compte"
                variant="primary"
                onPress={() => router.push("/register")}
              />
              <Button
                label="Se connecter"
                variant="ghost"
                onPress={() => router.push("/login")}
              />
            </View>
          </View>
          </FadeIn>

          {/* Grille responsive de fonctionnalités */}
          <View
            style={[
              styles.grid,
              { flexDirection: columns === 1 ? "column" : "row" },
            ]}
          >
            <FeatureCard
              tone="cyan"
              title="Montant auto"
              body={`Durée × taux horaire, calculé avant publication. Ex. 3 h × 15 €/h = ${montantDemo} €.`}
            />
            <FeatureCard
              tone="magenta"
              title="Accès de confiance"
              body={`Parrainage 5/5 ou Gens de Confiance. Progression : ${progress.label}.`}
            />
            <FeatureCard
              tone="violet"
              title="Paiement sécurisé"
              body="Stripe Connect : le travailleur est payé après réalisation, commission plateforme transparente."
            />
          </View>

          {/* Bandeau design system */}
          <Card glow style={{ marginTop: spacing.xl }}>
            <Text style={styles.sectionTitle}>Design system</Text>
            <Text style={styles.muted}>
              Thème sombre néon, mêmes écrans en mobile / tablette / desktop.
            </Text>
            <View style={styles.badgeRow}>
              <Badge label="Cyan" tone="cyan" />
              <Badge label="Magenta" tone="magenta" />
              <Badge label="Violet" tone="violet" />
              <Badge label="Succès" tone="success" />
              <Badge label="Alerte" tone="warning" />
            </View>
            <Button
              label="Voir le design system"
              variant="ghost"
              onPress={() => router.push("/design")}
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "cyan" | "magenta" | "violet";
}) {
  return (
    <Card style={styles.feature}>
      <Badge label={title} tone={tone} />
      <Text style={styles.featureBody}>{body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, alignItems: "center" },
  container: { width: "100%", gap: spacing.lg },
  hero: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  ctaRow: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  grid: { gap: spacing.md, flexWrap: "wrap" },
  feature: { flex: 1, minWidth: 240, gap: spacing.sm },
  featureBody: { ...typography.body, color: colors.textSecondary, lineHeight: 21 },
  sectionTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs },
  muted: { ...typography.body, color: colors.textMuted },
  badgeRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginTop: spacing.md },
});
