import de from './de.json'
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import ja from './ja.json'
import pt from './pt.json'
import tr from './tr.json'
import zh from './zh.json'

export type Locale = typeof en

export const LOCALE_MAP: Record<string, string> = {
  English: 'en-US',
  Portuguese: 'pt-PT',
  Spanish: 'es-ES',
  French: 'fr-FR',
  German: 'de-DE',
  Turkish: 'tr-TR',
  Japanese: 'ja-JP',
  Chinese: 'zh-CN',
}

const locales: Record<string, Locale> = {
  English: en,
  Portuguese: pt,
  Spanish: es,
  French: fr,
  German: de,
  Turkish: tr,
  Japanese: ja,
  Chinese: zh,
}

export function getStrings(language: string): Locale {
  return locales[language] ?? locales['English']
}

// Interpolation helpers — handle {placeholder} syntax in JSON strings
export function t(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''))
}

export function getDay(language: string, dayIndex: number): string {
  const locale: Locale = getStrings(language)
  return locale.days[dayIndex] ?? locale.days[1]
}

export function formatHour(hour: number): string {
  const h: number = hour % 12 || 12
  const ampm: string = hour < 12 ? 'am' : 'pm'
  return `${h}:00 ${ampm} UTC`
}