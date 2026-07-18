import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { Button, TextField, Badge } from "../../components/ui";
import { endpoints, type MessageItem } from "../../api/endpoints";
import { getAccessToken, wsBaseUrl } from "../../api/client";
import { useAuth } from "../../state/auth";

/**
 * Messagerie légère entre demandeur et candidat retenu.
 * Historique via REST, temps réel via WebSocket (fallback : rechargement REST).
 */
export default function Messages() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setMessages(await endpoints.getMessages(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Connexion temps réel.
  useEffect(() => {
    if (!id) return;
    const token = getAccessToken();
    if (!token) return;
    const ws = new WebSocket(`${wsBaseUrl()}/ws/tasks/${id}?token=${token}`);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data.type === "message") {
          setMessages((prev) =>
            prev.some((m) => m.id === data.message.id)
              ? prev
              : [...prev, data.message]
          );
        }
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, [id]);

  async function send() {
    if (!draft.trim() || !id) return;
    setError(null);
    try {
      const msg = await endpoints.sendMessage(id, draft.trim());
      setDraft("");
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 ? (
            <Text style={styles.muted}>Démarrez la conversation.</Text>
          ) : null}
          {messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <View
                key={m.id}
                style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              >
                {!mine ? (
                  <Text style={styles.author}>{m.sender.nom}</Text>
                ) : null}
                <Text style={styles.msgText}>{m.contenu}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.composer}>
          {error ? <Badge label={error} tone="warning" /> : null}
          <TextField label="" value={draft} onChangeText={setDraft} placeholder="Votre message…" />
          <Button label="Envoyer" variant="primary" onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  muted: { ...typography.body, color: colors.textMuted },
  bubble: {
    maxWidth: "85%",
    padding: spacing.md,
    borderRadius: radius.md,
    gap: 2,
  },
  mine: { alignSelf: "flex-end", backgroundColor: colors.cyanDim },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.surface },
  author: { ...typography.caption, color: colors.textSecondary },
  msgText: { ...typography.body, color: colors.textPrimary },
  composer: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
});
