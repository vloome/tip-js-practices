const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

/** Проверяет и нормализует данные формы без обращения к DOM и без изменения входных объектов. */
export function validateTaskDraft(draft, categories) {
  const errors = {};
  const source = draft && typeof draft === "object" && !Array.isArray(draft) ? draft : {};
  const categoryList = Array.isArray(categories) ? categories : [];
  const title = typeof source.title === "string" ? source.title.trim() : "";
  const priority = source.priority;
  const rawCategory = source.categoryId;
  const categoryId = typeof rawCategory === "number"
    ? rawCategory
    : (typeof rawCategory === "string" && rawCategory.trim() !== "" ? Number(rawCategory) : NaN);

  if (title.length < 1 || title.length > 100) {
    errors.title = "Название должно содержать от 1 до 100 символов после удаления пробелов по краям.";
  }
  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите допустимый приоритет: низкий, средний или высокий.";
  }
  if (!Number.isSafeInteger(categoryId) || categoryId <= 0
      || !categoryList.some((category) => category && category.id === categoryId)) {
    errors.categoryId = "Выберите существующую категорию.";
  }

  if (Object.keys(errors).length > 0) return { valid: false, value: null, errors };
  return { valid: true, value: { title, priority, categoryId }, errors: {} };
}
