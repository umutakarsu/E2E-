// Tiny task store with JSON-file persistence.
//
// Not a database — just enough to hold captured workflows ("tasks") and their
// voice notes across restarts. Persistence is best-effort; if the file can't be
// written we keep running in-memory.

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Task, VoiceNote } from "./types.js";
import { seedTasks } from "./seed.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(here, "..", ".data", "tasks.json");

let tasks: Task[] = [];
let loaded = false;

function newId(prefix: string): string {
  // No Math.random dependence for determinism-friendliness across restarts is
  // unnecessary here; a timestamp+counter keeps IDs unique and readable.
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}
let counter = 0;

async function persist(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), "utf8");
  } catch {
    // best-effort; keep serving from memory
  }
}

export async function init(): Promise<void> {
  if (loaded) return;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    tasks = JSON.parse(raw) as Task[];
  } catch {
    tasks = seedTasks();
    await persist();
  }
  loaded = true;
}

export function listTasks(): Task[] {
  return tasks;
}

export function getTask(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export async function createTask(input: {
  title: string;
  role?: string;
  rawTrace?: string;
}): Promise<Task> {
  const task: Task = {
    id: newId("task"),
    title: input.title.trim() || "Untitled workflow",
    role: (input.role ?? "").trim(),
    rawTrace: (input.rawTrace ?? "").trim(),
    voiceNotes: [],
    createdAt: new Date().toISOString(),
  };
  tasks.unshift(task);
  await persist();
  return task;
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<Task, "title" | "role" | "rawTrace">>
): Promise<Task | undefined> {
  const task = getTask(id);
  if (!task) return undefined;
  if (patch.title !== undefined) task.title = patch.title;
  if (patch.role !== undefined) task.role = patch.role;
  if (patch.rawTrace !== undefined) task.rawTrace = patch.rawTrace;
  await persist();
  return task;
}

export async function deleteTask(id: string): Promise<boolean> {
  const before = tasks.length;
  tasks = tasks.filter((t) => t.id !== id);
  const changed = tasks.length !== before;
  if (changed) await persist();
  return changed;
}

export async function addNote(
  taskId: string,
  note: Omit<VoiceNote, "id" | "createdAt">
): Promise<VoiceNote | undefined> {
  const task = getTask(taskId);
  if (!task) return undefined;
  const full: VoiceNote = {
    ...note,
    id: newId("note"),
    createdAt: new Date().toISOString(),
  };
  task.voiceNotes.push(full);
  await persist();
  return full;
}

export async function deleteNote(
  taskId: string,
  noteId: string
): Promise<boolean> {
  const task = getTask(taskId);
  if (!task) return false;
  const before = task.voiceNotes.length;
  task.voiceNotes = task.voiceNotes.filter((n) => n.id !== noteId);
  const changed = task.voiceNotes.length !== before;
  if (changed) await persist();
  return changed;
}
