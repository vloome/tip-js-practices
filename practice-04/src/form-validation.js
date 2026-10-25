const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

/**
 * Чистая функция проверки данных формы. Не обращается к DOM и не меняет входы.
 * draft: { id, title, priority }; editingId: null либо id редактируемой задачи.
 */
export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  let id;

  if (editingId !== null) {
    id = editingId;
    if (!Number.isSafeInteger(id) || id <= 0 || !safeTasks.some((task) => task?.id === id)) {
      errors.id = "Не удалось найти задачу для редактирования.";
    }
  } else {
    const rawId = draft?.id;
    const emptyId = rawId == null || (typeof rawId === "string" && rawId.trim() === "");
    if (emptyId || !["string", "number"].includes(typeof rawId)) {
      errors.id = "Укажите положительный целочисленный id.";
    } else {
      id = Number(rawId);
      if (!Number.isSafeInteger(id) || id <= 0) {
        errors.id = "ID должен быть положительным безопасным целым числом.";
      } else if (safeTasks.some((task) => task?.id === id)) {
        errors.id = "Задача с таким ID уже существует.";
      }
    }
  }

  if (typeof draft?.title !== "string") {
    errors.title = "Название должно быть строкой.";
  } else {
    const title = draft.title.trim();
    if (title.length < 1 || title.length > 100) {
      errors.title = "Название должно содержать от 1 до 100 символов.";
    }
  }

  if (!ALLOWED_PRIORITIES.has(draft?.priority)) {
    errors.priority = "Выберите допустимый приоритет.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      id,
      title: draft.title.trim(),
      priority: draft.priority,
    },
  };
}
