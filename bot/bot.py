import os, time, requests

TOKEN = os.environ["BOT_TOKEN"]
URL = os.environ.get("WEBAPP_URL", "https://zayber.skffmassage.com/")
API = f"https://api.telegram.org/bot{TOKEN}/"

PROBLEMS = [("fight", "🥊 Страх драться"), ("people", "🫥 Боюсь людей"), ("women", "💔 Страх женщин"),
            ("selfesteem", "🪞 Неуверенность"), ("money", "💸 Нет денег"), ("lazy", "🛋 Лень"),
            ("lonely", "🌑 Одиночество"), ("anxiety", "🌪 Тревога"), ("hopeless", "⛓ Тупик"),
            ("manifest", "✨ Манифестация")]


def call(method, **kw):
    try:
        return requests.post(API + method, json=kw, timeout=40).json()
    except Exception as e:
        print("err", method, e, flush=True)
        return {}


def app_btn(text, p=None):
    return {"text": text, "web_app": {"url": URL + (f"?p={p}" if p else "")}}


def kb_main():
    return {"inline_keyboard": [[app_btn("🧭 Открыть «Путь»")]]}


def kb_problems():
    rows, row = [], []
    for pid, title in PROBLEMS:
        row.append(app_btn(title, pid))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([app_btn("📚 Открыть всё приложение")])
    return {"inline_keyboard": rows}


WELCOME = ("<b>Путь</b> — навигатор по жизни.\n\n"
           "Выбери, что тебя тревожит, — и я подскажу <b>конкретные шаги</b>, "
           "а также какие <b>фильмы, сериалы и книги</b> посмотреть, чтобы прокачать нужное качество: "
           "смелость, дисциплину, спокойствие, уверенность.\n\nНажми кнопку ниже 👇")


def handle(m):
    chat = m["chat"]["id"]
    text = (m.get("text") or "").strip()
    if text.startswith(("/start", "/menu", "/help")):
        call("sendMessage", chat_id=chat, text=WELCOME, parse_mode="HTML", reply_markup=kb_main())
    else:
        call("sendMessage", chat_id=chat, text="Что тебя сейчас беспокоит? Выбери тему 👇", reply_markup=kb_problems())


def setup():
    call("setChatMenuButton", menu_button={"type": "web_app", "text": "Путь", "web_app": {"url": URL}})
    call("setMyCommands", commands=[{"command": "start", "description": "Открыть «Путь»"},
                                    {"command": "problems", "description": "Выбрать тему, что тревожит"}])
    call("setMyDescription", description="Навигатор по жизни: выбери, что тревожит — получи шаги, фильмы, сериалы и книги, которые прокачают нужные качества.")


def main():
    setup()
    offset = 0
    print("bot started", flush=True)
    while True:
        r = call("getUpdates", offset=offset, timeout=30, allowed_updates=["message"])
        for u in r.get("result", []):
            offset = u["update_id"] + 1
            if "message" in u:
                try:
                    handle(u["message"])
                except Exception as e:
                    print("handle err", e, flush=True)
        if not r.get("ok", True):
            time.sleep(3)


if __name__ == "__main__":
    main()
