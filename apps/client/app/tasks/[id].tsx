import React, { useEffect, useState, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, spacing, typography } from "../../theme/tokens";
import { Card, Button, Badge, TextField, StarRating } from "../../components/ui";
import { statusBadge } from "../../components/taskStatus";
import { endpoints, type TaskDetail, type ReviewItem } from "../../api/endpoints";
import { useAuth } from "../../state/auth";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [message, setMessage] = useState("");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [note, setNote] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [t, r] = await Promise.all([
        endpoints.getTask(id),
        endpoints.taskReviews(id).catch(() => [] as ReviewItem[]),
      ]);
      setTask(t);
      setReviews(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!task) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.scroll}>
          {error ? <Badge label={error} tone="warning" /> : <Text style={styles.muted}>Chargement…</Text>}
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = user?.id === task.owner?.id;
  const isParty = isOwner || user?.id === task.workerId;
  const alreadyApplied = task.applications.some((a) => a.workerId === user?.id);
  const badge = statusBadge(task.statut);
  const finished = task.statut === "TERMINEE" || task.statut === "PAYEE";
  const canReview =
    finished && isParty && !reviews.some((r) => r.authorId === user?.id);
  const showMessaging =
    isParty &&
    ["ATTRIBUEE", "EN_COURS", "TERMINEE", "PAYEE"].includes(task.statut);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Card style={{ gap: spacing.sm }}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{task.titre}</Text>
              <Badge label={badge.label} tone={badge.tone} />
            </View>
            <Text style={styles.muted}>{task.description}</Text>
            <View style={styles.metaRow}>
              <Badge label={task.zone} tone="violet" />
              <Badge label={`${Number(task.tauxHoraire).toFixed(0)} €/h`} tone="cyan" />
              <Badge label={`${Number(task.montantTotal).toFixed(2)} € total`} tone="cyan" />
            </View>
            <Text style={styles.muted}>
              Du {new Date(task.heureDebut).toLocaleString()} au{" "}
              {new Date(task.heureFin).toLocaleString()}
            </Text>
          </Card>

          {/* Actions travailleur : postuler */}
          {!isOwner && task.statut === "OUVERTE" ? (
            <Card style={{ gap: spacing.sm }}>
              <Text style={styles.section}>Postuler</Text>
              {alreadyApplied ? (
                <>
                  <Badge label="Candidature envoyée" tone="success" />
                  <Text style={styles.muted}>
                    Pensez à configurer votre compte de paiement pour être payé
                    si vous êtes retenu.
                  </Text>
                  <Button
                    label="Configurer mes paiements"
                    variant="ghost"
                    onPress={() => router.push("/payments")}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Message (optionnel)"
                    value={message}
                    onChangeText={setMessage}
                  />
                  <Button
                    label="Envoyer ma candidature"
                    variant="primary"
                    onPress={() =>
                      act(() => endpoints.applyToTask(task.id, message || undefined))
                    }
                  />
                </>
              )}
            </Card>
          ) : null}

          {/* Vue owner : liste des profils candidats + choix */}
          {isOwner ? (
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.section}>
                Candidats ({task.applications.length})
              </Text>
              {task.applications.length === 0 ? (
                <Text style={styles.muted}>Aucune candidature pour l'instant.</Text>
              ) : null}
              {task.applications.map((a) => (
                <View key={a.id} style={styles.candidate}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.candidateName}>{a.worker.nom}</Text>
                    <Badge
                      label={`★ ${a.worker.noteMoyenne.toFixed(1)}`}
                      tone="warning"
                    />
                  </View>
                  {a.worker.bio ? (
                    <Text style={styles.muted}>{a.worker.bio}</Text>
                  ) : null}
                  {a.message ? (
                    <Text style={styles.muted}>« {a.message} »</Text>
                  ) : null}
                  {task.statut === "OUVERTE" ? (
                    <Button
                      label="Choisir ce candidat"
                      variant="primary"
                      onPress={() =>
                        act(() => endpoints.acceptApplication(task.id, a.id))
                      }
                    />
                  ) : a.statut === "ACCEPTEE" ? (
                    <Badge label="Retenu" tone="success" />
                  ) : (
                    <Badge label="Non retenu" tone="magenta" />
                  )}
                </View>
              ))}
            </Card>
          ) : null}

          {/* Transitions de statut */}
          <Card style={{ gap: spacing.sm }}>
            <Text style={styles.section}>Suivi</Text>
            <View style={styles.metaRow}>
              {task.statut === "ATTRIBUEE" ? (
                <Button
                  label="Démarrer"
                  variant="accent"
                  onPress={() => act(() => endpoints.startTask(task.id))}
                />
              ) : null}
              {task.statut === "EN_COURS" ? (
                <Button
                  label="Marquer terminée"
                  variant="primary"
                  onPress={() => act(() => endpoints.completeTask(task.id))}
                />
              ) : null}
              {isOwner && task.statut === "ATTRIBUEE" ? (
                <Button
                  label="Autoriser le paiement"
                  variant="primary"
                  onPress={() => act(() => endpoints.payTask(task.id))}
                />
              ) : null}
              {isOwner && task.statut === "TERMINEE" ? (
                <Button
                  label="Libérer le paiement"
                  variant="primary"
                  onPress={() => act(() => endpoints.captureTask(task.id))}
                />
              ) : null}
              {(task.statut === "OUVERTE" ||
                task.statut === "ATTRIBUEE") && isOwner ? (
                <Button
                  label="Annuler"
                  variant="ghost"
                  onPress={() => act(() => endpoints.cancelTask(task.id))}
                />
              ) : null}
            </View>
          </Card>

          {/* Messagerie demandeur ↔ candidat retenu */}
          {showMessaging ? (
            <Button
              label="Ouvrir la messagerie"
              variant="accent"
              onPress={() => router.push(`/messages/${task.id}`)}
            />
          ) : null}

          {/* Notation après réalisation */}
          {canReview ? (
            <Card style={{ gap: spacing.sm }}>
              <Text style={styles.section}>Noter</Text>
              <Text style={styles.muted}>
                {isOwner
                  ? "Notez le travailleur venu réaliser la tâche."
                  : "Notez le demandeur."}
              </Text>
              <StarRating value={note} onChange={setNote} />
              <TextField
                label="Commentaire (optionnel)"
                value={comment}
                onChangeText={setComment}
              />
              <Button
                label="Envoyer mon avis"
                variant="primary"
                onPress={() =>
                  act(() =>
                    endpoints.createReview(task.id, note, comment || undefined)
                  )
                }
              />
            </Card>
          ) : null}

          {/* Avis déjà déposés */}
          {reviews.length > 0 ? (
            <Card style={{ gap: spacing.sm }}>
              <Text style={styles.section}>Avis</Text>
              {reviews.map((r) => (
                <View key={r.id} style={styles.reviewRow}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.candidateName}>{r.author.nom}</Text>
                    <Badge label={`★ ${r.note}`} tone="warning" />
                  </View>
                  {r.commentaire ? (
                    <Text style={styles.muted}>« {r.commentaire} »</Text>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          {error ? <Badge label={error} tone="warning" /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, alignItems: "center" },
  container: { width: "100%", maxWidth: 640, gap: spacing.md },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { ...typography.h2, color: colors.textPrimary, flex: 1 },
  section: { ...typography.h3, color: colors.textPrimary },
  muted: { ...typography.body, color: colors.textSecondary, lineHeight: 21 },
  metaRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  candidate: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  candidateName: { ...typography.h3, color: colors.textPrimary },
  reviewRow: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
});
