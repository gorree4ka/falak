# Screens index

Собранные экраны Falak. Секция **Screens** в файле `9PhUCqXUownqvFNyPyfB2f`.

| Файл | Кадр | Node ID | Локаль · тема | Статус |
|---|---|---|---|---|
| `home.md` | `Screen/HomeBase` | `28:3` | ar RTL · **Night** | собран |
| `how-calculated.md` | `Screen/HomeHowCalculated` | `141:119` | ar RTL · Night | собран |
| `home-short.md` | `Screen/HomeShort` | `245:235` | ar RTL · Night | собран, оба носителя |
| `send-home.md` | `Screen/SendHome` | `369:329` | ar RTL · Night | собран |
| `send-home-success.md` | `Screen/SendHomeSuccess` | `372:380` | ar RTL · Night | собран |
| — | `Screen/HomePayday` | — | ar RTL · Night | в очереди |
| — | `Screen/HomeRamadanNight` | — | ar RTL · Night | в очереди |
| — | `Screen/HomeBaseEn` | — | en LTR · Night | в очереди |

Шторки `home/how-calculated` и `send-home/success` собираются вместе со своими экранами.

## Как устроена секция

Экраны лежат прямо в секции `28:2`, каждый своим кадром: `Screen/HomeShort`, `Screen/HomeBase · Sheet=peek` (`305:248`), `Screen/HomeBase`, `Screen/HomeHowCalculated`. Поверх них последним ребёнком стоит кадр **«Пояснения»** (`345:329`) — без заливки и без обрезки: в нём доски выносок, линии, фрагмент ленты для чтения, подписи состояний и скрытые черновые легенды. Один щелчок по его видимости прячет всё объяснительное и оставляет чистые экраны.

Экран **никогда не кладётся внутрь доски пояснений**: иначе доску нельзя выключить, не выключив экран. Линии выносок — вектора с абсолютными координатами, поэтому экран и его доска могут жить в разных родителях, если кадры не двигаются.

## Порядок сборки

Определён в `ia/screens-inventory.md`. `HomeBase` собирается первым: остальные кадры переиспользуют его блоки — орбиту, резерв, людей, ленту и таб-бар.
