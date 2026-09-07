#!/usr/bin/env python3
"""
Симуляция раунда юзер-тестов: десять профилей из `ia/test-profiles.md`.

🔺 **Это не данные живых людей.** Скрипт кладёт в сборщик события, выражающие
находки когнитивного обхода (`audit/simulated-testing-2026-08-08.md`). Ставить
такой раунд рядом с настоящим нельзя — числа перестанут значить что-либо.
Происхождение раунда записано в `ia/user-testing.md`.

Почему события, а не выдуманные проценты: дашборд считает трение сам, по
сигналам. Нам достаточно честно описать поведение — где человек кликнул
впустую, где вернулся, где задумался, — и прибор выведет метрики своими
правилами. Правила (`dashboard/server/server.js`, `buildSession`):

  dead       — клик, после которого нет ни перехода, ни клика по другой цели
  repeated   — три и больше кликов по одной цели, растянутых дольше секунды
  rage       — три клика по одной цели внутри окна rage
  uturn      — экран A → B → A
  quickback  — то же, но с коротким пребыванием на B
  hesitation — первый клик позже p90 по этому экрану

Использование:
    python execution/ut_simulate.py --dry     # показать сводку, ничего не слать
    python execution/ut_simulate.py           # отправить в сборщик
    python execution/ut_simulate.py --endpoint https://.../collect
"""

import argparse
import json
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

ENDPOINT = "https://mobile-quartet-unlisted.ngrok-free.dev/collect"

# Устройства. Тип определяет сервер по UA, поэтому строки настоящие.
IPHONE_15 = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
             "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")
IPHONE_SE = ("Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 "
             "(KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1")
ANDROID = ("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 "
           "(KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36")
DESKTOP = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
           "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Шаг сценария: ("экран", секунд_на_нём, [(цель_клика, задержка_до_клика), ...])
# Задержка нужна, чтобы hesitation и rage выводились из времени, а не назначались.

