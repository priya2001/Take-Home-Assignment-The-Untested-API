const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// Create fixtures through HTTP so route validation and persistence are exercised.
async function createTask(fields = {}) {
  const response = await request(app)
    .post('/tasks')
    .send({ title: 'Write API tests', ...fields })
    .expect(201);
  return response.body;
}

describe('POST /tasks', () => {
  test('creates a task with defaults and makes it available in the list', async () => {
    const task = await createTask();
    expect(task).toMatchObject({
      id: expect.any(String), title: 'Write API tests', description: '',
      status: 'todo', priority: 'medium', dueDate: null, completedAt: null,
      createdAt: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(task.createdAt))).toBe(false);
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([task]);
  });

  test('preserves explicitly supplied task fields', async () => {
    const fields = {
      title: 'Review', description: 'Check API behavior', status: 'in_progress',
      priority: 'high', dueDate: '2030-01-01T00:00:00.000Z',
    };
    expect(await createTask(fields)).toMatchObject(fields);
  });

  test.each([
    ['missing title', {}],
    ['blank title', { title: '   ' }],
    ['non-string title', { title: 42 }],
    ['invalid status', { title: 'Test', status: 'unknown' }],
    ['invalid priority', { title: 'Test', priority: 'urgent' }],
    ['invalid due date', { title: 'Test', dueDate: 'not-a-date' }],
  ])('rejects %s without creating a task', async (_, body) => {
    const response = await request(app).post('/tasks').send(body).expect(400);
    expect(response.body).toEqual({ error: expect.any(String) });
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([]);
  });
});

describe('GET /tasks', () => {
  test('returns an empty list when there are no tasks', async () => {
    const response = await request(app).get('/tasks').expect(200);
    expect(response.body).toEqual([]);
  });

  test('lists multiple tasks', async () => {
    const first = await createTask({ title: 'First' });
    const second = await createTask({ title: 'Second' });
    const response = await request(app).get('/tasks').expect(200);
    expect(response.body).toEqual([first, second]);
  });

  test('filters by an exact status', async () => {
    await createTask();
    const active = await createTask({ status: 'in_progress' });
    const response = await request(app).get('/tasks').query({ status: 'in_progress' }).expect(200);
    expect(response.body).toEqual([active]);
  });

  test('returns no tasks when a valid status has no matches', async () => {
    await createTask();
    const response = await request(app).get('/tasks').query({ status: 'done' }).expect(200);
    expect(response.body).toEqual([]);
  });

  test('paginates from the first task through the partial last page', async () => {
    const first = await createTask({ title: 'First' });
    const second = await createTask({ title: 'Second' });
    const third = await createTask({ title: 'Third' });
    const pageOne = await request(app).get('/tasks').query({ page: 1, limit: 2 }).expect(200);
    const pageTwo = await request(app).get('/tasks').query({ page: 2, limit: 2 }).expect(200);
    expect(pageOne.body).toEqual([first, second]);
    expect(pageTwo.body).toEqual([third]);
  });

  test('returns an empty list beyond the last page', async () => {
    await createTask();
    const response = await request(app).get('/tasks').query({ page: 3, limit: 2 }).expect(200);
    expect(response.body).toEqual([]);
  });

  test('defaults to page one when only the limit is supplied', async () => {
    const first = await createTask();
    await createTask({ title: 'Second' });
    const response = await request(app).get('/tasks').query({ limit: 1 }).expect(200);
    expect(response.body).toEqual([first]);
  });

  test('defaults to ten tasks per page when only the page is supplied', async () => {
    const tasks = [];
    for (let index = 0; index < 11; index++) {
      tasks.push(await createTask({ title: `Task ${index}` }));
    }
    const response = await request(app).get('/tasks').query({ page: 2 }).expect(200);
    expect(response.body).toEqual([tasks[10]]);
  });
});

