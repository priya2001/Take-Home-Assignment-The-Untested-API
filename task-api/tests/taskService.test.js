const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('creating and reading tasks', () => {
  test('starts with an empty list', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  test('creates a stored task with defaults and a creation timestamp', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-29T12:00:00Z'));
    const task = taskService.create({ title: 'Write tests' });
    expect(task).toEqual({
      id: expect.any(String),
      title: 'Write tests',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
      createdAt: '2026-09-29T12:00:00.000Z',
    });
    expect(taskService.findById(task.id)).toEqual(task);
    expect(taskService.getAll()).toEqual([task]);
  });

  test('preserves supplied fields and gives separate tasks unique IDs', () => {
    const fields = {
      title: 'Review API', description: 'Check routes',
      status: 'in_progress', priority: 'high', dueDate: '2026-10-01T00:00:00Z',
    };
    const first = taskService.create(fields);
    const second = taskService.create(fields);
    expect(first).toMatchObject(fields);
    expect(first.id).not.toBe(second.id);
    expect(taskService.getAll()).toHaveLength(2);
  });

  test('returns undefined for a missing task', () => {
    expect(taskService.findById('missing')).toBeUndefined();
  });
});

describe('filtering tasks', () => {
  test('returns only tasks with the requested status', () => {
    const todo = taskService.create({ title: 'Todo' });
    taskService.create({ title: 'Working', status: 'in_progress' });
    expect(taskService.getByStatus('todo')).toEqual([todo]);
  });

  test('returns an empty list when no task matches', () => {
    taskService.create({ title: 'Todo' });
    expect(taskService.getByStatus('done')).toEqual([]);
  });

  test('does not match a partial status', () => {
    taskService.create({ title: 'Working', status: 'in_progress' });
    expect(taskService.getByStatus('progress')).toEqual([]);
  });
});

describe('pagination', () => {
  let tasks;
  beforeEach(() => {
    tasks = Array.from({ length: 5 }, (_, index) =>
      taskService.create({ title: `Task ${index + 1}` })
    );
  });

  test('starts page one at the first task', () => {
    expect(taskService.getPaginated(1, 2)).toEqual(tasks.slice(0, 2));
  });

  test('returns the next page without skipping tasks', () => {
    expect(taskService.getPaginated(2, 2)).toEqual(tasks.slice(2, 4));
  });

  test('returns a partial last page', () => {
    expect(taskService.getPaginated(3, 2)).toEqual([tasks[4]]);
  });

  test('returns an empty list beyond the last page', () => {
    expect(taskService.getPaginated(4, 2)).toEqual([]);
  });
});

describe('updating and deleting tasks', () => {
  test('updates supplied fields and preserves other fields', () => {
    const task = taskService.create({ title: 'Original', priority: 'high' });
    const updated = taskService.update(task.id, { title: 'Updated' });
    expect(updated).toEqual({ ...task, title: 'Updated' });
    expect(taskService.findById(task.id)).toEqual(updated);
  });

  test('updating a missing task returns null without changing existing tasks', () => {
    const task = taskService.create({ title: 'Keep me' });
    expect(taskService.update('missing', { title: 'New' })).toBeNull();
    expect(taskService.getAll()).toEqual([task]);
  });

  test('deletes only the selected task and cannot delete it twice', () => {
    const first = taskService.create({ title: 'Delete me' });
    const second = taskService.create({ title: 'Keep me' });
    expect(taskService.remove(first.id)).toBe(true);
    expect(taskService.findById(first.id)).toBeUndefined();
    expect(taskService.remove(first.id)).toBe(false);
    expect(taskService.getAll()).toEqual([second]);
  });

  test('deleting a missing task leaves the store unchanged', () => {
    const task = taskService.create({ title: 'Keep me' });
    expect(taskService.remove('missing')).toBe(false);
    expect(taskService.getAll()).toEqual([task]);
  });
});

describe('statistics', () => {
  test('returns zero counts for an empty store', () => {
    expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts each status and only unfinished tasks strictly past their due date', () => {
    // Freeze time so overdue checks do not depend on when the suite runs.
    jest.useFakeTimers().setSystemTime(new Date('2026-09-29T12:00:00Z'));
    taskService.create({ title: 'Late todo', dueDate: '2026-09-28T12:00:00Z' });
    taskService.create({ title: 'Late active', status: 'in_progress', dueDate: '2026-09-28T12:00:00Z' });
    taskService.create({ title: 'Finished', status: 'done', dueDate: '2026-09-28T12:00:00Z' });
    taskService.create({ title: 'Future', dueDate: '2026-09-30T12:00:00Z' });
    taskService.create({ title: 'Due now', dueDate: '2026-09-29T12:00:00Z' });
    taskService.create({ title: 'No deadline' });
    expect(taskService.getStats()).toEqual({ todo: 4, in_progress: 1, done: 1, overdue: 2 });
  });
});

test('completing a missing task returns null without changing existing tasks', () => {
  const task = taskService.create({ title: 'Keep me' });
  expect(taskService.completeTask('missing')).toBeNull();
  expect(taskService.getAll()).toEqual([task]);
});

test.each(['low', 'medium', 'high'])(
  'completing a task preserves its %s priority',
  (priority) => {
    const task = taskService.create({
      title: 'Learn API testing',
      priority,
    });

    const completedTask = taskService.completeTask(task.id);

    expect(completedTask.status).toBe('done');
    expect(completedTask.completedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(completedTask.completedAt))).toBe(false);
    expect(completedTask.priority).toBe(priority);
    expect(taskService.findById(task.id)).toEqual(completedTask);
  }
);
