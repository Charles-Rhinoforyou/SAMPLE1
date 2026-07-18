import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Role } from "@laundry/shared";
import { colors, spacing, typography } from "../theme/tokens";
import { Card, Button, TextField, Badge } from "../components/ui";
import { useAuth } from "../state/auth";

export default function Register() {
  const router = useRouter();
  const { register, loading } = useAuth();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    try {
      await register({
        nom,
        email,
        password,
        roles: [Role.DEMANDEUR, Role.TRAVAILLEUR],
        invitationCode: invitationCode || undefined,
      });
      router.replace("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.hint}>
            Le compte est créé en attente. Il s'active par 5 parrainages
            confirmés ou via Gens de Confiance.
          </Text>

          <TextField label="Nom" value={nom} onChangeText={setNom} autoCapitalize="words" />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="vous@exemple.fr"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="8 caractères minimum"
          />
          <TextField
            label="Code d'invitation (optionnel)"
            value={invitationCode}
            onChangeText={setInvitationCode}
            placeholder="Code d'un parrain vérifié"
          />

          {error ? <Badge label={error} tone="warning" /> : null}

          <Button
            label={loading ? "…" : "S'inscrire"}
            variant="primary"
            onPress={onSubmit}
          />
          <Button
            label="J'ai déjà un compte"
            variant="ghost"
            onPress={() => router.push("/login")}
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
  hint: { ...typography.body, color: colors.textSecondary, lineHeight: 21 },
});
