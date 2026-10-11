import { demoTasks, variantTasks } from "./data.js";
import { findTaskById, setTaskCompleted, removeTask } from "./task-service.js";
import { getVisibleTasks } from "./task-selectors.js";
import { renderTaskList, renderSummary, renderEmptyState } from "./task-view.js";

let currentFilter = "all";
let lastFocusedAction = null;
let lastFocusedFilter = null;

function getCurrentTasks() {
  if (window && Array.isArray(window.__TEST_TASKS__)) {
    return window.__TEST_TASKS__;
  }
  if (window && Array.isArray(window.__APP_TASKS__)) {
    return window.__APP_TASKS__;
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get("dataset") === "variant") {
    return variantTasks;
  }
  return demoTasks;
}

function updateCurrentTasks(newTasks) {
  if (window && window.__TEST_TASKS__) {
    window.__TEST_TASKS__ = newTasks;
  }
  if (window && window.__APP_TASKS__) {
    window.__APP_TASKS__ = newTasks;
  }
}

if (window && !window.__APP_TASKS__ && !window.__TEST_TASKS__) {
  window.__APP_TASKS__ = [...getCurrentTasks()];
}

function renderApp() {
  const tasks = getCurrentTasks();
  const visibleTasks = getVisibleTasks(tasks, currentFilter);

  // Сводка
  const summaryRoot = document.querySelector("#task-summary");
  renderSummary(summaryRoot, tasks, visibleTasks.length);

  // Кнопки фильтров
  const filterButtons = document.querySelectorAll("#task-filters button");
  filterButtons.forEach((btn) => {
    const filter = btn.dataset.filter;
    const isActive = filter === currentFilter;
    if (isActive) {
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
    } else {
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
    }
  });

  // Список и пустое состояние
  const taskListContainer = document.querySelector("#task-list");
  const emptyMessageEl = document.querySelector("#empty-message");

  if (taskListContainer) {
    renderTaskList(taskListContainer, visibleTasks);
  }
  if (emptyMessageEl) {
    renderEmptyState(emptyMessageEl, tasks.length, visibleTasks.length);
  }

  // Восстанавливаем фокус на основе зафиксированных действий пользователя
  if (lastFocusedAction) {
    const el = document.querySelector(`#task-list > [data-task-id="${lastFocusedAction.taskId}"] button[data-action="${lastFocusedAction.action}"]`);
    if (el) el.focus();
  } else if (lastFocusedFilter) {
    const el = document.querySelector(`#task-filters button[data-filter="${lastFocusedFilter}"]`);
    if (el) el.focus();
  }
}

// Делегирование событий на списке задач
const taskListContainer = document.querySelector("#task-list");
if (taskListContainer) {
  taskListContainer.addEventListener("click", (event) => {
    const card = event.target.closest(".task-card");
    if (!card) return;

    const rawId = card.dataset.taskId || card.dataset.id;
    const taskId = Number(rawId);

    const actionBtn = event.target.closest("button");
    if (!actionBtn) return;
    const action = actionBtn.dataset.action;

    // Сохраняем фокус для восстановления после перерисовки
    if (action) {
      lastFocusedAction = { taskId, action };
      lastFocusedFilter = null;
    }

    let tasks = getCurrentTasks();
    const opMsg = document.querySelector("#operation-message");
    if (opMsg) opMsg.textContent = "";

    if (action === "toggle") {
      const targetTask = findTaskById(tasks, taskId);
      if (!targetTask) {
        if (opMsg) opMsg.textContent = "Задача не найдена";
        return;
      }
      const res = setTaskCompleted(tasks, taskId, !targetTask.completed);
      if (res.ok) {
        updateCurrentTasks(res.tasks);
        renderApp();
      } else {
        if (opMsg) opMsg.textContent = res.error;
      }
    } else if (action === "delete") {
      const targetTask = findTaskById(tasks, taskId);
      if (!targetTask) {
        if (opMsg) opMsg.textContent = "Задача не найдена";
        return;
      }
      const res = removeTask(tasks, taskId);
      if (res.ok) {
        updateCurrentTasks(res.tasks);
        renderApp();
      } else {
        if (opMsg) opMsg.textContent = res.error;
      }
    }
  });
}

// Обработка кликов по фильтрам
const filterButtons = document.querySelectorAll("#task-filters button");
if (filterButtons.length > 0) {
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      if (filter) {
        currentFilter = filter;
        lastFocusedFilter = filter;
        lastFocusedAction = null;
        renderApp();
      }
    });
  });
}

renderApp();