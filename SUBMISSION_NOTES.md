# Submission notes

## Links and delivered work

- [GitHub repository](https://github.com/priya2001/Take-Home-Assignment-The-Untested-API)
- [Live API](https://priya-task-api.onrender.com/tasks)
- 76 passing tests across service unit tests and Supertest HTTP integration tests; 97.03% line coverage. The detailed summary is in [TESTING.md](./TESTING.md).
- Three reproduced and fixed bugs: completion overwriting priority, pagination skipping the first page, and status filtering accepting partial matches. Causes and regression evidence are in [BUG_REPORT.md](./BUG_REPORT.md).
- Implemented `PATCH /tasks/:id/assign`, including validation, trimming, reassignment, missing-task handling, and tests.

## Design decisions

Assignment accepts a non-empty string, trims surrounding whitespace, and changes only the assignee field. Reassignment replaces the old name, and repeating the same assignment is allowed. Completed tasks can also be assigned because the brief does not restrict assignment by status. Names are labels rather than user IDs; authentication and a user directory are outside this assignment's scope.

Input validation runs before lookup, matching the existing update route. A valid assignment to a missing task returns 404; invalid input returns 400 even if the task ID is missing. Other request fields are ignored by the assignment endpoint. Existing task creation responses remain unchanged: the assignee field appears after the first assignment.

The original in-memory storage and service/route structure were retained to keep the changes focused on testing, verified fixes, and the requested feature.

## Codebase surprises

The original README used status names that disagreed with the assignment and validators; the README now documents `todo`, `in_progress`, and `done`. Completing a task also reset its priority, an unrelated side effect caught by regression tests. Pagination used a zero-based offset formula despite the route defaulting to page 1. Another contract mismatch is that the original README described PUT as a full update while the implementation merges supplied fields; that behavior has been preserved and documented.

## What to test next

The next checks would cover combined filtering and pagination, invalid pagination values, falsy status/priority inputs, stricter date validation, malformed request bodies, and attempts to change server-owned fields through PUT. The route currently returns early when a status filter is present, so pagination is not applied in that case. PUT also spreads supplied fields into the task, which needs field restrictions before production. These areas were identified during code review and are not included among the three test-reproduced fixes.

The current suite does not verify the unexpected-error middleware or standalone startup callback. Higher coverage is not a substitute for testing these behaviors and clarifying ambiguous requirements.

## Questions before production

- Should tasks belong to authenticated users, and who can view, edit, or assign them?
- Should assignees be validated user IDs rather than free-text names?
- What persistent database, retention, and backup requirements apply?
- Should PUT replace a task or merge fields? Which fields must be server-controlled?
- Should repeated completion preserve the original completion timestamp, and how should reopening a task affect it?
- What limits, monitoring, and error-response contract are required?

## Deployment and verification

The Express API is deployed on Render. The live create → assign → complete → delete flow was checked on 2026-09-29 using a temporary task, which was removed after testing. Blank-name rejection, trimming, priority preservation, and the missing-task response were also verified. See [TESTING.md](./TESTING.md) for the results.

The deployment has no frontend or root-page handler; `/tasks` is the live entry point. Data resets when the process restarts, including after redeployment. The free hosting instance can sleep when idle, causing a slower first request. This is an assignment demonstration, not a production-ready persistence or access-control system.

## Tool assistance

AI assistance was used to develop tests, implement fixes and the assignment endpoint, and prepare documentation. Manual API requests were also used to exercise the local and deployed service. The tests and bug reports provide reproducible evidence for the implemented behavior.
