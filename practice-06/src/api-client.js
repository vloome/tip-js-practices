/** Нормализованная ошибка HTTP-клиента. */
export class ApiError extends Error {
  constructor(message, { kind, status = null, code = null, details = null, url = null, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

function validateBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new TypeError("baseUrl должен быть абсолютным URL.");
  }
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new TypeError("baseUrl должен быть абсолютным URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)
      || !parsed.hostname || parsed.search || parsed.hash
      || baseUrl.includes("?") || baseUrl.includes("#")) {
    throw new TypeError("baseUrl должен быть HTTP(S)-адресом без query и hash.");
  }
  return baseUrl.replace(/\/+$/, "");
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Собирает URL, не изменяя входной объект фильтров. */
export function buildUrl(baseUrl, path, query = {}) {
  const normalizedBase = validateBaseUrl(baseUrl);
  if (typeof path !== "string" || path.trim() === "" || path.includes("?") || path.includes("#")
      || /^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//")) {
    throw new TypeError("path должен быть относительным путём без query и hash.");
  }
  if (!isPlainObject(query)) throw new TypeError("query должен быть обычным объектом.");

  const url = new URL(`${normalizedBase}/${path.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new TypeError(`Недопустимое значение query-параметра ${key}.`);
    }
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function isAbortSignal(value) {
  return Boolean(value && typeof value === "object"
    && typeof value.aborted === "boolean"
    && typeof value.addEventListener === "function"
    && typeof value.removeEventListener === "function");
}

function abortError(kind, url, cause) {
  return new ApiError(
    kind === "timeout" ? "Превышено время ожидания HTTP-запроса." : "HTTP-запрос был отменён вызывающим кодом.",
    { kind: kind === "timeout" ? "timeout" : "aborted", url, cause },
  );
}

function validResponse(value) {
  return Boolean(value && typeof value === "object"
    && typeof value.status === "number"
    && value.headers && typeof value.headers.get === "function"
    && typeof value.json === "function"
    && typeof value.text === "function"
    && typeof value.ok === "boolean");
}

/** Создаёт общий клиент GET/POST/PATCH/DELETE, не зависящий от предметной области. */
export function createApiClient({ baseUrl, fetchFn = globalThis.fetch, timeoutMs = 3000 } = {}) {
  const normalizedBase = validateBaseUrl(baseUrl);
  if (typeof fetchFn !== "function") throw new TypeError("fetchFn должен быть функцией.");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs должен быть положительным целым числом.");
  }

  return {
    async requestJson(path, { method = "GET", query = {}, body, signal, timeoutMs: requestTimeout = timeoutMs } = {}) {
      const normalizedMethod = typeof method === "string" ? method.toUpperCase() : "";
      if (!["GET", "POST", "PATCH", "DELETE"].includes(normalizedMethod)) {
        throw new TypeError("Допустимые HTTP-методы: GET, POST, PATCH и DELETE.");
      }
      if (normalizedMethod === "GET" && body !== undefined) {
        throw new TypeError("GET-запрос не может содержать body.");
      }
      if (body !== undefined && normalizedMethod === "DELETE") {
        // DELETE с телом контрактом этой практики не предусмотрен.
        throw new TypeError("DELETE-запрос не может содержать body.");
      }
      if (!Number.isSafeInteger(requestTimeout) || requestTimeout <= 0) {
        throw new TypeError("timeoutMs должен быть положительным целым числом.");
      }
      if (signal !== undefined && !isAbortSignal(signal)) {
        throw new TypeError("signal должен быть объектом AbortSignal.");
      }
      const url = buildUrl(normalizedBase, path, query);
      const controller = new AbortController();
      let abortKind = null;
      let timeoutId;
      let abortReject;
      const abortPromise = new Promise((_resolve, reject) => { abortReject = reject; });
      // Даже при сигнале, отменённом до fetch, отклонение не должно стать unhandled rejection.
      abortPromise.catch(() => {});
      // На случай отмены уже после создания запроса гонка завершается даже если тестовый
      // fetchFn не умеет реагировать на AbortSignal.
      const abortListener = () => {
        const cause = controller.signal.reason;
        abortReject(abortError(abortKind ?? "aborted", url, cause));
      };
      controller.signal.addEventListener("abort", abortListener, { once: true });

      const onExternalAbort = () => {
        if (controller.signal.aborted) return;
        abortKind = "aborted";
        controller.abort(signal?.reason);
      };
      if (signal?.aborted) {
        abortKind = "aborted";
        controller.abort(signal.reason);
      } else if (signal) {
        signal.addEventListener("abort", onExternalAbort, { once: true });
      }

      const headers = { Accept: "application/json" };
      const options = { method: normalizedMethod, headers, signal: controller.signal };
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }

      const throwIfAborted = () => {
        if (abortKind) throw abortError(abortKind, url, controller.signal.reason);
      };

      try {
        throwIfAborted();
        timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            abortKind = "timeout";
            controller.abort(new DOMException("Превышено время ожидания HTTP-запроса.", "TimeoutError"));
          }
        }, requestTimeout);

        let response;
        try {
          response = await Promise.race([Promise.resolve().then(() => fetchFn(url, options)), abortPromise]);
        } catch (cause) {
          if (cause instanceof ApiError) throw cause;
          if (abortKind) throw abortError(abortKind, url, cause);
          throw new ApiError("Не удалось получить ответ от сервера.", { kind: "network", url, cause });
        }
        throwIfAborted();

        if (!validResponse(response)) {
          throw new ApiError("Получен ответ неизвестного формата.", {
            kind: "invalid-response", url, cause: new TypeError("fetchFn должен возвращать Response-подобный объект."),
          });
        }

        // Сначала классифицируем HTTP-ошибку: не-JSON тело не должно скрывать статус 4xx/5xx.
        if (!response.ok) {
          let payload = null;
          const contentType = response.headers.get("content-type") ?? "";
          if (contentType.toLowerCase().includes("application/json")) {
            try { payload = await response.json(); } catch { /* статус важнее ошибочного тела */ }
          }
          throw new ApiError(
            typeof payload?.error?.message === "string" && payload.error.message.trim()
              ? payload.error.message : `HTTP ${response.status}`,
            {
              kind: "http", status: response.status,
              code: typeof payload?.error?.code === "string" ? payload.error.code : null,
              details: payload?.error?.details ?? null,
              url,
            },
          );
        }

        if (response.status === 204) return null;
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("application/json")) {
          throw new ApiError("Ожидался JSON-ответ от сервера.", { kind: "invalid-response", url });
        }
        try {
          return await response.json();
        } catch (cause) {
          if (cause instanceof ApiError) throw cause;
          throw new ApiError("Сервер вернул повреждённый JSON.", { kind: "invalid-response", url, cause });
        }
      } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener("abort", onExternalAbort);
        controller.signal.removeEventListener("abort", abortListener);
      }
    },
  };
}
