const PRIORITY_LABELS = Object.freeze({ low: "Низкий", medium: "Средний", high: "Высокий" });

function makeText(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}
function makeAction(action, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  button.className = `button-secondary task-action task-action-${action}`;
  button.setAttribute("aria-label", label);
  button.append(makeText("span", "action-label", label));
  return button;
}

/** Создаёт карточку задачи, вставляя любые серверные строки только как текст. */
export function createTaskElement(task, category) {
  const item = document.createElement("li");
  item.className = `task-card${task.completed ? " is-completed" : ""}`;
  item.dataset.taskId = String(task.id);
  const header = document.createElement("div");
  header.className = "task-card-header";
  header.append(makeText("h3", "task-title", task.title));
  const status = task.completed ? "Выполнена" : "В работе";
  header.append(makeText("span", "task-status", status));
  item.append(header);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.append(makeText("span", "task-priority", `Приоритет: ${PRIORITY_LABELS[task.priority] ?? "Не указан"}`));
  meta.append(makeText("span", "task-category", category?.name ?? "Категория не найдена"));
  item.append(meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(makeAction("toggle", task.completed ? "Вернуть в работу" : "Завершить"));
  actions.append(makeAction("edit", "Изменить"));
  actions.append(makeAction("delete", "Удалить"));
  item.append(actions);
  return item;
}

/** Полностью заменяет список, чтобы в DOM не оставались устаревшие карточки. */
export function renderTaskList(list, tasks, categories) {
  if (!list || typeof list.replaceChildren !== "function") throw new TypeError("list должен быть DOM-элементом списка.");
  if (!Array.isArray(tasks) || !Array.isArray(categories)) throw new TypeError("tasks и categories должны быть массивами.");
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const elements = tasks.map((task) => createTaskElement(task, categoryById.get(task.categoryId)));
  list.replaceChildren(...elements);
}
