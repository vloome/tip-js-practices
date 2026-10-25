const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

function isValidId(id) {
  return Number.isSafeInteger(id) && id > 0;
}

function normalizeTitle(title) {
  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }
  const normalized = title.trim();
  if (normalized.length < 1 || normalized.length > 100) {
    return { ok: false, error: "Длина названия должна быть от 1 до 100 символов" };
  }
  return { ok: true, title: normalized };
}

function validatePriority(priority) {
  if (!ALLOWED_PRIORITIES.has(priority)) {
    return { ok: false, error: "Некорректный приоритет: допустимы low, medium, high" };
  }
  return { ok: true };
}

/** Создаёт задачу без изменения входных данных. */
export function createTask(id, title, priority = "medium") {
  if (!isValidId(id)) {
    return { ok: false, error: "Некорректный id: должен быть положительным безопасным целым числом" };
  }
  const titleResult = normalizeTitle(title);
  if (!titleResult.ok) return titleResult;
  const priorityResult = validatePriority(priority);
  if (!priorityResult.ok) return priorityResult;

  return {
    ok: true,
    task: {
      id,
      title: titleResult.title,
      completed: false,
      priority,
    },
  };
}

/** Возвращает задачу с указанным id или undefined. */
export function findTaskById(tasks, id) {
  if (!Array.isArray(tasks)) return undefined;
  return tasks.find((task) => task?.id === id);
}

/** Возвращает новый массив невыполненных задач. */
export function getPendingTasks(tasks) {
  return Array.isArray(tasks) ? tasks.filter((task) => !task.completed) : [];
}

/** Возвращает названия задач в исходном порядке. */
export function getTaskTitles(tasks) {
  return Array.isArray(tasks) ? tasks.map((task) => task.title) : [];
}

/** Рассчитывает общую статистику по списку. */
export function getTaskStats(tasks) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const total = safeTasks.length;
  const completed = safeTasks.filter((task) => task.completed === true).length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : (completed / total) * 100;
  return { total, completed, pending, progress };
}

/** Добавляет задачу в конец нового массива. */
export function addTask(tasks, id, title, priority = "medium") {
  if (!Array.isArray(tasks)) {
    return { ok: false, error: "Список задач должен быть массивом" };
  }
  if (tasks.some((task) => task?.id === id)) {
    return { ok: false, error: "Задача с таким id уже существует" };
  }
  const creationResult = createTask(id, title, priority);
  if (!creationResult.ok) return creationResult;
  return { ok: true, tasks: [...tasks, creationResult.task] };
}

/** Меняет статус задачи, сохраняя исходный массив и его объекты. */
export function setTaskCompleted(tasks, id, completed) {
  if (!isValidId(id)) {
    return { ok: false, error: "Некорректный id задачи" };
  }
  if (typeof completed !== "boolean") {
    return { ok: false, error: "Статус выполнения (completed) должен быть булевым значением" };
  }
  if (!Array.isArray(tasks) || !tasks.some((task) => task?.id === id)) {
    return { ok: false, error: "Задача с указанным id не найдена" };
  }
  return {
    ok: true,
    tasks: tasks.map((task) => task.id === id ? { ...task, completed } : task),
  };
}

/** Меняет название одной задачи. */
export function renameTask(tasks, id, title) {
  if (!isValidId(id)) return { ok: false, error: "Некорректный id задачи" };
  const titleResult = normalizeTitle(title);
  if (!titleResult.ok) return titleResult;
  if (!Array.isArray(tasks) || !tasks.some((task) => task?.id === id)) {
    return { ok: false, error: "Задача с указанным id не найдена" };
  }
  return {
    ok: true,
    tasks: tasks.map((task) => task.id === id ? { ...task, title: titleResult.title } : task),
  };
}

/** Удаляет задачу с указанным id. */
export function removeTask(tasks, id) {
  if (!isValidId(id)) return { ok: false, error: "Некорректный id задачи" };
  if (!Array.isArray(tasks) || !tasks.some((task) => task?.id === id)) {
    return { ok: false, error: "Задача с указанным id не найдена" };
  }
  return { ok: true, tasks: tasks.filter((task) => task.id !== id) };
}

/**
 * Редактирует только title и priority выбранной задачи.
 * id и completed сохраняются; исходный массив и его элементы не мутируются.
 */
export function updateTask(tasks, id, title, priority) {
  if (!isValidId(id)) {
    return { ok: false, error: "Некорректный id: должен быть положительным безопасным целым числом" };
  }
  if (!Array.isArray(tasks) || !tasks.some((task) => task?.id === id)) {
    return { ok: false, error: "Задача с указанным id не найдена" };
  }
  const titleResult = normalizeTitle(title);
  if (!titleResult.ok) return titleResult;
  const priorityResult = validatePriority(priority);
  if (!priorityResult.ok) return priorityResult;

  return {
    ok: true,
    tasks: tasks.map((task) => task.id === id
      ? { ...task, title: titleResult.title, priority }
      : task),
  };
}
