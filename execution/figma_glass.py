# -*- coding: utf-8 -*-
u"""Материал поверхностей: стекло шторок, затемнение и кромка плашек.

Зачем. Материал шторки — четыре независимых свойства: градиент `sheet-sheen` →
`sheet-veil`, одинаковая альфа у стопов, слой текстуры и размытие фона радиусом
20. Затемнение под модальной шторкой — заливка `surface-canvas` при
непрозрачности **краски** 0.55, а не узла. Ни одно из этих чисел не видно в
слое: панель слоёв показывает непрозрачность узла (100 %), а вся прозрачность
живёт внутри краски. Поэтому расхождение читается не как ошибка, а как «шторка
почему-то глухая».

Кромка `NoticeRow` — та же болезнь: цвет состояния на **16 %**, и эти 16 %
живут внутри краски. На полной силе плашка превращается в цветную коробку, а
цвет денег на краю контейнера — украшение, которое запрещает направление.
Возвращалась дважды: 07.09.2026 в самом макете (№152) и в тот же день снова —
правки структуры мастера сбросили оверрайды **инстансов**, мастера при этом
остались верны (№157). Инстанс, починенный поштучно, переживает не всякую
операцию над мастером.

Ловилось трижды: 07.09.2026 непрозрачное затемнение закрашивало главный экран
наглухо (№129), в тот же день три шторки разошлись по трём разным поверхностям,
и в тот же вечер затемнение молча вернулось к непрозрачности 1 — кадр снова стал
чёрным прямоугольником (№135). Число, которое возвращается само, обязано иметь
сторожа.

Как пользоваться — два шага, доступ к Figma идёт через MCP:

    python execution/figma_glass.py emit                # печатает JS для use_figma
    python execution/figma_glass.py report <файл.json>  # разбирает результат

`emit` печатает скрипт: он обходит секции из `project.json`, собирает все узлы
с именем `Sheet/*` и `scrim` и возвращает их материал одним массивом.
`report` сверяет собранное с контрактом и печатает расхождения.

Кадры под `Индекс /` — контактный лист деки, уменьшенный целиком: `rescale`
масштабирует и радиус размытия, поэтому 20 там законно превращается в 5,9.
Для них проверяется наличие размытия, а не его число; всё остальное — плотность
градиента, текстура, привязки и непрозрачность затемнения — от масштаба не
зависит и спрашивается наравне со всеми.
"""
from __future__ import annotations

import io
import json
import sys

from project import PAGES, SECTIONS, need   # адреса живут в project.json, не в скрипте

BLUR = 20
VEIL_ALPHA = {'night': 0.72, 'day': 0.78}
SCRIM_OPACITY = 0.55
TEXTURE_OPACITY = 0.02
PLATE_EDGE = 0.16   # кромка плашки состояния: подсказка, а не рамка
SCALED = u'Индекс /'   # контактный лист: уменьшен целиком, размытие уменьшено вместе с ним


def emit() -> None:
    need('figma.pages.screens', u'страница со Screens нужна сканеру стекла.')
    sections = json.dumps(sorted(set(SECTIONS.values())) + [PAGES['screens']])
    print(u'// Материал шторок и затемнений. Секции — из project.json.')
    print(u'const ROOTS = %s;' % sections)
    print(u"""const page = await figma.getNodeByIdAsync('%s');
await figma.setCurrentPageAsync(page);
const seen = new Set(), out = [];
async function paintRow(p, node) {
  const row = { type: p.type, visible: p.visible !== false, opacity: p.opacity === undefined ? 1 : p.opacity };
  if (p.type === 'GRADIENT_LINEAR') {
    row.stops = [];
    for (const s of p.gradientStops) {
      const bv = s.boundVariables && s.boundVariables.color;
      let name = null;
      if (bv) { const v = await figma.variables.getVariableByIdAsync(bv.id); name = v ? v.name : bv.id; }
      row.stops.push({ pos: Math.round(s.position * 100) / 100, alpha: Math.round(s.color.a * 100) / 100, variable: name });
    }
  }
  const bv = p.boundVariables && p.boundVariables.color;
  if (bv) { const v = await figma.variables.getVariableByIdAsync(bv.id); row.variable = v ? v.name : bv.id; }
  return row;
}
for (const rootId of ROOTS) {
  const root = await figma.getNodeByIdAsync(rootId);
  if (!root || !root.findAll) continue;
  for (const n of root.findAll(x => /^Sheet\\//.test(x.name) || x.name === 'scrim'
      || (/NoticeRow|Tone=/.test(x.name) && x.strokes && x.strokes.length))) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    let where = [], c = n.parent;
    while (c && c.type !== 'PAGE') { where.unshift(c.name); c = c.parent; }
    const fills = [];
    for (const p of (n.fills || [])) fills.push(await paintRow(p, n));
    const strokes = [];
    for (const p of (n.strokes || [])) strokes.push(await paintRow(p, n));
    out.push({ id: n.id, name: n.name, where: where.join(' / '), nodeOpacity: n.opacity, visible: n.visible,
      fills, strokes,
      effects: (n.effects || []).map(e => ({ type: e.type, radius: e.radius, visible: e.visible })) });
  }
}
return out;""" % PAGES['screens'])


