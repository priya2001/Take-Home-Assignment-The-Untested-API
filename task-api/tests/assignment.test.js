const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => taskService._reset());

describe('assignTask service', () => {
  test('stores a trimmed assignee and preserves the remaining task fields', () => {
    const task = taskService.create({ title: 'Review', priority: 'high' });
    const assigned = taskService.assignTask(task.id, '  Priya Gautam  ');
    expect(assigned).toEqual({ ...task, assignee: 'Priya Gautam' });
    expect(taskService.findById(task.id)).toEqual(assigned);
  });

  test('replaces an existing assignee', () => {
    const task = taskService.create({ title: 'Review' });
    taskService.assignTask(task.id, 'Priya');
    const assigned = taskService.assignTask(task.id, 'Aman');
    expect(assigned.assignee).toBe('Aman');
    expect(taskService.getAll()).toEqual([assigned]);
  });

  test('returns null for a missing task without changing the store', () => {
    const task = taskService.create({ title: 'Keep me' });
    expect(taskService.assignTask('missing', 'Priya')).toBeNull();
    expect(taskService.getAll()).toEqual([task]);
  });
});

describe('PATCH /tasks/:id/assign', () => {
  async function createTask() {
    const response = await request(app).post('/tasks')
      .send({ title: 'Review', priority: 'high' }).expect(201);
    return response.body;
  }

  test('returns and persists the task with a trimmed assignee', async () => {
    const task = await createTask();
    const response = await request(app).patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '  Priya Gautam  ' }).expect(200);
    expect(response.body).toEqual({ ...task, assignee: 'Priya Gautam' });
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([response.body]);
  });

  test('allows reassignment and repeating the same assignment', async () => {
    const task = await createTask();
    for (const assignee of ['Priya', 'Aman', 'Aman']) {
      const response = await request(app).patch(`/tasks/${task.id}/assign`)
        .send({ assignee }).expect(200);
      expect(response.body).toEqual({ ...task, assignee });
    }
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([{ ...task, assignee: 'Aman' }]);
  });

  test.each([
    ['missing name', {}],
    ['empty name', { assignee: '' }],
    ['whitespace name', { assignee: ' \t\n ' }],
    ['number', { assignee: 42 }],
    ['null', { assignee: null }],
    ['boolean', { assignee: false }],
    ['array', { assignee: ['Priya'] }],
    ['object', { assignee: { name: 'Priya' } }],
    ['array body', []],
  ])('rejects %s and preserves the previous assignment', async (_, body) => {
    const task = await createTask();
    const original = await request(app).patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Priya' }).expect(200);
    const response = await request(app).patch(`/tasks/${task.id}/assign`)
      .send(body).expect(400);
    expect(response.body).toEqual({ error: 'assignee is required and must be a non-empty string' });
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([original.body]);
  });

  test('rejects a request with no body', async () => {
    const task = await createTask();
    const response = await request(app).patch(`/tasks/${task.id}/assign`).expect(400);
    expect(response.body).toEqual({ error: 'assignee is required and must be a non-empty string' });
  });

  test('returns 404 for a missing task with a valid assignment', async () => {
    const task = await createTask();
    const response = await request(app).patch('/tasks/missing/assign')
      .send({ assignee: 'Priya' }).expect(404);
    expect(response.body).toEqual({ error: 'Task not found' });
    const list = await request(app).get('/tasks').expect(200);
    expect(list.body).toEqual([task]);
  });

  test('validates input before looking up the task, like the update route', async () => {
    const response = await request(app).patch('/tasks/missing/assign')
      .send({ assignee: '' }).expect(400);
    expect(response.body).toHaveProperty('error', 'assignee is required and must be a non-empty string');
  });

  test('ignores unrelated fields instead of allowing task changes through assignment', async () => {
    const task = await createTask();
    const response = await request(app).patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Priya', id: 'replacement', title: 'Changed', status: 'done', priority: 'low' })
      .expect(200);
    expect(response.body).toEqual({ ...task, assignee: 'Priya' });
  });

  test('allows assigning a completed task without changing its completion timestamp', async () => {
    const task = await createTask();
    const completed = await request(app).patch(`/tasks/${task.id}/complete`).expect(200);
    const assigned = await request(app).patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Priya' }).expect(200);
    expect(assigned.body).toEqual({ ...completed.body, assignee: 'Priya' });
  });

  test('preserves the assignee through later task updates and completion', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Priya' }).expect(200);
    const updated = await request(app).put(`/tasks/${task.id}`)
      .send({ title: 'New title' }).expect(200);
    expect(updated.body.assignee).toBe('Priya');
    const completed = await request(app).patch(`/tasks/${task.id}/complete`).expect(200);
    expect(completed.body).toMatchObject({ assignee: 'Priya', title: 'New title', status: 'done' });
  });
});
