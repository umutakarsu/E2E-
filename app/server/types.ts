// Shared types for the Alexandria reconstruction app.
//
// A "task" here is a captured human workflow (the thing Alexandria records and
// then clones). It carries a RAW ACTION TRACE — the low-level, intent-free log
// that Ambient + the OS accessibility tree would produce — plus any VOICE NOTES
// the human attached to explain *why* they do what they do.
//
// The pipeline (see pipeline.ts) turns { rawTrace + voiceNotes } into an
// ALX-1-style action+intent trace and a Lighthouse-style clone spec.

export interface VoiceNote {
  id: string;
  createdAt: string;
  /** Raw transcript from the browser's speech-to-text. */
  transcript: string;
  /** Transcript after local ALX-PII-1 redaction — this is what reaches the model. */
  redactedTranscript: string;
  /** PII categories found + redacted, so the UI can show what was scrubbed. */
  redactions: RedactionFinding[];
  durationMs: number;
}

export interface Task {
  id: string;
  title: string;
  role: string;
  /** Low-level, intent-free action log (what Ambient/a11y captures). */
  rawTrace: string;
  voiceNotes: VoiceNote[];
  createdAt: string;
}

export interface RedactionFinding {
  type: string; // e.g. "email", "ssn", "person-name", "currency"
  count: number;
}

export interface TraceSegment {
  span: string; // e.g. "00:10-00:15"
  action: string; // low-level: "select columns F:G"
  intent: string; // semantic: "cross-check ACV before posting"
  tools: string[];
  confidence: "low" | "medium" | "high";
  /** True when a voice note is what made this intent understandable. */
  influencedByNote: boolean;
}

export interface Trace {
  summary: string;
  segments: TraceSegment[];
  openQuestions: string[];
}

export interface CloneStep {
  n: number;
  description: string;
  tool: string;
  input: string;
  successCheck: string;
}

export interface ClonePlan {
  goal: string;
  harness: string; // suggested harness: Claude Code / Codex / n8n / ...
  requiredTools: string[];
  guardrails: string[];
  steps: CloneStep[];
}

export interface AnalyzeResult {
  taskId: string;
  mode: "live" | "simulated";
  model: string;
  redactions: RedactionFinding[];
  /** ALX-1 trace built from the raw actions ALONE (the "before"). */
  traceWithoutNotes: Trace;
  /** ALX-1 trace built from raw actions + voice notes (the "after"). */
  traceWithNotes: Trace;
  clonePlan: ClonePlan;
  /** How many segment intents the notes sharpened. */
  notesInfluenceCount: number;
  elapsedMs: number;
}
