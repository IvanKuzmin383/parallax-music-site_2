# Режим технических работ

Два слоя: приложение (Next.js) и nginx (если Node не отвечает).

## 1. Next.js (`MAINTENANCE_MODE`)

В `.env` на сервере:

```bash
MAINTENANCE_MODE=1
# опционально: обход для админов
MAINTENANCE_BYPASS_SECRET=длинный-секрет
# опционально: Retry-After в секундах (по умолчанию 3600)
# MAINTENANCE_RETRY_AFTER=3600
```

Затем:

```bash
pm2 restart parallaxmusic --update-env
```

Все страницы показывают стилизованную `/maintenance` (HTTP 503 + `Retry-After`).

API (в том числе payment webhooks) и статика не блокируются.

### Обход для себя

После включения откройте один раз:

`https://ваш-домен/?maintenance_bypass=ВАШ_СЕКРЕТ`

Поставится cookie на сутки, сайт снова доступен только вам.

### Выключить

```bash
# в .env: MAINTENANCE_MODE=0  (или удалить строку)
pm2 restart parallaxmusic --update-env
```

Превью страницы без режима: `/maintenance`.

## 2. Nginx (когда приложение лежит)

См. фрагмент `docs/nginx-maintenance.conf`.

```bash
# включить
touch /var/www/parallaxmusic/maintenance.on
nginx -t && systemctl reload nginx

# выключить
rm -f /var/www/parallaxmusic/maintenance.on
nginx -t && systemctl reload nginx
```

Отдаётся `public/maintenance.html` со статусом 503.
