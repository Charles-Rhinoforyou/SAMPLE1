/**
 * Client REST minimal, partagé par tous les écrans (web + Android).
 * L'URL de l'API vient de EXPO_PUBLIC_API_URL.
 */

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    const message =
      (data as { error?: string })?.error ?? `Erreur API (${res.status})`;
    throw new Error(message);
  }
  return data;
}
