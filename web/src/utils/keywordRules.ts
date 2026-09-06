import type { KeywordRule, KeywordRulesConfig } from '../types'

export function resolvePhrases(
  rule: KeywordRule,
  dogName: string,
  ownerName: string,
): string[] {
  return rule.phrases.map((phrase) =>
    phrase
      .replace(/\{dogName\}/g, dogName)
      .replace(/\{ownerName\}/g, ownerName),
  )
}

export function ruleMatchesTranscript(
  rule: KeywordRule,
  transcript: string,
  dogName: string,
  ownerName: string,
): boolean {
  const normalized = transcript.toLowerCase()
  for (const phrase of resolvePhrases(rule, dogName, ownerName)) {
    if (normalized.includes(phrase.toLowerCase())) {
      return true
    }
  }
  return false
}

export function findMatchingRule(
  rules: KeywordRule[],
  transcript: string,
  dogName: string,
  ownerName: string,
): KeywordRule | undefined {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)
  return sorted.find((rule) =>
    ruleMatchesTranscript(rule, transcript, dogName, ownerName),
  )
}

export async function loadKeywordRules(): Promise<KeywordRulesConfig> {
  const base = import.meta.env.BASE_URL
  const response = await fetch(`${base}keyword_rules.json`)
  if (!response.ok) {
    throw new Error('Failed to load keyword_rules.json')
  }
  return response.json() as Promise<KeywordRulesConfig>
}

export function clipUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}clips/${fileName}`
}