def report(path: str) -> int:
    rows = json.loads(io.open(path, encoding='utf-8').read())
    bad = []
    for r in rows:
        name, where = r['name'], r['where']
        fills = [f for f in r['fills'] if f['visible']]
        if name == 'scrim':
            solid = [f for f in fills if f['type'] == 'SOLID']
            if not solid:
                bad.append((where, name, u'нет сплошной заливки'))
                continue
            f = solid[0]
            if abs(f['opacity'] - SCRIM_OPACITY) > 0.01:
                bad.append((where, name, u'непрозрачность краски %.2f вместо %.2f — экран под шторкой закрашен'
                            % (f['opacity'], SCRIM_OPACITY)))
            if f.get('variable') != 'surface-canvas':
                bad.append((where, name, u'заливка не привязана к surface-canvas (%s)' % f.get('variable')))
            if abs(r['nodeOpacity'] - 1) > 0.01:
                bad.append((where, name, u'непрозрачность узла %.2f: прозрачность обязана жить в краске'
                            % r['nodeOpacity']))
            continue

        if 'NoticeRow' in name or name.startswith('Tone='):
            st = [x for x in r.get('strokes', []) if x['visible']]
            if not st:
                bad.append((where, name, u'у плашки нет кромки'))
                continue
            e = st[0]
            if e.get('variable') == 'border-hairline':
                continue                      # состояние данных: волосяная кромка в полную силу
            if abs(e['opacity'] - PLATE_EDGE) > 0.01:
                bad.append((where, name, u'кромка %.2f вместо %.2f — плашка стала цветной коробкой'
                            % (e['opacity'], PLATE_EDGE)))
            if not (e.get('variable') or '').startswith('money-'):
                bad.append((where, name, u'кромка не привязана к цвету состояния (%s)' % e.get('variable')))
            continue

        grad = [f for f in fills if f['type'] == 'GRADIENT_LINEAR']
        if not grad:
            bad.append((where, name, u'нет градиента sheen → veil'))
        else:
            stops = grad[0]['stops']
            alphas = {s['alpha'] for s in stops}
            if len(alphas) != 1:
                bad.append((where, name, u'альфа разная у стопов %s — плотность кромки уплыла' % sorted(alphas)))
            elif alphas.pop() not in VEIL_ALPHA.values():
                bad.append((where, name, u'плотность %s мимо вилки 0.72 / 0.78' % [s['alpha'] for s in stops]))
            names = [s['variable'] for s in stops]
            if names[0] != 'sheet-sheen' or set(names[1:]) != {'sheet-veil'}:
                bad.append((where, name, u'стопы не sheet-sheen → sheet-veil, а %s' % names))
        img = [f for f in fills if f['type'] == 'IMAGE']
        if not img:
            bad.append((where, name, u'нет слоя текстуры'))
        elif abs(img[0]['opacity'] - TEXTURE_OPACITY) > 0.005:
            bad.append((where, name, u'текстура %.3f вместо %.2f' % (img[0]['opacity'], TEXTURE_OPACITY)))
        blur = [e for e in r['effects'] if e['type'] == 'BACKGROUND_BLUR' and e['visible']]
        if not blur:
            bad.append((where, name, u'нет размытия фона — стекло перестало быть стеклом'))
        elif SCALED not in where:
            if blur[0]['radius'] != BLUR:
                bad.append((where, name, u'радиус размытия %s вместо %s' % (blur[0]['radius'], BLUR)))
        elif blur[0]['radius'] >= BLUR:
            bad.append((where, name, u'уменьшенный кадр, а размытие %s не уменьшилось' % blur[0]['radius']))

    plates = [r for r in rows if 'NoticeRow' in r['name'] or r['name'].startswith('Tone=')]
    scrims = [r for r in rows if r['name'] == 'scrim']
    sheets = [r for r in rows if r not in plates and r not in scrims]
    scaled = len([r for r in rows if SCALED in r['where']])
    print(u'проверено: шторок %d, затемнений %d, плашек %d (уменьшенных %d)'
          % (len(sheets), len(scrims), len(plates), scaled))
    for where, name, why in bad:
        print(u'  %s / %s — %s' % (where, name, why))
    print(u'расхождений: %d' % len(bad))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if len(sys.argv) > 1 and sys.argv[1] == 'emit':
        emit()
    elif len(sys.argv) > 2 and sys.argv[1] == 'report':
        raise SystemExit(report(sys.argv[2]))
    else:
        print(__doc__)
