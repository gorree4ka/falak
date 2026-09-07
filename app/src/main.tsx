import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './tokens/primitives.css'
import './tokens/semantics.css'
import './tokens/typography.css'
import './base.css'
import './index.css'
import { Showcase } from './Showcase'
import { Index } from './screens/Index'
import { DevicePage } from './screens/DevicePage'
import { SCREENS, HOME } from './screens/registry'
import { useRoute, parseRoute } from './screens/Router'

type Theme = 'night' | 'day'
const THEME_KEY = 'falak-theme'

/* Тема живёт в браузере: переключил один раз — и галерея, и кадры в ней остаются в ней.
   `?theme=day` в адресе перекрывает память — для снимков и ссылок на сдачу.
   Хранилище может отсутствовать (приватное окно, снимок) — тогда просто ночь. */
function readTheme(): Theme {
  const fromUrl = new URLSearchParams(window.location.search).get('theme')
  if (fromUrl === 'day' || fromUrl === 'night') return fromUrl
  try { return localStorage.getItem(THEME_KEY) === 'day' ? 'day' : 'night' } catch { return 'night' }
}
function writeTheme(t: Theme) {
  try { localStorage.setItem(THEME_KEY, t) } catch { /* без памяти — без ошибки */ }
}

function App() {
  const route = parseRoute(useRoute())
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const setTheme = (t: Theme) => { setThemeState(t); writeTheme(t) }
  const themeAttr = theme === 'day' ? 'day' : undefined

  if (route.kind === 'ds') return <Showcase />
  if (route.kind === 'gallery') return <Index theme={theme} onTheme={setTheme} />

  /* `/` — приложение: главный экран без адреса состояния. Незнакомый id — в галерею. */
  const screen = route.kind === 'app' ? HOME : SCREENS.find((s) => s.id === route.id)
  if (!screen) return <Index theme={theme} onTheme={setTheme} />
  const wanted = route.kind === 'screen' ? route.state : undefined
  const state = screen.states.find((s) => s.id === wanted) ?? screen.states[0]

  return (
    <div data-theme={themeAttr}>
      <DevicePage screen={screen} state={state} theme={theme} onTheme={setTheme} bare={route.kind === 'app'} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
