import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, spacing, typography } from "../theme/tokens";
import { Card, Button, TextField, Badge } from "../components/ui";
import { useAuth } from "../state/auth";

export default function Login() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    try {
      await login({ email, password });
      router.replace("/dashboard");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Text style={styles.title}>Connexion</Text>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? <Badge label={error} tone="warning" /> : null}
          <Button
            label={loading ? "…" : "Se connecter"}
            variant="primary"
            onPress={onSubmit}
          />
          <Button
            label="Créer un compte"
            variant="ghost"
            onPress={() => router.push("/register")}
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
});
