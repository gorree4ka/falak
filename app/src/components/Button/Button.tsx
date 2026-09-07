import styles from './Button.module.css'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** secondary — выбранный из ряда равных (быстрая сумма); ghost — тихое действие без плашки. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'quiet'
  full?: boolean
}

export function Button({ variant = 'primary', full = false, children, ...rest }: ButtonProps) {
  return (
    <button className={`${styles.btn} ${styles[variant]} ${full ? styles.full : ''}`} {...rest}>
      {children}
    </button>
  )
}
