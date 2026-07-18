import React, { useEffect, useState, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography, radius } from "../theme/tokens";
import { Card, Button, Badge } from "../components/ui";
import { endpoints, type NotificationItem } from "../api/endpoints";

const LABELS: Record<string, string> = {
  NEW_APPLICATION: "Nouvelle candidature",
  APP_ACCEPTED: "Candidature acceptée",
  TASK_UPCOMING: "Tâche à venir",
  PAYMENT_RECEIVED: "Paiement reçu",
  NEW_REVIEW: "Nouvel avis",
};

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await endpoints.notifications();
      setItems(res.items);
      setUnread(res.unread);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAll() {
    await endpoints.markAllNotificationsRead();
    await load();
  }

  async function markOne(id: string) {
    await endpoints.markNotificationRead(id);
    await load();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Notifications</Text>
            {unread > 0 ? <Badge label={`${unread} non lues`} tone="magenta" /> : null}
          </View>

          {error ? <Badge label={error} tone="warning" /> : null}
          {items.length === 0 ? (
            <Text style={styles.muted}>Aucune notification.</Text>
          ) : null}

          {items.map((n) => (
            <Pressable key={n.id} onPress={() => markOne(n.id)}>
              <Card style={[styles.item, !n.lu && styles.unread]}>
                <View style={styles.rowBetween}>
                  <Text style={styles.type}>{LABELS[n.type] ?? n.type}</Text>
                  {!n.lu ? <View style={styles.dot} /> : null}
                </View>
                {n.payload?.message ? (
                  <Text style={styles.muted}>{n.payload.message}</Text>
                ) : null}
                <Text style={styles.date}>
                  {new Date(n.createdAt).toLocaleString()}
                </Text>
              </Card>
            </Pressable>
          ))}

          {items.length > 0 ? (
            <Button label="Tout marquer comme lu" variant="ghost" onPress={markAll} />
          ) : null}
          <Button label="Rafraîchir" variant="ghost" onPress={() => void load()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, alignItems: "center" },
  container: { width: "100%", maxWidth: 560, gap: spacing.md },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...typography.h2, color: colors.textPrimary },
  item: { gap: spacing.xs },
  unread: { borderColor: colors.violet },
  type: { ...typography.h3, color: colors.textPrimary },
  muted: { ...typography.body, color: colors.textSecondary },
  date: { ...typography.caption, color: colors.textMuted },
  dot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.magenta },
});
