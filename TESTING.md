# Testing

From `task-api`, run:

```bash
npm test -- --runInBand
npm run coverage -- --runInBand
```

The tests import the Express app directly with Supertest; no separately running server or fixed port is needed. Each test resets its own in-memory store. They do not change data in a separately running development server.

## Coverage snapshot

Verified on 2026-09-29, before implementing the assignment endpoint:

```text
Test Suites: 2 passed, 2 total
Tests:       56 passed, 56 total

Scope                  Statements  Branches  Functions  Lines
All files              97.01%      97.33%    92.30%     96.72%
src/app.js             69.23%      75.00%     0.00%     69.23%
src/routes/tasks.js   100.00%     100.00%   100.00%    100.00%
src/services/          100.00%      94.11%   100.00%    100.00%
src/utils/validators.js 100.00%    100.00%   100.00%    100.00%
```

## What is covered

- 21 service unit tests: creation, defaults, reading, status filtering, pagination, updates, deletion, completion, and overdue statistics.
- 35 HTTP integration tests: every existing endpoint, successful responses, validation errors, missing tasks, persistence, pagination boundaries, repeated deletion/completion, and overdue count changes.
- Regressions for the three fixes in `BUG_REPORT.md`.
- Invalid create/update requests leave stored data unchanged.

The overall coverage exceeds the assignment's 80% target. Coverage measures executed code, not whether every possible input or bug has been checked.

## Remaining checks

- Add tests for the assignment endpoint when implementing it.
- Test combined status filtering and pagination, invalid pagination parameters, falsy status/priority values, and attempts to overwrite server-owned fields.
- Review malformed JSON and unexpected-error handling. Current tests do not exercise the error middleware or standalone server startup callback.
- Clarify full-replacement versus partial-update semantics for PUT and timestamp behavior when completing an already completed task.
- Re-run coverage after subsequent changes and verify the deployed API before submission.
