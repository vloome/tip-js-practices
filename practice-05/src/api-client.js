/** Ошибка, нормализованная HTTP-клиентом ПР5. */
export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
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

  if (
    !["http:", "https:"].includes(parsed.protocol)
    || !parsed.hostname
    || parsed.search !== ""
    || parsed.hash !== ""
    || baseUrl.includes("?")
    || baseUrl.includes("#")
  ) {
    throw new TypeError("baseUrl должен быть HTTP(S)-адресом без query и hash.");
  }

  return baseUrl.replace(/\/+$/, "");
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Собирает URL, корректно кодируя параметры запроса. */
export function buildUrl(baseUrl, path, query = {}) {
  const normalizedBase = validateBaseUrl(baseUrl);

  if (
    typeof path !== "string"
    || path.trim() === ""
    || path.includes("?")
    || path.includes("#")
    || /^[a-z][a-z\d+.-]*:/i.test(path)
    || path.startsWith("//")
  ) {
    throw new TypeError("path должен быть непустым относительным путём без query и hash.");
  }
  if (!isPlainObject(query)) {
    throw new TypeError("query должен быть обычным объектом.");
  }

  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(`${normalizedBase}/${normalizedPath}`);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new TypeError(`Значение query-параметра ${key} должно быть строкой, числом или boolean.`);
    }
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function makeAbortError(kind, url, cause) {
  if (kind === "timeout") {
    return new ApiError("Превышено время ожидания HTTP-запроса.", {
      kind,
      url,
      cause,
    });
  }
  return new ApiError("HTTP-запрос был отменён вызывающим кодом.", {
    kind: "aborted",
    url,
    cause,
  });
}

function isAbortSignal(value) {
  return Boolean(
    value
    && typeof value === "object"
    && typeof value.aborted === "boolean"
    && typeof value.addEventListener === "function"
    && typeof value.removeEventListener === "function",
  );
}

/** Создаёт общий HTTP JSON-клиент, который не зависит от предметной области. */
export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 2000,
} = {}) {
  const normalizedBase = validateBaseUrl(baseUrl);

  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией.");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs должен быть положительным целым числом.");
  }

  return {
    async requestJson(path, {
      query = {},
      signal,
      timeoutMs: requestTimeoutMs = timeoutMs,
    } = {}) {
      if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
        throw new TypeError("timeoutMs должен быть положительным целым числом.");
      }
      if (signal !== undefined && !isAbortSignal(signal)) {
        throw new TypeError("signal должен быть объектом AbortSignal.");
      }

      const url = buildUrl(normalizedBase, path, query);
      const controller = new AbortController();
      let abortKind = null;
      let timeoutId;

      const onExternalAbort = () => {
        if (!controller.signal.aborted) {
          abortKind = "aborted";
          controller.abort(signal.reason);
        }
      };

      if (signal?.aborted) {
        abortKind = "aborted";
        controller.abort(signal.reason);
      } else if (signal) {
        signal.addEventListener("abort", onExternalAbort, { once: true });
      }

      timeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
          abortKind = "timeout";
          controller.abort(new DOMException(
            "Превышено время ожидания HTTP-запроса.",
            "TimeoutError",
          ));
        }
      }, requestTimeoutMs);

      const throwIfAborted = (cause = controller.signal.reason) => {
        if (abortKind !== null) {
          throw makeAbortError(abortKind, url, cause);
        }
      };

      try {
        throwIfAborted();

        let response;
        try {
          response = await fetchFn(url, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
        } catch (cause) {
          if (abortKind !== null) throw makeAbortError(abortKind, url, cause);
          throw new ApiError("Не удалось получить ответ от сервера.", {
            kind: "network",
            url,
            cause,
          });
        }

        throwIfAborted();

        if (!(response instanceof Response)) {
          const cause = new TypeError("fetchFn должен возвращать объект Response.");
          throw new ApiError("Получен ответ неизвестного формата.", {
            kind: "invalid-response",
            url,
            cause,
          });
        }

        if (!response.ok) {
          const contentType = response.headers.get("content-type") ?? "";
          let errorPayload = null;

          if (contentType.toLowerCase().includes("application/json")) {
            try {
              errorPayload = await response.json();
            } catch {
              // При HTTP-ошибке статус важнее повреждённого или отсутствующего JSON.
            }
          }

          throw new ApiError(
            typeof errorPayload?.error?.message === "string" && errorPayload.error.message.trim()
              ? errorPayload.error.message
              : `HTTP ${response.status}`,
            {
              kind: "http",
              status: response.status,
              code: typeof errorPayload?.error?.code === "string"
                ? errorPayload.error.code
                : null,
              details: errorPayload?.error?.details ?? null,
              url,
            },
          );
        }

        if (response.status === 204) return null;

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("application/json")) {
          throw new ApiError("Ожидался JSON-ответ от сервера.", {
            kind: "invalid-response",
            url,
          });
        }

        try {
          return await response.json();
        } catch (cause) {
          if (abortKind !== null) throw makeAbortError(abortKind, url, cause);
          throw new ApiError("Сервер вернул повреждённый JSON.", {
            kind: "invalid-response",
            url,
            cause,
          });
        }
      } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener("abort", onExternalAbort);
      }
    },
  };
}
