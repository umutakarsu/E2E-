// ALX-PII-1 — local PII redaction gate.
//
// In the real product this is a post-trained multimodal model that runs
// ON-DEVICE and destroys private information before anything leaves the laptop.
// Here we stand it in with deterministic detectors so the mechanic is visible
// and runs offline: voice-note transcripts are scrubbed BEFORE they are sent to
// the model, and the UI shows what was removed (categories + counts, never the
// raw secret).
//
// This is the "delete it locally, so it never reaches a server" claim, made
// concrete. It pairs with the E2E-encrypted channel in ../../src/06 (whatever
// *does* leave the device travels under encryption the host can't read).

import type { RedactionFinding } from "./types.js";

interface Detector {
  type: string;
  re: RegExp;
  mask: (m: string) => string;
}

// A tiny gazetteer stands in for the model's learned name recognition. In the
// real product names are caught by the vision/NER model, not a word list.
const NAME_HINTS = [
  "alice",
  "bob",
  "carol",
  "dave",
  "jane",
  "john",
  "maria",
  "chen",
  "patel",
  "smith",
  "garcia",
  "mueller",
  "okafor",
];

const DETECTORS: Detector[] = [
  {
    type: "email",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    mask: () => "[EMAIL]",
  },
  {
    type: "ssn",
    re: /\b\d{3}-\d{2}-\d{4}\b/g,
    mask: () => "[SSN]",
  },
  {
    type: "credit-card",
    re: /\b(?:\d[ -]?){13,16}\b/g,
    mask: () => "[CARD]",
  },
  {
    type: "phone",
    re: /\b(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}\b/g,
    mask: () => "[PHONE]",
  },
  {
    type: "currency",
    re: /(?:USD|EUR|GBP|\$|€|£)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|bn|million|billion))?/gi,
    mask: () => "[AMOUNT]",
  },
  {
    type: "api-key",
    re: /\b(?:sk|pk|ghp|xox[baprs])[-_][A-Za-z0-9]{16,}\b/g,
    mask: () => "[SECRET]",
  },
  {
    type: "person-name",
    // Capitalized "First Last" where at least one token is a known name hint.
    re: /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g,
    mask: () => "[NAME]",
  },
];

export interface RedactionResult {
  redacted: string;
  findings: RedactionFinding[];
}

export function redact(text: string): RedactionResult {
  const counts = new Map<string, number>();
  let out = text;

  for (const det of DETECTORS) {
    out = out.replace(det.re, (match, ...groups) => {
      if (det.type === "person-name") {
        // Only redact "First Last" when a token looks like a real name, to
        // avoid nuking ordinary capitalized phrases ("Data Fields", "Q2 Close").
        const first = String(groups[0] ?? "").toLowerCase();
        const last = String(groups[1] ?? "").toLowerCase();
        if (!NAME_HINTS.includes(first) && !NAME_HINTS.includes(last)) {
          return match;
        }
      }
      // credit-card regex is greedy across digit groups; ignore short numbers
      if (det.type === "credit-card") {
        const digits = match.replace(/\D/g, "");
        if (digits.length < 13) return match;
      }
      counts.set(det.type, (counts.get(det.type) ?? 0) + 1);
      return det.mask(match);
    });
  }

  const findings: RedactionFinding[] = [...counts.entries()].map(
    ([type, count]) => ({ type, count })
  );
  return { redacted: out, findings };
}

/** Merge redaction findings across several notes into one summary list. */
export function mergeFindings(lists: RedactionFinding[][]): RedactionFinding[] {
  const counts = new Map<string, number>();
  for (const list of lists) {
    for (const f of list) {
      counts.set(f.type, (counts.get(f.type) ?? 0) + f.count);
    }
  }
  return [...counts.entries()].map(([type, count]) => ({ type, count }));
}
