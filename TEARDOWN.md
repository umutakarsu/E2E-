# Alexandria — Architecture Teardown (Reverse-Engineered)

> Reconstructed from the public `alexandria.so` landing pages. This is an
> outside-in analysis: it separates **what is stated on the site** (observed)
> from **how it is most likely built** (inferred). Not affiliated with,
> endorsed by, or confirmed by Alexandria. Inferences are marked.
>
> Companion to this repo's runnable crypto core (`src/01`–`src/06`), which
> demonstrates the one part of the system that is meant to be independently
> *verifiable*: the end-to-end encrypted GPU inference path.

---

## 0. TL;DR

Alexandria is a **workforce data company disguised as an AI infra company**.
The product is a desktop recorder (**Ambient**) deployed org-wide that captures
how knowledge workers actually do their jobs, a vision-language model
(**ALX-1**) that compresses those raw recordings into **action + intent
traces**, and a delivery layer (**Lighthouse**) that replays those traces as
**agentic clones** inside existing coding/agent harnesses (Claude Code, Codex,
n8n, …).

The whole thing is wrapped in a privacy story — **local PII redaction
(ALX-PII-1)** plus **E2E-encrypted GPU inference on NVIDIA Confidential
Computing** with an **open-source, auditable core** — because the only way you
get an entire org to install a keylogger + screen recorder is to make the trust
boundary cryptographically checkable.

The thesis (stated, verbatim): *the bottleneck to agents in every non-coding
field is not model capability, it is missing long-horizon workflow data.*
Everything in the architecture follows from optimizing for that one scarce
resource.

---

## 1. What the product actually is (observed)

From the landing copy and the four product panels:

| Panel | Headline | What it reveals |
|---|---|---|
| 1 | "Alexandria" | The thesis + the privacy/trust model |
| 2 | "Record how your best employees work." | The **capture** surface — per-role sessions |
| 3 | "ALX-1 understands the action and intent behind every employee workflow." | The **VLM trace** output format |
| 4 | "From human sessions to agentic clones." | The **end-to-end pipeline** diagram |
| 5 | "Partner with Alexandria's data lab…" | The **business model** + backers |

**The bet.** "Coding agents like Claude Code … run for hours, make hundreds of
tool calls, and ship real work … For every other field, those agents don't
exist yet." The reason coding agents work is that code work is *already*
recorded at scale (GitHub, terminals, traces). Biopharma / banking / quant
desktop work is not. Alexandria's bet is to **manufacture that missing dataset**
and become the supplier of long-horizon traces to everyone building agents.

**The unit of value** is not a model — it's a single artifact: a
**long-horizon action + intent trace** of a real expert doing real work, clean
enough (PII-stripped) to train on or replay.

---

## 2. System overview (the five subsystems)

```
                          THE DEVICE (employee laptop)                              THE CLOUD
  ┌───────────────────────────────────────────────────────────────┐   ┌──────────────────────────────────────┐
  │                                                                 │   │                                      │
  │   ┌─────────────┐     ┌──────────────┐      ┌──────────────┐    │   │   ┌──────────────┐   ┌────────────┐  │
  │   │  AMBIENT    │     │  multimodal  │      │  ALX-PII-1   │    │   │   │   ALX-1      │   │ LIGHTHOUSE │  │
  │   │  capture    │────▶│  raw session │─────▶│  PII redact  │────┼───┼──▶│   VLM        │──▶│  context   │  │
  │   │  client     │     │  (timeline)  │      │  (LOCAL)     │    │   │   │ action+intent│   │  worker    │  │
  │   └─────────────┘     └──────────────┘      └──────┬───────┘    │   │   └──────────────┘   └─────┬──────┘  │
  │     screen+OCR                                     │ drop       │   │     (runs inside           │         │
  │     keylog                                         ▼ locally    │   │      GPU TEE)              ▼         │
  │     a11y tree                                  [ private bits   │   │                      AGENTIC CLONES  │
  │     system audio                                never leave ]   │   │              Claude Code · Codex ·   │
  │     mic transcript                                              │   │              Hermes · OpenClaw ·     │
  │                                                                 │   │              OpenCode · n8n          │
  │                          whatever leaves ──── E2E ENCRYPTED ────┼───┼──▶ NVIDIA Confidential Computing     │
  │                                               (attested TEE)    │   │      (host OS sees ciphertext only)  │
  └───────────────────────────────────────────────────────────────┘   └──────────────────────────────────────┘
        └────────────────────── open-source / auditable network boundary ──────────────────────┘
```

