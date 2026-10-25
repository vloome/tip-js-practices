import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "aborted") return "";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

const API_METHODS = ["loadInitialData", "getTasks", "createTask", "updateTask", "setTaskCompleted", "deleteTask", "resetDemoData"];
const VIEW_METHODS = ["setListState", "setTasks", "setCategories", "setTotal", "setFormTask", "showFormErrors", "setMutationPending", "notify"];
function cloneFilters(filters) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) return {};
  return { ...filters };
}
function isAborted(error, controller) {
  return Boolean((controller?.signal.aborted) || (error instanceof ApiError && error.kind === "aborted"));
}

/** Контроллер хранит состояние и сценарии, но не зависит от document или конкретного DOM. */
export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  if (!api || !API_METHODS.every((name) => typeof api[name] === "function")
      || !view || !VIEW_METHODS.every((name) => typeof view[name] === "function")
      || typeof validateDraft !== "function") {
    throw new TypeError("Для контроллера нужны полный API, view и функция проверки формы.");
  }

  let tasks = [];
  let categories = [];
  let categoriesLoaded = false;
  let filters = {};
  let editingId = null;
  let activeLoadController = null;
  let requestSequence = 0;
  let destroyed = false;
  let mutationRunning = false;

  function cancelEditing() {
    editingId = null;
    view.setFormTask(null);
    view.showFormErrors({});
  }

  async function loadCurrent({ forceInitial = !categoriesLoaded } = {}) {
    destroyed = false;
    if (activeLoadController) activeLoadController.abort();
    const loadController = new AbortController();
    activeLoadController = loadController;
    const sequence = ++requestSequence;
    const currentFilters = cloneFilters(filters);
    view.setListState("loading");

    try {
      const result = forceInitial
        ? await api.loadInitialData(currentFilters, { signal: loadController.signal })
        : await api.getTasks(currentFilters, { signal: loadController.signal });
      if (destroyed || sequence !== requestSequence || loadController.signal.aborted) return;
      if (!result || !Array.isArray(result.tasks) || !Array.isArray(result.categories ?? categories)
          || !result.meta || typeof result.meta !== "object") {
        throw new ApiError("Ответ предметного API имеет неверный формат.", { kind: "invalid-response" });
      }
      tasks = result.tasks;
      if (Array.isArray(result.categories)) {
        categories = result.categories;
        categoriesLoaded = true;
        view.setCategories(categories);
      }
      view.setTasks(tasks, categories);
      const total = Number.isSafeInteger(result.meta.total) ? result.meta.total : tasks.length;
      view.setTotal(total);
      view.setListState(tasks.length > 0 ? "ready" : "empty");
    } catch (error) {
      if (destroyed || sequence !== requestSequence || isAborted(error, loadController)) return;
      view.setListState("error", messageForError(error));
    } finally {
      if (sequence === requestSequence && activeLoadController === loadController) activeLoadController = null;
    }
  }

  async function reloadAfterMutation() {
    await loadCurrent({ forceInitial: !categoriesLoaded });
  }

  async function runMutation(action, successMessage, { afterSuccess } = {}) {
    if (mutationRunning) return;
    mutationRunning = true;
    view.setMutationPending(true);
    try {
      await action();
      if (afterSuccess) afterSuccess();
      view.notify(successMessage, "success");
      await reloadAfterMutation();
    } catch (error) {
      view.notify(messageForError(error), "error");
    } finally {
      mutationRunning = false;
      view.setMutationPending(false);
    }
  }

  return {
    async start(initialFilters = {}) {
      filters = cloneFilters(initialFilters);
      view.setFilters?.(filters);
      return loadCurrent({ forceInitial: true });
    },
    async applyFilters(nextFilters = {}) {
      filters = cloneFilters(nextFilters);
      view.setFilters?.(filters);
      return loadCurrent({ forceInitial: !categoriesLoaded });
    },
    async refresh() {
      return loadCurrent({ forceInitial: !categoriesLoaded });
    },
    async submit(draft) {
      const result = validateDraft(draft, categories);
      view.showFormErrors(result?.errors ?? {});
      if (!result || result.valid !== true || !result.value) return;
      const value = result.value;
      if (editingId !== null) {
        const id = editingId;
        await runMutation(
          () => api.updateTask(id, value),
          "Изменения задачи сохранены.",
          { afterSuccess: cancelEditing },
        );
      } else {
        await runMutation(
          () => api.createTask(value),
          "Задача создана.",
          { afterSuccess: cancelEditing },
        );
      }
    },
    beginEdit(id) {
      const task = tasks.find((item) => item.id === id);
      if (!task) {
        view.notify("Задача отсутствует в текущем списке. Обновите данные.", "error");
        return;
      }
      editingId = id;
      view.showFormErrors({});
      view.setFormTask(task);
    },
    cancelEdit() {
      cancelEditing();
      view.notify("Редактирование отменено.");
    },
    async toggleTask(id) {
      const task = tasks.find((item) => item.id === id);
      if (!task) {
        view.notify("Задача не найдена в текущем списке.", "error");
        return;
      }
      await runMutation(
        () => api.setTaskCompleted(id, !task.completed),
        !task.completed ? "Задача отмечена выполненной." : "Задача возвращена в работу.",
      );
    },
    async deleteTask(id) {
      await runMutation(
        () => api.deleteTask(id),
        "Задача удалена.",
        { afterSuccess: () => { if (editingId === id) cancelEditing(); } },
      );
    },
    async resetData() {
      await runMutation(() => api.resetDemoData(), "Учебные данные восстановлены.");
    },
    destroy() {
      destroyed = true;
      requestSequence += 1;
      activeLoadController?.abort();
      activeLoadController = null;
    },
  };
}
