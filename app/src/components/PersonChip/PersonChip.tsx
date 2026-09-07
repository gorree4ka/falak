import { Avatar } from '../Avatar'
import styles from './PersonChip.module.css'

export interface PersonChipProps {
  name: string
  initial: string
  meta: string
  /** Метка появляется, только если впереди есть резерв на этого человека. */
  reserve?: 'hard' | 'soft' | null
  /** Кадр человека. Нет кадра — остаётся инициал: у группы лица не бывает. */
  photo?: string | null
  onClick?: () => void
}

export function PersonChip({ name, initial, meta, reserve = null, photo = null, onClick }: PersonChipProps) {
  return (
    <button type="button" className={styles.chip} onClick={() => onClick?.()}>
      <span className={styles.avatarWrap}>
        <Avatar size={48} name={name} initial={initial} photo={photo} />
        {reserve && <span className={reserve === 'hard' ? styles.stateHard : styles.stateSoft} />}
      </span>
      <span className={`${styles.name} ds-body-sm-medium`}>{name}</span>
      <bdi className={`${styles.meta} ds-mono-sm`}>{meta}</bdi>
    </button>
  )
}

export function AddPersonChip({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button type="button" className={styles.chip} onClick={() => onClick?.()}>
      <span className={styles.avatarWrap}>
        <span className={styles.add}>+</span>
      </span>
      <span className={`${styles.name} ds-body-sm-medium`}>{label}</span>
    </button>
  )
}