The five subsystems, in pipeline order:

1. **Ambient** — the on-device multimodal capture client.
2. **ALX-PII-1** — on-device PII detection + redaction (the local trust gate).
3. **E2E-encrypted GPU inference** — the transport + compute trust boundary
   (NVIDIA Confidential Computing). *This is the part this repo reconstructs.*
4. **ALX-1** — the VLM that turns raw activity into action + intent traces.
5. **Lighthouse** — the context worker that compiles traces and spawns clones
   into third-party harnesses.

---

## 3. Component teardown

### 3.1 Ambient — the capture client

**Observed.** A desktop app deployed "across entire organizations." The capture
inputs are named explicitly in the pipeline diagram: **OS accessibility**,
**Keylogging**, **System audio**, **Microphone transcript**, and the **ALX-1
VLM** reading the screen. Panel 2 shows per-role sessions tagged with
host-style IDs (`WIN-SF-OPP4421`, `MAC-CAD-DR0712`, `WIN-ACM-MEC4`, …), the
apps in use (Salesforce, AutoCAD, Excel/NetSuite, VS Code/GitHub, SAP,
PowerPoint/Gainsight, Outlook, kubectl/PagerDuty), and a live `REC` indicator.
Users "keep deep control and visibility over which apps and websites are
recorded and what information is shared."

**Inferred implementation.**

- **Cross-platform native client** (the IDs show both `WIN-` and `MAC-`
  prefixes). Almost certainly per-OS native modules wrapped in one app:
  - *Screen*: frame grabber (e.g., macOS `ScreenCaptureKit`, Windows
    `Windows.Graphics.Capture`) at a low, throttled FPS — they don't need 60fps,
    they need *semantic* change detection. Likely diff-based keyframing: only
    keep frames where the screen meaningfully changes.
  - *Accessibility tree*: the **most important and most underrated input.** macOS
    AX API / Windows UI Automation gives the *structured* DOM of the desktop —
    element roles, labels, values, focus — without OCR. This is what lets ALX-1
    know "the user selected column F in the *Data Fields* sheet" rather than
    guessing from pixels. a11y is the ground truth that anchors the VLM.
  - *Keylogging*: keystroke + timing stream, scoped per-app (their consent UI
    gates this). Gives the literal text entered and the cadence.
  - *System audio + mic transcript*: on-device ASR (likely a Whisper-class
    model) for meetings / dictation / "thinking out loud," producing a
    timestamped transcript aligned to the screen timeline.
- **Per-app/-website allowlisting + a recording indicator** is a hard product
  requirement, not a nicety — it's what makes org-wide rollout legally and
  socially survivable. Expect an admin policy layer (which apps may ever be
  recorded) plus a per-user toggle and a visible `REC` chrome.
- **Output = a single time-aligned multimodal session**: one monotonic clock
  with five tracks (frames, a11y snapshots, keys, audio, transcript) hung off
  it. This timeline is the raw material everything downstream consumes.

**Why the a11y tree matters most (inference):** pixels are lossy and
language-ambiguous; the accessibility tree is already the labeled,
machine-readable structure of the work. Anyone can screen-record. Alexandria's
moat on *capture quality* is fusing a11y + keys + audio + pixels into one
coherent trace. (See `src/07` design notes in the README's "what's missing"
section — this is the un-built half of the reconstruction.)

### 3.2 ALX-PII-1 — local PII redaction

**Observed.** "Our post-trained PII redaction models analyze every processed
screen recording for private information and delete it locally, so it never
reaches a server." In the pipeline diagram it's the `ALX-PII-1 — PII reduction`
node that sits **between capture and anything leaving the device.**

**Inferred implementation.**