PROFILES = [
    # 1. Марина — базовая бронь, доходит. Задумывается в выдаче: её работа —
    #    сравнивать, и долгое чтение здесь не трение, а сценарий.
    dict(name="Марина", task="booking", ua=IPHONE_15, steps=[
        ("/home", 22, [("home: найти туры", 18)]),
        ("/search-progress", 4, []),
        ("/results", 95, [("results: карточка отеля", 74)]),
        ("/hotel", 61, [("hotel: выбрать тур", 52)]),
        ("/hotel-tours", 38, [("hotel-tours: карточка тура", 31)]),
        ("/tour", 44, [("tour: забронировать", 39)]),
        ("/auth-phone", 19, [("button: Продолжить", 16)]),
        ("/auth-code", 12, [("button: Подтвердить", 10)]),
        ("/checkout", 71, [("checkout: к оплате", 66)]),
        ("/payment", 33, [("payment: оплатить", 29)]),
        ("/success", 15, []),
    ]),
    # 2. Алексей — ветка с ребёнком. Один пустой клик по полю возраста (Н1):
    #    кликнул, ничего не открылось, пошёл дальше.
    dict(name="Алексей", task="children", ua=ANDROID, steps=[
        ("/home", 26, [("home: кто едет", 21)]),
        ("/tourists-picker", 48, [("tourists: возраст ребёнка 1", 20),
                                  ("button: Готово", 44)]),
        ("/search-progress", 4, []),
        ("/results", 52, [("results: карточка отеля", 40)]),
        ("/hotel", 88, [("hotel: выбрать тур", 79)]),
        ("/hotel-tours", 30, [("hotel-tours: карточка тура", 24)]),
        ("/tour", 57, []),
    ]),
    # 3. Даша — горящий тур прямо с главной, быстро.
    dict(name="Даша", task="hot-tour", ua=IPHONE_15, steps=[
        ("/home", 11, [("home: горящий тур", 8)]),
        ("/hotel", 26, [("hotel: выбрать тур", 22)]),
        ("/hotel-tours", 17, [("hotel-tours: карточка тура", 13)]),
        ("/tour", 34, []),
    ]),
    # 4. Никита — гость. Заглядывает в «Мои заказы» до брони (разворот
    #    home → my-orders → home), доходит до входа и на нём останавливается:
    #    это и есть проверка гипотезы h3 «вход — не стена».
    dict(name="Никита", task="booking", ua=DESKTOP, steps=[
        ("/home", 14, [("tabbar: Мои заказы", 11)]),
        ("/my-orders", 9, [("button: К поиску", 7)]),
        ("/home", 18, [("home: найти туры", 15)]),
        ("/search-progress", 4, []),
        ("/results", 63, [("results: карточка отеля", 49)]),
        ("/hotel", 42, [("hotel: выбрать тур", 36)]),
        ("/hotel-tours", 25, [("hotel-tours: карточка тура", 20)]),
        ("/tour", 40, [("tour: забронировать", 35)]),
        ("/auth-phone", 48, [("button: Продолжить", 44)]),
    ]),
    # 5. Тамара — SE 375×667. На вводе телефона клавиши уходят под полосу
    #    индикатора (Н5): три попытки по одной клавише подряд — rage, — и уход.
    dict(name="Тамара", task="booking", ua=IPHONE_SE, steps=[
        ("/home", 41, [("home: найти туры", 36)]),
        ("/search-progress", 5, []),
        ("/results", 74, [("results: карточка отеля", 58)]),
        ("/hotel", 66, [("hotel: выбрать тур", 60)]),
        ("/hotel-tours", 34, [("hotel-tours: карточка тура", 28)]),
        ("/tour", 51, [("tour: забронировать", 46)]),
        ("/auth-phone", 62, [("keypad: 9", 12), ("keypad: 9", 12.4), ("keypad: 9", 12.8),
                             ("keypad: 9", 13.4)], False),
    ]),
    # 6. Артём — тёмная тема, сравнение. Долго сидит в таблице: подсветка
    #    лучшего закодирована только цветом (Н4), приходится вчитываться.
    dict(name="Артём", task="compare", ua=IPHONE_15, steps=[
        ("/home", 16, [("home: найти туры", 13)]),
        ("/search-progress", 4, []),
        ("/results", 58, [("results: карточка отеля", 44)]),
        ("/favorites", 24, [("favorites: сравнить", 19)]),
        ("/compare", 132, [("compare: приоритет Дорога", 96)]),
    ]),
    # 7. Оксана — двое детей. Ядро находки Н1: по полю «Выберите возраст»
    #    кликает четырежды за полминуты (repeated + dead), уходит перепроверить
    #    состав и возвращается — разворот tourists-picker → home → tourists-picker.
    dict(name="Оксана", task="children", ua=ANDROID, steps=[
        ("/home", 20, [("home: кто едет", 16)]),
        ("/tourists-picker", 96, [("tourists: возраст ребёнка 2", 22),
                                  ("tourists: возраст ребёнка 2", 31),
                                  ("tourists: возраст ребёнка 2", 47),
                                  ("tourists: возраст ребёнка 2", 68),
                                  ("nav: назад", 90)]),
        ("/home", 13, [("home: кто едет", 10)]),
        ("/tourists-picker", 44, [("tourists: возраст ребёнка 2", 12),
                                  ("button: Готово", 40)]),
        ("/search-progress", 4, []),
        ("/results", 47, [("results: карточка отеля", 35)]),
        ("/hotel", 39, [("hotel: выбрать тур", 33)]),
        ("/hotel-tours", 28, [("hotel-tours: карточка тура", 22)]),
        ("/tour", 63, []),
    ]),
    # 8. Вадим — паспорт на исходе. На чекауте задерживается на предупреждении
    #    и всё равно доходит: путь чистый, задержка осмысленная, не трение.
    dict(name="Вадим", task="booking", ua=IPHONE_15, steps=[
        ("/home", 19, [("home: найти туры", 15)]),
        ("/search-progress", 4, []),
        ("/results", 56, [("results: карточка отеля", 42)]),
        ("/hotel", 47, [("hotel: выбрать тур", 41)]),
        ("/hotel-tours", 29, [("hotel-tours: карточка тура", 23)]),
        ("/tour", 38, [("tour: забронировать", 33)]),
        ("/auth-phone", 21, [("button: Продолжить", 18)]),
        ("/auth-code", 13, [("button: Подтвердить", 11)]),
        ("/checkout", 118, [("checkout: к оплате", 109)]),
        ("/payment", 36, [("payment: оплатить", 31)]),
        ("/success", 12, []),
    ]),
    # 9. Лиля — четыре кандидата, доходит до сравнения и выходит в туры.
    dict(name="Лиля", task="compare", ua=IPHONE_15, steps=[
        ("/home", 17, [("home: найти туры", 14)]),
        ("/search-progress", 4, []),
        ("/results", 81, [("results: карточка отеля", 61)]),
        ("/favorites", 33, [("favorites: сравнить", 27)]),
        ("/compare", 87, [("compare: смотреть туры", 79)]),
        ("/hotel-tours", 22, []),
    ]),
    # 10. Пётр — вернулся через сутки, ловит устаревшую цену и пересчёт.
    dict(name="Пётр", task="compare", ua=ANDROID, steps=[
        ("/favorites", 28, [("favorites: сравнить", 23)]),
        ("/compare", 64, [("compare: смотреть туры", 58)]),
        ("/hotel-tours", 26, [("hotel-tours: карточка тура", 21)]),
        ("/tour", 41, [("tour: забронировать", 36)]),
        ("/price-recalc", 37, [("button: Принять новую цену", 33)]),
        ("/tour", 19, []),
    ]),
]


