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
export function isTask(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string" && value.title.trim().length >= 1 && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId));
}
export function isCategory(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string" && value.name.trim().length >= 1 && value.name.trim().length <= 100);
}

function validateCollection(payload, itemValidator, label) {
  if (!isPlainObject(payload) || !Array.isArray(payload.data) || !isPlainObject(payload.meta)
      || !Number.isSafeInteger(payload.meta.total) || payload.meta.total < 0
      || payload.meta.total !== payload.data.length) {
    throw invalidResponse(`Ответ API содержит некорректную коллекцию ${label} или meta.total.`);
  }
  const ids = new Set();
  for (const value of payload.data) {
    if (!itemValidator(value)) throw invalidResponse(`Ответ API содержит некорректный элемент коллекции ${label}.`);
    if (ids.has(value.id)) throw invalidResponse(`Ответ API содержит повторяющийся id в коллекции ${label}.`);
    ids.add(value.id);
  }
  return { data: payload.data, meta: payload.meta };
}
function normalizeFilters(filters = {}) {
  if (!isPlainObject(filters)) throw new TypeError("Фильтры должны быть обычным объектом.");
  for (const key of Object.keys(filters)) {
    if (!ALLOWED_FILTERS.has(key)) throw new TypeError(`Неизвестный фильтр: ${key}.`);
  }
  const normalized = {};
  if (Object.hasOwn(filters, "completed")) {
    if (typeof filters.completed !== "boolean") throw new TypeError("Фильтр completed должен быть boolean.");
    normalized.completed = filters.completed;
  }
  if (Object.hasOwn(filters, "priority")) {
    if (!ALLOWED_PRIORITIES.has(filters.priority)) throw new TypeError("Фильтр priority должен быть low, medium или high.");
    normalized.priority = filters.priority;
  }
  if (Object.hasOwn(filters, "categoryId")) {
    if (!isPositiveSafeInteger(filters.categoryId)) throw new TypeError("Фильтр categoryId должен быть положительным целым числом.");
    normalized.categoryId = filters.categoryId;
  }
  if (Object.hasOwn(filters, "q")) {
    if (typeof filters.q !== "string" || filters.q.trim().length > 100) throw new TypeError("Фильтр q должен быть строкой длиной не более 100 символов.");
    normalized.q = filters.q.trim();
  }
  return normalized;
}
function normalizeId(id) {
  if (!isPositiveSafeInteger(id)) throw new TypeError("id задачи должен быть положительным безопасным целым числом.");
  return id;
}
function getSignalOptions(options = {}) {
  if (options == null || typeof options !== "object" || Array.isArray(options)) throw new TypeError("options должен быть объектом.");
  return options.signal === undefined ? {} : { signal: options.signal };
}
function validateSingleTask(payload) {
  if (!isPlainObject(payload) || !isTask(payload.data)) throw invalidResponse("Ответ API содержит некорректную задачу.");
  return payload.data;
}
function normalizeDraft(draft, { allowCompleted = false } = {}) {
  if (!isPlainObject(draft)) throw new TypeError("Данные задачи должны быть обычным объектом.");
  const allowed = allowCompleted ? new Set(["title", "priority", "categoryId", "completed"]) : new Set(["title", "priority", "categoryId"]);
  const result = {};
  for (const [key, value] of Object.entries(draft)) {
    if (!allowed.has(key)) throw new TypeError(`Поле ${key} нельзя передавать в этой операции.`);
    result[key] = value;
  }
  if (Object.hasOwn(result, "title") && typeof result.title === "string") result.title = result.title.trim();
  if (Object.hasOwn(result, "categoryId") && typeof result.categoryId === "string" && result.categoryId.trim() !== "") {
    result.categoryId = Number(result.categoryId);
  }
  return result;
}

/** Предметный клиент: все HTTP-операции задач собраны в одном модуле. */
export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") throw new TypeError("Для createTaskApi нужен клиент с методом requestJson.");

  async function getTasks(filters = {}, options = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query, ...getSignalOptions(options) });
    const collection = validateCollection(payload, isTask, "задач");
    return { tasks: collection.data, meta: collection.meta };
  }
  async function getTaskById(id, options = {}) {
    normalizeId(id);
    const payload = await client.requestJson(`/tasks/${id}`, getSignalOptions(options));
    return validateSingleTask(payload);
  }
  async function getCategories(options = {}) {
    const payload = await client.requestJson("/categories", getSignalOptions(options));
    return validateCollection(payload, isCategory, "категорий").data;
  }
  async function loadInitialData(filters = {}, options = {}) {
    const [tasksResult, categories] = await Promise.all([
      getTasks(filters, options),
      getCategories(options),
    ]);
    return { tasks: tasksResult.tasks, categories, meta: tasksResult.meta };
  }
  async function createTask(draft, options = {}) {
    const body = normalizeDraft(draft);
    const payload = await client.requestJson("/tasks", { method: "POST", body, ...getSignalOptions(options) });
    return validateSingleTask(payload);
  }
  async function updateTask(id, changes, options = {}) {
    normalizeId(id);
    const body = normalizeDraft(changes, { allowCompleted: true });
    if (Object.keys(body).length === 0) throw new TypeError("Необходимо передать хотя бы одно изменяемое поле.");
    const payload = await client.requestJson(`/tasks/${id}`, { method: "PATCH", body, ...getSignalOptions(options) });
    return validateSingleTask(payload);
  }
  async function setTaskCompleted(id, completed, options = {}) {
    normalizeId(id);
    if (typeof completed !== "boolean") throw new TypeError("completed должен быть boolean.");
    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "PATCH", body: { completed }, ...getSignalOptions(options),
    });
    return validateSingleTask(payload);
  }
  async function deleteTask(id, options = {}) {
    normalizeId(id);
    const result = await client.requestJson(`/tasks/${id}`, { method: "DELETE", ...getSignalOptions(options) });
    if (result !== null) throw invalidResponse("DELETE должен возвращать ответ 204 без тела.");
    return null;
  }
  async function resetDemoData(options = {}) {
    const payload = await client.requestJson("/debug/reset", { method: "POST", ...getSignalOptions(options) });
    if (!isPlainObject(payload) || !isPlainObject(payload.data)
        || payload.data.reset !== true || !Number.isSafeInteger(payload.data.total) || payload.data.total < 0) {
      throw invalidResponse("Ответ сброса данных имеет неверный формат.");
    }
    return payload.data;
  }
  return { getTasks, getTaskById, getCategories, loadInitialData, createTask, updateTask, setTaskCompleted, deleteTask, resetDemoData };
}
