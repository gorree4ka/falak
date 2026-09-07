# Промты на фотоассеты — Falak

Стиль — из `brand-direction.md`, копируется дословно и не сочиняется заново. Правила кадра и расстановки — навык `asset-prompts`.

**Нужно ровно три кадра.** Считано прогоном по секции `Screens` и по реестру прототипа, а не по памяти.

| Кто | Где стоит | Размер в кадре |
|---|---|---|
| **Нур** | шапка на пяти экранах: главный свёрнутый и раскрытый, 25 сентября, нехватка, первое открытие | круг 34 |
| **Мама · فاطمة** | чип получателя на главном; получатель на переводе; ряд выбора | круг 48 и 72 |
| **Юсуф** | чип получателя на главном; ряд выбора | круг 48 |

**Гамея остаётся буквой.** У круга коллег нет лица, и подставлять ему чьё-то — соврать о том, что это за объект. Аватар группы собран из инициала, как и был.

## Общий стиль — во все три промта дословно

> warm 35 mm documentary film portrait, soft diffused daylight from a window, matte skin with no gloss or beauty retouching, open shadows, fine film grain, limestone-sand background wall in `#EFE9DC` to `#D3CABA`, calm and precise mood, subject not smiling at the camera, everyday clothing, no jewellery glare. Square crop, head and shoulders, face fills about three fifths of the frame height, eyes on the upper third. No gold, no navy, no purple, no gradients, no HDR, no studio glamour lighting, no stock-photo expression.

**Про покрытие головы — решение, которое переворачивается одной строкой.** Нур — молодая инженер в Дубае, волосы не покрыты и просто убраны; мама в Каире — в мягком платке. Это правдоподобная пара поколений, а не типаж; если нужно иначе, меняется слово в поле `subject`, стиль не трогается.

## 01 · Нур — шапка приложения

```json
{
  "subject": "Egyptian woman, 29, structural engineer, calm and self-possessed, hair uncovered and simply tied back, plain warm-grey shirt, looking slightly past the camera, relaxed mouth, no smile",
  "scene": "plain limestone wall behind her, nothing else in frame",
  "style": "warm 35 mm documentary film portrait, matte skin, no beauty retouching, fine grain, limestone-sand palette #EFE9DC to #D3CABA, no gold, no navy, no purple, no gradients, no HDR, no studio glamour",
  "mood": "calm, precise, respectful, slightly austere",
  "lighting": "soft diffused daylight from a window at her left, open shadows, no specular highlights on skin",
  "camera": "85 mm equivalent, shallow but not creamy depth of field, square crop, head and shoulders, face about three fifths of frame height, eyes on the upper third",
  "aspect_ratio": "1:1"
}
```

## 02 · Мама · فاطمة — получатель перевода

```json
{
  "subject": "Egyptian woman, about 58, warm and composed, soft patterned headscarf in muted sand tones, plain dark clothing, looking slightly past the camera, gentle closed-mouth expression",
  "scene": "plain limestone wall of a Cairo flat behind her, nothing else in frame",
  "style": "warm 35 mm documentary film portrait, matte skin, visible skin texture and lines kept, no beauty retouching, fine grain, limestone-sand palette #EFE9DC to #D3CABA, no gold, no navy, no purple, no gradients, no HDR, no studio glamour",
  "mood": "calm, warm, unhurried, dignified",
  "lighting": "soft diffused daylight from a window at her right, open shadows, no specular highlights on skin",
  "camera": "85 mm equivalent, shallow but not creamy depth of field, square crop, head and shoulders, face about three fifths of frame height, eyes on the upper third",
  "aspect_ratio": "1:1"
}
```

## 03 · Юсуф — брат, Дубай

```json
{
  "subject": "Egyptian man, about 25, younger brother, short dark hair, short beard, plain olive t-shirt, looking slightly past the camera, neutral open expression, no smile",
  "scene": "plain limestone wall behind him, nothing else in frame",
  "style": "warm 35 mm documentary film portrait, matte skin, no beauty retouching, fine grain, limestone-sand palette #EFE9DC to #D3CABA, no gold, no navy, no purple, no gradients, no HDR, no studio glamour",
  "mood": "calm, direct, unposed",
  "lighting": "soft diffused daylight from a window at his left, open shadows, no specular highlights on skin",
  "camera": "85 mm equivalent, shallow but not creamy depth of field, square crop, head and shoulders, face about three fifths of frame height, eyes on the upper third",
  "aspect_ratio": "1:1"
}
```

## ✅ Расставлено 7 сентября 2026

Кадры пришли 1254×1254, кроп под круг посчитан по замеру (голова 0.70 высоты, центр головы на 0.46 — под подбородком остаётся плечо). Верх у всех трёх выходил за кадр на 5–6 %, добор сделан продлением верхней строки: фон там ровная стена, шва не видно.

- оригиналы — `assets/photos/{nour,mama,yusuf}.png`
- прототип — `app/public/photos/*.webp` (19–22 КБ вместо 350 КБ PNG)
- макет — заливкой в 27 аватарах, **PNG, а не WebP**: Figma принимает WebP на загрузке, но такой заливки не рисует — круги остаются пустыми. Проверено дважды, лечится перезаливкой PNG.
- гамея и «إضافة» остались знаками; их мастера в ките пришлось откатывать вручную — автоподстановка по имени рядом приняла заготовку «ماما» за настоящее имя.
