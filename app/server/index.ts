// Alexandria reconstruction — server.
//
// Serves the web UI and a small JSON API for tasks, voice notes, and the
// capture -> redact -> ALX-1 trace -> Lighthouse clone pipeline.

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import * as store from "./store.js";
import { redact } from "./pii.js";
import { analyze } from "./pipeline.js";
import { hasCredentials, getModel } from "./anthropic.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(here, "..", "web");
const PORT = Number(process.env.PORT || 4173);

const app = express();
app.use(express.json({ limit: "12mb" })); // room for a base64 audio blob

// --- API -------------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mode: hasCredentials() ? "live" : "simulated",
    model: hasCredentials() ? getModel() : "offline-simulation",
  });
});

app.get("/api/tasks", (_req, res) => {
  res.json({ tasks: store.listTasks() });
});

app.post("/api/tasks", async (req, res) => {
  const { title, role, rawTrace } = req.body ?? {};
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title is required" });
  }
  const task = await store.createTask({ title, role, rawTrace });
  res.status(201).json({ task });
});

app.get("/api/tasks/:id", (req, res) => {
  const task = store.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "task not found" });
  res.json({ task });
});

app.patch("/api/tasks/:id", async (req, res) => {
  const { title, role, rawTrace } = req.body ?? {};
  const task = await store.updateTask(req.params.id, { title, role, rawTrace });
  if (!task) return res.status(404).json({ error: "task not found" });
  res.json({ task });
});

app.delete("/api/tasks/:id", async (req, res) => {
  const ok = await store.deleteTask(req.params.id);
  if (!ok) return res.status(404).json({ error: "task not found" });
  res.json({ ok: true });
});

// Add a voice note. The transcript is redacted locally (ALX-PII-1) BEFORE it is
// stored or ever sent to the model. We keep the raw transcript only in memory to
// show the worker; only the redacted form leaves via analyze().
app.post("/api/tasks/:id/notes", async (req, res) => {
  const { transcript, durationMs } = req.body ?? {};
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return res.status(400).json({ error: "transcript is required" });
  }
  const { redacted, findings } = redact(transcript.trim());
  const note = await store.addNote(req.params.id, {
    transcript: transcript.trim(),
    redactedTranscript: redacted,
    redactions: findings,
    durationMs: Number(durationMs) || 0,
  });
  if (!note) return res.status(404).json({ error: "task not found" });
  res.status(201).json({ note });
});

app.delete("/api/tasks/:id/notes/:noteId", async (req, res) => {
  const ok = await store.deleteNote(req.params.id, req.params.noteId);
  if (!ok) return res.status(404).json({ error: "note not found" });
  res.json({ ok: true });
});

// Run the pipeline for a task.
app.post("/api/tasks/:id/analyze", async (req, res) => {
  const task = store.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "task not found" });
  if (!task.rawTrace.trim()) {
    return res.status(400).json({ error: "task has no raw action trace to analyze" });
  }
  try {
    const result = await analyze(task);
    res.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("analyze failed:", message);
    res.status(502).json({
      error: "analysis failed",
      detail: message,
      hint: hasCredentials()
        ? "The model call failed — check the server logs."
        : "No ANTHROPIC_API_KEY set; running in simulated mode should not hit this. See app/README.md.",
    });
  }
});

// --- static UI -------------------------------------------------------------

app.use(express.static(WEB_DIR));
app.get(/.*/, (_req, res) => res.sendFile(path.join(WEB_DIR, "index.html")));

// --- boot ------------------------------------------------------------------

store.init().then(() => {
  app.listen(PORT, () => {
    const mode = hasCredentials() ? `LIVE (${getModel()})` : "SIMULATED (no API key)";
    console.log(`\n  Alexandria reconstruction running:`);
    console.log(`    http://localhost:${PORT}`);
    console.log(`    mode: ${mode}\n`);
  });
});
