---
name: firestore-data-ops
description: 'Query or manipulate existing Firestore data using temporary Node scripts. Use when asked to inspect records, update fields, run dry-runs, create safety backups before writes, or restore data from local backups.'
argument-hint: 'Describe the collection, filter criteria, and intended fields to read or update.'
---

# Firestore Data Ops

Use this skill to perform one-off Firestore data operations by generating short-lived Node scripts, running them, reviewing output, and then deleting scripts when the task is complete.

## When To Use

- Querying existing Firestore data for analysis or debugging.
- Updating one or more fields on existing documents.
- Running a preview of proposed changes before writing.
- Restoring documents from a local backup created before an update.

## Core Rules

- Use temporary Node scripts for data access and mutation.
- Delete temporary scripts after successful execution and verification.
- Before any write or update, always create a local backup copy of the affected data.
- For update requests, always ask whether to run a dry-run first.
- Dry-run output must list each target record with: document id, title, and field-level from/to values.
- If restore is requested, read from the saved local backup and write records back to Firestore.
- Unless specified otherwise, this script operates on the remote Firestore database, not the local emulator, using the `service-account-key.json` credentials file.

## Repository Type And Schema Hints

Use these files first before searching broadly:

- Event shape (including title and tags): `app/types.ts` (CalendarEvent)
- Event read model with events collection path: `app/events/[id]/layout.tsx`
- Events collection usage examples: `app/serverActions.ts`, `functions/src/exportToSheets.ts`

## Required Inputs

Collect or confirm:

- Firestore target: project/environment and credentials source.
- Data scope: collection path, filters, and optional document IDs.
- Operation type: query, update, or restore.
- Update intent: exact fields and target values.
- Dry-run preference for updates: yes/no.
- Text matching rules for string filters: substring vs full-word, case-sensitive vs case-insensitive.

## Match Semantics Guardrail

Always confirm text matching behavior before running scripts.

- If request says "contains TT", ask whether TT must be a full word.
- If full word is required, use word-boundary matching (for example `\bTT\b`).
- Confirm case sensitivity explicitly.

## Workflow

1. Understand and constrain scope.
2. Create a temporary script under a temporary location (for example `scripts/tmp/`).
3. Initialize Firestore client in Node.
4. Query target documents.

If operation is query-only:

5. Print concise output and optional JSON export.

If operation is update:

7. Ask whether to execute a dry-run.
8. Create a local backup file containing all target documents before any write.
9. If dry-run is yes, print planned field changes per record and stop before write.
10. If dry-run is no (or after dry-run approval), perform update writes.
11. Print summary: matched count, updated count, failures.
12. Delete temporary script unless asked to keep it.

If operation is restore:

13. Read the relevant local backup file.
14. Write backup values back to Firestore.
15. Print restore summary and any failures.
16. Delete temporary script unless asked to keep it.

## Update Branching Logic

- If user asks to update data:
	- Ask: "Do you want a dry-run first?"
	- If yes: do not write, only report intended changes.
	- If no: still create backup first, then apply writes.
	- If backup creation fails: stop immediately and do not write.

## Dry-Run Output Contract

For each record that would change, output:

- `id`
- `title`
- `changes` object with per-field entries containing:
	- `from`
	- `to`

Example shape:

```json
{
	"id": "abc123",
	"title": "Inter-club TT League #1 VCGH",
	"changes": {
		"tags": {
			"from": ["Intro", "Race"],
			"to": ["Time-trial"]
		}
	}
}
```

## Backup And Restore Standard

- Backups must be local files (for example under `scripts/backups/`).
- Include timestamp, collection path, and operation context in filename.
- Store full document payloads for all affected records.
- Keep backup path in the final response so restore can be run later.

## Completion Checks

- Query task: output contains correct scope and record count.
- Update dry-run: output clearly shows record-by-record title plus field-level from/to diffs with no writes.
- Update write: backup exists and write summary is provided.
- Restore: restore summary is provided and failures are reported explicitly.
- Cleanup: temporary script removed unless user requested retention.

## Output Format Guidance

- Always report:
	- Collection/path queried.
	- Number of matching documents.
	- For dry-run: records that would change with title and from/to field values.
	- For updates: number of documents changed and backup file path.
	- For restore: backup file used and number of documents restored.
