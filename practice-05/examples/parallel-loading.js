// Сравнение двух запросов с одинаковой задержкой: последовательно и через Promise.all.
const baseUrl = (process.env.API_URL ?? "http://127.0.0.1:5505/api").replace(/\/+$/, "");
const delayMs = 150;
const repetitions = 3;

async function requestDelay() {
  const response = await fetch(`${baseUrl}/debug/delay?ms=${delayMs}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} для /debug/delay`);
  }
  await response.json();
}

async function measure(action) {
  const start = performance.now();
  await action();
  return Number((performance.now() - start).toFixed(1));
}

async function sequential() {
  await requestDelay();
  await requestDelay();
}

async function parallel() {
  await Promise.all([requestDelay(), requestDelay()]);
}

try {
  const results = [];
  for (let index = 1; index <= repetitions; index += 1) {
    results.push({
      запуск: index,
      последовательные_мс: await measure(sequential),
      Promise_all_мс: await measure(parallel),
    });
  }

  console.log(`Две операции /debug/delay с задержкой ${delayMs} мс каждая`);
  console.table(results);
  console.log("Значения зависят от среды; в отчёт перенесите именно свой вывод.");
} catch (error) {
  console.error(`Не удалось провести измерение: ${error.message}`);
  process.exitCode = 1;
}
