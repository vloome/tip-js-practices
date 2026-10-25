"use strict";

/**
 * 1. Создание новой задачи с валидацией полей
 */
export function createTask(id, title, priority = "medium") {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, error: "Некорректный id: должен быть положительным безопасным целым числом" };
  }
  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }
  
  const trimmedTitle = title.trim();
  if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
    return { ok: false, error: "Длина названия должна быть от 1 до 100 символов" };
  }
  
  if (!["low", "medium", "high"].includes(priority)) {
    return { ok: false, error: "Некорректный приоритет: допустимы low, medium, high" };
  }

  return {
    ok: true,
    task: {
      id,
      title: trimmedTitle,
      completed: false,
      priority,
    },
  };
}

/**
 * 2. Поиск задачи по идентификатору
 */
export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

/**
 * 3. Получение массива невыполненных задач
 */
export function getPendingTasks(tasks) {
  return tasks.filter((task) => !task.completed);
}

/**
 * 4. Получение массива названий всех задач
 */
export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

/**
 * 5. Расчёт сводной статистики по списку задач
 */
export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return {
    total,
    completed,
    pending,
    progress,
  };
}

/**
 * 6. Добавление задачи в конец нового массива
 */
export function addTask(tasks, id, title, priority = "medium") {
  if (tasks.some((task) => task.id === id)) {
    return { ok: false, error: "Задача с таким id уже существует" };
  }

  const creationResult = createTask(id, title, priority);
  if (!creationResult.ok) {
    return creationResult;
  }

  return {
    ok: true,
    tasks: [...tasks, creationResult.task],
  };
}

/**
 * 7. Изменение статуса выполнения задачи
 */
export function setTaskCompleted(tasks, id, completed) {
  if (typeof completed !== "boolean") {
    return { ok: false, error: "Статус выполнения (completed) должен быть булевым значением" };
  }

  const taskExists = tasks.some((task) => task.id === id);
  if (!taskExists) {
    return { ok: false, error: "Задача с указанным id не найдена" };
  }

  const updatedTasks = tasks.map((task) => {
    if (task.id === id) {
      return { ...task, completed };
    }
    return task;
  });

  return {
    ok: true,
    tasks: updatedTasks,
  };
}

/**
 * 8. Переименование задачи
 */
export function renameTask(tasks, id, title) {
  if (typeof title !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }

  const trimmedTitle = title.trim();
  if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
    return { ok: false, error: "Длина нового названия должна быть от 1 до 100 символов" };
  }

  const taskExists = tasks.some((task) => task.id === id);
  if (!taskExists) {
    return { ok: false, error: "Задача с указанным id не найдена" };
  }

  const updatedTasks = tasks.map((task) => {
    if (task.id === id) {
      return { ...task, title: trimmedTitle };
    }
    return task;
  });

  return {
    ok: true,
    tasks: updatedTasks,
  };
}

/**
 * 9. Удаление задачи по идентификатору
 */
export function removeTask(tasks, id) {
  const taskExists = tasks.some((task) => task.id === id);
  if (!taskExists) {
    return { ok: false, error: "Задача с указанным id не найдена" };
  }

  const filteredTasks = tasks.filter((task) => task.id !== id);

  return {
    ok: true,
    tasks: filteredTasks,
  };
}

const demoTasks = [
  { id: 1, title: 'Изучить основы JavaScript', completed: true, priority: 'high' },
  { id: 4, title: 'Написать модульные тесты', completed: false, priority: 'medium' },
  { id: 7, title: 'Настроить сборку проекта', completed: false, priority: 'low' },
  { id: 10, title: 'Подготовить отчёт', completed: true, priority: 'high' }
];

console.log("--- Проверка изменения статуса задачи ---");
console.log(setTaskCompleted(demoTasks, 777, true));