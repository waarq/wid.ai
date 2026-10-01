import { format, parseISO } from "date-fns"

import type { AnswerConfidence, AnswerSource, Decision, JobFunction, Meeting, SuggestedQuestion, TranscriptSegment } from "@/types"

import { rawTokens, stem, tokenize } from "./utils"

/*
 * Deterministic "ask this meeting" over the meeting's own data. Questions are
 * scored against intent keyword sets (decisions, actions, risks, questions,
 * unresolved, client asks, summary, people, dates); remaining content words
 * are the topic, used to filter insights. If nothing structured matches, the
 * transcript is searched with IDF-weighted token overlap. Every answered
 * result cites real segment ids and timestamps; otherwise it is "not_found".
 */

type Intent = "decisions" | "actions" | "risks" | "questions" | "unresolved" | "client" | "summary" | "people" | "dates"

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  decisions: ["decid", "decision", "agre", "conclu", "settl", "official", "chose", "choose", "plan"],
  actions: ["action", "todo", "task", "assign", "owe", "follow", "next", "step", "deliver", "commit", "responsib"],
  risks: ["risk", "blocker", "block", "concern", "worr", "issue", "problem", "danger", "depend", "slip", "threat"],
  questions: ["question", "asked"],
  unresolved: ["unresolv", "open", "pending", "outstand", "remain", "undecid", "unclear", "unanswer"],
  client: ["client", "customer", "request", "requir", "want", "need", "prospect", "buyer"],
  summary: ["summar", "overview", "recap", "gist", "tldr", "highlight", "happen", "takeaway", "key"],
  people: ["who", "attend", "participant", "present", "join", "people"],
  dates: ["when", "date", "deadline", "due", "timeline", "schedul"],
}

/** Words that carry no topic on their own. */
const GENERIC = new Set(
  ["thing", "talk", "discuss", "say", "said", "mention", "item", "point", "anything", "everything", "team", "mean", "know",
    "about", "regard", "make", "made", "go", "going", "come", "came", "were", "look", "like", "think", "today"].map(stem),
)

const PRIORITY: Intent[] = ["unresolved", "client", "risks", "actions", "decisions", "dates", "questions", "people", "summary"]
const MAX_SOURCES = 4

export interface AssistantContext {
  meeting: Meeting
  segments: TranscriptSegment[]
  me: { personId: string; userId: string }
  findDecision: (id: string) => Decision | undefined
  notFoundText: string
}

export interface AssistantResult {
  answer: string
  status: "answered" | "not_found"
  sources: AnswerSource[]
  confidence: AnswerConfidence
}

interface Insight {
  text: string
  sourceSegmentId: string
  sourceTimestamp: number
}

const matchesKeyword = (token: string, keyword: string) => (keyword.length <= 3 ? token === keyword : token.startsWith(keyword))

function classify(question: string): { intent: Intent | null; topic: string[]; mine: boolean } {
  const raw = rawTokens(question)
  const tokens = tokenize(question)
  const all = [...new Set([...tokens, ...raw.filter((t) => t === "who" || t === "when")])]
  const scores = new Map<Intent, number>()
  const consumed = new Set<string>()
  for (const intent of PRIORITY) {
    const hits = all.filter((t) => INTENT_KEYWORDS[intent].some((k) => matchesKeyword(t, k)))
    if (hits.length) scores.set(intent, hits.length)
  }
  const lower = question.toLowerCase()
  if (/\bnext steps?\b|\bfollow[- ]?ups?\b/.test(lower)) scores.set("actions", (scores.get("actions") ?? 0) + 2)
  if (/\bstill open\b|\bremains?\b|\bnot (yet )?(decided|resolved)\b/.test(lower)) scores.set("unresolved", (scores.get("unresolved") ?? 0) + 2)
  if (/\bask(ed)? for\b/.test(lower)) scores.set("client", (scores.get("client") ?? 0) + 1)
  if (/^\s*who\b/.test(lower)) scores.set("people", (scores.get("people") ?? 0) + 3)

  let intent: Intent | null = null
  let best = 0
  for (const candidate of PRIORITY) {
    const value = scores.get(candidate) ?? 0
    if (value > best) {
      best = value
      intent = candidate
    }
  }
  if (intent) for (const t of all) if (INTENT_KEYWORDS[intent].some((k) => matchesKeyword(t, k))) consumed.add(t)
  const topic = tokens.filter((t) => !consumed.has(t) && !GENERIC.has(t) && t !== "who" && t !== "when")
  const mine = raw.some((t) => t === "my" || t === "me" || t === "i" || t === "mine")
  return { intent, topic, mine }
}

