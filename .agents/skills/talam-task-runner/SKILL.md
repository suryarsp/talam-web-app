---
name: talam-task-runner
description: Pull the next open task from the Talam Notion tracker, implement it (checking the live Paper design file first when it's a UI task, so the code matches the actual artboard rather than just the written design doc), and write the result back to Notion as Status + Notes on that same task. Use this whenever the user says "pick up the next task", "work the tracker", "do the next thing on the list", "sync this task to Notion when done", or references the Talam Tasks database / project tracker. Also use it proactively after finishing any Talam implementation work that corresponds to a tracked task, so the tracker doesn't fall behind — don't wait for the user to ask for the Notion update separately.
---

# Talam Task Runner

Closes the loop between the Notion tracker and the actual codebase: pick a task, build it against the real design (not just the doc), then record exactly what happened back on that task's Notion page. The point is that the tracker should never require a separate "now go update Notion" request — it happens as part of finishing the task.

## Notion tracker reference

- Tracker page: **"Talam — Project Tracker"** (`3921cde7-be68-81eb-b16d-dd73e06d4a1e`)
- Task database: **"Talam Tasks"**, data source `collection://8c41c5ac-9ade-4450-b9eb-a0ab6add0ac3`
- `Status` is a fixed-option `status` property: `Not started` / `In progress` / `Done` — never invent other values.
- `Notes` is a plain single-string text property, not rich blocks.

If the Notion MCP tools (`mcp__*__notion-*`) aren't available or return an auth error, stop and tell the user the Notion connector needs to be authorized — don't fall back to guessing task state from local docs.

## Step 1 — Pick the task

Query the data source with `notion-query-data-sources` (SQL mode), e.g. `WHERE Status != 'Done' ORDER BY Phase LIMIT 1` (adjust the filter if the user names a specific task or phase instead of "the next one"). Confirm the picked task's title, phase, and any spec/plan-doc link with the user in one line before starting if it's ambiguous which task they mean — otherwise just proceed.

Set `Status` to `In progress` on that task immediately via `notion-update-page` (`update_properties`), so the tracker reflects reality while you work rather than only at the end.

## Step 2 — If it's a UI/design task, check Paper first

A task counts as UI/design work if it involves building or changing a screen, component, or visual flow (as opposed to pure backend/data/infra work). For these:

1. Invoke the `paper-desktop:design-to-code` skill rather than jumping straight to the written design doc.
2. That skill (and the Paper MCP `find_nodes` / `get_tree_summary` tools it uses) will tell you whether a matching artboard already exists in the live Paper file for this screen.
3. **If the artboard exists**: treat it as ground truth, the same way past screens (e.g. Auth) were verified — pull the literal `get_jsx`/`get_screenshot` output and match classNames, copy, spacing, and exact values against it. The written design doc (`docs/design/2026-06-23-talam-oss-design.md`) explicitly disclaims itself as unverified intent, not a pixel-accurate spec, so don't stop at the prose description if a real artboard is available.
4. **If no artboard exists yet** for this screen, say so explicitly, fall back to the written design doc + design tokens in `app/globals.css`, and note in the eventual Notion write-up that this screen still needs a Paper artboard created (don't silently invent one — Paper desktop is the user's only design tool, per standing preference; don't substitute HTML/SVG mockups for actual prototyping).
5. Any brand mark, icon, or logo pulled from Paper goes into a reusable `components/icons/` (or `components/` root) component — never inline raw SVG copied from the artboard into a one-off component.

Non-UI tasks (schema changes, API routes, config, etc.) skip this step and go straight to implementation against the plan doc / task description.

## Step 3 — Implement

Build the task normally: follow the relevant plan doc's task breakdown if one exists, keep changes scoped to what the task actually asks for, and run the project's existing lint/build/test commands before considering it done. If you hit a bug or have to deviate from the plan doc's snippet, keep a one-line mental note of it (root cause + fix) — you'll need it for the Notes field next.

## Step 4 — Write the result back to Notion

As soon as the task's code is committed (or otherwise genuinely finished — don't do this for partial/WIP work), update that same task's Notion page in one `notion-update-page` call:

- `Status` → `Done`
- `Notes` → a terse, single-paragraph changelog in the same style as the plan doc's own "> Actually shipped..." deviation notes. Include:
  - what was implemented, in one clause
  - any deviation from the plan/spec and why
  - any bug hit + root cause + fix, if applicable
  - commit hash(es)
  - for UI tasks: whether a Paper artboard existed and was matched, or was missing (per Step 2)

Example: `"Added checkout summary screen per Paper artboard (Order Confirmed). No deviations from spec. Commit 3f1a9c2."` or `"FIX: OTP resend button double-fired — root cause was missing debounce on click handler; fixed in useOtpResend hook. Commit 9b2e7d1."`

Do this per task, immediately after it's done — never batch multiple tasks' Notion updates until the end of a phase.
