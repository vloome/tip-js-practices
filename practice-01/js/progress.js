"use strict";

const totalTasks = 12;
const completedTasks = 5;

// 1. Проверка на то, что оба значения являются конечными числами
if (!Number.isFinite(totalTasks) || !Number.isFinite(completedTasks)) {
  console.log("Ошибка: входные данные должны быть числами");
} 
// 2. Проверка на целочисленность (исключает строки и дробные числа)
else if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks)) {
  console.log("Ошибка: количество задач должно быть целым числом");
} 
// 3. Проверка допустимых диапазонов (0 <= totalTasks <= 1000 и 0 <= completedTasks <= totalTasks)
else if (totalTasks < 0 || totalTasks > 1000 || completedTasks < 0 || completedTasks > totalTasks) {
  console.log("Ошибка: количество задач выходит за допустимые пределы или выполнено больше, чем существует");
} 
// 4. Обработка особого случая: задач вообще нет
else if (totalTasks === 0 && completedTasks === 0) {
  console.log("Задач пока нет");
} 
// 5. Основной расчет и вывод для корректных данных
else {
  const remainingTasks = totalTasks - completedTasks;
  const progressPercent = (completedTasks / totalTasks * 100).toFixed(1);

  let status = "В работе";
  if (completedTasks === 0) {
    status = "Не начато";
  } else if (completedTasks === totalTasks) {
    status = "Завершено";
  }

  console.log(`Всего задач: ${totalTasks}`);
  console.log(`Выполнено: ${completedTasks}`);
  console.log(`Осталось: ${remainingTasks}`);
  console.log(`Прогресс: ${progressPercent}%`);
  console.log(`Статус: ${status}`);
}