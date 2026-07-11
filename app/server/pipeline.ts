// The pipeline: capture(raw) -> redact(local) -> understand(ALX-1) -> compile(Lighthouse).
//
// analyze() runs the interesting part end to end and returns a BEFORE/AFTER so
// the UI can show voice notes improving the model's understanding of intent.

import type { Task, AnalyzeResult, Trace, ClonePlan } from "./types.js";
import { mergeFindings } from "./pii.js";
import {
  extractTrace,
  buildClonePlan,
  hasCredentials,
  getModel,
} from "./anthropic.js";
import { simulateTrace, simulateClonePlan } from "./simulate.js";

export async function analyze(task: Task): Promise<AnalyzeResult> {
  const started = Date.now();
  const live = hasCredentials();
  const notes = task.voiceNotes;
  const hasNotes = notes.length > 0;

  let traceWithoutNotes: Trace;
  let traceWithNotes: Trace;
  let clonePlan: ClonePlan;

  if (live) {
    // Real ALX-1. Compute the notes-free trace and the notes-aware trace in
    // parallel (the "before" and "after"). If there are no notes, they're the
    // same run — skip the duplicate call.
    const base = extractTrace({
      title: task.title,
      role: task.role,
      rawTrace: task.rawTrace,
      notes,
      useNotes: false,
    });
    if (hasNotes) {
      const withNotes = extractTrace({
        title: task.title,
        role: task.role,
        rawTrace: task.rawTrace,
        notes,
        useNotes: true,
      });
      [traceWithoutNotes, traceWithNotes] = await Promise.all([base, withNotes]);
    } else {
      traceWithoutNotes = await base;
      traceWithNotes = traceWithoutNotes;
    }
    // Lighthouse compiles from the best trace we have.
    clonePlan = await buildClonePlan(traceWithNotes, task.title, task.role);
  } else {
    // Labeled offline fallback so the app is runnable without an API key.
    traceWithoutNotes = simulateTrace(task, false);
    traceWithNotes = hasNotes ? simulateTrace(task, true) : traceWithoutNotes;
    clonePlan = simulateClonePlan(task, traceWithNotes);
  }

  const notesInfluenceCount = traceWithNotes.segments.filter(
    (s) => s.influencedByNote
  ).length;

  return {
    taskId: task.id,
    mode: live ? "live" : "simulated",
    model: live ? getModel() : "offline-simulation",
    redactions: mergeFindings(notes.map((n) => n.redactions)),
    traceWithoutNotes,
    traceWithNotes,
    clonePlan,
    notesInfluenceCount,
    elapsedMs: Date.now() - started,
  };
}
