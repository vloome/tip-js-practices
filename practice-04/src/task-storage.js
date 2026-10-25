export const STORAGE_VERSION = 1;
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

function copyTasks(tasks) {
  return Array.isArray(tasks) ? tasks.map((task) => ({ ...task })) : [];
}

/** Проверяет схему каждой задачи и уникальность id, ничего не исправляя. */
export function isValidTaskList(value) {
  if (!Array.isArray(value)) return false;
  const seenIds = new Set();
  for (const task of value) {
    if (task === null || typeof task !== "object" || Array.isArray(task)) return false;
    if (!Number.isSafeInteger(task.id) || task.id <= 0) return false;
    if (seenIds.has(task.id)) return false;
    seenIds.add(task.id);
    if (typeof task.title !== "string") return false;
    if (task.title.length < 1 || task.title.length > 100 || task.title.trim() !== task.title) return false;
    if (typeof task.completed !== "boolean") return false;
    if (!ALLOWED_PRIORITIES.has(task.priority)) return false;
  }
  return true;
}

/**
 * Возвращает сохранённый список или независимую копию исходного набора.
 * Исключения и несовместимые данные не передаются вызывающему коду.
 */
export function loadTasks(storage, key, fallbackTasks) {
  const fallback = copyTasks(fallbackTasks);
  try {
    const raw = storage.getItem(key);
    if (raw === null) {
      return { ok: true, source: "initial", tasks: fallback };
    }
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Сохранённые данные имеют неверный формат.");
    }
    if (parsed.version !== STORAGE_VERSION) {
      throw new Error("Версия сохранённых данных не поддерживается.");
    }
    if (!isValidTaskList(parsed.tasks)) {
      throw new Error("Сохранённый список задач не соответствует модели данных.");
    }
    return { ok: true, source: "storage", tasks: copyTasks(parsed.tasks) };
  } catch (error) {
    return {
      ok: false,
      source: "fallback",
      tasks: fallback,
      error: `Не удалось прочитать сохранённые данные: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Записывает только список, соответствующий полной схеме модели. */
export function saveTasks(storage, key, tasks) {
  if (!isValidTaskList(tasks)) {
    return { ok: false, error: "Список задач не соответствует модели данных; сохранение отменено." };
  }
  try {
    storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, tasks }));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Не удалось сохранить данные: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Удаляет только переданный ключ хранилища. */
export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Не удалось удалить сохранённые данные: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
