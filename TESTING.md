# Testing

From `task-api`, run:

```bash
npm test -- --runInBand
npm run coverage -- --runInBand
```

The tests import the Express app directly with Supertest; no separately running server or fixed port is needed. Each test resets its own in-memory store. They do not change data in a separately running development server.

## Coverage snapshot

Verified on 2026-09-29, after implementing the assignment endpoint:

```text
Test Suites: 3 passed, 3 total
Tests:       76 passed, 76 total

Scope                  Statements  Branches  Functions  Lines
All files              97.29%      97.59%    93.10%     97.03%
src/app.js             69.23%      75.00%     0.00%     69.23%
src/routes/tasks.js   100.00%     100.00%   100.00%    100.00%
src/services/          100.00%      94.11%   100.00%    100.00%
src/utils/validators.js 100.00%    100.00%   100.00%    100.00%
```

## What is covered

- 21 service unit tests: creation, defaults, reading, status filtering, pagination, updates, deletion, completion, and overdue statistics.
- 35 HTTP integration tests: every existing endpoint, successful responses, validation errors, missing tasks, persistence, pagination boundaries, repeated deletion/completion, and overdue count changes.
- 20 assignment tests (3 service and 17 HTTP): assignment, whitespace trimming, reassignment, invalid input, missing tasks, unrelated-field protection, and preservation of assignment through updates/completion. These tests failed before the feature was implemented and pass with the implementation.
- Regressions for the three fixes in `BUG_REPORT.md`.
- Invalid create/update requests leave stored data unchanged.

The overall coverage exceeds the assignment's 80% target. Coverage measures executed code, not whether every possible input or bug has been checked.

## Remaining checks

- Test combined status filtering and pagination, invalid pagination parameters, falsy status/priority values, and attempts to overwrite server-owned fields.
- Review malformed JSON and unexpected-error handling. Current tests do not exercise the error middleware or standalone server startup callback.
- Clarify full-replacement versus partial-update semantics for PUT and timestamp behavior when completing an already completed task.
- Re-run coverage after subsequent changes and verify the deployed API before submission.
