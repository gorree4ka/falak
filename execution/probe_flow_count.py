# -*- coding: utf-8 -*-
u"""Перетекание числа «останется свободным» на переводе при переключении
плана (№173): выборки текста по ходу, итог, отсутствие скачка назад."""
import asyncio, sys, time
sys.stdout.reconfigure(encoding='utf-8')
from cdp import run

BIG = "document.querySelector('[class*=numbers] bdi')"
SHARE = "document.querySelector('[data-motion=flow]')"

async def body(s):
    await asyncio.sleep(1.2)   # дать появлению досчитаться
    before = (await s.ev(BIG + '.textContent'), await s.ev(SHARE + '.textContent'))
    await s.click('[role=switch]')
    t0 = time.time(); samples = []
    for _ in range(40):
        v = await s.ev(BIG + '.textContent'); w = await s.ev(SHARE + '.textContent')
        samples.append((int((time.time() - t0) * 1000), v, w))
        if len(samples) > 6 and samples[-1][1:] == samples[-2][1:] == samples[-3][1:]: break
        await asyncio.sleep(0.04)
    await s.shot('send-home-flow.png')
    return before, samples

before, samples = run('/#/screen/send-home/default', body)
print('до переключения:', before)
print('после (мс, свободно, доля дня):', samples[:10], '…' if len(samples) > 10 else '')
print('итог:', samples[-1][1:])
nums = [int(v.replace(',', '')) for _, v, _ in samples]
mono = all((b - a) * (nums[-1] - nums[0]) >= 0 for a, b in zip(nums, nums[1:]))
print('движется в одну сторону без скачка назад:', 'да' if mono else 'нет')
