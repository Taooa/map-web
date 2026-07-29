export type ThemePreference = 'system' | 'light' | 'dark';
export type SupportedLocale = 'zh-CN';

/**
 * Product preferences only. Map credentials are deliberately excluded and
 * belong to a separate infrastructure port in a later phase.
 */
export interface Settings {
  readonly theme: ThemePreference;
  readonly locale: SupportedLocale;
}
