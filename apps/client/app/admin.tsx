import React, { useEffect, useState, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, typography } from "../theme/tokens";
import { Card, Button, Badge } from "../components/ui";
import { endpoints } from "../api/endpoints";
import { useAuth } from "../state/auth";

type Item = Awaited<ReturnType<typeof endpoints.adminVerifications>>[number];

export default function Admin() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await endpoints.adminVerifications());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [user]);

  async function review(id: string, decision: "APPROVE" | "REJECT") {
    await endpoints.reviewVerification(id, decision);
    await load();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.title}>Vérifications en attente</Text>
          {error ? <Badge label={error} tone="warning" /> : null}
          {items.length === 0 ? (
            <Text style={styles.muted}>Aucune vérification en attente.</Text>
          ) : null}
          {items.map((it) => (
            <Card key={it.id} style={{ gap: spacing.sm }}>
              <Text style={styles.name}>
                {it.user.nom} — {it.user.email}
              </Text>
              <Text style={styles.muted}>Profil : {it.gdcProfile}</Text>
              <Text style={styles.muted}>Preuve : {it.proofUrl}</Text>
              <View style={styles.row}>
                <Button
                  label="Valider"
                  variant="primary"
                  onPress={() => review(it.id, "APPROVE")}
                />
                <Button
                  label="Refuser"
                  variant="accent"
                  onPress={() => review(it.id, "REJECT")}
                />
              </View>
            </Card>
          ))}
          <Button label="Rafraîchir" variant="ghost" onPress={() => void load()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, alignItems: "center" },
  container: { width: "100%", maxWidth: 640, gap: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  name: { ...typography.h3, color: colors.textPrimary },
  muted: { ...typography.body, color: colors.textSecondary },
  row: { flexDirection: "row", gap: spacing.md },
});
