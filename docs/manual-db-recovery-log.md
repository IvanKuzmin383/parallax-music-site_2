# Журнал ручных правок БД (Selectel / миграция)

Сюда пишем всё, что внесли в прод-БД вручную (не через обычный webhook/UI), чтобы не потерять историю после аварии Yandex и переезда.

Формат записи:
- дата/время (МСК)
- зачем
- что сделали (таблицы / ключевые поля)
- проверка после

---

## 2026-10-11 — Fix pack после бэкапа (migel_65)

**Зачем:** оплата Fix пришла уже после дампа `parallaxmusic-db-20261007`, в восстановленной БД на Selectel заказа не было (уведомление в Telegram было).

**Источник:** скрин уведомления `#оплата #fix #кабинет`

| Поле | Значение |
|------|----------|
| Email | `migel_65@mail.ru` |
| Order ID | `473e8d54-0dbd-491c-887a-4c82a744bf99` |
| Payment ID | `9396099991` |
| Tracks | `1` |
| Amount | `500.00` |
| User ID (уже был в БД) | `7b200d4a-1d57-4158-a78d-a1b82246c2f0` |

**Что сделали (Selectel, `parallax_prod`):**
1. `INSERT` в `orders` — `fix_pack`, `status=paid`, `plan_id=fix`, `user_id` привязан, `paid_at=NOW()`.
2. `UPDATE cabinet_users` — `purchased_tracks_balance`: `0 → 1`.
3. `pending_fix_credits` не трогали (юзер уже зарегистрирован).

**Проверка:** заказ находится по id; баланс пользователя = 1.

---

## 2026-10-11 — Подписка Medium после бэкапа (rayvs07)

**Зачем:** оплата подписки после дампа; в БД на Selectel заказа не было. Пользователь ещё не регистрировался. Автопривязку (`pending_subscription_autopay` / RebillId) по решению не восстанавливали.

**Источник:** скрин уведомления "оплата подписки (пользователь ещё не зарегистрирован) (tbank)"

| Поле | Значение |
|------|----------|
| Email | `rayvs07@yandex.ru` |
| Order ID | `15a81870-3e77-42f6-9799-91b2326478bf` |
| Payment ID | `9396197310` |
| Тариф | Medium (`plan_id=medium`) |
| Период | месяц × 1 |
| Amount | `549.00` |

**Что сделали (Selectel, `parallax_prod`):**
1. `INSERT` в `orders` — `subscription`, `status=paid`, `user_id=NULL`, `paid_at=NOW()`.
2. `pending_subscription_autopay` — не создавали.
3. `cabinet_users` — не создавали (подписка начислится при регистрации по paid-заказам).

**Проверка:** заказ есть по id/payment_id.

### Дополнение — ручное создание пользователя (тот же день)

Telegram "Новая регистрация" пришло не с Selectel (в `cabinet_users` записи не было). Создали вручную через app-скрипт:

| Поле | Значение |
|------|----------|
| User ID | `625c8427-d07f-4341-9728-a0152bbcaa0d` |
| Email | `rayvs07@yandex.ru` |
| Артист | `СтрелкоFF` |
| Подписка | Medium до `2026-11-11T17:15:04.033Z` (от paid_at заказа + 1 месяц) |
| Temp password | `5PvXN4JNrK5ELAi1` (пусть сменит через "Забыли пароль") |

Также: `cabinet_user_artist_subscriptions` слот Medium; `orders.user_id` привязан к заказу `15a81870-…`.

---

## 2026-10-11 — Продление Pro после бэкапа (liquidsource)

**Зачем:** оплата Pro после дампа; заказа не было. Юзер уже был в БД с истёкшим Pro (до 2026-08-14). Автосписание не подключали (по скрину не было).

**Источник:** скрин "Выполнена оплата подписки (tbank)", тариф Pro

| Поле | Значение |
|------|----------|
| Email | `liquidsource@rambler.ru` |
| User ID | `33c00b4f-23f6-4956-86c9-e413a9f2113c` |
| Артист | Voidspace |
| Order ID | `1eac3b25-17c9-4b76-a1f4-917369beafda` |
| Payment ID | `9396365635` |
| Тариф | Pro (`plan_id=pro`), месяц × 1 |
| Amount | `849.00` |
| Действует до (из уведомления) | 7 нояб. 2026 |

**Что сделали:**
1. `INSERT` в `orders` — subscription/paid, `user_id` привязан.
2. `UPDATE cabinet_users` — Pro, `subscription_expires_at = 2026-11-07T21:00:00+00`.
3. `INSERT` слот в `cabinet_user_artist_subscriptions` (Voidspace / Pro / до 2026-11-07).
4. Autopay / pending — не трогали.

