// Alexandria reconstruction — front end.
//
// Flow: pick a workflow -> (edit its raw action trace) -> record voice notes in
// the browser (real speech-to-text) -> Analyze -> see ALX-1 turn actions into
// action+intent traces (before vs after the notes) and a Lighthouse clone spec.

const state = { tasks: [], activeId: null, analyzing: false, results: {} };

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || `${res.status}`);
  return data;
}

// --- boot ------------------------------------------------------------------

async function boot() {
  try {
    const health = await api("GET", "/api/health");
    const badge = $("#modeBadge");
    if (health.mode === "live") {
      badge.textContent = `live · ${health.model}`;
      badge.classList.add("live");
    } else {
      badge.textContent = "simulated · no api key";
      badge.classList.add("sim");
    }
  } catch { /* ignore */ }

  await loadTasks();
  $("#newTaskBtn").addEventListener("click", () => $("#newTaskDialog").showModal());
  $("#newTaskForm").addEventListener("submit", onCreateTask);
}

async function loadTasks() {
  const { tasks } = await api("GET", "/api/tasks");
  state.tasks = tasks;
  renderTaskList();
  if (!state.activeId && tasks.length) selectTask(tasks[0].id);
}

function renderTaskList() {
  const list = $("#taskList");
  list.innerHTML = "";
  for (const t of state.tasks) {
    const li = el("li", "task-item" + (t.id === state.activeId ? " active" : ""));
    li.appendChild(el("div", "t", t.title));
    if (t.role) li.appendChild(el("div", "r", t.role));
    if (t.voiceNotes.length)
      li.appendChild(el("div", "n", `${t.voiceNotes.length} voice note${t.voiceNotes.length > 1 ? "s" : ""}`));
    li.addEventListener("click", () => selectTask(t.id));
    list.appendChild(li);
  }
}

async function onCreateTask(e) {
  const form = e.target;
  if (form.returnValue === "cancel" || e.submitter?.value === "cancel") return;
  const fd = new FormData(form);
  const title = fd.get("title");
  if (!title) return;
  const { task } = await api("POST", "/api/tasks", {
    title,
    role: fd.get("role"),
    rawTrace: fd.get("rawTrace"),
  });
  form.reset();
  state.tasks.unshift(task);
  renderTaskList();
  selectTask(task.id);
}

function selectTask(id) {
  state.activeId = id;
  renderTaskList();
  renderDetail();
}

function activeTask() {
  return state.tasks.find((t) => t.id === state.activeId);
}

// --- detail pane -----------------------------------------------------------

function renderDetail() {
  const t = activeTask();
  const detail = $("#detail");
  if (!t) return;
  detail.innerHTML = "";

  detail.appendChild(el("h1", null, t.title));
  detail.appendChild(el("div", "role", t.role || "—"));

  detail.appendChild(rawTraceCard(t));
  detail.appendChild(notesCard(t));
  detail.appendChild(analyzeCard(t));
}

function rawTraceCard(t) {
  const card = el("div", "card");
  card.appendChild(el("h3", null, "① Raw action trace"));
  card.appendChild(el("p", "hint", "Intent-free log of low-level actions — what Ambient + the accessibility tree capture. Edit if you like."));
  const ta = el("textarea", "rawtrace");
  ta.value = t.rawTrace;
  card.appendChild(ta);
  const row = el("div", "row");
  row.style.marginTop = "10px";
  const save = el("button", "ghost", "Save trace");
  save.addEventListener("click", async () => {
    await api("PATCH", `/api/tasks/${t.id}`, { rawTrace: ta.value });
    t.rawTrace = ta.value;
    save.textContent = "Saved ✓";
    setTimeout(() => (save.textContent = "Save trace"), 1200);
  });
  row.appendChild(save);
  card.appendChild(row);
  return card;
}

function notesCard(t) {
  const card = el("div", "card");
  card.appendChild(el("h3", null, "② Voice notes"));
  card.appendChild(el("p", "hint", "Record the intent in your own words — why you do this, the rules you apply, the traps to avoid. Transcribed in-browser; PII is redacted locally before anything is sent to the model."));

  const recRow = el("div", "row");
  const recBtn = el("button", "rec", "● Record voice note");
  const stopHint = el("span");
  stopHint.style.color = "var(--muted)";
  stopHint.style.fontSize = "12.5px";
  recRow.appendChild(recBtn);
  recRow.appendChild(stopHint);
  card.appendChild(recRow);

  const live = el("div", "live-transcript");
  live.style.display = "none";
  card.appendChild(live);

  setupRecorder({ recBtn, stopHint, live, task: t, onSaved: renderDetail });

  // existing notes
  const notesWrap = el("div");
  for (const n of t.voiceNotes) notesWrap.appendChild(renderNote(t, n));
  card.appendChild(notesWrap);
  return card;
}

