# Bug report

## Completing a task overwrites its priority — fixed

- **Location:** `task-api/src/services/taskService.js`, `completeTask()`.
- **Expected:** Completing a task sets its status to `done` and records a completion timestamp while preserving its priority.
- **Actual:** Tasks with `low` or `high` priority became `medium` after completion.
- **Discovery:** A manual create-and-complete API request reproduced the issue for a high-priority task. A parameterized unit test then checked all three priority values: low and high failed, while medium passed before the fix.
- **Cause:** The updated object spread the original task, then explicitly overwrote its priority with `priority: 'medium'`.
- **Fix:** Remove that override so the original task's priority is retained.
- **Regression coverage:** `task-api/tests/taskService.test.js` checks all three priorities, completion status, a parseable completion timestamp, and the stored result.

This report currently covers the first verified bug; the remaining assignment work is still pending.