describe('PUT /tasks/:id', () => {
  test('updates task fields and persists the result', async () => {
    const task = await createTask();
    const fields = {
      title: 'Updated', description: 'New description', status: 'in_progress',
      priority: 'high', dueDate: '2030-01-01T00:00:00.000Z',
    };
    const response = await request(app).put(`/tasks/${task.id}`).send(fields).expect(200);
    expect(response.body).toEqual({ ...task, ...fields });
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([response.body]);
  });

  test('returns 404 for a missing task', async () => {
    const response = await request(app).put('/tasks/missing').send({ title: 'Updated' }).expect(404);
    expect(response.body).toEqual({ error: 'Task not found' });
  });

  test.each([
    ['blank title', { title: '   ' }],
    ['non-string title', { title: 42 }],
    ['invalid status', { status: 'unknown' }],
    ['invalid priority', { priority: 'urgent' }],
    ['invalid due date', { dueDate: 'not-a-date' }],
  ])('rejects %s without changing the stored task', async (_, fields) => {
    const task = await createTask();
    const response = await request(app).put(`/tasks/${task.id}`).send(fields).expect(400);
    expect(response.body).toEqual({ error: expect.any(String) });
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([task]);
  });

  test('allows clearing the due date with null', async () => {
    const task = await createTask({ dueDate: '2030-01-01T00:00:00.000Z' });
    const response = await request(app).put(`/tasks/${task.id}`).send({ dueDate: null }).expect(200);
    expect(response.body).toEqual({ ...task, dueDate: null });
  });
});

describe('DELETE /tasks/:id', () => {
  test('returns 204 with no body and removes only the selected task', async () => {
    const first = await createTask();
    const second = await createTask({ title: 'Keep me' });
    const response = await request(app).delete(`/tasks/${first.id}`).expect(204);
    expect(response.text).toBe('');
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([second]);
  });

  test('returns 404 for a missing task without deleting another task', async () => {
    const task = await createTask();
    const response = await request(app).delete('/tasks/missing').expect(404);
    expect(response.body).toEqual({ error: 'Task not found' });
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([task]);
  });

  test('returns 404 when the same task is deleted again', async () => {
    const task = await createTask();
    await request(app).delete(`/tasks/${task.id}`).expect(204);
    await request(app).delete(`/tasks/${task.id}`).expect(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test.each(['low', 'medium', 'high'])('completes a %s priority task without changing other fields', async (priority) => {
    const task = await createTask({ priority });
    const response = await request(app).patch(`/tasks/${task.id}/complete`).expect(200);
    expect(response.body).toEqual({ ...task, status: 'done', completedAt: expect.any(String) });
    expect(Number.isNaN(Date.parse(response.body.completedAt))).toBe(false);
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([response.body]);
  });

  test('returns 404 for a missing task without changing existing tasks', async () => {
    const task = await createTask();
    const response = await request(app).patch('/tasks/missing/complete').expect(404);
    expect(response.body).toEqual({ error: 'Task not found' });
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([task]);
  });

  test('allows completion of an already completed task without duplicating it', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/complete`).expect(200);
    const response = await request(app).patch(`/tasks/${task.id}/complete`).expect(200);
    expect(response.body).toMatchObject({ id: task.id, status: 'done', priority: task.priority });
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([response.body]);
  });
});

describe('GET /tasks/stats', () => {
  test('returns zeros when there are no tasks', async () => {
    const response = await request(app).get('/tasks/stats').expect(200);
    expect(response.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts statuses and excludes completed and undated tasks from overdue', async () => {
    // Relative dates avoid depending on the calendar date when these tests run.
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    await createTask({ dueDate: past });
    await createTask({ status: 'in_progress', dueDate: past });
    await createTask({ status: 'done', dueDate: past });
    await createTask({ dueDate: future });
    await createTask();
    const response = await request(app).get('/tasks/stats').expect(200);
    expect(response.body).toEqual({ todo: 3, in_progress: 1, done: 1, overdue: 2 });
  });

  test('removes a task from the overdue count when it is completed', async () => {
    const task = await createTask({ dueDate: new Date(Date.now() - 86400000).toISOString() });
    const before = await request(app).get('/tasks/stats').expect(200);
    expect(before.body.overdue).toBe(1);
    await request(app).patch(`/tasks/${task.id}/complete`).expect(200);
    const after = await request(app).get('/tasks/stats').expect(200);
    expect(after.body).toEqual({ todo: 0, in_progress: 0, done: 1, overdue: 0 });
  });
});
