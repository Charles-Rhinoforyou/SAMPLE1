import React, { useEffect, useState, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TaskType } from "@laundry/shared";
import { colors, spacing, typography } from "../../theme/tokens";
import { Card, Badge, Button, Segmented } from "../../components/ui";
import { useResponsive } from "../../components/useResponsive";
import { endpoints, type TaskSummary } from "../../api/endpoints";

type Filter = "ALL" | TaskType;

export default function TasksList() {
  const router = useRouter();
  const { columns } = useResponsive();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await endpoints.listTasks(
        filter === "ALL" ? undefined : { type: filter }
      );
      setTasks(list);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Annonces ouvertes</Text>
            <Button
              label="+ Publier"
              variant="primary"
              onPress={() => router.push("/tasks/new")}
            />
          </View>

          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "ALL", label: "Toutes" },
              { value: TaskType.LESSIVE, label: "Lessive" },
              { value: TaskType.PLIAGE, label: "Pliage" },
              { value: TaskType.LES_DEUX, label: "Les deux" },
            ]}
          />

          {error ? <Badge label={error} tone="warning" /> : null}
          {tasks.length === 0 ? (
            <Text style={styles.muted}>Aucune annonce pour ce filtre.</Text>
          ) : null}

          <View
            style={[
              styles.grid,
              { flexDirection: columns === 1 ? "column" : "row" },
            ]}
          >
            {tasks.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/tasks/${t.id}`)}
                style={styles.cardWrap}
              >
                <Card style={{ gap: spacing.sm }}>
                  <Text style={styles.cardTitle}>{t.titre}</Text>
                  <Text style={styles.muted} numberOfLines={2}>
                    {t.description}
                  </Text>
                  <View style={styles.metaRow}>
                    <Badge label={t.zone} tone="violet" />
                    <Badge label={`${Number(t.montantTotal).toFixed(0)} €`} tone="cyan" />
                    <Badge
                      label={`${t._count?.applications ?? 0} candidat(s)`}
                      tone="magenta"
                    />
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
          <Button label="Rafraîchir" variant="ghost" onPress={() => void load()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, alignItems: "center" },
  container: { width: "100%", maxWidth: 1000, gap: spacing.md },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { ...typography.h2, color: colors.textPrimary },
  grid: { gap: spacing.md, flexWrap: "wrap" },
  cardWrap: { flexGrow: 1, flexBasis: 280, minWidth: 260 },
  cardTitle: { ...typography.h3, color: colors.textPrimary },
  muted: { ...typography.body, color: colors.textSecondary },
  metaRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
});