def build(profile, start, idx):
    """Развернуть профиль в список событий трекера."""
    sid = f"sim{idx:02d}-{int(start.timestamp())}"
    vid = f"simv{idx:02d}-{int(start.timestamp())}"
    evs = []
    t = start

    def ev(kind, **extra):
        e = {"ts": t.isoformat().replace("+00:00", "Z"), "sessionId": sid,
             "visitorId": vid, "type": kind, "task": profile["task"]}
        e.update(extra)
        evs.append(e)

    ev("session_start", screen=profile["steps"][0][0], ua=profile["ua"])
    for step in profile["steps"]:
        screen, dwell, clicks = step[0], step[1], step[2]
        # Четвёртый элемент — уводит ли последний клик на следующий экран.
        # По умолчанию да; False там, где человек упёрся и ушёл сам.
        navigates = step[3] if len(step) > 3 else True
        entered = t
        ev("pageview", screen=screen)
        # 🔺 **Навигационный клик обязан стоять вплотную к переходу.** Сервер
        # считает клик мёртвым, если за `DEAD_WINDOW_MS = 2500` после него не
        # случилось ни перехода, ни клика по другой цели (`server.js:95-97`).
        # Клик за четыре секунды до pageview — уже «мёртвый», и тогда данные
        # показывают не находки обхода, а промах в датировке. Поэтому последний
        # клик уводящего экрана переносим на `dwell - 1`.
        seq = list(clicks)
        if navigates and seq:
            seq[-1] = (seq[-1][0], dwell - 1)
        for target, after in seq:
            t = entered + timedelta(seconds=after)
            ev("click", screen=screen, target=target, interactive=True)
        t = entered + timedelta(seconds=dwell)
        ev("screen_time", screen=screen, ms=int(dwell * 1000))
    ev("session_end", screen=profile["steps"][-1][0])
    return evs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--endpoint", default=ENDPOINT)
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--after", default=None,
                    help="ISO-время начала раунда: события кладутся после него")
    args = ap.parse_args()

    # 🔺 События обязаны лечь **после** начала активного раунда: `/stats` режет
    # выборку по `activeRoundStart()` (`server.js:269`), и всё, что раньше,
    # в текущий раунд просто не попадёт. Поэтому база — не «вчера», а граница
    # раунда, переданная `--after`.
    if args.after:
        base = datetime.fromisoformat(args.after.replace("Z", "+00:00")) + timedelta(seconds=30)
    else:
        base = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(seconds=30)
    # Визиты идут внахлёст с шагом 30 секунд — так выглядит групповая сессия,
    # где люди проходят сценарий одновременно, а не очередью через полчаса.
    all_events = []
    for i, p in enumerate(PROFILES):
        start = base + timedelta(seconds=30 * i)
        evs = build(p, start, i + 1)
        all_events += evs
        print(f"{p['name']:9} {p['task']:9} экранов: {len(p['steps']):2}  событий: {len(evs):3}")

    print(f"\nвсего событий: {len(all_events)}")
    if args.dry:
        print("[dry] ничего не отправлено")
        return

    body = json.dumps({"events": all_events}).encode("utf-8")
    req = urllib.request.Request(
        args.endpoint, data=body, method="POST",
        headers={"Content-Type": "application/json",
                 "ngrok-skip-browser-warning": "1"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"сборщик ответил: {r.status} {r.read().decode('utf-8')[:200]}")
    except Exception as e:
        sys.exit(f"отправка не удалась: {e}")


if __name__ == "__main__":
    main()
