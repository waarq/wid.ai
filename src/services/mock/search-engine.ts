import { format, parseISO } from "date-fns"

import type {
  ActionSearchResult,
  CommandSearchResult,
  DealSearchResult,
  DecisionSearchResult,
  MeetingSearchResult,
  PersonSearchResult,
  SearchParams,
  SearchResult,
  SearchResultType,
  TranscriptSearchResult,
} from "@/types"

import type { MockDb } from "./db"
import { findHighlights, formatClock, makeSnippet, normalize, rawTokens, stem } from "./utils"

/*
 * Ranked search over the mock database. Every query token must match the
 * start of a word somewhere in an entity (prefix + light stemming, so
 * "launc", "launch" and "launched" all match). Each entity scores the sum of
 * its field weights times the fraction of tokens matched in that field, plus
 * bonuses for whole-phrase and exact-title matches.
 */

const DEFAULT_LIMIT = 25
const PER_TYPE: Record<SearchResultType, number> = {
  meeting: 5,
  transcript: 6,
  action: 5,
  decision: 5,
  deal: 5,
  person: 5,
  command: 5,
}

const SEARCH_STOPWORDS = new Set(["the", "a", "an", "of", "to", "in", "on", "and", "or", "for", "with", "is", "at", "by"])

interface Query {
  phrase: string
  tokens: string[]
}

interface Field {
  text: string
  weight: number
}

function prepare(query: string): Query {
  const all = rawTokens(query)
  const filtered = all.filter((t) => !SEARCH_STOPWORDS.has(t))
  return { phrase: normalize(query).trim().replace(/\s+/g, " "), tokens: filtered.length > 0 ? filtered : all }
}

function tokenMatchesWord(token: string, word: string): boolean {
  if (word.startsWith(token)) return true
  if (token.length >= 4) {
    const root = stem(token)
    return word.startsWith(root) || stem(word) === root
  }
  return false
}

const wordCache = new Map<string, string[]>()
function wordsOf(text: string): string[] {
  let words = wordCache.get(text)
  if (!words) {
    words = rawTokens(text)
    if (wordCache.size > 5000) wordCache.clear()
    wordCache.set(text, words)
  }
  return words
}

/** 0 when any token is unmatched across all fields. */
function score(query: Query, fields: Field[]): number {
  if (query.tokens.length === 0) return 0
  const covered = new Set<string>()
  let total = 0
  fields.forEach((field, index) => {
    if (!field.text) return
    const words = wordsOf(field.text)
    let matched = 0
    for (const token of query.tokens) {
      if (words.some((w) => tokenMatchesWord(token, w))) {
        matched += 1
        covered.add(token)
      }
    }
    if (matched === 0) return
    total += field.weight * (matched / query.tokens.length)
    const normalized = normalize(field.text)
    if (query.tokens.length > 1 && normalized.includes(query.phrase)) total += field.weight * 0.5
    if (index === 0 && normalized.trim() === query.phrase) total += field.weight
  })
  return covered.size === query.tokens.length ? Math.round(total * 10) / 10 : 0
}

