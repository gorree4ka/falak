import { figmaUrl, screenRoute } from './registry'
import type { ScreenEntry, ScreenState } from './registry'
import { ThemeToggle } from './ThemeToggle'
import styles from './DevicePage.module.css'

interface Props {
  screen: ScreenEntry
  state: ScreenState
  theme: 'night' | 'day'
  onTheme: (t: 'night' | 'day') => void
  /** `/` — вход в приложение: без переключателя состояний, только кадр. */
  bare?: boolean
}

/**
 * Страница одного кадра: корпус устройства по центру, над ним — служебная полоса.
 * Полоса живёт в галерее (LTR, по-русски), кадр внутри — в продукте (RTL, по-арабски).
 * На телефоне полоса прячется и кадр занимает весь экран: ссылка открывается как приложение.
 */
export function DevicePage({ screen, state, theme, onTheme, bare = false }: Props) {
  const Screen = screen.component
  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <a className={`${styles.quiet} ds-body-sm`} href="#/screens">← Все экраны</a>

        <div className={styles.center}>
          <span className="ds-body-sm-medium">{screen.name}</span>
          {!bare && (
            <nav className={styles.states} aria-label="Состояние кадра">
              {screen.states.map((s) => (
                <a
                  key={s.id}
                  href={`#${screenRoute(screen.id, s.id)}`}
                  className={`${s.id === state.id ? styles.pillOn : styles.pill} ds-body-sm`}
                  aria-current={s.id === state.id ? 'page' : undefined}
                >{s.label}</a>
              ))}
            </nav>
          )}
        </div>

        <div className={styles.right}>
          <a className={`${styles.quiet} ds-mono-xs`} href={figmaUrl(screen.figma)} target="_blank" rel="noreferrer">
            FIGMA {screen.figma} ↗
          </a>
          <ThemeToggle theme={theme} onTheme={onTheme} />
        </div>
      </header>

      {/* Ключ перемонтирует кадр при смене состояния: адрес — точка входа, дальше экран живёт сам. */}
      <div className={styles.frame} key={`${screen.id}/${state.id}`}>
        <Screen state={state.id} />
      </div>
    </div>
  )
}
