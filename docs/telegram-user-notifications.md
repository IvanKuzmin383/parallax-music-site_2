# Telegram-уведомления для артистов

Отдельный бот (не staff `TELEGRAM_BOT_TOKEN`). Колокольчик в кабинете всегда получает все события; в Telegram - только выбранные типы. AI-анализ релиза в Telegram **не** отправляется.

## Env на сервере

```bash
# Токен бота от @BotFather
TELEGRAM_USER_BOT_TOKEN=123456:ABC...

# Username бота без @
TELEGRAM_USER_BOT_USERNAME=YourParallaxBot

# Секрет для webhook (произвольная длинная строка)
TELEGRAM_USER_BOT_WEBHOOK_SECRET=длинный-случайный-секрет
```

Staff-бот (`TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`) не трогать - он для внутренних алертов.

## Миграция

```bash
pnpm db:migrate
# или на сервере ваш обычный скрипт миграций
```

Файл: `migrations/039_cabinet_telegram_notify.sql`.

## Webhook

После деплоя один раз (подставьте токен и домен):

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_USER_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://parallaxmusic.ru/api/telegram/user-bot/webhook\",
    \"secret_token\": \"${TELEGRAM_USER_BOT_WEBHOOK_SECRET}\",
    \"allowed_updates\": [\"message\"]
  }"
```

Проверка: `getWebhookInfo`.

## Поведение

1. Кабинет → Настройки → Уведомления → Подключить
2. Код на 15 минут + deep link `t.me/Bot?start=CODE`
3. Пользователь пишет код боту → привязка `telegram_chat_id`
4. Тумблеры: мастер + релизы / оплаты / выводы / роялти
5. Отключить - сбрасывает привязку

## Типы → TG

| Событие колокольчика | В Telegram |
|----------------------|------------|
| `release_status`, `release_moderation_note` | если «Релизы» |
| `payment_success` | если «Оплаты» |
| `withdrawal_status` | если «Выводы» |
| `royalty_to_wallet` | если «Роялти» |
| `release_ai_analysis` | никогда |
