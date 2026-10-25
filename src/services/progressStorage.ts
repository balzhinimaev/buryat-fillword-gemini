// Local learning data is isolated per account. Legacy data is claimed once by
// the account already present at upgrade (or by the guest), never by a later login.
export const PROGRESS_OWNER_EVENT = 'progress:owner';
const LEGACY_OWNER = 'progress_legacy_owner_v2';
let memoryOwner: string | null = null;
export function ownerFromToken(token?: string): string {
  try {
    const raw = token?.split('.')[1];
    if (!raw) return 'guest';
    const { sub } = JSON.parse(atob(raw.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof sub === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(sub) ? sub : 'guest';
  } catch { return 'guest'; }
}
export function progressOwner(): string {
  try {
    const token = JSON.parse(localStorage.getItem('auth_tokens') || 'null')?.access_token;
    return token ? ownerFromToken(token) : 'guest';
  } catch { return memoryOwner || 'guest'; }
}
function legacyOwner(): string {
  const existing = localStorage.getItem(LEGACY_OWNER);
  if (existing) return existing;
  const owner = progressOwner();
  localStorage.setItem(LEGACY_OWNER, owner);
  return owner;
}
export function prepareOwnerChange(): void {
  try { legacyOwner(); } catch { /* storage unavailable */ }
}
export function notifyOwnerChange(token?: string): void {
  memoryOwner = ownerFromToken(token);
  window.dispatchEvent(new Event(PROGRESS_OWNER_EVENT));
}
export function progressKey(key: string, owner = progressOwner()): string {
  return `${key}:v2:${owner}`;
}
export function readProgress(key: string, owner = progressOwner()): string | null {
  const scoped = progressKey(key, owner);
  const current = localStorage.getItem(scoped);
  if (current !== null) return current;
  if (!localStorage.getItem(`${scoped}:migrated`) && legacyOwner() === owner) {
    const legacy = localStorage.getItem(key);
    if (legacy !== null) {
      localStorage.setItem(scoped, legacy);
      // Keep the original as a rollback backup, with a migration marker even
      // if the scoped entry is later removed deliberately.
      localStorage.setItem(`${scoped}:migrated`, '1');
      return legacy;
    }
  }
  return null;
}
export function writeProgress(key: string, value: string, owner = progressOwner()): void {
  localStorage.setItem(progressKey(key, owner), value);
}
