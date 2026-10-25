import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isTask(value) {
  return Boolean(
    isPlainObject(value)
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

function isCategory(value) {
  return Boolean(
    isPlainObject(value)
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

function validateCollection(payload, itemValidator, label) {
  if (
    !isPlainObject(payload)
    || !Array.isArray(payload.data)
    || !isPlainObject(payload.meta)
    || !Number.isSafeInteger(payload.meta.total)
    || payload.meta.total !== payload.data.length
  ) {
    throw invalidResponse(`Ответ API содержит некорректную коллекцию ${label} или meta.total.`);
  }

  const seenIds = new Set();
  for (const item of payload.data) {
    if (!itemValidator(item)) {
      throw invalidResponse(`Ответ API содержит некорректный элемент коллекции ${label}.`);
    }
    if (seenIds.has(item.id)) {
      throw invalidResponse(`Ответ API содержит повторяющийся id в коллекции ${label}.`);
    }
    seenIds.add(item.id);
  }

  return { data: payload.data, meta: payload.meta };
}

function normalizeFilters(filters = {}) {
  if (!isPlainObject(filters)) {
    throw new TypeError("Фильтры должны быть обычным объектом.");
  }

  for (const key of Object.keys(filters)) {
    if (!ALLOWED_FILTERS.has(key)) {
      throw new TypeError(`Неизвестный фильтр: ${key}.`);
    }
  }

  const normalized = {};

  if (Object.hasOwn(filters, "completed")) {
    if (typeof filters.completed !== "boolean") {
      throw new TypeError("Фильтр completed должен быть boolean.");
    }
    normalized.completed = filters.completed;
  }

  if (Object.hasOwn(filters, "priority")) {
    if (!ALLOWED_PRIORITIES.has(filters.priority)) {
      throw new TypeError("Фильтр priority должен быть low, medium или high.");
    }
    normalized.priority = filters.priority;
  }

  if (Object.hasOwn(filters, "categoryId")) {
    if (!isPositiveSafeInteger(filters.categoryId)) {
      throw new TypeError("Фильтр categoryId должен быть положительным целым числом.");
    }
    normalized.categoryId = filters.categoryId;
  }

  if (Object.hasOwn(filters, "q")) {
    if (typeof filters.q !== "string" || filters.q.trim().length > 100) {
      throw new TypeError("Фильтр q должен быть строкой длиной не более 100 символов.");
    }
    normalized.q = filters.q.trim();
  }

  return normalized;
}

/** Предметный клиент знает API задач и категорий, но не детали fetch. */
export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("Для createTaskApi нужен клиент с методом requestJson.");
  }

  async function getTasks(filters = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query });
    const collection = validateCollection(payload, isTask, "задач");

    return {
      tasks: collection.data,
      meta: collection.meta,
    };
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id задачи должен быть положительным безопасным целым числом.");
    }

    const payload = await client.requestJson(`/tasks/${id}`);
    if (!isPlainObject(payload) || !isTask(payload.data)) {
      throw invalidResponse("Ответ API содержит некорректную задачу.");
    }
    return payload.data;
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    const collection = validateCollection(payload, isCategory, "категорий");
    return collection.data;
  }

  async function loadInitialData(filters = {}) {
    // Оба независимых запроса запускаются до ожидания общего результата.
    const tasksPromise = getTasks(filters);
    const categoriesPromise = getCategories();
    const [taskResult, categories] = await Promise.all([
      tasksPromise,
      categoriesPromise,
    ]);

    return {
      tasks: taskResult.tasks,
      categories,
      meta: taskResult.meta,
    };
  }

  return { getTasks, getTaskById, getCategories, loadInitialData };
}