**Проверка:** заказ есть; у пользователя Pro до 2026-11-07.

---

## 2026-10-11 — Продление Start (автосписание) после бэкапа (gulina-mari20)

**Зачем:** рекуррентное продление Start после дампа; заказа не было. Юзер был с Start до 2026-10-08 и уже с `tbank_rebill_id`.

**Источник:** скрин "Продление подписки / тарифа (tbank)"

| Поле | Значение |
|------|----------|
| Email | `gulina-mari20@yandex.ru` |
| User ID | `3b26e8ce-e0ae-4edb-a1b7-76ab427bdef8` |
| Артист | Мария Гулина |
| Order ID | `2ae7f914-5cde-4f4b-b641-4ea19ac4f896` |
| Payment ID | `9398327987` |
| Тариф | Start, месяц × 1 |
| Amount | `390.00` |
| Действует до | 8 нояб. 2026 |
| Rebill (уже был) | `1855984509` |

**Что сделали:**
1. `INSERT` в `orders` — subscription/paid, `is_recurring_renewal=true`, `user_id` привязан.
2. `UPDATE cabinet_users` — Start до `2026-11-08T21:00:00+00`, `autopay_next_charge_at` туда же.
3. `UPDATE` слот артиста — Start до 2026-11-08.

**Проверка:** заказ есть; Start и next charge до 2026-11-08; rebill на месте.

---

## 2026-10-11 — Medium после бэкапа (goyevgen1988, был Fix)

**Зачем:** оплата Medium после дампа; заказа не было. Юзер был на Fix без даты окончания.

**Источник:** скрин "Выполнена оплата подписки (tbank)", тариф Medium

| Поле | Значение |
|------|----------|
| Email | `goyevgen1988@gmail.com` |
| User ID | `9d47f20e-8ba1-40de-9265-c1c7a9bd9021` |
| Артист | Halina Hoi |
| Order ID | `29544c89-4b90-4117-8b5a-fc859973a100` |
| Payment ID | `9401682845` |
| Тариф | Medium, месяц × 1 |
| Amount | `549.00` |
| Действует до | 8 нояб. 2026 |

**Что сделали:**
1. `INSERT` в `orders` — subscription/paid, medium, `user_id` привязан.
2. `UPDATE cabinet_users` — Fix → Medium, `subscription_expires_at = 2026-11-08T21:00:00+00`.
3. `INSERT` слот `cabinet_user_artist_subscriptions` (Halina Hoi / Medium / до 2026-11-08).
4. Autopay — не трогали.

**Проверка:** заказ есть; Medium до 2026-11-08.

---

## 2026-10-11 — Ещё один Fix pack (migel_65)

**Зачем:** вторая оплата Fix после дампа; заказа не было. Юзер уже был, баланс был 1 (после предыдущей ручной записи).

| Поле | Значение |
|------|----------|
| Email | `migel_65@mail.ru` |
| User ID | `7b200d4a-1d57-4158-a78d-a1b82246c2f0` |
| Order ID | `32eb3924-fff3-4432-838f-1b1caeb87fcf` |
| Payment ID | `9402402994` |
| Tracks | `1` |
| Amount | `500.00` |

**Что сделали:**
1. `INSERT` в `orders` — fix_pack/paid.
2. `UPDATE cabinet_users` — `purchased_tracks_balance`: `1 → 2`.

**Проверка:** заказ есть; баланс = 2.

---

## 2026-10-11 — Fix pack после бэкапа (mrv777)

**Зачем:** оплата Fix после дампа; заказа не было. Юзер уже был (RU_SSEL / Fix), баланс был 0.

| Поле | Значение |
|------|----------|
| Email | `mrv777@internet.ru` |
| User ID | `9da6bf2f-75ba-4308-97bf-da9c7bcd8e65` |
| Order ID | `f49cd476-7370-4c13-8f69-12931aae47f6` |
| Payment ID | `9402586474` |
| Tracks | `1` |
| Amount | `500.00` |

**Что сделали:**
1. `INSERT` в `orders` — fix_pack/paid, `plan_id=fix`, `user_id` привязан, `paid_at=NOW()`.
2. `UPDATE cabinet_users` — `purchased_tracks_balance`: `0 → 1`.
3. `pending_fix_credits` не трогали.

**Проверка:** заказ есть по id/payment_id; баланс = 1.

---

## 2026-10-11 — Start + регистрация после бэкапа (nancy.johnson)

