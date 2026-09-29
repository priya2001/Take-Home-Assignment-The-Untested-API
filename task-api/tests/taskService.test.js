const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
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
