# Alexandria — workflow → clone (with voice notes)

A runnable reconstruction of the **data half** of Alexandria's pipeline (the
part [`TEARDOWN.md`](../TEARDOWN.md) reverse-engineered, and the crypto core in
[`../src`](../src) already covers). It turns a captured human workflow into an
**action + intent trace** and a **runnable clone spec** — and lets you attach
**voice notes** to a task so the AI understands the *intent* behind the work.

```
 ① capture        ② redact (local)     ③ understand (ALX-1)      ④ compile (Lighthouse)
 raw action  ──►  ALX-PII-1 strips  ──► real Claude model turns  ──► clone skill spec +
 log + voice      PII from notes        actions + notes into an       suggested harness
 notes            before egress         action + intent trace         (Claude Code / Codex / n8n)
```

The **voice note** is the feature: a spoken annotation, transcribed in-browser
(real speech-to-text), redacted locally, then fed to the model so it can explain
*why* each step happens — the hard, valuable part of a trace. The UI runs the
model **with and without** the notes so you can see them sharpen the intent.

## Run it

```bash
cd app
npm install

# Real ALX-1 + Lighthouse (recommended — this is the "real STT + real LLM" build):
export ANTHROPIC_API_KEY=sk-ant-...      # or add it to app/.env
npm run start

# No key? It still runs, in clearly-labeled SIMULATED mode:
npm run start
```

Open **http://localhost:4173** in **Chrome or Edge** (they ship the Web Speech
API used for in-browser transcription; other browsers fall back to typing the
note). Pick a seeded workflow, hit **● Record voice note**, say why you do the
task, then **Analyze**.

- **STT is real and key-free** — it uses the browser's own Web Speech API.
- **The LLM is real** — `claude-opus-4-8` by default (override with `ALEX_MODEL`),
  called with adaptive thinking and structured outputs.

## How it maps to the product

| Screen element | Component | Code |
|---|---|---|
| The raw action log on each task | **Ambient** capture (screen + a11y + keylog) | `server/seed.ts`, editable in the UI |
| "PII … deleted locally" chips | **ALX-PII-1** local redaction | `server/pii.ts` |
| Action + intent trace (before/after) | **ALX-1** VLM | `server/anthropic.ts` → `extractTrace` |
| Clone spec + harness suggestion | **Lighthouse** context worker | `server/anthropic.ts` → `buildClonePlan` |
| "whatever leaves is E2E-encrypted" | NVIDIA CC inference | reconstructed in [`../src/06`](../src/06-tee-inference.ts) |

## Notes & honesty

- **Redaction runs server-side, before the model call.** In the real product it
  runs on-device; here it's the gate just before egress to the LLM. The chips
  show *categories and counts*, never the raw value.
- **Simulated mode** is deterministic and labeled — it exists only so the app
  runs with zero setup. Everything interesting (the intent reading) needs a key.
- Tasks and notes persist to `app/.data/tasks.json` (gitignored).

## API (if you want to script it)

`GET /api/health` · `GET/POST /api/tasks` · `POST /api/tasks/:id/notes`
· `POST /api/tasks/:id/analyze`