- A **post-trained** (fine-tuned) small multimodal model that runs **on-device**
  — it has to, because the whole claim is that private bits are destroyed before
  egress. Likely a compact VLM/OCR+NER hybrid: detect PII in *pixels* (names on
  screen, SSNs in a spreadsheet, patient data, salaries — note panel 3 is
  literally a disability-demographics dataset and the AE card mentions employee
  salaries) **and** in the transcript/keystream text.
- Operates as a **redaction gate**: regions of frames are masked, transcript
  spans are dropped, keystrokes matching secrets are nulled — *before* the
  session is eligible to leave. The blurred grid with 🚫 markers on Panel 1's
  hero image is exactly this: a screen where most tiles are redacted/blocked.
- "Delete it **locally**" implies the redaction model's *false-negative* rate is
  the real product risk. A single leaked SSN that survives to the server breaks
  the entire trust story. Expect conservative, recall-favoring redaction +
  probably a second server-side pass *inside the TEE* as defense-in-depth.

**Where this repo plugs in:** ALX-PII-1 decides *what* may leave; `src/06`
demonstrates that *whatever does leave* travels and is computed on under
encryption the host can't read. The two together are the privacy claim.

### 3.3 E2E-encrypted GPU inference (NVIDIA Confidential Computing)

**Observed.** "Whatever does leave the device is processed inside fully
end-to-end encrypted GPU inference built on NVIDIA Confidential Computing. Our
open-source core makes this auditable — anyone can inspect the network traffic
and verify that inference is end-to-end encrypted and that we hold no access to
the data."

**This is the only subsystem the company invites you to verify, and it is the
exact subsystem this repo reconstructs from first principles** (`src/01`–`06`).

**Inferred implementation** (consistent with real NVIDIA CC on H100/H200/Blackwell):

- **Hardware root of trust.** Each GPU has a device identity key effectively
  fused in at manufacture; NVIDIA acts as the CA. → `src/05`, `src/06`
  (`NVIDIACertAuthority`, key "burned into fuses").
- **Remote attestation.** Before the client sends anything, the GPU produces a
  signed report (firmware/measurement hash + a fresh challenge + an ephemeral
  key-exchange public key). The client verifies the NVIDIA cert chain, the
  signature, the challenge (anti-replay), and that the measured firmware is on a
  trusted list. → `src/05` (`05-attestation.ts`), `src/06`
  (`verifyAttestation`).
- **Sealed channel via key exchange.** A Diffie-Hellman exchange yields a
  session key that exists only on the client and inside the TEE; the host
  OS/hypervisor/cloud admin never holds it. → `src/04`, `src/06`
  (`establishSecureChannel`).
- **Compute under encryption.** Inputs are AES-256-GCM encrypted to that key;
  they're decrypted **only inside the GPU TEE**, inference runs, and results are
  re-encrypted before leaving the enclave. → `src/01`/`src/03`, `src/06`
  (`runInference`).
- **"We hold no access."** The point of CC is that Alexandria-the-operator is in
  the *untrusted* set alongside the cloud provider — they run the service but
  can't read the plaintext. → the "WHO SAW WHAT?" table at the end of
  `src/06`.

**The "auditable" claim, decoded.** "Inspect the network traffic and verify
inference is end-to-end encrypted" means: an open-source client + published
attestation policy let a third party confirm (a) the client only ever emits
ciphertext bound to an attested enclave, and (b) the enclave's measurement
matches open code. The repo's `06-tee-inference.ts` is a runnable, simplified
model of precisely this verification.

> ⚠️ **Honest caveat (inference):** real-world CC has a known gap — attestation
> proves *firmware/enclave integrity*, not that the *application weights/logic*
> inside do what's advertised, unless the measurement covers them and the code
> is reproducible. "Open-source core" is what's supposed to close that gap. How
> much of the actual model-serving stack is in that core vs. proprietary is the
> single biggest unknown from the outside.

### 3.4 ALX-1 — the VLM (action + intent traces)

**Observed.** "Vision-language models turn raw desktop activity into
long-horizon intent & action traces." Panel 3 shows the output format directly,
over a Google Sheets recording of a demographics dataset:

