# -*- coding: utf-8 -*-
u"""Прогон кольца по всем длинам месяца и всем положениям «сегодня».

Зачем скрипт, а не глаз: дефекты орбиты живут в конкретных днях. Радиус меток
выглядел безопасным на сентябре и прятал 18-е в октябре (№69, №70); подпись
«сегодня» подписывала собой 1-е число только когда сегодня 2-е (№119). Оба
класса ошибок не видно ни на одном скриншоте — их видно перебором.

⚠️ **Сравнивать углы можно только на одном радиусе.** Первая версия скрипта
ругалась, что подпись «сегодня» садится на цифру шкалы в каждом месяце: по углу
они совпадают. Но цифра стоит на 184, подпись — на 152, между ними 32 px, и
никакого столкновения нет. Проверка, не знающая про радиус, выдаёт 21 ложную
находку и прячет за ними настоящие.

Что проверяется (радиусы — из `ds/components.md`, «Анатомия Orbit»):

1. метка обязательства целиком в кадре и не под кромкой сжатой шторки;
2. подпись «сегодня» не читается как подпись шва начала месяца;
3. подпись «сегодня» не наезжает на метки обязательств;
4. подписанное число не встаёт вплотную к шву;
5. соседние метки различимы.

Пункты 1 и 3 зависят от данных, поэтому гоняются и по фикстуре тоже: сентябрь
из §4 и октябрь из §9.1.

    python execution/orbit_sweep.py
"""
import math
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

C = 222.0
R_NUMERAL, R_MARK, R_TODAY_LABEL = 184.0, 152.0, 166.0
MARK = 8.0
LABEL_W, LABEL_H = 34.0, 13.0   # «اليوم», DS/Label/xs
FRAME_HALF = 196.0              # от центра кольца до края кадра 393
SHEET_TOP = 158.0               # от центра кольца до кромки сжатой шторки
NUMERALS = [5, 10, 15, 20, 25, 30]

# Обязательства фикстуры: §4 — сентябрь, §9.1 — октябрь.
FIXTURES = {
    u'сентябрь, 30 дней': (30, [18, 20, 22, 25, 28]),
    u'октябрь, 31 день': (31, [5, 18, 20, 25, 28]),
}


def angle(d, days, sign=-1):
    return math.radians(-90 + sign * (d - 1) * (360.0 / days))


def norm(deg):
    return abs(((deg + 180) % 360 + 360) % 360 - 180)


def label_angle(today, days, sign=-1):
    u"""Та же формула, что в Orbit.tsx: подпись на радиальной линии своего дня,
    и только 1-е число отводит её вперёд — оно само стоит на шве."""
    if today == 1:
        return angle(today, days, sign) + sign * math.radians(15)
    return angle(today, days, sign)


def at(r, a):
    return C + r * math.cos(a), C + r * math.sin(a)


def run():
    bad = []
    for days in (28, 29, 30, 31):
        step = 360.0 / days
        labelled = [d for d in NUMERALS if d <= days and d != days]

        # 4. подписанное число не встаёт вплотную к шву
        for d in labelled:
            if norm((d - 1) * step) < step * 1.5:
                bad.append(u'%d дней: число %d в %.1f° от шва' % (days, d, norm((d - 1) * step)))

        # 5. соседние метки различимы
        arc = 2 * math.pi * R_MARK * step / 360.0
        if arc < MARK * 2:
            bad.append(u'%d дней: соседние метки в %.1f px при размере %.0f' % (days, arc, MARK))

        for d in range(1, days + 1):
            # 1. метка целиком в кадре и не под шторкой
            x, y = at(R_MARK, angle(d, days))
            if abs(x - C) + MARK / 2 > FRAME_HALF:
                bad.append(u'%d дней: метка %d за краем кадра' % (days, d))
            if (y - C) + MARK / 2 > SHEET_TOP:
                bad.append(u'%d дней: метка %d под шторкой' % (days, d))

            # 2. подпись не наезжает на шов: риска шва идёт от 166 до 196,
            #    то есть ровно в поясе подписи
            la = label_angle(d, days)
            lx, ly = at(R_TODAY_LABEL, la)
            sx, sy = at(R_TODAY_LABEL, angle(1, days))
            if abs(lx - sx) < (LABEL_W + 2) / 2 and abs(ly - sy) < (LABEL_H + 34) / 2:
                bad.append(u'%d дней: сегодня %d — подпись на шве начала месяца' % (days, d))

    # 3. подпись «сегодня» против меток обязательств — один радиус, нужны данные
    for name, (days, marks) in FIXTURES.items():
        for today in range(1, days + 1):
            lx, ly = at(R_TODAY_LABEL, label_angle(today, days))
            for m in marks:
                if m == today:
                    continue
                mx, my = at(R_MARK, angle(m, days))
                if abs(lx - mx) < (LABEL_W + MARK) / 2 and abs(ly - my) < (LABEL_H + MARK) / 2:
                    bad.append(u'%s: сегодня %d — подпись накрывает метку %d' % (name, today, m))

    print(u'проверено: 4 длины месяца × все дни = %d положений, плюс две фикстуры'
          % sum((28, 29, 30, 31)))
    print(u'подписанные числа: 30 дней — %s · 31 день — %s'
          % ([d for d in NUMERALS if d <= 30 and d != 30],
             [d for d in NUMERALS if d <= 31 and d != 31]))
    if bad:
        print(u'\nнаходок: %d' % len(bad))
        for b in bad[:40]:
            print(u'  ' + b)
        return 1
    print(u'\nчисто: метки в кадре, подписи не сталкиваются')
    return 0


if __name__ == '__main__':
    raise SystemExit(run())
