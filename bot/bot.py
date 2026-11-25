import os, time, sqlite3, requests

TOKEN = os.environ["BOT_TOKEN"]
URL = os.environ.get("WEBAPP_URL", "https://zayber.skffmassage.com/")
API = f"https://api.telegram.org/bot{TOKEN}/"
ADMIN_ID = int(os.environ.get("ADMIN_ID", "7308147004"))
DB_PATH =os.environ.get("DB_PATH", "/opt/zayber-bot/users.db")
db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.execute("""CREATE TABLE IF NOT EXISTS users(
  tg_id INTEGER PRIMARY KEY, username TEXT, tg_name TEXT, name TEXT, age INTEGER, gender TEXT,
  state TEXT DEFAULT 'name', created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_seen TEXT)""")
db.commit()


def get_user(m_from):
    uid = m_from["id"]
    row = db.execute("SELECT state FROM users WHERE tg_id=?", (uid,)).fetchone()
    if not row:
        db.execute("INSERT INTO users(tg_id,username,tg_name) VALUES(?,?,?)",
                   (uid, m_from.get("username"), m_from.get("first_name")))
        db.commit()
        row = ("name",)
        uname = f"@{m_from['username']}" if m_from.get("username") else f"{m_from.get('first_name', '')} (без username)"
        call("sendMessage", chat_id=ADMIN_ID, text=f"🆕 Новый юзер {uname}\nID: {uid}")
    db.execute("UPDATE users SET last_seen=CURRENT_TIMESTAMP, username=? WHERE tg_id=?", (m_from.get("username"), uid))
    db.commit()
    return row[0]


def set_field(uid, **kw):
    cols = ",".join(f"{k}=?" for k in kw)
    db.execute(f"UPDATE users SET {cols} WHERE tg_id=?", (*kw.values(), uid))
    db.commit()

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


GENDER_KB = {"inline_keyboard": [[{"text": "👨 Мужской", "callback_data": "g:m"}, {"text": "👩 Женский", "callback_data": "g:f"}]]}


def finish(chat, name):
    call("sendMessage", chat_id=chat, text=f"Готово, {name}! 🔥\n\n" + WELCOME, parse_mode="HTML", reply_markup=kb_main())


def handle(m):
    chat = m["chat"]["id"]
    text = (m.get("text") or "").strip()
    state = get_user(m["from"])
    if state == "name":
        if text.startswith("/start") or not text or text.startswith("/"):
            call("sendMessage", chat_id=chat, text="Привет! 👋 Я «Путь» — помогу разобраться, что смотреть и читать, когда что-то тревожит.\n\nДавай познакомимся. <b>Как тебя зовут?</b>", parse_mode="HTML")
        else:
            set_field(m["from"]["id"], name=text[:40], state="age")
            call("sendMessage", chat_id=chat, text=f"Приятно, {text[:40]}! Сколько тебе <b>лет</b>?", parse_mode="HTML")
        return
    if state == "age":
        if text.isdigit() and 10 <= int(text) <= 99:
            set_field(m["from"]["id"], age=int(text), state="gender")
            call("sendMessage", chat_id=chat, text="Твой <b>пол</b>?", parse_mode="HTML", reply_markup=GENDER_KB)
        else:
            call("sendMessage", chat_id=chat, text="Напиши возраст числом, например 27")
        return
    if state == "gender":
        call("sendMessage", chat_id=chat, text="Выбери пол кнопкой 👇", reply_markup=GENDER_KB)
        return
    if text.startswith(("/start", "/menu", "/help")):
        call("sendMessage", chat_id=chat, text=WELCOME, parse_mode="HTML", reply_markup=kb_main())
    else:
        call("sendMessage", chat_id=chat, text="Что тебя сейчас беспокоит? Выбери тему 👇", reply_markup=kb_problems())


def handle_cb(cb):
    uid, chat = cb["from"]["id"], cb["message"]["chat"]["id"]
    call("answerCallbackQuery", callback_query_id=cb["id"])
    if cb.get("data", "").startswith("g:") and get_user(cb["from"]) == "gender":
        set_field(uid, gender=cb["data"][2:], state="done")
        name, age, gender, uname = db.execute("SELECT name,age,gender,username FROM users WHERE tg_id=?", (uid,)).fetchone()
        call("sendMessage", chat_id=ADMIN_ID, text=f"✅ Анкета заполнена: {name}, {age}, {'муж' if gender == 'm' else 'жен'}" + (f" — @{uname}" if uname else "") + f"\nID: {uid}")
        finish(chat, name)


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
        r = call("getUpdates", offset=offset, timeout=30, allowed_updates=["message", "callback_query"])
        for u in r.get("result", []):
            offset = u["update_id"] + 1
            if "message" in u or "callback_query" in u:
                try:
                    handle(u["message"]) if "message" in u else handle_cb(u["callback_query"])
                except Exception as e:
                    print("handle err", e, flush=True)
        if not r.get("ok", True):
            time.sleep(3)


if __name__ == "__main__":
    main()