```
00:10–00:15  Highlighting and inspecting spreadsheet cells containing
             estimates and margins of error for demographic data
00:15–00:20  Selecting columns with estimates and margins of error …
00:20–00:25  Selecting columns containing estimates and margins of error …
00:25–00:30  Selecting a contiguous range of estimate and margin columns …
00:30–00:35  Selecting and reviewing multiple rows …
00:35–00:40  Right-clicking selected data rows to open context menu …
00:40–00:45  Selecting 'Paste transpose' from the right-click context menu …
00:45–00:50  Selecting a range … in 'Data Fields' tab for further operations
00:50–00:55  Opening context menu on selected columns and preparing to sort …
```

Domain tabs (**Finance, Software Engineering, Sales, Healthcare**) show it's
positioned as cross-vertical.

**Inferred implementation.**

- **Two-layer trace, exactly as branded — "action AND intent":**
  - *Action layer* (low-level, near-deterministic): "select columns F:G",
    "open context menu", "choose Paste transpose". This is reconstructable
    largely from the **a11y tree + keystrokes**, with the VLM resolving
    references the structured data can't.
  - *Intent layer* (semantic, the hard/valuable part): "preparing to sort the
    demographic estimates," "cross-checking ACV against the discount approval
    matrix" (the Account Executive card). This is what makes a trace *trainable*
    rather than just *replayable* — it explains *why*, which is what an agent
    needs to generalize.
- **Segmentation into ~5-second windows** (the trace is bucketed `00:10–00:15`,
  etc.). Likely: keyframe/diff the session → cluster into coherent segments →
  caption each segment with the VLM conditioned on the prior segments (so it's
  *long-horizon*, not per-frame). The running context is what lets it say
  "*further* operations" and "*preparing to* sort."
- **Why it's "ALX-1" and not just GPT-4V:** generic VLMs are weak at
  OS-grounded, long-horizon desktop semantics and at fusing a11y+pixels. A
  model post-trained on Alexandria's own captured corpus is the flywheel:
  better captures → better ALX-1 → better traces → more customers → more
  captures.
- **Runs inside the TEE** (per §3.3) on any data that left the device.

**Output artifact (inference):** a structured, timestamped document —
`[{ span, action, intent, grounding(refs to a11y nodes/apps) }]` — which is the
exact thing Lighthouse compiles.

### 3.5 Lighthouse — the context worker

**Observed.** In the pipeline diagram, `Lighthouse — Context Worker` sits
between `ALX-PII-1` and the **agentic clones** column. Panel 5: "We turn daily
work into long-running action and intent traces" and "deploy long-running
agents in Codex and Claude Code, using tools you already pay for."

**Inferred implementation.**

- The **trace → executable task** compiler. It takes ALX-1's action+intent
  trace and turns it into something a *harness* can run: a task/skill spec —
  goal, ordered steps, the tools/apps each step needs, and the
  acceptance/observation checks.
- "**Context Worker**" + "**tools you already pay for**" strongly implies an
  **MCP-style integration layer**: Lighthouse maps the workflow's apps
  (Salesforce, Excel, SAP, kubectl…) onto the customer's *existing* tool
  credentials and surfaces them to the harness as callable tools. The agent
  grid in Panel 4 (`planner`, `bash`, `codex`, `mcp`, `worker`, `ingress`,
  `sql`, `embed`) is the worker topology — a planner orchestrating tool-nodes.
- It's the **delivery/runtime** half of the company: ALX-1 understands the work,
  Lighthouse re-performs it.

### 3.6 Agentic clones — harness integration

**Observed.** The clone column names six harnesses: **Hermes (Nous Research)**,
**OpenClaw**, **Claude Code** (Anthropic), **OpenAI Codex**, **OpenCode**,
**n8n**. "Feed harnesses like Codex and Claude Code to spawn agentic clones of
human workflows."

**Inferred implementation.**

- Alexandria deliberately **does not build its own agent runtime.** It produces
  the *traces/skills* and plugs them into whatever harness the customer already
  uses. Claude Code and Codex are agentic *coding* harnesses; n8n is workflow
  automation; Hermes/OpenClaw/OpenCode are open agent stacks. Being
  harness-agnostic is the smart move: the harnesses are commoditizing fast, the
  **data is not.**
