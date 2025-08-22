"use client"

import { useState, useEffect } from 'react'
import { Locale, getLocale, t, formatDate, formatDateTime } from '@/lib/i18n'
import { TranslationKey } from '@/lib/i18n'

/**
 * React hook for internationalization
 * Provides translation functions and locale management
 */
export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>('it')

  useEffect(() => {
    setLocaleState(getLocale())
  }, [])

  // Translation function with current locale
  const translate = (key: TranslationKey): string => {
    return t(key, locale)
  }

  // Format date with current locale
  const formatDateLocale = (date: string | Date): string => {
    return formatDate(date, locale)
  }

  // Format datetime with current locale
  const formatDateTimeLocale = (date: string | Date): string => {
    return formatDateTime(date, locale)
  }

  return {
    locale,
    t: translate,
    formatDate: formatDateLocale,
    formatDateTime: formatDateTimeLocale
  }
}
