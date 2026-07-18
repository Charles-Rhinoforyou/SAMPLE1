import React, { useEffect, useState, useCallback } from "react";
import { Linking, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../theme/tokens";
import { Card, Button, Badge } from "../components/ui";
import { endpoints } from "../api/endpoints";

/** Configuration du compte de paiement du travailleur (Stripe Connect Express). */
export default function Payments() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await endpoints.connectStatus();
      setOnboarded(s.onboarded);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onboard() {
    setError(null);
    try {
      const res = await endpoints.onboardConnect();
      await Linking.openURL(res.url);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Text style={styles.title}>Recevoir mes paiements</Text>
          <Text style={styles.muted}>
            Pour être payé après vos prestations, reliez un compte Stripe
            Connect (Express). À faire dès votre première candidature.
          </Text>
          {onboarded === true ? (
            <Badge label="Compte de paiement configuré" tone="success" />
          ) : onboarded === false ? (
            <Badge label="Compte non configuré" tone="warning" />
          ) : null}
          {error ? <Badge label={error} tone="warning" /> : null}
          <Button
            label={onboarded ? "Mettre à jour mon compte" : "Configurer mon compte"}
            variant="primary"
            onPress={onboard}
          />
          <Button label="Rafraîchir le statut" variant="ghost" onPress={() => void load()} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, alignItems: "center" },
  card: { width: "100%", maxWidth: 460, gap: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  muted: { ...typography.body, color: colors.textSecondary, lineHeight: 21 },
});