- A "clone" = a harness instance seeded with a Lighthouse skill spec + the
  customer's tools, executing the recorded workflow autonomously and
  generalizing via the intent layer.

---

## 4. End-to-end data flow (one trace's life)

1. **Capture.** Employee works; Ambient records screen/a11y/keys/audio into one
   time-aligned session. (§3.1)
2. **Redact, locally.** ALX-PII-1 scans every modality and *destroys* PII
   on-device. Private bits never become network bytes. (§3.2)
3. **Seal + send.** The client attests the remote GPU enclave, establishes a
   sealed channel, and uploads only ciphertext. Host OS/cloud/Alexandria see
   blobs. (§3.3 ↔ `src/05`/`src/06`)
4. **Understand.** Inside the TEE, ALX-1 turns the redacted session into a
   long-horizon **action + intent trace**. (§3.4)
5. **Compile.** Lighthouse converts the trace into an executable skill spec
   bound to the customer's tools. (§3.5)
6. **Clone.** A harness (Claude Code / Codex / n8n / …) runs the skill as an
   autonomous agent that reproduces — and generalizes — the human workflow.
   (§3.6)

The product loop the company is actually selling: **steps 1–4 are the data
factory; steps 5–6 are the demo that justifies the factory.** The durable asset
is the corpus of step-4 traces.

---

## 5. The trust & privacy model (the crux)

Org-wide screen recording + keylogging is, on its face, the most invasive
software you could install. The entire architecture is bent around making that
*acceptable and checkable*. Three concentric guarantees:

| Layer | Claim | Mechanism | Independently verifiable? |
|---|---|---|---|
| Consent | You control what's recorded | per-app/website allowlist + visible `REC` | Partially (UX, policy) |
| Locality | Private data never leaves | ALX-PII-1 redacts on-device, deletes locally | **Hard to verify** — trust in the model's recall |
| Confidentiality | What leaves, no one but you+TEE reads | NVIDIA CC: attestation + sealed channel + in-enclave compute | **Yes — this is the "auditable open-source core"** |

The clever part: they concede that *some* data must leave the device (you can't
run a frontier VLM locally), and they move the trust boundary to a place where
it can be **cryptographically attested** rather than merely promised. That's why
"open-source core" + "inspect the network traffic" is in the headline — it
converts "trust us" into "verify us" for the one layer where that's possible.

**The weak link is the middle row.** Confidentiality is provable; *locality* of
PII redaction is a model-quality claim, not a cryptographic one. A redaction
false-negative is a real, unfalsifiable-from-outside risk.

**This repo is the concrete artifact for the bottom row.** `src/01`–`src/06`
build, from primitives up to a full simulation, exactly the attestation + sealed
channel + in-TEE compute that backs the "no access to the data" claim — so you
can read working code instead of taking the marketing on faith.

---

## 6. Threat model / where it can break (inference)

- **Redaction false-negatives.** The highest-severity, lowest-visibility risk.
  Mitigation would be recall-favoring local redaction + a second in-TEE pass.
- **Attestation TOCTOU / policy laxity.** If the client accepts too broad a set
  of firmware measurements, or skips re-attestation, the CC guarantee weakens.
  (`src/05` shows the four checks that must *all* hold.)
- **Measurement coverage gap.** Attestation proves enclave/firmware integrity,
  not that the served model/business logic is the open-source one — unless the
  measurement covers the application and the build is reproducible. (§3.3 caveat)
- **Side channels & metadata.** Even with sealed payloads, traffic
  timing/volume and trace *metadata* (which app, when, how long) leak workflow
  signal.
- **Insider/credential risk in Lighthouse.** Clones run with the customer's real
  tool credentials ("tools you already pay for") — that runtime is a high-value
  blast radius distinct from the encrypted-capture path.
- **The human-factors threat.** "Record your best employees" is also workforce
  surveillance; the consent/allowlist UX is doing heavy ethical and legal
  lifting, especially under EU law (the company is German — `alexandriagroup.de`,
  TUM/LMU ties).

---

## 7. Business model & positioning (observed)

