"use strict";

const totalTasks = 12;
const completedTasks = 5;
const dailyLimit = 3;

// 1. Проверка на числовые типы
if (!Number.isFinite(totalTasks) || !Number.isFinite(completedTasks) || !Number.isFinite(dailyLimit)) {
  console.log("Ошибка: входные данные должны быть числами");
} 
// 2. Проверка на целочисленность (исключает строки и дробные числа)
else if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks) || !Number.isInteger(dailyLimit)) {
  console.log("Ошибка: параметры должны быть целыми числами");
} 
// 3. Проверка границ для totalTasks и completedTasks
else if (totalTasks < 0 || totalTasks > 1000 || completedTasks < 0 || completedTasks > totalTasks) {
  console.log("Ошибка: количество задач выходит за допустимые пределы или выполнено больше, чем существует");
} 
// 4. Обязательная проверка dailyLimit (от 1 до 1000) даже при отсутствии оставшихся задач
else if (dailyLimit < 1 || dailyLimit > 1000) {
  console.log("Ошибка: дневная норма должна быть в диапазоне от 1 до 1000");
} 
// 5. Основной расчёт и цикл
else {
  let remainingTasks = totalTasks - completedTasks;
  let day = 0;

  console.log(`Осталось задач: ${remainingTasks}`);

  if (remainingTasks === 0) {
    console.log("Все задачи уже выполнены.");
    console.log("Потребуется дней: 0");
  } else {
    // Цикл выполняется, пока есть невыполненные задачи
    while (remainingTasks > 0) {
      day += 1;
      // В последний день нельзя выполнить больше задач, чем осталось, с помощью Math.min
      const tasksToday = Math.min(dailyLimit, remainingTasks);
      remainingTasks -= tasksToday;
      
      console.log(`День ${day}: выполнено ${tasksToday}, осталось ${remainingTasks}`);
    }
    
    console.log(`Потребуется дней: ${day}`);
  }
}