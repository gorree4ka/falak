import styles from './Avatar.module.css'

export interface AvatarProps {
  /** Диаметр круга: 34 — шапка, 40 — ряд выбора, 48 — чип, 72 — получатель перевода. */
  size: 34 | 40 | 48 | 72
  /** Имя для диктора и для alt: круг без имени — это украшение, а не человек. */
  name: string
  /** Инициал. Он же остаётся, если фотографии нет: у группы лица не бывает. */
  initial: string
  /** Путь к кадру в `app/public/photos`. Нет пути — рисуется инициал. */
  photo?: string | null
  className?: string
}

/**
 * Кит: `Avatar / Size=34·40·48·72`.
 *
 * Аватар всегда нейтрален — цвет в этом продукте отвечает за состояние денег,
 * а не за вид объекта (`CONTRACT` №15). Поэтому у фотографии тот же волосяной
 * обод и та же подложка, что у инициала: подмена содержимого не меняет форму.
 *
 * Метка веса живёт **снаружи** компонента, в обёртке носителя: она про деньги
 * впереди, а не про человека, и от появления фотографии не меняется.
 */
export function Avatar({ size, name, initial, photo = null, className }: AvatarProps) {
  const cls = `${styles.avatar} ${styles['s' + size]} ${className || ''}`
  if (!photo) return <span className={cls} aria-hidden="true">{initial}</span>
  return (
    <span className={cls}>
      {/* Кадр квадратный и обрезан по лицу: круг не должен доучивать кадрирование. */}
      <img className={styles.photo} src={import.meta.env.BASE_URL + photo} alt={name}
           width={size} height={size} loading="lazy" />
    </span>
  )
}
