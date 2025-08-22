/**
 * Internationalization (i18n) utilities for supplier platform
 * Supports English and Italian languages
 */

export type Locale = 'en' | 'it';

export interface TranslationKey {
  en: string;
  it: string;
}

// Default locale
export const DEFAULT_LOCALE: Locale = 'it';

// Available locales
export const SUPPORTED_LOCALES: Locale[] = ['en', 'it'];

// Locale detection from browser or storage
export function getLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  
  // Check localStorage first
  const stored = localStorage.getItem('locale') as Locale;
  if (stored && SUPPORTED_LOCALES.includes(stored)) {
    return stored;
  }
  
  // Check browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('it')) return 'it';
  if (browserLang.startsWith('en')) return 'en';
  
  return DEFAULT_LOCALE;
}

// Set locale in localStorage
export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('locale', locale);
}

// Translation function
export function t(key: TranslationKey, locale?: Locale): string {
  const currentLocale = locale || getLocale();
  return key[currentLocale] || key[DEFAULT_LOCALE] || key.en;
}

// Format date according to locale
export function formatDate(date: string | Date, locale?: Locale): string {
  const currentLocale = locale || getLocale();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(currentLocale === 'it' ? 'it-IT' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Format datetime according to locale
export function formatDateTime(date: string | Date, locale?: Locale): string {
  const currentLocale = locale || getLocale();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(currentLocale === 'it' ? 'it-IT' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
