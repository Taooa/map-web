export function readPlatformSettings<Settings extends object>(
  key: string,
  fallback: Settings,
): Settings {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    const parsed: unknown = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? Object.assign({}, fallback, parsed) : fallback;
  } catch {
    return fallback;
  }
}
