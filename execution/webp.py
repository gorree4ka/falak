# -*- coding: utf-8 -*-
"""
Перегон фотоассетов в WebP.

Зачем: витрина отдаётся с CDN и открывается с телефона по мобильному интернету.
39 МБ PNG/JPG — это не «тяжеловато», это галерея отеля, которая грузится дольше,
чем человек готов ждать; на юзер-тесте пустой прямоугольник читается как поломка.

Оригиналы живут в `assets/photos` и здесь не трогаются — конвертация обратима.

    python execution/webp.py --check app/public/photos          # посчитать, не трогая
    python execution/webp.py --one   app/public/photos/09-sunrise.png
    python execution/webp.py --apply app/public/photos          # переписать

После `--apply` расширения в `app/src/data/photos.ts` надо перевести на `.webp`
(скрипт печатает напоминание — сам код он не правит: правка кода не его дело).
"""
import io
import os
import sys

from PIL import Image

SRC_EXT = ('.png', '.jpg', '.jpeg')

# 82 — рабочий потолок для фотографии: выше растёт вес, а глаз разницы не берёт.
# `method=6` — самый медленный и самый плотный энкодер; 42 файла того стоят.
QUALITY = 82
METHOD = 6


def encode(path, quality=QUALITY):
    """Возвращает (байты webp, ширина, высота). Ничего не пишет на диск."""
    with Image.open(path) as im:
        # Палитровые и серые кадры приводятся к RGB(A): WebP не хранит палитру,
        # а без явного перевода Pillow ругается на режим `P` с прозрачностью.
        mode = 'RGBA' if ('A' in im.getbands() or im.mode == 'P') else 'RGB'
        im = im.convert(mode)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=quality, method=METHOD)
        return buf.getvalue(), im.width, im.height


def files_of(folder):
    return sorted(f for f in os.listdir(folder) if f.lower().endswith(SRC_EXT))


def report(rows, total_before, total_after):
    # Пустая папка — это ответ «всё уже переведено», а не повод падать делением на ноль.
    if not rows:
        print(u'нечего перегонять: PNG и JPG не найдены, всё уже в WebP')
        return
    rows.sort(key=lambda r: -r[1])
    print('%-28s %9s %9s %7s' % ('файл', 'было', 'стало', 'ужато'))
    for name, before, after in rows:
        print('%-28s %8.2f М %8.2f М %6.0f%%' % (
            name, before / 1048576.0, after / 1048576.0,
            100.0 * (1 - float(after) / before)))
    print('-' * 58)
    print('%-28s %8.2f М %8.2f М %6.0f%%' % (
        'ИТОГО %d файлов' % len(rows), total_before / 1048576.0,
        total_after / 1048576.0, 100.0 * (1 - float(total_after) / total_before)))


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    mode, target = sys.argv[1], sys.argv[2]

    if mode == '--one':
        data, w, h = encode(target)
        before = os.path.getsize(target)
        print('%s  %dx%d' % (os.path.basename(target), w, h))
        print('  было  %.2f МБ' % (before / 1048576.0))
        print('  стало %.2f МБ  (−%.0f%%)' % (
            len(data) / 1048576.0, 100.0 * (1 - float(len(data)) / before)))
        out = os.path.splitext(target)[0] + '.preview.webp'
        with open(out, 'wb') as f:
            f.write(data)
        print('  образец для сверки глазами: %s' % out)
        return 0

    rows, tb, ta = [], 0, 0
    for name in files_of(target):
        path = os.path.join(target, name)
        data, _, _ = encode(path)
        before = os.path.getsize(path)
        rows.append((name, before, len(data)))
        tb += before
        ta += len(data)
        if mode == '--apply':
            with open(os.path.splitext(path)[0] + '.webp', 'wb') as f:
                f.write(data)
            os.remove(path)

    report(rows, tb, ta)
    if mode == '--apply':
        print('\nПереписано. Оригиналы целы в assets/photos.')
        print('Дальше: расширения в app/src/data/photos.ts перевести на .webp')
    return 0


if __name__ == '__main__':
    sys.exit(main())
