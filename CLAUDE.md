# CLAUDE.md — Hill Racer

## Что это
2D-гонка по холмам в духе Hill Climb Racing 2. Личный проект, без рекламы и IAP.
Стек: TypeScript + Vite + Phaser 3 (рендер/сцены/ввод/звук) + planck.js (физика Box2D).
Платформа: web сейчас, Android через Capacitor позже.
План работ по фазам: `docs/PLAN.md`. ТЗ на ассеты: `docs/ASSETS.md`.

## Команды
- `npm run dev` — dev-сервер (http://localhost:5173)
- `npm test` — vitest (логика + физика в Node, без браузера)
- `npm run shot` — headless-скриншоты игры в `./shots/` (обязательно после правок геймплея/физики)
- `npm run build` — прод-сборка
- `npm run lint` / `npm run format`

## Архитектурные инварианты — НЕ НАРУШАТЬ
1. Физика в МЕТРАХ (planck/Box2D). Конверсия в пиксели только в `src/render/`: `PX_PER_M = 50` из `config.ts`.
2. Fixed timestep 1/60 с аккумулятором. Никакой физики внутри render loop.
3. `src/core/**` не импортирует Phaser. Генерация рельефа, топливо, флипы, апгрейды, сейвы — чистые модули, тестируемые в Node через vitest.
4. Детерминизм: одинаковый seed ⇒ одинаковый рельеф и расстановка объектов. Есть тест — не ломать.
5. Все числа физики/баланса только в `src/data/*.ts` (vehicles, upgrades, stages, rewards). Хардкод чисел в физике запрещён.
6. Сейвы через интерфейс `SaveStorage` (`src/core/save/`), реализация localStorage; схема имеет поле `version`.

## Структура
- `src/scenes/` — Boot, Preload, Game, Hud, Garage, Results
- `src/core/physics/` — мир, машина (WheelJoint), тело рельефа
- `src/core/terrain/` — noise, generator, chunks
- `src/core/gameplay/` — run (state machine), fuel, flips, score, pickups
- `src/data/` — vehicles, upgrades, stages, rewards
- `src/render/` — carView, terrainView, parallax, particles
- `public/assets/` — по именам из `docs/ASSETS.md`

## Отладка через URL-параметры
`?seed=42` — фиксированный seed · `?stage=desert` — этап · `?auto=gas` — автогаз (для скриншотов) · `?debug=1` — physics debug draw.

## Правила работы
- Работаем строго по фазам из `docs/PLAN.md`: одна фаза = одна задача. Сначала краткий план изменений по файлам, потом код.
- Definition of Done фазы: критерии приёмки выполнены, `npm test` зелёный, `npm run shot` приложен, предложено осмысленное commit message.
- Новые зависимости — только с обоснованием. Базовый набор: phaser, planck, vitest, playwright, eslint, prettier.
- Нет нужного ассета — использовать placeholder из Graphics и не блокироваться.
- Идентификаторы на английском, комментарии можно на русском.
- Тюнинг «ощущений» (торк, трение, подвеска) не делать «на глаз» без запроса пользователя — менять только значения в `src/data/vehicles.ts` по его конкретным жалобам.
