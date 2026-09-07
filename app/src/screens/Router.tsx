import { useSyncExternalStore } from 'react'

/**
 * Переключатель на хеше, без библиотеки: в зависимостях их четыре,
 * тянуть пятую ради галереи статичных экранов не за что.
 *
 * Адреса прототипа:
 *   `/`                       — приложение (главный экран)
 *   `/#/screens`              — галерея
 *   `/#/screen/<id>/<state>`  — один кадр в заданном состоянии
 *   `/#/ds`                   — витрина токенов
 */
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash.replace(/^#/, '') || '/',
    () => '/',
  )
}

export function go(route: string) {
  window.location.hash = route
}

export type Route =
  | { kind: 'app' }
  | { kind: 'gallery' }
  | { kind: 'ds' }
  | { kind: 'screen'; id: string; state?: string }

/** Разбор строки в адрес. Всё незнакомое — галерея: там видно, что вообще есть. */
export function parseRoute(route: string): Route {
  const parts = route.split('/').filter(Boolean)
  if (parts.length === 0) return { kind: 'app' }
  if (parts[0] === 'ds') return { kind: 'ds' }
  if (parts[0] === 'screen' && parts[1]) return { kind: 'screen', id: parts[1], state: parts[2] }
  return { kind: 'gallery' }
}
