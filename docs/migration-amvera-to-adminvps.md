# Перенос parallaxmusic.ru с Amvera на AdminVPS

Пошаговая инструкция под проект: **Next.js 16**, **Node 20**, **pnpm**, **SQLite** (`/data/app.db`), файлы в `/data/uploads`, порт **3000**.

---

## Что переносим

| Что | Где на Amvera | Где на VPS |
|-----|---------------|------------|
| База | `/data/app.db` | `/data/app.db` |
| Загрузки (аудио, обложки) | `/data/uploads/` | `/data/uploads/` |
| Код | Git / деплой Amvera | `/var/www/parallaxmusic` |
| Секреты | переменные в панели Amvera | файл `.env` на VPS |
| Cron | задачи в Amvera | `crontab` на VPS |

Домен по умолчанию в коде: `https://parallaxmusic.ru`.

---

## Рекомендуемая конфигурация VPS (AdminVPS)

- **ОС:** Ubuntu 24.04
- **Маркетплейс:** не установлен
- **DDoS L7+CDN:** не подключено
- **Тариф:** Start (4 CPU / 8 GB / 80 GB NVMe)
- **Бэкапы:** еженедельный (бесплатно) — дополнение, не замена ручного бэкапа `/data`

---

## Этап 0. Подготовка (до переключения DNS)

### 0.1. Запиши всё с Amvera

В панели Amvera: проект → **переменные окружения** — скопируй все в блокнот.

Типичный список для этого проекта:

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://parallaxmusic.ru

ADMIN_PASSWORD=...
CRON_SECRET=...
SUBSCRIPTION_REMINDER_SECRET=...

YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_RETURN_URL=...
YOOKASSA_SAVE_PAYMENT_METHOD=...
YOOKASSA_WEBHOOK_IP_WHITELIST=...
YOOKASSA_RECEIPT_VAT_CODE=...
YOOKASSA_SKIP_RECEIPT=...

RESEND_API_KEY=...
RESEND_FROM_EMAIL=...

TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

TURNSTILE_SECRET_KEY=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
NEXT_PUBLIC_TURNSTILE_ENABLED=...

NEXT_PUBLIC_YANDEX_METRIKA_ID=...

MUSIC_STATS_IMPORT_TOKEN=...
```

На VPS можно **не** ставить `AMVERA_DATA_PATH` — достаточно папки `/data` (код в `lib/db.ts` и `lib/tracks.ts` подхватит её автоматически, если каталог существует).

### 0.2. Скачай данные с Amvera

Нужны **`/data/app.db`** и вся папка **`/data/uploads`**.

Варианты:

- Файловый менеджер / бэкап в панели Amvera
- SSH/консоль Amvera (если есть) → `tar` + `scp`
- Скачать `app.db` и `uploads` отдельно

Сохрани на ПК, например: `C:\backup-amvera\`.

### 0.3. Запиши cron с Amvera

| Задача | URL | Метод |
|--------|-----|--------|
| Очистка черновиков | `/api/cron/upload-drafts-cleanup?secret=CRON_SECRET` | GET |
| Списание подписок | `/api/cron/subscription-billing` | POST, заголовок `Authorization: Bearer CRON_SECRET` |
| Напоминания о подписке | `/api/admin/subscriptions/expiring?secret=SUBSCRIPTION_REMINDER_SECRET` | GET |

---

## Этап 1. Первый вход на VPS

После оплаты AdminVPS пришлёт: **IP**, **логин** (часто `root`), **пароль**.

### Windows: SSH

PowerShell:

```powershell
ssh root@ТВОЙ_IP_СЕРВЕРА
```

При первом входе: `yes`, затем пароль.

Смени пароль root:

```bash
passwd
```

---

## Этап 2. Базовая настройка Ubuntu 24.04

```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx \
  build-essential python3 ufw
```

Файрвол:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

Папка для постоянных данных (как на Amvera):

```bash
mkdir -p /data/uploads
chmod 755 /data
```

---

## Этап 3. Node.js 20 и pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v    # v20.x
npm -v

corepack enable
corepack prepare pnpm@latest --activate
pnpm -v

npm install -g pm2
```

---

## Этап 4. Перенос данных с Amvera на VPS

### С Windows на VPS

PowerShell на **своём ПК**:

```powershell
scp C:\backup-amvera\app.db root@ТВОЙ_IP:/data/app.db
scp -r C:\backup-amvera\uploads root@ТВОЙ_IP:/data/
```

### Проверка на сервере

```bash
ls -lh /data/app.db
du -sh /data/uploads
```

---

## Этап 5. Код проекта на сервере

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/IvanKuzmin383/parallax-music-site_2.git parallaxmusic
cd parallaxmusic
```

Если репозиторий приватный — настрой SSH-ключ на GitHub или deploy token.

### Файл `.env`

```bash
nano /var/www/parallaxmusic/.env
```

Вставь все переменные из Amvera. Обязательно:

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://parallaxmusic.ru
```