- **Sells to enterprises** ("deploy across entire organizations," "Talk to
  sales"), framed as a **data lab partnership**: *we record your experts, you
  get agents that do their long-running work in the harnesses you already use.*
- **Verticals targeted:** biopharma, banking, quant finance (named); panels show
  Finance, Sales, Healthcare, Software, plus manufacturing/CAD, accounting, SRE.
- **Harness-agnostic on purpose** — value accrues to the **trace corpus**, not a
  proprietary agent runtime.
- **Backers/affiliations shown:** Stanford, a16z (Andreessen Horowitz),
  UnternehmerTUM, TUM Venture Labs, LMU, TUM. German/Munich academic-VC base.
- **Contact:** `info@alexandriagroup.de`.

The flywheel: deployments → captured expert work → better ALX-1 / ALX-PII-1 →
better traces → more deployments. Whoever accumulates the most long-horizon
trace data first compounds hardest. That is the whole company.

---

## 8. What we genuinely can't tell from the outside

- How much of the model-serving stack is actually in the "open-source core," and
  whether enclave **measurements cover the application** (the make-or-break
  detail for the audit claim).
- ALX-1's real architecture/size and whether traces are used to **train** models
  or only to **replay** workflows (or both).
- ALX-PII-1's measured recall/precision — the number that the whole privacy
  story rests on.
- Whether capture/redaction/VLM run **fully on-device** for any tier, or always
  round-trip to the TEE.
- How Lighthouse handles **auth/secrets** for clones touching production systems.
- Where data is **retained**, for how long, and who can request a clone.

---

## 9. Claim → mechanism → evidence map

| Landing-page claim | Most likely mechanism | Reconstructed in this repo? |
|---|---|---|
| "Record how your best employees work" | Ambient: screen+OCR, a11y tree, keylog, system audio, mic ASR, time-aligned | ✗ (design notes only — the un-built capture half) |
| "PII … delete it locally, so it never reaches a server" | ALX-PII-1: on-device multimodal redaction gate before egress | ✗ (design notes only) |
| "fully end-to-end encrypted GPU inference … NVIDIA Confidential Computing" | HW root of trust → remote attestation → DH sealed channel → AES-GCM in-TEE compute | ✅ `src/01`–`src/06` |
| "open-source core … inspect traffic … we hold no access" | open client + attestation policy; operator in the untrusted set | ✅ `src/05`, `src/06` ("WHO SAW WHAT?") |
| "VLMs turn raw desktop activity into intent & action traces" | ALX-1: segment → caption with long-horizon context; action + intent layers | ✗ (design notes only) |
| "feed harnesses like Codex and Claude Code to spawn agentic clones" | Lighthouse compiles trace → skill spec → MCP tools → harness agent run | ✗ (design notes only) |

**Bottom line:** the repo already reconstructs the **verifiable trust spine**
(rows 3–4). The remaining rows are the **data factory** (capture → redact →
trace → clone) — the half that is Alexandria's actual moat and the natural next
target if this teardown is ever turned back into runnable code.

---

## Appendix — on-screen identifiers (observed, Panel 2)

Session IDs encode `OS-ROLE-CONTEXT`, e.g.:

| ID | Role | Apps shown |
|---|---|---|
| `WIN-SF-OPP4421` | Account Executive | Salesforce |
| `MAC-CAD-DR0712` | Mechanical Designer | AutoCAD |
| `WIN-ACM-MEC4` | Accounting Manager | Excel, NetSuite |
| `MAC-BE-PAY3318` | Backend Engineer | GitHub, VS Code |
| `WIN-CSM-QBR41` | Customer Success Manager | Salesforce, PowerPoint, Gainsight |
| `WIN-MFG-DXF712` | Manufacturing Engineer | SAP, AutoCAD |
| `WIN-FPA-FY26` | FP&A Analyst | Excel, Outlook |
| `MAC-SRE-AUTH8` | Site Reliability Engineer | kubectl, PagerDuty |

The IDs themselves are a tell: capture is **role- and task-scoped** (an
opportunity number, a drawing number, a fiscal year), i.e. organized for
*trace retrieval by workflow*, which is exactly what a data lab selling traces
would index on.
