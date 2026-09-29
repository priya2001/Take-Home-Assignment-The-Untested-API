# Bug report

## Completing a task overwrites its priority — fixed

- **Location:** `task-api/src/services/taskService.js`, `completeTask()`.
- **Expected:** Completing a task sets its status to `done` and records a completion timestamp while preserving its priority.
- **Actual:** Tasks with `low` or `high` priority became `medium` after completion.
- **Discovery:** A manual create-and-complete API request reproduced the issue for a high-priority task. A parameterized unit test then checked all three priority values: low and high failed, while medium passed before the fix.
- **Cause:** The updated object spread the original task, then explicitly overwrote its priority with `priority: 'medium'`.
- **Fix:** Remove that override so the original task's priority is retained.
- **Regression coverage:** `task-api/tests/taskService.test.js` checks all three priorities, completion status, a parseable completion timestamp, and the stored result.

## Pagination skips the first page — fixed

- **Location:** `task-api/src/services/taskService.js`, `getPaginated()`.
- **Expected:** With one-based pages, page 1 starts at the first task; subsequent pages continue without skipping tasks.
- **Actual:** With five tasks and a limit of two, page 1 returned tasks 3 and 4, page 2 returned only task 5, and page 3 was empty.
- **Discovery:** Three unit tests covering the first, second, and partial last page failed before the fix.
- **Cause:** `page * limit` treats the page number as zero-based, although the API defaults to page 1.
- **Fix:** Calculate the offset using `(page - 1) * limit`.
- **Regression coverage:** Tests check the first page, subsequent page, partial last page, and an out-of-range page.

## Status filtering accepts partial matches — fixed

- **Location:** `task-api/src/services/taskService.js`, `getByStatus()`.
- **Expected:** Filtering selects tasks whose status exactly matches the requested value.
- **Actual:** Filtering by `progress` returned tasks with status `in_progress`.
- **Discovery:** A unit test requesting a partial status failed before the fix.
- **Cause:** `String.includes()` checks for a substring rather than equality.
- **Fix:** Compare status values with strict equality.
- **Regression coverage:** Tests cover exact matches, no matches, and partial values. This service-level fix does not introduce HTTP query validation.

The report currently covers three verified bugs. Integration tests and the assignment feature are now in place; see `TESTING.md` for the current coverage snapshot and remaining checks. Deployment and final submission verification are still pending.
