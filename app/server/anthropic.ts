// ALX-1 (the VLM) + Lighthouse (the clone compiler), backed by a real Claude
// model. Two jobs:
//
//   1. extractTrace() — turn a raw, intent-free action log (+ optional voice
//      notes) into a long-horizon ACTION + INTENT trace, the ALX-1 output.
//   2. buildClonePlan() — compile that trace into an executable skill spec a
//      harness (Claude Code / Codex / n8n) could run: the Lighthouse output.
//
// The whole point of the voice-note feature is visible here: we run extractTrace
// twice — once WITHOUT notes, once WITH — so the UI can show the notes sharpening
// the model's understanding of intent.

import Anthropic from "@anthropic-ai/sdk";
import type { Trace, ClonePlan, VoiceNote } from "./types.js";

const MODEL = process.env.ALEX_MODEL || "claude-opus-4-8";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic(); // resolves ANTHROPIC_API_KEY / auth profile
  return client;
}

export function getModel(): string {
  return MODEL;
}

export function hasCredentials(): boolean {
  if (process.env.ALEX_FORCE_DEMO === "1") return false;
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

// ---- JSON Schemas (structured outputs) ------------------------------------

const TRACE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    segments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          span: { type: "string" },
          action: { type: "string" },
          intent: { type: "string" },
          tools: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          influencedByNote: { type: "boolean" },
        },
        required: ["span", "action", "intent", "tools", "confidence", "influencedByNote"],
      },
    },
    openQuestions: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "segments", "openQuestions"],
} as const;

const CLONE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    goal: { type: "string" },
    harness: { type: "string" },
    requiredTools: { type: "array", items: { type: "string" } },
    guardrails: { type: "array", items: { type: "string" } },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          n: { type: "integer" },
          description: { type: "string" },
          tool: { type: "string" },
          input: { type: "string" },
          successCheck: { type: "string" },
        },
        required: ["n", "description", "tool", "input", "successCheck"],
      },
    },
  },
  required: ["goal", "harness", "requiredTools", "guardrails", "steps"],
} as const;

// ---- Low-level call --------------------------------------------------------

async function callModelJSON(
  system: string,
  user: string,
  schema: unknown
): Promise<unknown> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    // Structured outputs: constrain the response to the schema. We ALSO tell the
    // model in-prompt to emit only JSON, so this stays robust on SDK/model
    // versions where output_config isn't honored. `medium` effort keeps the
    // interactive round-trip snappy.
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content: user }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return parseJson(text);
}

/** Tolerant JSON extraction: handles bare JSON, fenced blocks, or trailing prose. */
function parseJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      /* fall through */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("Model did not return parseable JSON");
}

// ---- ALX-1: raw activity -> action + intent trace -------------------------

const TRACE_SYSTEM = `You are ALX-1, a vision-language model that reconstructs how a knowledge worker does their job.
You receive a RAW ACTION TRACE: a timestamped, intent-free log of low-level desktop actions (clicks, selections, app switches) — the kind an OS accessibility tree and keylogger produce. You may also receive VOICE NOTES: short spoken annotations the worker recorded to explain what they are doing and why.

Produce a long-horizon ACTION + INTENT trace:
- Group the raw actions into coherent time segments (keep the original timespans).
- For each segment give: the low-level ACTION (what literally happened) and the INTENT (why — the goal the action serves).
- The INTENT layer is the valuable part. Infer it from the actions; where a voice note explains or corrects the intent, use it and set influencedByNote=true for that segment. Set confidence to reflect how sure you are of the intent (low when you are guessing from actions alone).
- List the apps/tools each segment touches.
- In openQuestions, list what you still cannot determine — the ambiguities a human would need to resolve.
Be concrete and specific to THIS workflow. Do not invent steps that aren't in the trace. Return only the JSON object.`;

function notesBlock(notes: VoiceNote[]): string {
  if (notes.length === 0) return "(none)";
  return notes
    .map((n, i) => `Voice note ${i + 1}: "${n.redactedTranscript}"`)
    .join("\n");
}

export async function extractTrace(input: {
  title: string;
  role: string;
  rawTrace: string;
  notes: VoiceNote[];
  useNotes: boolean;
}): Promise<Trace> {
  const user = [
    `Task: ${input.title}`,
    input.role ? `Role: ${input.role}` : "",
    "",
    "RAW ACTION TRACE:",
    input.rawTrace || "(empty)",
    "",
    "VOICE NOTES:",
    input.useNotes ? notesBlock(input.notes) : "(not provided for this pass)",
  ]
    .filter(Boolean)
    .join("\n");

  const trace = (await callModelJSON(TRACE_SYSTEM, user, TRACE_SCHEMA)) as Trace;
  // When notes weren't provided, force influencedByNote false for cleanliness.
  if (!input.useNotes) {
    for (const s of trace.segments) s.influencedByNote = false;
  }
  return trace;
}

// ---- Lighthouse: trace -> executable clone spec ---------------------------

const CLONE_SYSTEM = `You are Lighthouse, a context worker that compiles a human workflow into an executable skill spec for an autonomous agent (a "clone").
You receive an ACTION + INTENT trace. Produce a spec a harness (Claude Code, OpenAI Codex, or n8n) could run to reproduce and generalize the workflow:
- goal: one sentence describing what the clone should accomplish.
- harness: the single most appropriate harness for this workflow, chosen from Claude Code, OpenAI Codex, or n8n, with a 2-4 word reason.
- requiredTools: the concrete apps/APIs/tools the clone needs (map the workflow's apps to callable tools).
- steps: ordered, each with a description, the tool it uses, a concrete input, and a successCheck (how the clone verifies that step worked).
- guardrails: the checks that keep the clone from doing damage (approvals, dry-runs, do-not-touch).
Ground everything in the given trace; prefer the intents to drive generalization. Return only the JSON object.`;

export async function buildClonePlan(trace: Trace, title: string, role: string): Promise<ClonePlan> {
  const user = [
    `Task: ${title}`,
    role ? `Role: ${role}` : "",
    "",
    "ACTION + INTENT TRACE:",
    JSON.stringify(trace, null, 2),
  ]
    .filter(Boolean)
    .join("\n");
  return (await callModelJSON(CLONE_SYSTEM, user, CLONE_SCHEMA)) as ClonePlan;
}