function renderNote(t, n) {
  const node = el("div", "note");
  node.appendChild(el("div", "body", `“${n.redactedTranscript}”`));
  const meta = el("div", "meta");
  meta.appendChild(el("span", "chip time", `${(n.durationMs / 1000).toFixed(1)}s`));
  for (const r of n.redactions)
    meta.appendChild(el("span", "chip", `${r.type} ×${r.count} redacted`));
  const del = el("button", "danger-link", "delete");
  del.addEventListener("click", async () => {
    await api("DELETE", `/api/tasks/${t.id}/notes/${n.id}`);
    t.voiceNotes = t.voiceNotes.filter((x) => x.id !== n.id);
    renderTaskList();
    renderDetail();
  });
  meta.appendChild(del);
  node.appendChild(meta);
  return node;
}

function analyzeCard(t) {
  const card = el("div", "card");
  card.appendChild(el("h3", null, "③ Understand & clone"));
  card.appendChild(el("p", "hint", "ALX-1 turns the actions + your notes into an action + intent trace; Lighthouse compiles a runnable clone. When notes exist, we run it with and without them so you can see the difference."));

  const btn = el("button", "primary", t.voiceNotes.length ? "Analyze (before vs after notes)" : "Analyze");
  const status = el("span");
  status.style.marginLeft = "10px";
  const row = el("div", "row");
  row.appendChild(btn);
  row.appendChild(status);
  card.appendChild(row);

  const out = el("div");
  out.style.marginTop = "16px";
  card.appendChild(out);

  const cached = state.results[t.id];
  if (cached) renderResult(out, cached);

  btn.addEventListener("click", async () => {
    if (state.analyzing) return;
    state.analyzing = true;
    btn.disabled = true;
    status.innerHTML = '<span class="spinner"></span> analyzing…';
    out.innerHTML = "";
    try {
      const { result } = await api("POST", `/api/tasks/${t.id}/analyze`);
      state.results[t.id] = result;
      renderResult(out, result);
      status.textContent = `done in ${(result.elapsedMs / 1000).toFixed(1)}s`;
    } catch (err) {
      out.innerHTML = "";
      out.appendChild(el("div", "error", "Analysis failed: " + err.message));
    } finally {
      state.analyzing = false;
      btn.disabled = false;
    }
  });
  return card;
}

// --- results rendering -----------------------------------------------------

function renderResult(root, r) {
  root.innerHTML = "";

  if (r.mode === "simulated") {
    root.appendChild(el("div", "callout sim",
      "Simulated output (no ANTHROPIC_API_KEY set). Wire a key to see a real ALX-1 reading of intent — see app/README.md."));
  }

  // PII redaction summary
  if (r.redactions.length) {
    const redWrap = el("div", "card");
    redWrap.style.margin = "0 0 16px";
    redWrap.appendChild(el("h3", null, "Local PII redaction (ALX-PII-1)"));
    const p = el("p", "hint", "Removed before anything reached the model:");
    redWrap.appendChild(p);
    const pills = el("div", "pill-list");
    for (const red of r.redactions) pills.appendChild(el("span", "pill", `${red.type} ×${red.count}`));
    redWrap.appendChild(pills);
    root.appendChild(redWrap);
  }

  // before/after
  const hasNotes = r.notesInfluenceCount > 0 || r.traceWithNotes !== r.traceWithoutNotes;
  if (r.notesInfluenceCount > 0) {
    root.appendChild(el("div", "callout",
      `The voice note${r.notesInfluenceCount > 1 ? "s" : ""} sharpened ${r.notesInfluenceCount} intent${r.notesInfluenceCount > 1 ? "s" : ""} the model could only guess at from the actions alone (highlighted below).`));
  }

  if (hasNotes) {
    const compare = el("div", "compare");
    compare.appendChild(traceColumn("Without voice notes", r.traceWithoutNotes, false));
    compare.appendChild(traceColumn("With voice notes", r.traceWithNotes, true));
    root.appendChild(compare);
  } else {
    root.appendChild(traceColumn("ALX-1 trace", r.traceWithNotes, true));
    root.appendChild(el("p", "hint", "Add a voice note and re-analyze to see the intent layer sharpen."));
  }

  // clone plan
  root.appendChild(clonePlanCard(r.clonePlan));
}

