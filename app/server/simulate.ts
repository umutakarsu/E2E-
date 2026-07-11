// Offline fallback for when no ANTHROPIC_API_KEY is configured. Deterministic,
// clearly labeled "simulated" in the UI. It parses the raw action lines into
// segments and attaches generic intents; when notes are present it grafts a bit
// of each note's text onto the nearest segments and marks them influenced — a
// stand-in that keeps the before/after mechanic working without a model.
//
// The real understanding comes from ALX-1 (anthropic.ts); this only exists so
// the app runs end-to-end with zero setup.

import type { Task, Trace, ClonePlan } from "./types.js";

function parseLines(raw: string): { span: string; action: string }[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line, i) => {
    const m = line.match(/^(\d{2}:\d{2})\s+(.*)$/);
    if (m) return { span: `${m[1]}-${nextSpan(m[1])}`, action: m[2]! };
    return { span: `step ${i + 1}`, action: line };
  });
}

function nextSpan(mmss: string): string {
  const [mm, ss] = mmss.split(":").map((x) => parseInt(x, 10));
  const total = (mm ?? 0) * 60 + (ss ?? 0) + 5;
  const nm = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const ns = (total % 60).toString().padStart(2, "0");
  return `${nm}:${ns}`;
}

function guessTools(action: string): string[] {
  const a = action.toLowerCase();
  const tools: string[] = [];
  const map: [string, string][] = [
    ["salesforce", "Salesforce"],
    ["excel", "Excel"],
    ["xlsx", "Excel"],
    ["outlook", "Outlook"],
    ["netsuite", "NetSuite"],
    ["kubectl", "kubectl"],
    ["pagerduty", "PagerDuty"],
    ["pivot", "Excel"],
    ["quote", "Salesforce"],
    ["email", "Outlook"],
    ["runbook", "Docs"],
  ];
  for (const [k, v] of map) if (a.includes(k) && !tools.includes(v)) tools.push(v);
  return tools;
}

export function simulateTrace(task: Task, useNotes: boolean): Trace {
  const parsed = parseLines(task.rawTrace);
  const noteText = task.voiceNotes
    .map((n) => n.redactedTranscript)
    .join(" ")
    .trim();

  const segments = parsed.map((p, i) => {
    const influenced = useNotes && noteText.length > 0 && (i === 0 || i === parsed.length - 1);
    const intent = influenced
      ? `In the worker's words: "${clip(noteText, 90)}" — this step serves that goal.`
      : `Likely part of "${task.title.toLowerCase()}" (inferred from the action alone).`;
    return {
      span: p.span,
      action: p.action,
      intent,
      tools: guessTools(p.action),
      confidence: influenced ? ("high" as const) : ("low" as const),
      influencedByNote: influenced,
    };
  });

  return {
    summary: useNotes && noteText
      ? `[SIMULATED] ${task.title} — intent sharpened by ${task.voiceNotes.length} voice note(s).`
      : `[SIMULATED] ${task.title} — intent guessed from actions only.`,
    segments,
    openQuestions: useNotes
      ? ["[SIMULATED] Set ANTHROPIC_API_KEY for a real ALX-1 reading of intent."]
      : [
          "[SIMULATED] Why does the worker perform these steps? (add a voice note)",
          "[SIMULATED] Which of these actions are load-bearing vs incidental?",
        ],
  };
}

export function simulateClonePlan(task: Task, trace: Trace): ClonePlan {
  const tools = [...new Set(trace.segments.flatMap((s) => s.tools))];
  return {
    goal: `[SIMULATED] Reproduce: ${task.title}`,
    harness: "Claude Code (general workflow)",
    requiredTools: tools.length ? tools : ["(none detected)"],
    guardrails: [
      "[SIMULATED] Dry-run before any write/post/send action.",
      "Require human approval for irreversible steps.",
    ],
    steps: trace.segments.map((s, i) => ({
      n: i + 1,
      description: s.action,
      tool: s.tools[0] ?? "desktop",
      input: "(derived from the recorded action)",
      successCheck: "state matches the human's recorded outcome",
    })),
  };
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
