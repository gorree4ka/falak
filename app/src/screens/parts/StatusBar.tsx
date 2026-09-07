import { Battery, Wifi } from 'lucide-react'
import { useDemoClock } from '../../clock'
import styles from './StatusBar.module.css'

/**
 * Системная строка устройства. Зеркальна по языку системы, как в iOS на арабском:
 * время у ведущего края справа, индикаторы слева (№40, №105).
 */
export function StatusBar({ time }: { time?: string } = {}) {
  /* Часы идут от опорного момента фикстуры; сценарный кадр передаёт свой. */
  const clock = useDemoClock()
  return (
    <div className={styles.statusbar}>
      <bdi className="ds-mono-sm">{time ?? clock.time}</bdi>
      <span className={styles.grow} />
      <span className={styles.indicators}>
        <span className={styles.cellular}>
          <i style={{ height: 3.5, opacity: .35 }} /><i style={{ height: 6 }} />
          <i style={{ height: 8.5 }} /><i style={{ height: 11 }} />
        </span>
        <Wifi size={16} strokeWidth={2.25} />
        <Battery size={18} strokeWidth={2} />
      </span>
    </div>
  )
}
