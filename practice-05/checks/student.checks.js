// Три дополнительные проверки для индивидуального отчёта ПР5.
import assert from "node:assert/strict";
import { ApiError, buildUrl, createApiClient } from "../src/api-client.js";

let passed = 0;
let failed = 0;

async function check(name, action) {
  try {
    await action();
    passed += 1;
    console.log(`OK: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(error.stack ?? error.message);
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function expectApiError(action, kind) {
  let caught;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof ApiError, "Ожидался ApiError");
  assert.equal(caught.kind, kind);
  return caught;
}

await check("01. собственная комбинация query-параметров кодируется корректно", () => {
  const query = Object.freeze({
    completed: false,
    priority: "medium",
    q: "C++ / API & тест",
  });
  const url = new URL(buildUrl("http://localhost:5505/api/", "/tasks", query));
  assert.equal(url.pathname, "/api/tasks");
  assert.equal(url.searchParams.get("completed"), "false");
  assert.equal(url.searchParams.get("priority"), "medium");
  assert.equal(url.searchParams.get("q"), "C++ / API & тест");
  assert.deepEqual(query, {
    completed: false,
    priority: "medium",
    q: "C++ / API & тест",
  });
});

await check("02. HTTP 429 сохраняется как HTTP-ошибка с кодом API", async () => {
  const client = createApiClient({
    baseUrl: "https://example.test/api",
    fetchFn: async () => jsonResponse({
      error: {
        code: "RATE_LIMITED",
        message: "Слишком много запросов.",
        details: { retryAfterSeconds: 5 },
      },
    }, 429),
  });

  const error = await expectApiError(() => client.requestJson("/tasks"), "http");
  assert.equal(error.status, 429);
  assert.equal(error.code, "RATE_LIMITED");
  assert.deepEqual(error.details, { retryAfterSeconds: 5 });
});

await check("03. заранее отменённый сигнал не запускает fetch", async () => {
  let fetchCalls = 0;
  const controller = new AbortController();
  controller.abort();
  const client = createApiClient({
    baseUrl: "https://example.test/api",
    fetchFn: async () => {
      fetchCalls += 1;
      return jsonResponse({ data: [] });
    },
    timeoutMs: 500,
  });

  const error = await expectApiError(
    () => client.requestJson("/tasks", { signal: controller.signal }),
    "aborted",
  );
  assert.equal(fetchCalls, 0);
  assert.equal(error.url, "https://example.test/api/tasks");
});

console.log(`\nИтог собственных проверок: успешно ${passed}, ошибок ${failed}.`);
if (failed > 0) process.exitCode = 1;