**Зачем:** оплата Start после дампа; заказа не было. Telegram "Новая регистрация" пришло не с Selectel — в `cabinet_users` записи не было. Autopay не восстанавливали.

| Поле | Значение |
|------|----------|
| Email | `nancy.johnson@moiseyvillage.live` |
| User ID | `f65431a7-267b-4ae3-bd10-c5961c01cd25` |
| Order ID | `12744e1a-a1dc-4d16-8d74-050e25b18833` |
| Payment ID | `9407350044` |
| Тариф | Start (`plan_id=start`), месяц × 1 |
| Amount | `390.00` |
| Действует до | `2026-11-11T18:19:23.587Z` |
| Артист | не указан (пусто) |
| Temp password | `fOZyCFAxXsri-EMJ` (пусть сменит через "Забыли пароль") |

**Что сделали:**
1. `INSERT` в `orders` — subscription/paid, start, `user_id` привязан, `paid_at=NOW()`.
2. `INSERT` в `cabinet_users` — Start до paid_at + 1 месяц.
3. `INSERT` слот `cabinet_user_artist_subscriptions` (Start, artist_name NULL).
4. Autopay / pending — не трогали.

**Проверка:** заказ есть; пользователь Start до 2026-11-11; слот есть.

---

## 2026-10-11 — Продление Pro после бэкапа (djforklift2606)

**Зачем:** оплата Pro после дампа; заказа не было. Юзер был с Pro до 2026-10-08 (истёк). Autopay/rebill не трогали.

| Поле | Значение |
|------|----------|
| Email | `djforklift2606@gmail.com` |
| User ID | `7c5727f7-cfd5-4e69-a449-8bc3e6a0d28f` |
| Артист | SLAVIC LIQUID |
| Order ID | `d5b0a57e-c66b-4d48-a0ed-c48ee8afdc69` |
| Payment ID | `9409039705` |
| Тариф | Pro, месяц × 1 |
| Amount | `849.00` |
| Действует до | 9 нояб. 2026 (`2026-11-09T21:00:00+00`) |

**Что сделали:**
1. `INSERT` в `orders` — subscription/paid, pro, `user_id` привязан.
2. `UPDATE cabinet_users` — Pro до `2026-11-09T21:00:00+00`.
3. `UPDATE` актуальный слот `c2f3090e-…` — Pro до 2026-11-09.
4. Autopay / rebill — не трогали.

**Проверка:** заказ есть; Pro до 2026-11-09.

---

## 2026-10-11 — AI мастеринг после бэкапа (dmitrycole5nikoff)

**Зачем:** оплата AI mastering после дампа; заказа не было. WAV на Selectel нет (каталог `ai-mastering-orders` пустой после переезда) — заказ в БД для очереди админки, файл нужно запросить у клиента.

| Поле | Значение |
|------|----------|
| Email / контакт | `dmitrycole5nikoff@yandex.ru` |
| User ID | `43599050-dd75-4487-ae21-853b2647b0cc` |
| Артист | Код Велеса |
| Order ID | `d11a250b-e3e9-4369-905d-6ff7863fcc31` |
| Payment ID | `9409196711` |
| Tracks | `1` — `Яга (2)_vol+1.5dB.wav` |
| Amount | `100.00` |

**Что сделали:**
1. `INSERT` в `orders` — `ai_mastering` / paid, `user_id` привязан, `service_details_json` с именами файлов.
2. `INSERT` в `service_fulfillments` — `fulfillment_status=new`.
3. Создали пустой каталог `/data/uploads/ai-mastering-orders/d11a250b-…` (WAV отсутствует).

**Проверка:** заказ и fulfillment есть; файлов в каталоге нет.

---

## 2026-10-11 — Fix pack после бэкапа (d4s.dasch)

**Зачем:** оплата Fix после дампа; заказа не было. Юзер уже был (Dashulya / Fix), баланс был 1.

| Поле | Значение |
|------|----------|
| Email | `d4s.dasch@yandex.ru` |
| User ID | `18dfc25f-fa44-4d4a-b11f-3c8f6a921138` |
| Order ID | `6497a740-ae60-4dd5-aee3-31272e6d96f2` |
| Payment ID | `9409743362` |
| Tracks | `1` |
| Amount | `500.00` |

**Что сделали:**
1. `INSERT` в `orders` — fix_pack/paid, `plan_id=fix`, `user_id` привязан.
2. `UPDATE cabinet_users` — `purchased_tracks_balance`: `1 → 2`.

**Проверка:** заказ есть; баланс = 2.

