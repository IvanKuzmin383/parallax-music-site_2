# Parallax Music Partner API

Документация для лейблов и партнёрских сервисов (Swagger UI).

## Локально

```bash
pnpm dev
```

Открыть: [http://localhost:3000/partners/api](http://localhost:3000/partners/api)

OpenAPI JSON: [http://localhost:3000/partner-api/openapi.json](http://localhost:3000/partner-api/openapi.json)

## Что покрывает

- Auth (`X-API-Key`) и профиль партнёра
- Артисты (много артистов в одном лейбл-кабинете)
- Релизы: create → cover/audio → submit → статусы модерации/дистрибуции
- Статистика стримов
- Webhooks смены статуса

Страница с `robots: noindex` — на индекс поиска не рассчитана, пока не решите публиковать.
