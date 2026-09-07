import { useRef, useState } from 'react'
import { ScanFace } from 'lucide-react'
import styles from './SliderConfirm.module.css'

export interface SliderConfirmProps {
  label: string
  disabled?: boolean
  /** Кноб доехал до конца дорожки — подтверждение состоялось. */
  onConfirm?: () => void
}

const THRESHOLD = 0.85

/**
 * Подтверждение жестом: кноб у ведущего края едет по направлению чтения.
 * Знак смещения берётся из направления письма на дорожке, а не задаётся:
 * в RTL кноб едет влево, в LTR — вправо, компонент один.
 */
export function SliderConfirm({ label, disabled = false, onConfirm }: SliderConfirmProps) {
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; id: number } | null>(null)
  const [geometry, setGeometry] = useState({ travel: 0, sign: -1 })
  const [progress, setProgress] = useState(0)
  const [settling, setSettling] = useState(false)
  const [done, setDone] = useState(false)

  return (
    <div
      ref={track}
      className={styles.track}
      data-disabled={disabled}
      data-done={done}
      data-settling={settling}
      style={{ '--progress': progress, '--travel': `${geometry.travel}px`, '--sign': geometry.sign } as React.CSSProperties}
    >
      {/* Кноб первым в разметке — значит у ведущего края: справа в RTL, слева в LTR. Едет по направлению чтения. */}
      <button
        type="button"
        className={styles.knob}
        aria-label={label}
        disabled={disabled || done}
        onPointerDown={(e) => {
          if (!track.current || !e.isPrimary) return
          const rtl = getComputedStyle(track.current).direction === 'rtl'
          const travel = track.current.clientWidth - e.currentTarget.clientWidth - 8
          setGeometry({ travel, sign: rtl ? -1 : 1 })
          setSettling(false)
          drag.current = { x: e.clientX, id: e.pointerId }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d || d.id !== e.pointerId || geometry.travel === 0) return
          setProgress(Math.max(0, Math.min(1, ((e.clientX - d.x) * geometry.sign) / geometry.travel)))
        }}
        onPointerUp={(e) => {
          const d = drag.current
          if (!d || d.id !== e.pointerId) return
          drag.current = null
          setSettling(true)
          if (progress >= THRESHOLD) { setProgress(1); setDone(true); onConfirm?.() }
          else setProgress(0)
        }}
        onPointerCancel={() => { drag.current = null; setSettling(true); setProgress(0) }}
      >
        <ScanFace size={20} strokeWidth={1.8} />
      </button>
      <span className={`${styles.label} ds-body-sm-medium`}>{label}</span>
    </div>
  )
}
