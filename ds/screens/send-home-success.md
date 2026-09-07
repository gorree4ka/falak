# Screen/SendHomeSuccess — composition map

**Кадр:** 393×852, FIXED × FIXED
**Локаль:** ar, RTL · **Тема:** Night
**Анатомия:** `ia/wireframes/send-home.md`, состояние `success` · **Числа:** `ia/demo-data.md` §2, §7, §7.2
**Final Screen Node ID:** `372:380` · секция Screens `28:2`, x 4150

## Принцип

Отдельный кадр, а не тост: отправка денег семье — событие месяца, и у него есть своё место. Подтверждение типографическое — крупное слово, а не галочка в зелёном круге (`CONTRACT` №21: культура через поведение, не через орнамент, и №15: нефрит только там, где речь о состоянии денег). Главное число экрана — не «сколько ушло», а **что осталось свободным**: 6,840, столько же, сколько утром, потому что исполнен план.

## Composition

### StatusBar — 44
### Header — 56
Без кнопки назад: путь завершён, из экрана выходят действиями внизу.

### Confirmation — FILL × HUG, по центру, padding-top `space-12`
- `marking` — «SENT · 9:41» `DS/Mono/xs` `text-reserved`, трекинг 14 % — гравировка момента
- `title` — «تم الإرسال» `DS/Heading/xl` `text-primary`. Крупнее не нужно: слово держит кадр расстоянием, а не кеглем; крупным здесь остаётся число
- `sent` — ряд `Amount / Tone=free` **1,200** «درهم» размером `DS/Display/amount-lg`; под ним «16,104 جنيه» `DS/Body/base` `text-muted`
- `arrival` — «تصل إلى ماما اليوم قبل 19:40» `DS/Body/sm` `text-muted`

### Plan — плашка `surface-raised`, radius `radius-md`, padding `space-4`, как на SendHome
- справа: «يبقى حرًا» `DS/Body/sm` `text-muted`, `Amount / Tone=free` **6,840**, подпись «نصيب اليوم 364 · نُفِّذ محجوز 25 سبتمبر مبكرًا» `DS/Body/sm` `text-faint`
- слева: `Orbit/Mini` 96 — метка 25-го снята, 12 сентября получило метку пройденного события (составной глиф с меткой «сегодня»). Число свободных пересчитывается на глазах — `motion-count`, свойство оживления

### Actions — прижаты к низу, padding-inline `space-gutter`, зазор `space-3`, снизу `space-safe-bottom`
- `Button / State=primary` «تم» — FILL, `touch-min`
- `Button / State=ghost` «إرسال لشخص آخر» — FILL

## Edge cases

Состояний у экрана нет: успех — одно состояние. Вариант «сверх плана» отличается только числами (5,640 · 297, метка 25-го на месте) и в Figma не собирается: разница описана в `send-home.md`, в React — пропсом.

## Tokens used

`surface-canvas` · `surface-raised` · `text-primary` · `text-muted` · `text-faint` · `text-reserved` · `money-free` · `action-primary` · `text-on-action` · `space-3/4/12/gutter/safe-bottom` · `radius-md` · `touch-min`

## Компоненты из кита

`Amount / Tone=free ×2` · `Orbit/Mini` · `Button / State=primary` · `Button / State=ghost`
