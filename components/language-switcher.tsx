"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import { Locale, getLocale, setLocale, SUPPORTED_LOCALES } from "@/lib/i18n"
import { uiTranslations } from "@/lib/i18n/translations"

interface LanguageSwitcherProps {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const [currentLocale, setCurrentLocale] = useState<Locale>('it')

  useEffect(() => {
    setCurrentLocale(getLocale())
  }, [])

  const handleLocaleChange = (locale: Locale) => {
    setLocale(locale)
    setCurrentLocale(locale)
    // Trigger a page refresh to apply the new locale
    window.location.reload()
  }

  const getLanguageName = (locale: Locale) => {
    switch (locale) {
      case 'en':
        return uiTranslations.english[currentLocale]
      case 'it':
        return uiTranslations.italian[currentLocale]
      default:
        return locale
    }
  }

  const getCurrentLanguageFlag = (locale: Locale) => {
    switch (locale) {
      case 'en':
        return '🇺🇸'
      case 'it':
        return '🇮🇹'
      default:
        return '🌐'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Globe className="w-4 h-4 mr-2" />
          <span className="mr-1">{getCurrentLanguageFlag(currentLocale)}</span>
          {getLanguageName(currentLocale)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className={currentLocale === locale ? "bg-accent" : ""}
          >
            <span className="mr-2">{getCurrentLanguageFlag(locale)}</span>
            {getLanguageName(locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
