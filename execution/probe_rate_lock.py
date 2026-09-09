# -*- coding: utf-8 -*-
u"""Защёлкивание курса на переводе (№172): выборки текста по ходу перебора,
итог, форма `dd.dd` в каждом кадре, кадр экрана."""
import asyncio, re, sys, time
sys.stdout.reconfigure(encoding='utf-8')
from cdp import run

RATE = "(document.querySelector('[data-motion=lock]')||{}).textContent||null"

async def body(s):
    t0 = time.time(); samples = []
    for _ in range(80):
        v = await s.ev(RATE)
        if v is not None: samples.append((int((time.time() - t0) * 1000), v))
        if len(samples) > 4 and samples[-1][1] == samples[-2][1] == '13.42': break
        await asyncio.sleep(0.04)
    label = await s.ev("(document.querySelector('[data-motion=lock]')||{}).parentElement.getAttribute('aria-label')")
    await s.shot('send-home-lock.png')
    return samples, label

samples, label = run('/#/screen/send-home/default', body)
print('выборки (мс, текст):', samples[:12], '…' if len(samples) > 12 else '')
print('итог:', samples[-1][1], '| aria-label:', label)
bad = [x for x in samples if not re.fullmatch(r'\d\d\.\d\d', x[1])]
print('форма dd.dd во всех выборках:', 'да' if not bad else bad)
