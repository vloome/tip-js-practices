import { getTaskStats } from "./task-service.js";

const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

function makeActionButton(action, label, extra = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  if (extra.ariaPressed !== undefined) {
    button.setAttribute("aria-pressed", String(extra.ariaPressed));
  }
  const span = document.createElement("span");
  span.className = "action-label";
  span.textContent = label;
  button.append(span);
  return button;
}

/** Создаёт DOM-карточку одной задачи. Обработчики здесь не назначаются. */
export function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "task-card";
  item.dataset.taskId = String(task.id);

  const completed = task.completed === true;
  if (completed) item.classList.add("is-completed");

  const priority = document.createElement("span");
  priority.className = `task-priority priority-${task.priority}`;
  priority.textContent = PRIORITY_LABELS[task.priority] ?? String(task.priority);

  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = completed ? "Выполнена" : "В работе";

  const title = document.createElement("span");
  title.className = "task-title";
  // Не используем innerHTML: пользовательское название отображается как обычный текст.
  title.textContent = String(task.title);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    makeActionButton("toggle", completed ? "В работу" : "Выполнена", { ariaPressed: completed }),
    makeActionButton("edit", "Изменить"),
    makeActionButton("delete", "Удалить"),
  );

  item.append(priority, status, title, actions);
  return item;
}

/** Полностью перерисовывает список, не накапливая старые карточки. */
export function renderTaskList(listElement, tasks) {
  if (!listElement) return;
  listElement.replaceChildren();
  if (!Array.isArray(tasks)) return;
  const fragment = document.createDocumentFragment();
  for (const task of tasks) fragment.append(createTaskElement(task));
  listElement.append(fragment);
}

/** Сводка всегда рассчитывается по полному списку, а не только по фильтру. */
export function renderSummary(summaryElement, tasks, visibleCount) {
  if (!summaryElement) return;
  const stats = getTaskStats(Array.isArray(tasks) ? tasks : []);
  const values = {
    total: String(stats.total),
    completed: String(stats.completed),
    pending: String(stats.pending),
    progress: `${stats.progress.toFixed(1)}%`,
    visible: String(visibleCount ?? stats.total),
  };
  for (const [name, value] of Object.entries(values)) {
    const target = summaryElement.querySelector(`[data-stat="${name}"]`)
      ?? summaryElement.querySelector(`#stat-${name}`);
    if (target) target.textContent = value;
  }
}

/** Показывает различающиеся сообщения для пустого списка и пустого фильтра. */
export function renderEmptyState(messageElement, total, visibleCount) {
  if (!messageElement) return;
  if (visibleCount === 0) {
    messageElement.hidden = false;
    messageElement.textContent = total === 0
      ? "Список задач пуст."
      : "Нет задач по выбранному фильтру.";
  } else {
    messageElement.hidden = true;
    messageElement.textContent = "";
  }
}
