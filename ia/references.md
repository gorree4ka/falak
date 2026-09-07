# Референсы — Mobbin

Собрано 7 сентября 2026 для аудита главного экрана. Правило навыка `mobbin-patterns`: **предложить, а не внедрить** — решение за пользователем; внедрённое идёт через `cross-screen-sweep`.

## Главный экран · «сколько можно потратить»

| Приложение | Что делают | Ссылка |
|---|---|---|
| Revolut · Budget | Кольцо «Left to spend $90.01 · 90% · 23 days left · $3.91/day», статус «On track», список Budget / Spent / Upcoming / Left | [экран](https://mobbin.com/screens/b578103d-3eca-4520-b50f-1698113428d7) |
| Quicken · Spending Plan | «$650 available ($23.21 per day)», напоминания о переводах карточками сверху | [экран](https://mobbin.com/screens/32ae27b5-b0d4-4b14-909c-b5ca5865534a) |
| Rocket Money · Budget | «$0/day for 25d», «$33 left to pay» по счетам | [экран](https://mobbin.com/screens/64db6b84-7887-41a3-a137-4a2df6d811bb) |
| Cleo · Budget | «$1,274 until … / $115 per day», ближайшие счета карточками с датой | [экран](https://mobbin.com/screens/b4b76599-f902-4f9c-b1a3-4cf132a08bc4) |
| YNAB · Plan | По каждому счёту: «Funded» / «$60 more needed by the 30th» | [экран](https://mobbin.com/screens/15747c12-b670-42aa-81b9-d9b4d1998c5a) |
| Ubank · Home | «Bill Planner»: Transfer · Due in 23 days · $500; «Set up your pay cycle» | [экран](https://mobbin.com/screens/cdb43016-3430-492e-a5b9-f65727f3083b) |
| Copilot Money | Линия темпа трат за месяц, «$318 over» | [экран](https://mobbin.com/screens/4ed48c3b-8d88-4dab-b69f-89f0c67953fc) |
| Buddy · Budget | Кольцо по категориям, «$555 left to budget» | [экран](https://mobbin.com/screens/78cebd3c-0057-4ffd-8de6-ec9f8534515e) |

## Детали платежа · потоки

| Приложение | Что делают | Ссылка |
|---|---|---|
| Cleo · Bill details | Сумма, периодичность, следующая дата; «This is correct» / «Remove» | [поток](https://mobbin.com/flows/6f1d251c-48b6-479d-8224-e4451b475057) |
| Ubank · Bill detail | «Due in 29 days · Tue 1 Jul», «Edit bill / Untrack bill», хвост будущих списаний, «These details are estimated» | [поток](https://mobbin.com/flows/b5735911-9fe3-4115-b302-77dc37096ab8) |
| ANZ Plus · Upcoming | Пустое состояние с объяснением: «With a little time… we'll predict your upcoming expenses» | [поток](https://mobbin.com/flows/26813d53-9a55-4d86-858b-af0a60836740) |
| State Farm · Upcoming bill | Карточка счёта с «Last paid», детали в шторке | [поток](https://mobbin.com/flows/c31c404a-6dcc-4dea-9c23-c09a3575ef0c) |

## Чего в Mobbin нет

- **Постоянная шторка с детентами** в финансах — выдача не ищет паттерн; канон вне Mobbin: Apple Maps, Find My, Material *standard bottom sheet*.
- **Арабские RTL-банки** — на запрос вернулся один Careem, на английском. Референсы для Liv, Wio, D360, Barq, STC Bank — из App Store, см. `competitive_analysis.md`.

## Что предложено (аудит 7 сентября)

Норма дня на главном «صرفت 76 من 364»; относительный срок «بعد 6 أيام» у ближайшего платежа; шторка обязательства с действиями и пометкой «оценочно»; строка источника даты зарплаты в расчёте. Ни одно не внедрено — ждёт решения.
