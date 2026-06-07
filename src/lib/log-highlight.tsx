import type { ReactNode } from "react"

import { formatLogPayload } from "@/data/serial-defaults"
import type { DisplayMode, HighlightColor, HighlightRule, LogEntry, LogFilter } from "@/types/serial"

export const HIGHLIGHT_REGEX_FLAGS = "gi"

const highlightClasses: Record<HighlightColor, string> = {
  yellow: "bg-warning/35 text-foreground ring-warning/30",
  cyan: "bg-cyan-400/25 text-cyan-50 ring-cyan-300/25",
  green: "bg-emerald-400/25 text-emerald-50 ring-emerald-300/25",
  violet: "bg-violet-400/25 text-violet-50 ring-violet-300/25",
  rose: "bg-rose-400/25 text-rose-50 ring-rose-300/25",
}

export const highlightColorOptions: { color: HighlightColor; className: string }[] = [
  { color: "yellow", className: "bg-warning" },
  { color: "cyan", className: "bg-cyan-300" },
  { color: "green", className: "bg-emerald-300" },
  { color: "violet", className: "bg-violet-300" },
  { color: "rose", className: "bg-rose-300" },
]

export interface HighlightMatch {
  start: number
  end: number
  color: HighlightColor
}

export function parseHighlightTerms(highlight: string): string[] {
  return [...new Set(highlight.split(/[,;|\s]+/).map((term) => term.trim()).filter(Boolean))]
}

export function createHighlightRule(pattern = ""): HighlightRule {
  return {
    id: crypto.randomUUID(),
    pattern,
    isRegex: false,
    color: "yellow",
    enabled: true,
  }
}

export function getActiveHighlightRules(filter: LogFilter): HighlightRule[] {
  const rules = filter.highlightRules.filter((rule) => rule.enabled && rule.pattern.trim())
  if (rules.length) {
    return rules
  }

  return parseHighlightTerms(filter.highlight || filter.search).map((term) => ({
    id: `legacy-${term}`,
    pattern: term,
    isRegex: false,
    color: "yellow",
    enabled: true,
  }))
}

export function isInvalidRegex(pattern: string) {
  if (!pattern.trim()) {
    return false
  }
  try {
    new RegExp(pattern, HIGHLIGHT_REGEX_FLAGS)
    return false
  } catch {
    return true
  }
}

export function findRuleMatches(text: string, rule: HighlightRule): HighlightMatch[] {
  const matches: HighlightMatch[] = []
  const pattern = rule.pattern.trim()
  if (!rule.enabled || !pattern || !text) {
    return matches
  }
  if (rule.isRegex) {
    if (isInvalidRegex(pattern)) {
      return matches
    }
    collectRegexMatches(text, pattern, rule.color, matches)
  } else {
    collectLiteralMatches(text, pattern, rule.color, matches)
  }
  return matches
}

export function findFirstMatchingLogId(
  logs: LogEntry[],
  rule: HighlightRule,
  displayMode: DisplayMode
): string | null {
  for (const entry of logs) {
    const text = formatLogPayload(entry, displayMode)
    if (findRuleMatches(text, rule).length) {
      return entry.id
    }
  }
  return null
}

export function highlightText(text: string, rules: HighlightRule[]): ReactNode {
  if (!rules.length || !text) {
    return text
  }

  const matches: HighlightMatch[] = []
  for (const rule of rules) {
    matches.push(...findRuleMatches(text, rule))
  }

  if (!matches.length) {
    return text
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: HighlightMatch[] = []
  for (const match of matches) {
    const last = merged.at(-1)
    if (!last || match.start >= last.end) {
      merged.push({ ...match })
    } else if (match.end > last.end) {
      last.end = match.end
    }
  }

  const parts: ReactNode[] = []
  let cursor = 0
  merged.forEach((match, index) => {
    if (cursor < match.start) {
      parts.push(text.slice(cursor, match.start))
    }
    parts.push(
      <mark
        key={`${match.start}-${index}`}
        className={`rounded-sm px-0.5 ring-1 ${highlightClasses[match.color]}`}
      >
        {text.slice(match.start, match.end)}
      </mark>
    )
    cursor = match.end
  })
  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }
  return parts
}

function collectLiteralMatches(
  text: string,
  pattern: string,
  color: HighlightColor,
  matches: HighlightMatch[]
) {
  const lower = text.toLowerCase()
  const term = pattern.toLowerCase()
  let from = 0
  while (from < lower.length) {
    const index = lower.indexOf(term, from)
    if (index < 0) {
      break
    }
    matches.push({ start: index, end: index + term.length, color })
    from = index + term.length
  }
}

function collectRegexMatches(
  text: string,
  pattern: string,
  color: HighlightColor,
  matches: HighlightMatch[]
) {
  try {
    const regexp = new RegExp(pattern, HIGHLIGHT_REGEX_FLAGS)
    let from = 0
    while (from <= text.length) {
      regexp.lastIndex = from
      const match = regexp.exec(text)
      if (!match || match.index === undefined) {
        break
      }
      if (!match[0]) {
        from = match.index + 1
        continue
      }
      matches.push({ start: match.index, end: match.index + match[0].length, color })
      from = match.index + match[0].length
    }
  } catch {
    /* Invalid user regex is shown in the editor and ignored while rendering. */
  }
}