function traceColumn(title, trace, allowInfluence) {
  const col = el("div", "trace-col");
  const h = el("h4", null, title);
  col.appendChild(h);
  if (trace.summary) col.appendChild(el("p", "summary-line", trace.summary));
  for (const s of trace.segments) {
    const seg = el("div", "seg" + (allowInfluence && s.influencedByNote ? " influenced" : ""));
    const top = el("div", "row");
    top.style.justifyContent = "space-between";
    top.appendChild(el("span", "span", s.span));
    const conf = el("span", "span " + (s.confidence === "high" ? "conf-high" : s.confidence === "low" ? "conf-low" : ""), s.confidence + " conf");
    top.appendChild(conf);
    seg.appendChild(top);
    seg.appendChild(el("div", "action", s.action));
    const intent = el("div", "intent");
    intent.appendChild(el("span", "lbl", "intent"));
    intent.appendChild(document.createTextNode(s.intent));
    seg.appendChild(intent);
    if (allowInfluence && s.influencedByNote) {
      const b = el("span", "badge-note", "▲ from voice note");
      b.style.marginTop = "6px";
      b.style.display = "inline-block";
      seg.appendChild(b);
    }
    if (s.tools?.length) {
      const tags = el("div", "tags");
      for (const tool of s.tools) tags.appendChild(el("span", "tag", tool));
      seg.appendChild(tags);
    }
    col.appendChild(seg);
  }
  if (trace.openQuestions?.length) {
    const oq = el("div", "seg");
    oq.appendChild(el("div", "action", "Open questions"));
    const ul = el("ul");
    ul.style.margin = "6px 0 0";
    ul.style.paddingLeft = "18px";
    ul.style.fontSize = "13px";
    ul.style.color = "var(--muted)";
    for (const q of trace.openQuestions) {
      const li = el("li");
      li.textContent = q;
      ul.appendChild(li);
    }
    oq.appendChild(ul);
    col.appendChild(oq);
  }
  return col;
}

function clonePlanCard(plan) {
  const card = el("div", "card");
  card.style.marginTop = "18px";
  card.appendChild(el("h3", null, "Lighthouse → agentic clone"));
  card.appendChild(el("p", "hint", plan.goal));

  const meta = el("div", "row");
  meta.appendChild(el("span", "pill", "harness · " + plan.harness));
  card.appendChild(meta);

  if (plan.requiredTools?.length) {
    const tw = el("div");
    tw.style.marginTop = "10px";
    tw.appendChild(el("div", "hint", "Required tools"));
    const pills = el("div", "pill-list");
    for (const tool of plan.requiredTools) pills.appendChild(el("span", "pill", tool));
    tw.appendChild(pills);
    card.appendChild(tw);
  }

  const steps = el("div");
  steps.style.marginTop = "14px";
  for (const s of plan.steps) {
    const step = el("div", "step");
    step.appendChild(el("div", "num", String(s.n)));
    const body = el("div");
    body.appendChild(el("div", "desc", s.description));
    const sub = el("div", "sub");
    sub.innerHTML = `<code>${esc(s.tool)}</code> · ${esc(s.input)} <br>✓ ${esc(s.successCheck)}`;
    body.appendChild(sub);
    step.appendChild(body);
    steps.appendChild(step);
  }
  card.appendChild(steps);

  if (plan.guardrails?.length) {
    const gw = el("div");
    gw.style.marginTop = "12px";
    gw.appendChild(el("div", "hint", "Guardrails"));
    for (const g of plan.guardrails) gw.appendChild(el("div", "guardrail", g));
    card.appendChild(gw);
  }
  return card;
}

// --- recorder (real in-browser speech-to-text) -----------------------------

function setupRecorder({ recBtn, stopHint, live, task, onSaved }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    // Fallback: manual typing when the browser has no speech recognition.
    stopHint.textContent = "in-browser STT unavailable — type your note instead";
    recBtn.textContent = "＋ Add note (type)";
    recBtn.classList.remove("rec");
    recBtn.addEventListener("click", async () => {
      const text = prompt("Voice note (spoken intent, in your words):");
      if (text && text.trim()) {
        await saveNote(task, text.trim(), 0);
        onSaved();
      }
    });
    return;
  }

  let rec = null;
  let recording = false;
  let finalText = "";
  let startedAt = 0;

  recBtn.addEventListener("click", () => {
    if (recording) {
      rec && rec.stop();
      return;
    }
    finalText = "";
    startedAt = Date.now();
    rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += chunk + " ";
        else interim += chunk;
      }
      live.innerHTML = `${esc(finalText)}<span class="interim">${esc(interim)}</span>`;
    };
    rec.onerror = (e) => {
      stopHint.textContent = "mic/STT error: " + (e.error || "unknown");
    };
    rec.onend = async () => {
      recording = false;
      recBtn.classList.remove("recording");
      recBtn.innerHTML = "● Record voice note";
      stopHint.textContent = "";
      const text = finalText.trim();
      if (text) {
        stopHint.innerHTML = '<span class="spinner"></span> saving…';
        await saveNote(task, text, Date.now() - startedAt);
        stopHint.textContent = "";
        onSaved();
      } else {
        live.style.display = "none";
      }
    };

    recording = true;
    live.style.display = "block";
    live.textContent = "listening…";
    recBtn.classList.add("recording");
    recBtn.innerHTML = '<span class="pulse"></span> Stop & save';
    stopHint.textContent = "speak, then click stop";
    rec.start();
  });
}

async function saveNote(task, transcript, durationMs) {
  const { note } = await api("POST", `/api/tasks/${task.id}/notes`, { transcript, durationMs });
  task.voiceNotes.push(note);
  renderTaskList();
}

boot();
