# Путь — Telegram-бот + Mini App
- `web/` — мини-приложение (статика, nginx): data.js — весь контент, app.js — логика.
- `bot/bot.py` — бот (long polling), токен в переменной BOT_TOKEN (/etc/zayber.env на сервере).
Деплой: `python deploy.py` (см. файл).
