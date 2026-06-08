const STORAGE_KEY = "ad-studio-remembered-accounts";
const MAX_ACCOUNTS = 5;

export type RememberedAccount = {
  email: string;
  name: string | null;
  lastUsedAt: number;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getAccountInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "User";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const AVATAR_COLORS = ["#7c3aed", "#c026d3", "#0284c7", "#059669", "#d97706", "#e11d48"];

export function getAccountAvatarColor(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i += 1) {
    hash = (hash + email.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
}

function readAccounts(): RememberedAccount[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as RememberedAccount[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (account) =>
          account &&
          typeof account.email === "string" &&
          typeof account.lastUsedAt === "number",
      )
      .map((account) => ({
        email: normalizeEmail(account.email),
        name: typeof account.name === "string" ? account.name : null,
        lastUsedAt: account.lastUsedAt,
      }))
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, MAX_ACCOUNTS);
  } catch {
    return [];
  }
}

function writeAccounts(accounts: RememberedAccount[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)));
}

export function listRememberedAccounts() {
  return readAccounts();
}

export function rememberAccount(account: { email: string; name?: string | null }) {
  const email = normalizeEmail(account.email);
  const existing = readAccounts().filter((item) => item.email !== email);
  const next: RememberedAccount = {
    email,
    name: account.name?.trim() || null,
    lastUsedAt: Date.now(),
  };

  writeAccounts([next, ...existing]);
}

export function removeRememberedAccount(email: string) {
  const normalized = normalizeEmail(email);
  writeAccounts(readAccounts().filter((account) => account.email !== normalized));
}

export function clearRememberedAccounts() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
