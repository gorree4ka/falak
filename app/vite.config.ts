import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  /*
    Сборка отдаётся с корня домена, поэтому пути к ассетам абсолютные.
    С относительным `./` страница по адресу вроде `/screens` искала бы
    скрипты в `/screens/assets/` — SPA-перезапись отдала бы им ту же
    страницу вместо файла, и экран остался бы пустым. То же и с фото:
    `BASE_URL` подставляется к `photos/...` в аватаре.
  */
  base: '/',
})