Сохранить: `Ctrl+O`, Enter, `Ctrl+X`.

### Установка и сборка

```bash
cd /var/www/parallaxmusic
pnpm install
pnpm build
```

Сборка может занять 5–15 минут.

Тестовый запуск:

```bash
pnpm start
```

В другом окне SSH или с ПК:

```bash
curl -I http://ТВОЙ_IP:3000
```

Остановить тест: `Ctrl+C`.

### PM2 — постоянный запуск

```bash
cd /var/www/parallaxmusic
pm2 start pnpm --name parallaxmusic -- start
pm2 save
pm2 startup
```

Команда `pm2 startup` выведет строку вида `sudo env PATH=...` — **скопируй и выполни её**.

```bash
pm2 status
pm2 logs parallaxmusic --lines 50
```

---

## Этап 6. Nginx + HTTPS

```bash
nano /etc/nginx/sites-available/parallaxmusic
```

```nginx
server {
    listen 80;
    server_name parallaxmusic.ru www.parallaxmusic.ru;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

`client_max_body_size 100M` — под загрузки до **80 MB** аудио в API.

Активация:

```bash
ln -s /etc/nginx/sites-available/parallaxmusic /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

SSL (домен должен уже указывать на IP VPS — см. этап 7):

```bash
certbot --nginx -d parallaxmusic.ru -d www.parallaxmusic.ru
```

---

## Этап 7. DNS (переключение продакшена)

За день до миграции можно снизить **TTL** до 300–600 секунд у регистратора домена.

| Запись | Значение |
|--------|----------|
| `A` для `@` | IP VPS |
| `A` для `www` | тот же IP VPS |

Проверка с ПК:

```powershell
nslookup parallaxmusic.ru
```

---

## Этап 8. ЮKassa и внешние сервисы

### ЮKassa

1. **Webhook URL** → `https://parallaxmusic.ru/api/payments/webhook`
2. Если включён whitelist IP (`YOOKASSA_WEBHOOK_IP_WHITELIST`) — добавь IP VPS:

```bash
curl -4 ifconfig.me
```

### Остальное

- **Cloudflare Turnstile** — ключи обычно без изменений
- **Resend / Telegram** — те же ключи из `.env`

---

## Этап 9. Cron на VPS

```bash
crontab -e
```

Пример (подставь свои секреты; время UTC — подстрой под Москву):

```cron
# Очистка черновиков — каждый час
0 * * * * curl -fsS "https://parallaxmusic.ru/api/cron/upload-drafts-cleanup?secret=CRON_SECRET" >/dev/null

# Списание подписок — раз в сутки
0 3 * * * curl -fsS -X POST -H "Authorization: Bearer CRON_SECRET" "https://parallaxmusic.ru/api/cron/subscription-billing" >/dev/null

# Напоминания о подписке — раз в день (если использовал на Amvera)
0 7 * * * curl -fsS "https://parallaxmusic.ru/api/admin/subscriptions/expiring?secret=SUBSCRIPTION_REMINDER_SECRET" >/dev/null
```

Проверка:

```bash
curl "https://parallaxmusic.ru/api/cron/upload-drafts-cleanup?secret=CRON_SECRET"
```

Ожидается JSON с `"ok": true`.

---

## Этап 10. Чеклист «всё работает»

- [ ] Главная, блог, смартлинки
- [ ] Регистрация / вход в кабинет
- [ ] Загрузка аудио и обложки
- [ ] Старые треки открываются (файлы из `/data/uploads`)
- [ ] Оплата и webhook (статус заказа меняется)
- [ ] Письма (сброс пароля)
- [ ] Админка
- [ ] `pm2 status` — `online`
- [ ] После `reboot` сайт поднимается (`pm2 startup` выполнен)

---

## Этап 11. Отключить Amvera

Только когда **2–3 дня** всё стабильно на VPS:

1. Финальный бэкап `/data` с Amvera
2. Остановить / удалить проект на Amvera

---

## Обновление сайта в будущем

```bash
cd /var/www/parallaxmusic
git pull
pnpm install
pnpm build
pm2 restart parallaxmusic
```

---

## Частые проблемы

| Симптом | Что проверить |
|---------|----------------|
| 502 Bad Gateway | `pm2 status`, `pm2 logs` — упал Node |
| Сайт без стилей | `NEXT_PUBLIC_SITE_URL`, нужен `pnpm build` после смены env |
| Пустая БД / нет треков | нет `/data/app.db` или права доступа |
| 413 при загрузке | в nginx `client_max_body_size 100M` |
| Платежи не приходят | webhook ЮKassa, IP whitelist, HTTPS |
| Ошибка `better-sqlite3` при install | `build-essential python3`, снова `pnpm install` |

---

## Минимизация простоя

1. Поднять всё на VPS, проверить по **IP** (`http://IP:3000`) или через `hosts` на ПК
2. Синхронизировать `/data` с Amvera **в последний раз**
3. Переключить DNS
4. Через 1–2 часа проверить критичное, затем отключить Amvera
