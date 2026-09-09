# -*- coding: utf-8 -*-
u"""Зонд движения в реальном времени: headless Chrome через DevTools-протокол.
Виртуальное время (`--virtual-time-budget`) не крутит кадры GSAP, поэтому
анимации на rAF проверяются так. Адрес превью — `preview_url` в project.json.

    from cdp import run
    run('/#/screen/send-home/default', body)   # body(s) — корутина: s.ev(js), s.click(sel), s.shot(name)
"""
import asyncio, json, subprocess, os, time, urllib.request, base64, contextlib
import websockets

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CFG = json.load(open(os.path.join(ROOT, 'project.json'), encoding='utf-8'))
CHROME = os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe')
OUT = os.path.join(ROOT, '.tmp'); os.makedirs(OUT, exist_ok=True)


class Session(object):
    def __init__(self, ws): self.ws, self.n = ws, 0
    async def _call(self, method, **params):
        self.n += 1
        await self.ws.send(json.dumps({'id': self.n, 'method': method, 'params': params}))
        while True:
            m = json.loads(await self.ws.recv())
            if m.get('id') == self.n: return m.get('result', {})
    async def ev(self, expr):
        r = await self._call('Runtime.evaluate', expression=expr, returnByValue=True, awaitPromise=True)
        return r.get('result', {}).get('value')
    async def click(self, selector):
        u"""Настоящий клик по центру элемента, а не `.click()`: события идут, как от пальца."""
        box = await self.ev("(function(){var e=document.querySelector(%s);if(!e)return null;e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()" % json.dumps(selector))
        await asyncio.sleep(0.15)   # прокрутка до элемента ниже сгиба: клик мимо окна молча не доходит
        if not box: raise RuntimeError('нет элемента ' + selector)
        x, y = box
        for t in ('mousePressed', 'mouseReleased'):
            await self._call('Input.dispatchMouseEvent', type=t, x=x, y=y, button='left', clickCount=1)
    async def shot(self, name):
        r = await self._call('Page.captureScreenshot', format='png')
        path = os.path.join(OUT, name); open(path, 'wb').write(base64.b64decode(r['data'])); return path


@contextlib.contextmanager
def chrome(port=9333, size='393,852'):
    proc = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--remote-debugging-port=%d' % port,
                             '--window-size=' + size, '--force-device-scale-factor=2', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(40):
            try: targets = json.load(urllib.request.urlopen('http://localhost:%d/json' % port)); break
            except Exception: time.sleep(0.25)
        yield [t for t in targets if t['type'] == 'page'][0]['webSocketDebuggerUrl']
    finally:
        proc.kill()


def run(path, body, port=9333):
    u"""body(session) — корутина; страница открыта и загружена до её вызова."""
    url = CFG.get('preview_url', 'http://localhost:4199') + path
    with chrome(port) as ws_url:
        async def main():
            async with websockets.connect(ws_url, max_size=50_000_000) as ws:
                s = Session(ws)
                await s._call('Page.enable'); await s._call('Runtime.enable')
                await s._call('Page.navigate', url=url)
                for _ in range(100):
                    if await s.ev("document.readyState==='complete' && document.querySelector('#root') && document.querySelector('#root').children.length>0"): break
                    await asyncio.sleep(0.05)
                return await body(s)
        return asyncio.run(main())