---

## 2026-10-11 — Продление Pro (автосписание) после бэкапа (kolosoff.vladislaw)

**Зачем:** рекуррентное продление Pro после дампа; заказа не было. Юзер был с Pro до 2026-09-26 и уже с `tbank_rebill_id`.

| Поле | Значение |
|------|----------|
| Email | `kolosoff.vladislaw@yandex.ru` |
| User ID | `f5656018-46b7-418a-bd63-6c732d44bbb2` |
| Артист | NikoGaD |
| Order ID | `8cb9afee-4991-44bf-89e5-53990e9430c5` |
| Payment ID | `9412191903` |
| Тариф | Pro, месяц × 1 |
| Amount | `849.00` |
| Действует до | 10 нояб. 2026 |
| Rebill (уже был) | `1847506203` |

**Что сделали:**
1. `INSERT` в `orders` — subscription/paid, `is_recurring_renewal=true`, `user_id` привязан.
2. `UPDATE cabinet_users` — Pro до `2026-11-10T21:00:00+00`, `autopay_next_charge_at` туда же.
3. `UPDATE` слот `9ada1783-…` — Pro до 2026-11-10.
4. Rebill — не трогали (уже был).

**Проверка:** заказ есть; Pro и next charge до 2026-11-10; rebill на месте.

---

## 2026-10-11 — Start + регистрация после бэкапа (webmichael)

**Зачем:** оплата Start после дампа; заказа не было. Telegram "Новая регистрация" пришло не с Selectel. Autopay не было.

| Поле | Значение |
|------|----------|
| Email | `webmichael@mail.ru` |
| User ID | `6dca9f3a-feac-442a-90c7-1ab08be585df` |
| Order ID | `943acc81-6f57-41ed-81a7-0c122209d7f8` |
| Payment ID | `9412438126` |
| Тариф | Start, месяц × 1 |
| Amount | `390.00` |
| Действует до | `2026-11-11T18:29:40.999Z` |
| Артист | не указан (пусто) |
| Temp password | `-PHKO-3TjaJHfrI4` (пусть сменит через "Забыли пароль") |

**Что сделали:**
1. `INSERT` в `orders` — subscription/paid, start, `user_id` привязан.
2. `INSERT` в `cabinet_users` — Start до paid_at + 1 месяц.
3. `INSERT` слот Start (artist_name NULL).
4. Autopay — не трогали.

**Проверка:** заказ есть; пользователь Start до 2026-11-11; слот есть.

---

## 2026-10-11 — Fix pack ×6 после бэкапа (a.mezhenov)

**Зачем:** оплата Fix после дампа; заказа не было. Юзер уже был (MavLaris / Fix), баланс был 0.

| Поле | Значение |
|------|----------|
| Email | `a.mezhenov@yandex.ru` |
| User ID | `7c6c34b7-676d-4137-a19e-f8f5214255f7` |
| Order ID | `327863ac-5516-49d1-8e0d-c2c6b5b8d94e` |
| Payment ID | `9415393591` |
| Tracks | `6` |
| Amount | `2400.00` |

**Что сделали:**
1. `INSERT` в `orders` — fix_pack/paid, tracks_count=6, `user_id` привязан.
2. `UPDATE cabinet_users` — `purchased_tracks_balance`: `0 → 6`.

**Проверка:** заказ есть; баланс = 6.

---

## 2026-10-11 — Pro + регистрация после бэкапа (topinskaaludmila)

**Зачем:** оплата Pro после дампа; заказа не было. Telegram "Новая регистрация" пришло не с Selectel. Autopay не восстанавливали.

| Поле | Значение |
|------|----------|
| Email | `topinskaaludmila@gmail.com` |
| User ID | `1f035361-e401-4fb2-a355-143c25ffda53` |
| Order ID | `bdfc8120-5c92-4172-aec3-e8da76c1c74a` |
| Payment ID | `9415721311` |
| Тариф | Pro, месяц × 1 |
| Amount | `849.00` |
| Действует до | `2026-11-11T18:33:43.207Z` |
| Артист | не указан (пусто) |
| Temp password | `VhDCy6vcCjJD6dg0` (пусть сменит через "Забыли пароль") |

**Что сделали:**
1. `INSERT` в `orders` — subscription/paid, pro, `user_id` привязан.
2. `INSERT` в `cabinet_users` — Pro до paid_at + 1 месяц.
3. `INSERT` слот Pro (artist_name NULL).
4. Autopay — не трогали.

**Проверка:** заказ есть; пользователь Pro до 2026-11-11; слот есть.
