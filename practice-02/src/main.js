import { demoTasks, variantTasks, variantNumber } from "./data.js";
import {
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
} from "./task-service.js";

console.log("=== 1. ОБЩИЙ ДЕМОНСТРАЦИОННЫЙ СЦЕНАРИЙ (demoTasks) ===");
let currentTasks = demoTasks;

// Вывод исходных данных
console.log("Исходные задачи:", currentTasks);
console.log("Названия задач:", getTaskTitles(currentTasks));
console.log("Невыполненные задачи:", getPendingTasks(currentTasks));

let stats = getTaskStats(currentTasks);
console.log(
  `Сводка: Всего: ${stats.total}, Выполнено: ${stats.completed}, Осталось: ${stats.pending}, Прогресс: ${stats.progress.toFixed(1)}%`
);

// Шаг 2. Добавление задачи id = 20
let result = addTask(currentTasks, 20, "Добавить проверку", "high");
if (result.ok) {
  currentTasks = result.tasks;
  console.log("-> Добавлена задача id 20. Прогресс:", getTaskStats(currentTasks).progress.toFixed(1) + "%");
}

// Шаг 3. Установка completed = true для id = 4
result = setTaskCompleted(currentTasks, 4, true);
if (result.ok) {
  currentTasks = result.tasks;
  console.log("-> Задача id 4 отмечена как выполненная. Прогресс:", getTaskStats(currentTasks).progress.toFixed(1) + "%");
}

// Шаг 4. Переименование задачи id = 10
result = renameTask(currentTasks, 10, "Подготовить инструкцию запуска");
if (result.ok) {
  currentTasks = result.tasks;
  console.log("-> Переименована задача id 10");
}

// Шаг 5. Удаление задачи id = 7
result = removeTask(currentTasks, 7);
if (result.ok) {
  currentTasks = result.tasks;
  console.log("-> Удалена задача id 7. Итоговые id:", currentTasks.map(t => t.id));
  let finalStats = getTaskStats(currentTasks);
  console.log(`Итоговая сводка общего набора: Всего: ${finalStats.total}, Прогресс: ${finalStats.progress.toFixed(1)}%`);
}

// Шаг 6. Демонстрация обработки отказа (попытка добавить существующий id)
console.log("Попытка добавить задачу с уже существующим id = 4:");
result = addTask(currentTasks, 4, "Дубликат", "medium");
if (!result.ok) {
  console.log("Отказ обработан корректно:", result.error);
}

// Шаг 7. Подтверждение неизменности demoTasks
console.log("Исходный demoTasks сохранен, длина:", demoTasks.length);


console.log(`\n=== 2. ИНДИВИДУАЛЬНЫЙ СЦЕНАРИЙ (Вариант ${variantNumber} — Подготовка семинара) ===`);
let variantCurrentTasks = variantTasks;

console.log("Исходные задачи варианта:", variantCurrentTasks);
let vStats = getTaskStats(variantCurrentTasks);
console.log(
  `Сводка варианта: Всего: ${vStats.total}, Выполнено: ${vStats.completed}, Осталось: ${vStats.pending}, Прогресс: ${vStats.progress.toFixed(1)}%`
);

// Добавление задачи id = 80 с приоритетом high (по условиям варианта 4)
result = addTask(variantCurrentTasks, 80, "Оформить раздаточный материал", "high");
if (result.ok) {
  variantCurrentTasks = result.tasks;
  console.log("-> Добавлена задача id 80 (high). Прогресс:", getTaskStats(variantCurrentTasks).progress.toFixed(1) + "%");
}

// Установка completed = true для id = 11
result = setTaskCompleted(variantCurrentTasks, 11, true);
if (result.ok) {
  variantCurrentTasks = result.tasks;
  console.log("-> Задача id 11 отмечена как выполненная. Прогресс:", getTaskStats(variantCurrentTasks).progress.toFixed(1) + "%");
}

// Переименование id = 23
result = renameTask(variantCurrentTasks, 23, "Уточнить структуру доклада");
if (result.ok) {
  variantCurrentTasks = result.tasks;
  console.log("-> Переименована задача id 23");
}

// Удаление id = 37
result = removeTask(variantCurrentTasks, 37);
if (result.ok) {
  variantCurrentTasks = result.tasks;
  console.log("-> Удалена задача id 37. Список id:", variantCurrentTasks.map(t => t.id));
}

// Повторное добавление id = 80 (показ отказа)
result = addTask(variantCurrentTasks, 80, "Повторный id", "low");
if (!result.ok) {
  console.log("-> Отказ при повторном добавлении id 80 обработан корректно:", result.error);
}

let vFinalStats = getTaskStats(variantCurrentTasks);
console.log("Итоговые задачи варианта:", variantCurrentTasks);
console.log(`Итоговая сводка варианта: Всего: ${vFinalStats.total}, Выполнено: ${vFinalStats.completed}, Прогресс: ${vFinalStats.progress.toFixed(1)}%`);
console.log("Исходный массив variantTasks сохранен, длина:", variantTasks.length);