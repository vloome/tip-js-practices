const PRIORITY_LABELS = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий"
};

/**
 * Создает DOM-элемент карточки задачи
 */
export function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-card";
  
  const strId = String(task.id);
  li.dataset.taskId = strId;
  li.setAttribute("data-task-id", strId);
  
  const isCompleted = Boolean(task.completed);
  if (isCompleted) {
    li.classList.add("is-completed"); // Строго по требованиям тестов и стилей
  }

  // Приоритет
  const prioritySpan = document.createElement("span");
  prioritySpan.className = `task-priority priority-${task.priority}`;
  prioritySpan.textContent = PRIORITY_LABELS[task.priority] || task.priority;

  // Статус задачи
  const statusSpan = document.createElement("span");
  statusSpan.className = "task-status";
  statusSpan.textContent = isCompleted ? "Выполнена" : "В работе";

  // Название задачи (используем textContent для защиты от XSS и разметки)
  const titleSpan = document.createElement("span");
  titleSpan.className = "task-title";
  titleSpan.textContent = task.title;

  // Кнопка переключения статуса
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "task-btn-toggle";
  toggleBtn.type = "button";
  toggleBtn.setAttribute("data-action", "toggle");
  toggleBtn.setAttribute("aria-pressed", isCompleted ? "true" : "false");
  
  const toggleLabel = document.createElement("span");
  toggleLabel.className = "action-label";
  toggleLabel.textContent = isCompleted ? "В работу" : "Выполнена";
  toggleBtn.appendChild(toggleLabel);

  // Кнопка удаления
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "task-btn-delete";
  deleteBtn.type = "button";
  deleteBtn.setAttribute("data-action", "delete");
  
  const deleteLabel = document.createElement("span");
  deleteLabel.className = "action-label";
  deleteLabel.textContent = "Удалить";
  deleteBtn.appendChild(deleteLabel);

  li.append(prioritySpan, statusSpan, titleSpan, toggleBtn, deleteBtn);
  return li;
}

export function renderTaskList(container, tasks) {
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(tasks)) return;
  const fragment = document.createDocumentFragment();
  tasks.forEach((task) => {
    fragment.appendChild(createTaskElement(task));
  });
  container.appendChild(fragment);
}

/**
 * Выводит общую сводку по списку
 */
export function renderSummary(root, tasks, visibleCount) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const total = safeTasks.length;
  const completed = safeTasks.filter((t) => t && t.completed).length;
  const pending = total - completed;
  const progressNum = total > 0 ? (completed / total) * 100 : 0;
  const progress = `${progressNum.toFixed(1)}%`;
  const visible = visibleCount !== undefined ? visibleCount : total;

  const values = {
    total: String(total),
    completed: String(completed),
    pending: String(pending),
    progress: progress,
    visible: String(visible)
  };

  const updateScope = (container) => {
    if (!container) return;
    for (const [name, val] of Object.entries(values)) {
      const el = container.querySelector(`[data-stat="${name}"]`) || container.querySelector(`#stat-${name}`);
      if (el) el.textContent = val;
    }
  };

  if (root) {
    updateScope(root);
  }
  updateScope(document);
}

/**
 * Управляет отображением сообщения для пустого списка или фильтра
 */
export function renderEmptyState(container, total, visibleCount) {
  if (!container) return;
  if (visibleCount === 0) {
    container.hidden = false;
    if (total === 0) {
      container.textContent = "Список задач пуст.";
    } else {
      container.textContent = "Нет задач по выбранному фильтру.";
    }
  } else {
    container.hidden = true;
    container.textContent = "";
  }
}