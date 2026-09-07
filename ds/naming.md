# Нейминг слоёв и компонентов

Имя отвечает на вопрос «что это в продукте», а не «из какой фигуры сделано». Ни одного `Frame 12`, `Rectangle 4`, `Group 7`, `Text`.

## Компоненты

Латиницей, существительное в единственном числе: `Button`, `Input`, `Amount`, `PersonChip`, `Orbit`, `FeedRow`, `TabBar`.

Варианты — `Property=value`: `State=default`, `State=pressed`, `Tone=free`, `Tone=reserved`, `Size=md`.

## Слои внутри компонента

По роли, не по содержимому: `label`, `value`, `hint`, `icon`, `track`, `mark`, `avatar`.

## Слои на экранах

По роли в продукте:

| Плохо | Хорошо |
|---|---|
| `Frame 42` | `Screen/Home` |
| `Group 3` | `Orbit` |
| `Rectangle 8` | `orbit/track` |
| `Text` | `amount/value` |
| `Ellipse 2` | `orbit/mark/rent` |

## Экраны и состояния

`Screen/Home`, `Screen/HomePayday`, `Screen/HomeRamadanNight`, `Screen/SendHome`, `Screen/SendHomeSuccess`.

Семья состояний одного экрана начинается с одного корня: всё, что `Screen/Home*`, — носители одной сквозной правки.

## Локаль и тема в имени

Не пишутся в имя слоя. Локаль задаётся направлением фрейма, тема — режимом коллекции Semantic. Дублировать их в названии значит завести четыре копии одного экрана, которые разъедутся.

Исключение — кадры на сдачу, где обе локали показаны рядом: тогда суффикс `· ar` / `· en` ставится на корневом фрейме и только на нём.
