# -*- coding: utf-8 -*-
u"""Дымовой прогон трекера юзер-тестов: воронка брони из шести шагов.

Проверяет то, что нельзя проверить чтением кода: **доезжает ли до сбора имя
экрана**. Прототип не меняет URL при переходах, экран приносит мост в
`Prototype.tsx` — сломается мост, и весь тест запишется одним экраном `/`,
причём молча: события идут, дашборд открывается, метрики пустые.

Гоняет живое приложение в айфрейме, кликает по размеченным органам и ждёт
**смены экрана**, а не секунд: headless идёт на виртуальном времени, где любая
пауза схлопывается в ноль.

Нужен поднятый дев-сервер и сборщик:
    node dashboard/server/server.js            (PORT=8787)
    python execution/ut_smoke.py
"""
import io, json, os, re, shutil, subprocess, urllib.parse, urllib.request

from project import ROOT_STR as ROOT
CHROME = os.environ['LOCALAPPDATA'] + r'\Google\Chrome\Application\chrome.exe'
PAGE = ROOT + 'app/public/utrun.html'
FUNNEL = ['/home', '/search-progress', '/results', '/hotel', '/hotel-tours', '/tour',
          '/auth-phone', '/auth-code', '/checkout', '/payment', '/success']

shutil.copyfile(ROOT + 'execution/ut_smoke.html', PAGE)
try:
    dom = subprocess.run(
        [CHROME, '--headless', '--disable-gpu', '--virtual-time-budget=120000',
         '--window-size=900,1000', '--dump-dom', 'http://localhost:5173/utrun.html?ut_force=1'],
        capture_output=True, timeout=300).stdout.decode('utf-8', 'replace')
finally:
    os.remove(PAGE)      # на живой версии эта страница слала бы фальшивые сессии

m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
print(m.group(1) if m else '(прогон не отчитался)')

q = urllib.parse.urlencode({'funnel': ','.join(FUNNEL), 'goal': '/success',
                            'task': 'booking', 'round': 'all',
                            'fc': u'/home::home: найти туры'})
d = json.load(urllib.request.urlopen('http://localhost:8787/stats?' + q))
print(u'\nпривязка: %s · тестировщиков: %s · событий: %s'
      % (d['attribution']['mode'], d['totals']['testers'], d['totals']['events']))
for f in d['funnel']:
    print(u'  %-18s дошло %s' % (f['step'], f['reached']))
