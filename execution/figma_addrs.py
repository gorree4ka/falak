"""Сверка Node ID из документации с файлом Figma.

Зачем. Доки `ds/screens/*.md` ссылаются на узлы Figma адресами вида `1860:24514`.
Пересборка кадра выпускает новый ID, а дока остаётся верной по смыслу и ложной
по ссылке — для человека незаметно (он найдёт кадр глазами), для машинной
сборки это стоп. Свип 04.08.2026 нашёл так 37 мёртвых адресов из 278.

Конвенция (`ds/screens/_index.md`). **Адрес в бэктиках обязан открываться.**
Историческое упоминание пишется без бэктиков — этот скрипт их и не видит,
поэтому правдивый рассказ «кадр удалён» больше не даёт ложной тревоги.

Как пользоваться — два шага, потому что доступ к Figma идёт через MCP:

    python execution/figma_addrs.py emit      # печатает JS для use_figma
    python execution/figma_addrs.py report <результат.json>

`emit` печатает готовый скрипт: он перебирает адреса через `getNodeByIdAsync`
и возвращает только мёртвые. Один вызов на весь свип — на порядок дешевле, чем
проверять каждый адрес рендером (так делал первый прогон: 36 запросов вместо
одного, и покрывал только строки `Final Screen Node ID`).

`report` принимает JSON-массив мёртвых адресов и печатает, в каких доках и
строках они упомянуты, — чтобы правка шла сразу по месту.
"""
from __future__ import annotations

import glob
import io
import json
import os
import re
import sys

DOCS = 'ds/screens/*.md'
ADDR = re.compile(r'`(\d+:\d+)`')


def collect() -> dict[str, list[tuple[str, int, str]]]:
    """Адрес → список (файл, строка, текст строки). Только то, что в бэктиках."""
    found: dict[str, list[tuple[str, int, str]]] = {}
    for path in sorted(glob.glob(DOCS)):
        name = os.path.basename(path)
        with open(path, encoding='utf-8') as fh:
            for num, line in enumerate(fh, 1):
                for nid in ADDR.findall(line):
                    found.setdefault(nid, []).append((name, num, line.strip()))
    return found


def order(nid: str) -> tuple[int, int]:
    a, b = nid.split(':')
    return int(a), int(b)


def emit(found: dict) -> None:
    ids = sorted(found, key=order)
    print(f'// {len(ids)} адресов из {DOCS}. Вернёт только мёртвые.')
    print(f'const IDS = {json.dumps(ids)};')
    print("""const dead = [];
for (const id of IDS) {
  let n = null;
  try { n = await figma.getNodeByIdAsync(id) } catch (e) { n = null }
  if (!n) dead.push(id);
}
return { checked: IDS.length, deadCount: dead.length, dead };""")


def report(found: dict, dead_path: str) -> int:
    with open(dead_path, encoding='utf-8') as fh:
        payload = json.load(fh)
    dead = payload.get('dead', payload) if isinstance(payload, dict) else payload

    if not dead:
        print('Мёртвых адресов нет.')
        return 0

    print(f'Мёртвых адресов: {len(dead)} из {len(found)}\n')
    for nid in sorted(dead, key=order):
        print(f'{nid}')
        for name, num, line in found.get(nid, [])[:3]:
            print(f'   {name}:{num}  {line[:140]}')
        print()
    print('Что делать с каждым:')
    print('  — узел пересобран  → вписать новый адрес в бэктиках;')
    print('  — узел удалён      → снять бэктики, это историческое упоминание;')
    print('  — узла не должно быть вовсе → удалить упоминание.')
    return 1


def main() -> int:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    found = collect()
    mode = sys.argv[1] if len(sys.argv) > 1 else 'emit'
    if mode == 'emit':
        emit(found)
        return 0
    if mode == 'report':
        if len(sys.argv) < 3:
            print('нужен путь к JSON с результатом свипа')
            return 2
        return report(found, sys.argv[2])
    print(f'неизвестный режим: {mode}')
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
