import enTranslations from './translations/en.json'
import deTranslations from './translations/de.json'

export type Locale = 'en' | 'de'

export interface TranslationResources {
  [key: string]: unknown
}

const translations: Record<Locale, TranslationResources> = {
  en: enTranslations,
  de: deTranslations,
}

let currentLocale: Locale = 'en'

/**
 * Set the current locale for translations
 */
export const setLocale = (locale: Locale): void => {
  if (translations[locale]) {
    currentLocale = locale
  } else {
    console.warn(`Locale "${locale}" not found, falling back to "en"`)
    currentLocale = 'en'
  }
}

/**
 * Get the current locale
 */
export const getLocale = (): Locale => {
  return currentLocale
}

/**
 * Get nested value from object by dot-notation path
 */
const getNestedValue = (obj: unknown, path: string): string | undefined => {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Replace placeholders in a string with values
 * Supports {{key}} syntax
 */
const replacePlaceholders = (str: string, values?: Record<string, string | number>): string => {
  if (!values) return str

  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match
  })
}

/**
 * Translation function
 * @param key - Translation key in dot notation (e.g., 'components.protectedRoleNotice.title')
 * @param values - Optional values to replace placeholders
 * @param locale - Optional locale override (defaults to current locale)
 * @returns Translated string or the key if translation not found
 */
export const t = (
  key: string,
  values?: Record<string, string | number>,
  locale?: Locale
): string => {
  const targetLocale = locale || currentLocale
  const translation = translations[targetLocale]

  if (!translation) {
    console.warn(`Translation for locale "${targetLocale}" not found, falling back to "en"`)
    return t(key, values, 'en')
  }

  let translated = getNestedValue(translation, key)

  // Fallback to English if translation not found
  if (!translated && targetLocale !== 'en') {
    translated = getNestedValue(translations.en, key)
  }

  // If still not found, return the key
  if (!translated) {
    console.warn(`Translation key "${key}" not found for locale "${targetLocale}"`)
    return key
  }

  return replacePlaceholders(translated, values)
}

/**
 * Initialize i18n with a locale
 */
export const initI18n = (locale: Locale = 'en'): void => {
  setLocale(locale)
}

// Export default locale
export const DEFAULT_LOCALE: Locale = 'en'
