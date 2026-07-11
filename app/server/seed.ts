// Seed workflows, modeled on the roles shown on Alexandria's "Record how your
// best employees work" panel. Each carries a RAW ACTION TRACE — the intent-free
// low-level log Ambient + the accessibility tree would emit. The whole point of
// the app is that these actions are ambiguous without the human's intent, and a
// voice note is the fastest way to supply it.

import type { Task } from "./types.js";

export function seedTasks(): Task[] {
  const now = new Date().toISOString();
  return [
    {
      id: "task_seed_fpa",
      title: "Reconcile FY26 accruals vs budget",
      role: "FP&A Analyst",
      rawTrace: [
        "00:00 open FY26-budget-rollup.xlsx",
        "00:06 click sheet tab 'Actuals'",
        "00:11 select range B4:B60",
        "00:18 insert PivotTable",
        "00:27 drag 'Department' to Rows, 'Variance' to Values",
        "00:41 filter Variance > 5000",
        "00:52 copy 3 rows, switch to Outlook",
        "01:03 paste into new email, type recipient",
      ].join("\n"),
      voiceNotes: [],
      createdAt: now,
    },
    {
      id: "task_seed_ae",
      title: "Vet an opportunity before sending the quote",
      role: "Account Executive",
      rawTrace: [
        "00:00 open Salesforce, search Opportunity OPP-44219",
        "00:09 open Opportunity detail",
        "00:15 read ACV field",
        "00:20 open 'Discount Approval Matrix' tab",
        "00:31 compare two numbers",
        "00:44 open Quote record",
        "00:55 change 'Discount %' field",
        "01:05 click Save",
      ].join("\n"),
      voiceNotes: [],
      createdAt: now,
    },
    {
      id: "task_seed_acm",
      title: "Post month-end accruals",
      role: "Accounting Manager",
      rawTrace: [
        "00:00 open Excel accruals workbook",
        "00:07 review JE log rows 12-40",
        "00:19 highlight 4 rows",
        "00:28 switch to NetSuite",
        "00:36 click 'New Journal Entry'",
        "00:47 type lines, set period",
        "00:59 attach summary, click Post",
      ].join("\n"),
      voiceNotes: [],
      createdAt: now,
    },
    {
      id: "task_seed_sre",
      title: "Triage an auth-service pager alert",
      role: "Site Reliability Engineer",
      rawTrace: [
        "00:00 open PagerDuty incident",
        "00:08 read alert: auth pod 5xx spike",
        "00:14 run kubectl get pods -n auth",
        "00:22 run kubectl logs auth-7f... --tail=200",
        "00:35 open runbook",
        "00:44 cross-reference upstream dashboard",
        "00:58 edit runbook, add a check",
      ].join("\n"),
      voiceNotes: [],
      createdAt: now,
    },
  ];
}