function top<T extends { score: number }>(items: T[], limit: number): T[] {
  return items.filter((i) => i.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
}

function minutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`
}

export function runSearch(db: MockDb, rawQuery: string, params: SearchParams = {}): SearchResult[] {
  const query = prepare(rawQuery)
  if (query.tokens.length === 0) return []
  const wants = (type: SearchResultType) => !params.types || params.types.includes(type)
  const scoped = Boolean(params.meetingId)
  const meetings = db.accessibleMeetings().filter((m) => !params.meetingId || m.id === params.meetingId)
  const results: SearchResult[] = []

  if (wants("meeting")) {
    const found: MeetingSearchResult[] = meetings.map((m) => {
      const s = m.summary
      const transcript = db.state.transcripts[m.id]
      return {
        type: "meeting",
        id: `meeting:${m.id}`,
        meetingId: m.id,
        title: m.title,
        subtitle: `${format(parseISO(m.startedAt), "MMM d")} · ${minutes(m.duration)} · ${m.participants.length} participants`,
        startedAt: m.startedAt,
        duration: m.duration,
        participantCount: m.participants.length,
        status: m.status,
        score: score(query, [
          { text: m.title, weight: 100 },
          { text: m.tags.map((t) => t.label).join(" "), weight: 45 },
          { text: m.participants.map((p) => `${p.name} ${p.company ?? ""}`).join(" "), weight: 30 },
          { text: [s?.overview ?? "", ...(s?.keyPoints ?? [])].join(" "), weight: 30 },
          { text: [...(s?.decisions.map((d) => d.title) ?? []), ...(s?.actionItems.map((a) => a.title) ?? [])].join(" "), weight: 25 },
          { text: s?.topics.map((t) => t.label).join(" ") ?? "", weight: 20 },
          { text: transcript?.segments.map((seg) => seg.text).join(" ") ?? "", weight: 8 },
        ]),
      }
    })
    results.push(...top(found, PER_TYPE.meeting))
  }

  if (wants("transcript")) {
    const found: TranscriptSearchResult[] = []
    for (const m of meetings) {
      const ref = { id: m.id, title: m.title, startedAt: m.startedAt }
      for (const seg of db.state.transcripts[m.id]?.segments ?? []) {
        const value = score(query, [{ text: seg.text, weight: 50 }, { text: seg.speakerName, weight: 10 }])
        if (value === 0) continue
        const { snippet, highlights } = makeSnippet(seg.text, findHighlights(seg.text, rawQuery))
        found.push({
          type: "transcript",
          id: `transcript:${seg.id}`,
          title: m.title,
          subtitle: `${seg.speakerName} · ${formatClock(seg.startTime)}`,
          meeting: ref,
          speakerName: seg.speakerName,
          snippet,
          highlights,
          meetingId: m.id,
          sourceSegmentId: seg.id,
          sourceTimestamp: seg.startTime,
          score: value,
        })
      }
    }
    // At most two lines per meeting so one long meeting does not crowd others out.
    const perMeeting = new Map<string, number>()
    const diverse = top(found, found.length).filter((r) => {
      const count = perMeeting.get(r.meeting.id) ?? 0
      perMeeting.set(r.meeting.id, count + 1)
      return scoped || count < 2
    })
    results.push(...diverse.slice(0, PER_TYPE.transcript))
  }

  if (wants("decision")) {
    const all = meetings.flatMap((m) => (m.summary?.decisions ?? []).map((d) => ({ d, m })))
    const superseded = new Set(all.map((x) => x.d.supersedesDecisionId).filter(Boolean))
    const found: DecisionSearchResult[] = all.map(({ d, m }) => {
      const value = score(query, [
        { text: d.title, weight: 90 },
        { text: d.context ?? "", weight: 40 },
        { text: m.title, weight: 10 },
      ])
      return {
        type: "decision",
        id: `decision:${d.id}`,
        decisionId: d.id,
        title: d.title,
        subtitle: `${m.title} · ${format(parseISO(m.startedAt), "MMM d")}`,
        meeting: { id: m.id, title: m.title, startedAt: m.startedAt },
        meetingId: d.meetingId,
        sourceSegmentId: d.sourceSegmentId,
        sourceTimestamp: d.sourceTimestamp,
        // The current decision outranks the ones it replaced.
        score: value > 0 ? value + (superseded.has(d.id) ? 0 : 10) : 0,
      }
    })
    results.push(...top(found, PER_TYPE.decision))
  }

  if (wants("action")) {
    const found: ActionSearchResult[] = meetings.flatMap((m) =>
      (m.summary?.actionItems ?? [])
        .filter((a) => a.status !== "dismissed")
        .map((a) => {
          const value = score(query, [
            { text: a.title, weight: 85 },
            { text: a.description ?? "", weight: 35 },
            { text: a.assignee?.name ?? "", weight: 20 },
            { text: m.title, weight: 10 },
          ])
          return {
            type: "action" as const,
            id: `action:${a.id}`,
            actionItemId: a.id,
            title: a.title,
            subtitle: [m.title, a.assignee?.name].filter(Boolean).join(" · "),
            meeting: a.meeting,
            status: a.status,
            dueDate: a.dueDate,
            assigneeName: a.assignee?.name,
            meetingId: a.meetingId,
            sourceSegmentId: a.sourceSegmentId,
            sourceTimestamp: a.sourceTimestamp,
            score: value > 0 ? value + (a.status === "completed" ? 0 : 5) : 0,
          }
        }),
    )
    results.push(...top(found, PER_TYPE.action))
  }

  if (!scoped && wants("deal")) {
    const found: DealSearchResult[] = db.state.deals.map((d) => ({
      type: "deal",
      id: `deal:${d.id}`,
      dealId: d.id,
      company: d.company,
      stage: d.stage,
      title: d.company,
      subtitle: d.nextAction?.title ?? d.name,
      score: score(query, [
        { text: d.company, weight: 95 },
        { text: d.name, weight: 50 },
        { text: d.nextAction?.title ?? "", weight: 30 },
        { text: d.signals.map((s) => s.label).join(" "), weight: 25 },
        { text: d.stage, weight: 20 },
      ]),
    }))
    results.push(...top(found, PER_TYPE.deal))
  }

  if (!scoped && wants("person")) {
    const people = new Map<string, { id: string; name: string; email?: string; company?: string; team?: string }>()
    for (const member of db.members()) people.set(member.id, { id: member.id, name: member.name, email: member.email, team: member.team })
    for (const m of meetings) {
      for (const p of m.participants) {
        if (!people.has(p.id)) people.set(p.id, { id: p.id, name: p.name, email: p.email, company: p.company })
      }
    }
    const found: PersonSearchResult[] = Array.from(people.values()).map((p) => {
      const meetingCount = meetings.filter((m) => m.participants.some((x) => x.id === p.id)).length
      return {
        type: "person",
        id: `person:${p.id}`,
        personId: p.id,
        title: p.name,
        subtitle: p.company ?? p.team ?? p.email,
        email: p.email,
        company: p.company,
        meetingCount,
        score: score(query, [
          { text: p.name, weight: 95 },
          { text: p.email ?? "", weight: 40 },
          { text: p.company ?? "", weight: 40 },
          { text: p.team ?? "", weight: 20 },
        ]),
      }
    })
    results.push(...top(found, PER_TYPE.person))
  }

  if (!scoped && wants("command")) {
    const found: CommandSearchResult[] = db.statics.commands.map((c) => ({
      ...c,
      score: score(query, [
        { text: c.title, weight: 80 },
        { text: c.subtitle ?? "", weight: 20 },
      ]),
    }))
    results.push(...top(found, PER_TYPE.command))
  }

  return results.sort((a, b) => b.score - a.score).slice(0, Math.max(1, params.limit ?? DEFAULT_LIMIT))
}
