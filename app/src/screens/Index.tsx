import { SCREENS, figmaUrl, screenRoute } from './registry'
import { ThemeToggle } from './ThemeToggle'
import styles from './Index.module.css'

interface Props {
  theme: 'night' | 'day'
  onTheme: (t: 'night' | 'day') => void
}

/** Галерея строится из реестра: плитки не хардкодятся. */
export function Index({ theme, onTheme }: Props) {
  return (
    <div className={styles.page} data-theme={theme === 'day' ? 'day' : undefined}>
      <header className={styles.head}>
        <div>
          <h1 className="ds-heading-xl">Falak · экраны</h1>
          <p className={`${styles.sub} ds-body-sm`}>
            Кадры собраны из кита по картам в <code>ds/screens/</code>. Числа — из <code>ia/demo-data.md</code>.
            Каждое состояние адресуется: <code>#/screen/&lt;экран&gt;/&lt;состояние&gt;</code>.
          </p>
        </div>
        <div className={styles.tools}>
          <a className={`${styles.link} ds-body-sm-medium`} href="#/">Открыть приложение →</a>
          <a className={`${styles.link} ds-body-sm-medium`} href="#/ds">Витрина системы →</a>
          <ThemeToggle theme={theme} onTheme={onTheme} />
        </div>
      </header>

      <div className={styles.grid}>
        {SCREENS.map((s) => (
          <article key={s.id} className={styles.tile}>
            <a className={styles.frame} href={`#${screenRoute(s.id)}`} aria-label={s.name}>
              <span className={styles.scale}><s.component /></span>
            </a>
            <div className={styles.caption}>
              <span className="ds-body-sm-medium">{s.name}</span>
              <span className={`${styles.sub} ds-body-sm`}>{s.description}</span>
              <nav className={styles.states} aria-label={`Состояния: ${s.name}`}>
                {s.states.map((st) => (
                  <a key={st.id} className={`${styles.pill} ds-body-sm`} href={`#${screenRoute(s.id, st.id)}`}>{st.label}</a>
                ))}
              </nav>
              <a className={`${styles.meta} ds-mono-xs`} href={figmaUrl(s.figma)} target="_blank" rel="noreferrer">
                FIGMA {s.figma} ↗
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
