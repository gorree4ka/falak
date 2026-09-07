import { MoreHorizontal, CreditCard, Users, CircleDot } from 'lucide-react'
import styles from './TabBar.module.css'

export type TabKey = 'more' | 'card' | 'people' | 'today'

const ICONS = {
  more: MoreHorizontal,
  card: CreditCard,
  people: Users,
  today: CircleDot,
} as const

export interface TabBarProps {
  active: TabKey
  labels: Record<TabKey, string>
  onChange?: (key: TabKey) => void
}

/**
 * В RTL первый ребёнок флекса уходит к правому краю, поэтому порядок в разметке
 * обратный тому, что видно слева направо в Figma. Направление делает браузер,
 * руками его дублировать нельзя — иначе разворот случится дважды.
 */
const ORDER: TabKey[] = ['today', 'people', 'card', 'more']

export function TabBar({ active, labels, onChange }: TabBarProps) {
  return (
    <nav className={styles.bar}>
      {ORDER.map((key) => {
        const Icon = ICONS[key]
        const on = key === active
        return (
          <button
            key={key}
            type="button"
            className={`${styles.tab} ${on ? styles.active : ''}`}
            onClick={() => onChange?.(key)}
            aria-current={on ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={2} />
            <span className="ds-label-xs">{labels[key]}</span>
          </button>
        )
      })}
    </nav>
  )
}
