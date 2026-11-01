// Who can see / open the Dev Space. The server enforces this too (ADMIN_EMAIL
// env var) — this list only decides whether the entry point is shown.
export const ADMIN_EMAILS = ['letmeknow6@icloud.com', 'loqvm1@gmail.com'];

export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase().trim());

/** Turn apiRequest's "HTTP 400: {"message":"..."}" errors into plain text. */
export function apiErrorText(e: unknown, fallback = 'Something went wrong'): string {
  const raw = String((e as any)?.message ?? '');
  const body = raw.replace(/^HTTP \d+:\s*/, '');
  try {
    const parsed = JSON.parse(body);
    if (parsed?.message) return String(parsed.message);
  } catch { /* not JSON */ }
  return body || fallback;
}