function words(text: string): string[] {
  return tokenize(text)
}

function overlap(topic: string[], text: string): number {
  if (topic.length === 0) return 0
  const w = words(text)
  return topic.filter((t) => w.some((x) => x.startsWith(t) || t.startsWith(x) && x.length >= 4)).length
}

function due(date: string | undefined): string {
  return date ? ` (due ${format(parseISO(date), "EEE, MMM d")})` : ""
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ""
  return `${items.slice(0, -1).join("; ")}; and ${items[items.length - 1]}`
}

function count(n: number, singular: string, plural = `${singular}s`): string {
  const wordsForNumbers = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
  return `${wordsForNumbers[n] ?? n} ${n === 1 ? singular : plural}`
}

/** Lowercases the first letter unless it starts an acronym ("API"). */
function lowerFirst(text: string): string {
  return /^[A-Z][A-Z]/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1)
}

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function clip(text: string, max = 220): string {
  return text.length <= max ? text : `${text.slice(0, max - 3).trimEnd()}...`
}

export function answerQuestion(ctx: AssistantContext, question: string): AssistantResult {
  const { meeting, segments } = ctx
  const summary = meeting.summary
  const segmentById = new Map(segments.map((s) => [s.id, s]))
  const sourcesOf = (insights: Insight[]): AnswerSource[] => {
    const seen = new Set<string>()
    const out: AnswerSource[] = []
    for (const i of insights) {
      const seg = segmentById.get(i.sourceSegmentId)
      if (!seg || seen.has(seg.id)) continue
      seen.add(seg.id)
      out.push({ meetingId: meeting.id, sourceSegmentId: seg.id, sourceTimestamp: seg.startTime, quote: clip(seg.text), speakerName: seg.speakerName })
      if (out.length >= MAX_SOURCES) break
    }
    return out
  }
  const answered = (answer: string, insights: Insight[], confidence: AnswerConfidence): AssistantResult => {
    const sources = sourcesOf(insights)
    return sources.length > 0 ? { answer, status: "answered", sources, confidence } : notFound()
  }
  const notFound = (text = ctx.notFoundText): AssistantResult => ({ answer: text, status: "not_found", sources: [], confidence: "low" })
  const segText = (id: string) => segmentById.get(id)?.text ?? ""
  /** Items relevant to the topic, best first; all items when there is no topic. */
  const relevant = <T extends Insight>(items: T[], topic: string[]): T[] => {
    if (topic.length === 0) return items
    return items
      .map((item) => ({ item, score: overlap(topic, `${item.text} ${segText(item.sourceSegmentId)}`) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.item.sourceTimestamp - b.item.sourceTimestamp)
      .map((x) => x.item)
  }

  /** IDF-weighted transcript search, the fallback for anything not in the summary. */
  const searchTranscript = (terms: string[]): AssistantResult | null => {
    if (terms.length === 0 || segments.length === 0) return null
    const segWords = segments.map((s) => words(s.text))
    const idf = (t: string) => {
      const df = segWords.filter((w) => w.some((x) => x.startsWith(t))).length
      return df === 0 ? 0 : Math.log(1 + segments.length / df)
    }
    const weights = terms.map(idf)
    const scored = segments
      .map((seg, i) => {
        const hits = terms.map((t, j) => (segWords[i].some((x) => x.startsWith(t)) ? weights[j] : 0))
        const covered = hits.filter((h) => h > 0).length
        return { seg, score: hits.reduce((a, b) => a + b, 0), coverage: covered / terms.length }
      })
      .filter((x) => x.score > 0 && x.coverage >= 0.5)
      .sort((a, b) => b.score - a.score || a.seg.startTime - b.seg.startTime)
    if (scored.length === 0) return null
    const picks = scored.slice(0, 2).sort((a, b) => a.seg.startTime - b.seg.startTime)
    const answer = picks.map((p) => `${p.seg.speakerName} said: "${clip(p.seg.text, 180)}"`).join(" ")
    const confidence: AnswerConfidence = picks[0].coverage === 1 ? "medium" : "low"
    return answered(answer, picks.map((p) => ({ text: p.seg.text, sourceSegmentId: p.seg.id, sourceTimestamp: p.seg.startTime })), confidence)
  }

  if (!summary) {
    return notFound("This meeting is still being processed. Ask again once it's ready.")
  }

  const { intent, topic, mine } = classify(question)
  const decisions = summary.decisions.map((d) => ({ ...d, text: `${d.title} ${d.context ?? ""}` }))
  const actions = summary.actionItems
    .filter((a) => a.status !== "dismissed")
    .map((a) => ({ ...a, text: `${a.title} ${a.description ?? ""} ${a.assignee?.name ?? ""}` }))
  const questions = summary.questions.map((q) => ({ ...q, text: `${q.text} ${q.answer ?? ""}` }))
  const risks = summary.risks.map((r) => ({ ...r, text: `${r.title} ${r.description ?? ""}` }))
  const confidence: AnswerConfidence = "high"

  const describeDecision = (d: (typeof decisions)[number]) => {
    const previous = d.supersedesDecisionId ? ctx.findDecision(d.supersedesDecisionId) : undefined
    return `${d.title}.${d.context ? ` ${d.context}` : ""}${previous ? ` This replaced an earlier decision: ${lowerFirst(previous.title)}.` : ""}`
  }
  const describeAction = (a: (typeof actions)[number], withOwner = true) => {
    const owner = withOwner && a.assignee ? `${a.assignee.name.split(" ")[0]}: ` : ""
    const done = a.status === "completed" ? " (done)" : ""
    return `${owner}${a.title}${a.status === "completed" ? "" : due(a.dueDate)}${done}`
  }
  const isMine = (a: (typeof actions)[number]) => a.assignee?.id === ctx.me.personId || a.assignee?.userId === ctx.me.userId

  const byIntent = (): AssistantResult | null => {
    switch (intent) {
      case "decisions": {
        const found = relevant(decisions, topic)
        if (found.length === 0) return null
        if (found.length === 1 || topic.length > 0) return answered(describeDecision(found[0]), [found[0]], confidence)
        return answered(`The team made ${count(found.length, "decision")}: ${list(found.map((d) => d.title))}.`, found, confidence)
      }
      case "actions": {
        let found = relevant(actions, topic)
        if (mine) found = found.filter(isMine)
        const openItems = found.filter((a) => a.status !== "completed")
        if (found.length === 0) {
          return mine && topic.length === 0 && actions.length > 0
            ? answered(`Nothing in this meeting is assigned to you. The team's actions are: ${list(actions.map((a) => describeAction(a)))}.`, actions, "medium")
            : null
        }
        const shown = openItems.length > 0 ? openItems : found
        const lead = mine
          ? `You have ${count(openItems.length, "open action item")}`
          : `There ${openItems.length === 1 ? "is" : "are"} ${count(openItems.length, "open action item")}`
        return answered(`${lead}: ${list(shown.map((a) => describeAction(a, !mine)))}.`, shown, confidence)
      }
      case "risks": {
        const found = relevant(risks, topic)
        if (found.length === 0) return null
        const order = { high: 0, medium: 1, low: 2 }
        const sorted = [...found].sort((a, b) => order[a.severity] - order[b.severity])
        const [first, ...rest] = sorted
        const main = `${found.length === 1 ? "One risk came up" : upperFirst(`${count(found.length, "risk")} came up`)}. The main one (${first.severity}): ${first.title}.${first.description ? ` ${first.description}` : ""}`
        const others = rest.length ? ` Also: ${list(rest.map((r) => `${r.title} (${r.severity})`))}.` : ""
        return answered(`${main}${others}`, sorted, confidence)
      }
      case "unresolved":
      case "questions": {
        const pool = intent === "unresolved" ? questions.filter((q) => q.status === "open") : questions
        const found = relevant(pool, topic)
        const highRisks = intent === "unresolved" && topic.length === 0 ? risks.filter((r) => r.severity === "high") : []
        if (found.length === 0 && highRisks.length === 0) {
          return intent === "unresolved" && topic.length === 0
            ? answered("Nothing was left open. Every question raised was answered in the meeting.", questions.slice(0, 1), "medium")
            : null
        }
        const parts: string[] = []
        if (intent === "unresolved" && found.length > 0) {
          parts.push(`${found.length === 1 ? "One question is" : `${count(found.length, "question")} are`} still open: ${list(found.map((q) => lowerFirst(summary.questions.find((x) => x.id === q.id)!.text.replace(/\?$/, ""))))}.`)
        } else if (found.length > 0) {
          parts.push(list(found.map((q) => (q.status === "answered" && q.answer ? `${q.text} ${q.answer}` : `${q.text} (still open)`))))
        }
        if (highRisks.length) parts.push(`The main unmitigated risk: ${highRisks[0].title}.`)
        return answered(parts.join(" "), [...found, ...highRisks], confidence)
      }
      case "client": {
        const external = new Set(meeting.participants.filter((p) => p.isExternal).map((p) => p.id))
        if (external.size === 0) {
          return notFound("No one from outside the team was in this meeting, so there were no client requests to find.")
        }
        const cue = /\b(need|needs|want|wants|require|must|would like|looking for|can you|could you|ask|asking|expect|budget|pricing|price)\b/i
        const candidates = segments
          .filter((s) => external.has(s.speakerId))
          .map((s) => ({ s, score: (cue.test(s.text) ? 2 : 0) + (s.text.includes("?") ? 1 : 0) + overlap(topic, s.text) * 2 }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score || a.s.startTime - b.s.startTime)
          .slice(0, 3)
          .sort((a, b) => a.s.startTime - b.s.startTime)
        if (candidates.length === 0) return null
        const speaker = meeting.participants.find((p) => p.id === candidates[0].s.speakerId)
        const who = speaker ? `${speaker.name}${speaker.company ? ` (${speaker.company})` : ""}` : candidates[0].s.speakerName
        const points = candidates.map((c) => `"${clip(c.s.text, 160)}"`)
        return answered(`${who} raised these points: ${list(points)}.`, candidates.map((c) => ({ text: c.s.text, sourceSegmentId: c.s.id, sourceTimestamp: c.s.startTime })), confidence)
      }
      case "summary": {
        const moments: Insight[] =
          summary.keyMoments.length > 0
            ? summary.keyMoments.map((m) => ({ ...m, text: m.title }))
            : [...decisions, ...actions]
        return answered(summary.overview, moments.slice(0, 3), confidence)
      }
      case "people": {
        if (topic.length > 0) {
          const owned = relevant(actions, topic)
          const open = relevant(questions.filter((q) => q.status === "open"), topic)
          const strength = (item: Insight | undefined) => (item ? overlap(topic, item.text) : 0)
          // An open question that matches at least as well means nobody owns it yet.
          if (open[0] && strength(open[0]) >= strength(owned[0])) {
            const text = summary.questions.find((q) => q.id === open[0].id)?.text ?? open[0].text
            return answered(`Nobody owns that yet. "${text}" is still open.`, [open[0]], confidence)
          }
          if (owned[0]?.assignee) return answered(`${owned[0].assignee.name} owns it: ${describeAction(owned[0], false)}.`, [owned[0]], confidence)
          const decided = relevant(decisions, topic)
          if (decided[0]?.decidedBy) return answered(`${decided[0].decidedBy.name} made the call: ${describeDecision(decided[0])}`, [decided[0]], confidence)
          return null
        }
        const names = meeting.participants.map((p) => `${p.name}${p.role === "host" ? " (host)" : ""}${p.isExternal && p.company ? ` from ${p.company}` : ""}`)
        const firstLines = meeting.participants
          .map((p) => segments.find((s) => s.speakerId === p.id))
          .filter((s): s is TranscriptSegment => Boolean(s))
          .map((s) => ({ text: s.text, sourceSegmentId: s.id, sourceTimestamp: s.startTime }))
        return answered(`${count(names.length, "person", "people")} took part: ${list(names)}.`, firstLines, confidence)
      }
      case "dates": {
        const datedActions = relevant(actions.filter((a) => a.dueDate && a.status !== "completed"), topic)
        const datedDecisions = relevant(decisions, topic).filter((d) => topic.length > 0 || /\b\d{1,2}\b|monday|tuesday|wednesday|thursday|friday|january|february|march|april|may|june|july|august|september|october|november|december/i.test(d.title))
        if (datedDecisions.length > 0 && topic.length > 0) return answered(describeDecision(datedDecisions[0]), [datedDecisions[0]], confidence)
        if (datedActions.length > 0) return answered(`Upcoming deadlines: ${list(datedActions.map((a) => describeAction(a)))}.`, datedActions, confidence)
        if (datedDecisions.length > 0) return answered(describeDecision(datedDecisions[0]), [datedDecisions[0]], confidence)
        return null
      }
      default:
        return null
    }
  }

  const structured = byIntent()
  if (structured) return structured
  if (intent === "client" && !meeting.participants.some((p) => p.isExternal)) {
    return notFound("No one from outside the team was in this meeting, so there were no client requests to find.")
  }

  // No intent (or nothing matched it): best structured insight on the topic, then the transcript.
  const terms = topic.length > 0 ? topic : tokenize(question)
  if (terms.length > 0) {
    const pool: Array<Insight & { kind: string }> = [
      ...decisions.map((d) => ({ ...d, kind: "decision" })),
      ...actions.map((a) => ({ ...a, kind: "action" })),
      ...risks.map((r) => ({ ...r, kind: "risk" })),
      ...questions.map((q) => ({ ...q, kind: "question" })),
    ]
    const ranked = pool
      .map((item) => ({ item, score: overlap(terms, item.text) }))
      .filter((x) => x.score > 0 && x.score / terms.length >= 0.5)
      .sort((a, b) => b.score - a.score)
    const best = ranked[0]?.item
    if (best) {
      const text =
        best.kind === "decision"
          ? describeDecision(best as unknown as (typeof decisions)[number])
          : best.kind === "action"
            ? `There's an action on this: ${describeAction(best as unknown as (typeof actions)[number])}.`
            : best.kind === "risk"
              ? `This came up as a risk: ${(best as unknown as (typeof risks)[number]).title}.`
              : `This was raised as a question: ${(best as unknown as (typeof questions)[number]).text}`
      return answered(text, [best], "medium")
    }
  }
  return searchTranscript(terms) ?? notFound()
}

/** Suggestions grounded in what this meeting actually contains, ordered by job function. */
export function suggestQuestions(meeting: Meeting, me: { personId: string; userId: string }, jobFunction: JobFunction | null): SuggestedQuestion[] {
  const s = meeting.summary
  if (!s) return []
  const hasMine = s.actionItems.some((a) => a.assignee?.id === me.personId || a.assignee?.userId === me.userId)
  const external = meeting.participants.some((p) => p.isExternal)
  const candidates: Array<{ key: string; text: string; when: boolean }> = [
    { key: "client", text: "What did the client ask for?", when: external },
    { key: "decisions", text: "What did we decide?", when: s.decisions.length > 0 },
    { key: "actions", text: hasMine ? "What are my action items?" : "What are the next steps?", when: s.actionItems.length > 0 },
    { key: "risks", text: "What risks were mentioned?", when: s.risks.length > 0 },
    { key: "unresolved", text: "What remains unresolved?", when: s.questions.some((q) => q.status === "open") },
    { key: "summary", text: "Summarize this meeting", when: true },
  ]
  const customerFacing = jobFunction === "sales" || jobFunction === "customer_success" || jobFunction === "consulting"
  const order = customerFacing
    ? ["client", "actions", "risks", "decisions", "unresolved", "summary"]
    : jobFunction === "management" || jobFunction === "executive"
      ? ["decisions", "unresolved", "risks", "actions", "client", "summary"]
      : ["actions", "decisions", "risks", "unresolved", "client", "summary"]
  return order
    .map((key) => candidates.find((c) => c.key === key)!)
    .filter((c) => c.when)
    .slice(0, 4)
    .map((c) => ({ id: `sq_${meeting.id}_${c.key}`, text: c.text }))
}
