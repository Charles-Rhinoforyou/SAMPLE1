import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, typography } from "../theme/tokens";
import { Card, Button, TextField, Badge } from "../components/ui";
import { endpoints } from "../api/endpoints";
import { useAuth } from "../state/auth";

export default function VerifyGdc() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const [gdcProfile, setGdcProfile] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setMessage(null);
    try {
      const res = await endpoints.submitGdc({ gdcProfile, proofUrl });
      setMessage(res.message);
      await refreshMe();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Text style={styles.title}>Vérification Gens de Confiance</Text>
          <Text style={styles.muted}>
            L'API partenaire Gens de Confiance n'est pas encore branchée : votre
            demande est validée manuellement par un administrateur. Fournissez
            votre profil et une preuve.
          </Text>

          <TextField
            label="Profil Gens de Confiance"
            value={gdcProfile}
            onChangeText={setGdcProfile}
            placeholder="URL ou identifiant de votre profil GdC"
          />
          <TextField
            label="URL de la preuve"
            value={proofUrl}
            onChangeText={setProofUrl}
            placeholder="https://… (capture / document)"
          />

          {message ? <Badge label={message} tone="success" /> : null}
          {error ? <Badge label={error} tone="warning" /> : null}

          <Button label="Envoyer" variant="primary" onPress={onSubmit} />
          <Button
            label="Retour"
            variant="ghost"
            onPress={() => router.back()}
          />
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
