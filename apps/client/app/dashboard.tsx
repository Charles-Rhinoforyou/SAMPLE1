import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, typography, radius } from "../theme/tokens";
import { Card, Button, Badge } from "../components/ui";
import { useAuth } from "../state/auth";

export default function Dashboard() {
  const router = useRouter();
  const { user, refreshMe, logout } = useAuth();

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user]);

  if (!user) return null;

  const { progress, result } = user.eligibility;
  const verified = user.verifStatus === "VERIFIED";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Card style={{ gap: spacing.sm }}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>Bonjour {user.nom}</Text>
              <Badge
                label={verified ? "Vérifié" : "En attente"}
                tone={verified ? "success" : "warning"}
              />
            </View>
            <Text style={styles.muted}>{result.reason}</Text>
          </Card>

          {/* Progression parrainage */}
          <Card style={{ gap: spacing.sm }}>
            <Text style={styles.section}>Parrainage</Text>
            <Text style={styles.big}>{progress.label}</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(progress.confirmed / progress.required) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.muted}>
              Partagez votre code d'invitation pour recevoir des parrainages :
            </Text>
            <Badge label={user.invitationCode} tone="cyan" />
          </Card>

          {/* Voie Gens de Confiance */}
          <Card style={{ gap: spacing.sm }}>
            <Text style={styles.section}>Gens de Confiance</Text>
            <Text style={styles.muted}>
              Alternative au parrainage : faites vérifier votre compte Gens de
              Confiance.
            </Text>
            <Button
              label="Soumettre une vérification"
              variant="accent"
              onPress={() => router.push("/verify-gdc")}
            />
          </Card>

          {/* Accès au cœur métier */}
          <Card style={{ gap: spacing.sm }}>
            <Text style={styles.section}>Annonces</Text>
            <Text style={styles.muted}>
              Parcourez les annonces ouvertes ou publiez une tâche.
            </Text>
            <Button
              label="Voir les annonces"
              variant="primary"
              onPress={() => router.push("/tasks")}
            />
            <Button
              label="Publier une annonce"
              variant="accent"
              onPress={() => router.push("/tasks/new")}
            />
            <Button
              label="Configurer mes paiements"
              variant="ghost"
              onPress={() => router.push("/payments")}
            />
          </Card>

          {user.isAdmin ? (
            <Button
              label="Ouvrir le back-office admin"
              variant="ghost"
              onPress={() => router.push("/admin")}
            />
          ) : null}

          <Button label="Rafraîchir" variant="ghost" onPress={() => void refreshMe()} />
          <Button
            label="Se déconnecter"
            variant="ghost"
            onPress={() => {
              logout();
              router.replace("/");
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, alignItems: "center" },
  container: { width: "100%", maxWidth: 560, gap: spacing.md },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { ...typography.h2, color: colors.textPrimary },
  section: { ...typography.h3, color: colors.textPrimary },
  big: { ...typography.h1, color: colors.cyan },
  muted: { ...typography.body, color: colors.textSecondary, lineHeight: 21 },
  progressTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  progressFill: { height: 10, backgroundColor: colors.cyan },
});
