import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TaskType, computeTaskAmount } from "@laundry/shared";
import { colors, spacing, typography } from "../../theme/tokens";
import { Card, Button, TextField, Badge, Segmented } from "../../components/ui";
import { endpoints } from "../../api/endpoints";

export default function NewTask() {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>(TaskType.LES_DEUX);
  const [zone, setZone] = useState("");
  const [heureDebut, setHeureDebut] = useState("2026-07-20T09:00");
  const [heureFin, setHeureFin] = useState("2026-07-20T12:00");
  const [taux, setTaux] = useState("15");
  const [error, setError] = useState<string | null>(null);

  // Montant total calculé automatiquement (durée × taux), en direct.
  const montant = useMemo(() => {
    try {
      const t = Number(taux);
      if (!t) return null;
      return computeTaskAmount({ heureDebut, heureFin, tauxHoraire: t });
    } catch {
      return null;
    }
  }, [heureDebut, heureFin, taux]);

  async function onSubmit() {
    setError(null);
    try {
      const task = await endpoints.createTask({
        titre,
        description,
        type,
        zone,
        heureDebut: new Date(heureDebut),
        heureFin: new Date(heureFin),
        tauxHoraire: Number(taux),
      });
      router.replace(`/tasks/${task.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <Text style={styles.title}>Publier une annonce</Text>

          <TextField label="Titre" value={titre} onChangeText={setTitre} />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
          />
          <Segmented
            label="Type de tâche"
            value={type}
            onChange={setType}
            options={[
              { value: TaskType.LESSIVE, label: "Lessive" },
              { value: TaskType.PLIAGE, label: "Pliage" },
              { value: TaskType.LES_DEUX, label: "Les deux" },
            ]}
          />
          <TextField label="Zone" value={zone} onChangeText={setZone} placeholder="Paris 11e" />
          <TextField
            label="Heure de début"
            value={heureDebut}
            onChangeText={setHeureDebut}
            placeholder="AAAA-MM-JJTHH:mm"
          />
          <TextField
            label="Heure de fin"
            value={heureFin}
            onChangeText={setHeureFin}
            placeholder="AAAA-MM-JJTHH:mm"
          />
          <TextField
            label="Taux horaire (€/h)"
            value={taux}
            onChangeText={setTaux}
            keyboardType="numeric"
          />

          {/* Montant auto affiché avant publication */}
          <View style={styles.montantBox}>
            <Text style={styles.montantLabel}>Montant total estimé</Text>
            <Text style={styles.montant}>
              {montant != null ? `${montant.toFixed(2)} €` : "—"}
            </Text>
          </View>

          {error ? <Badge label={error} tone="warning" /> : null}

          <Button
            label="Publier l'annonce"
            variant="primary"
            onPress={onSubmit}
          />
          <Button label="Annuler" variant="ghost" onPress={() => router.back()} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, alignItems: "center" },
  card: { width: "100%", maxWidth: 520, gap: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  montantBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.violet,
    padding: spacing.md,
    gap: spacing.xs,
  },
  montantLabel: { ...typography.label, color: colors.textSecondary },
  montant: { ...typography.h1, color: colors.cyan },
});
