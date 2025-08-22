# Supplier Profile Validation & Internationalization (i18n)

This document explains the Supplier Profile Validation feature and the English/Italian internationalization implemented across the relevant UI and API layers.

Last updated: 2025-08-21

---

## Overview

- Validates supplier "basic profile" (deBasic answers) against business rules.
- Returns a per-field compliance result and overall score.
- Displays a validation dashboard in the Supplier Detail "Profile" tab.
- Provides bilingual UI (English/Italian) with a language switcher in the header.

---

## Contents

- API endpoints
- Validation logic
- Frontend components
- i18n setup and usage
- How to add new fields and translations
- Testing checklist

---

## API Endpoints

- GET `/api/suppliers/[id]/profile-validation`
  - Path param: `id` (UUID or `bravo_id`)
  - Response: `{ success: boolean, data: ValidationResult }`
  - Behavior: Fetches supplier and joined `supplier_debasic_answers`, runs validation, returns results.

- POST `/api/suppliers/[id]/profile-validation`
  - Body: `{ field?: string }` (optional to validate a single field)
  - Response: `{ success: boolean, data: ValidationResult | FieldValidationResult }`

Implementation: `app/api/suppliers/[id]/profile-validation/route.ts`

Notes:
- Distinguishes UUID vs `bravo_id` with explicit type casting.
- Joins `suppliers` and `supplier_debasic_answers`.

---

## Validation Logic

- File: `lib/supplier-profile-validator.ts`
- Rules:
  - Exact-match required for some answers (e.g., Yes/No type business rules).
  - Non-empty checks for required fields.
  - Handles nested answer structures (attachments and nested values) by extracting meaningful text.
- Output shape (excerpt):
  ```ts
  type ValidationResult = {
    overall: {
      compliant: boolean
      score: number // 0-100
      total: number
      passed: number
    }
    fields: Array<{
      key: string
      label: string
      required: boolean
      status: 'pass' | 'fail' | 'warning'
      message: string
      value?: string | null
      expected?: string | null
    }>
  }
  ```

---

## Frontend Components

- `components/supplier-profile-validation.tsx`
  - Fetches validation via the API and renders a dashboard.
  - Shows overall score, progress bar, field-by-field results, refresh button.
  - All UI strings are translated using i18n.

- `components/supplier-detail-view.tsx`
  - Integrates the validation dashboard under the "Profile" tab.
  - Adds the `LanguageSwitcher` component to the header.
  - Uses translated tab labels and section titles.

- `components/language-switcher.tsx`
  - Dropdown to toggle English/Italian.
  - Persists selection in `localStorage` and reloads page to apply globally.

---

## i18n Setup

- Files:
  - `lib/i18n/index.ts` — locale detection, getting/setting locale, translation function `t()`, date formatters.
  - `lib/i18n/translations.ts` — translation keys and strings for `en` and `it`.
  - `hooks/use-i18n.ts` — React hook exposing `{ t, locale, setLocale, formatDate, formatDateTime }`.

Usage example in components:
```tsx
import { useI18n } from "@/hooks/use-i18n"
import { uiTranslations } from "@/lib/i18n/translations"

const { t } = useI18n()

<TabsTrigger value="overview">{t(uiTranslations.overview)}</TabsTrigger>
```

Locale persistence and detection order:
1. `localStorage` (user selection)
2. Browser language (navigator.language)
3. Default to `en`

Note: Next.js i18n routing is not required; the solution is app-wide via runtime utilities. You may later integrate Next.js `i18n` routing if needed.

---

## Translation Keys

Primary keys in `lib/i18n/translations.ts` (non-exhaustive):
- `overview`, `profile`, `documents`, `scorecard`, `timeline`
- `companyInformation`, `contactInformation`
- Supplier validation labels and messages
- Language switcher labels: `language`, `english`, `italian`

To add new strings:
1. Add a key to `translations.ts` with `en` and `it` values.
2. Replace hard-coded strings in components with `t()` calls.

---

## Extending Validation

To add a new field validation:
1. Add rule/logic in `lib/supplier-profile-validator.ts`.
2. Ensure the field label/message keys exist in `translations.ts`.
3. (Optional) Update API POST validation to allow the new field-specific runs.
4. The UI will render any additional `fields[]` automatically.

---

## Testing Checklist

- API
  - `GET /api/suppliers/[id]/profile-validation` returns data for valid supplier id or `bravo_id`.
  - `POST /api/suppliers/[id]/profile-validation` validates either full profile or single field.
- UI
  - Supplier Detail → Profile tab shows validation dashboard.
  - Progress bar and badges reflect per-field status.
  - Language switcher toggles all related texts between EN/IT.
- i18n
  - `localStorage` persists language after reload.
  - Date formatting reflects current locale where used.

---

## Known Limitations / Next Steps

- Nested/complex answers are normalized heuristically; refine mappings as needed.
- Consider integrating Next.js i18n routing for URL-based locale control.
- Expand translations to cover additional modules (analytics, settings, etc.).
