import os, time, html, json, hmac, hashlib, threading, sqlite3, requests
from urllib.parse import parse_qsl
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ["BOT_TOKEN"]
URL = os.environ.get("WEBAPP_URL", "https://zayber.skffmassage.com/")
ADMIN_ID = int(os.environ.get("ADMIN_ID", "7308147004"))
DB_PATH = os.environ.get("DB_PATH", "/opt/open-bot/users.db")
API = f"https://api.telegram.org/bot{TOKEN}/"

db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.execute("""CREATE TABLE IF NOT EXISTS users(
  tg_id INTEGER PRIMARY KEY, username TEXT, tg_name TEXT, name TEXT, age INTEGER, gender TEXT,
  state TEXT DEFAULT 'name', created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_seen TEXT)""")
if "city" not in [r[1] for r in db.execute("PRAGMA table_info(users)")]:
    db.execute("ALTER TABLE users ADD COLUMN city TEXT")
db.commit()
lock = threading.RLock()


def call(method, **kw):
    try:
        return requests.post(API + method, json=kw, timeout=40).json()
    except Exception as e:
        print("err", method, e, flush=True)
        return {}


def get_user(u):
    """Возвращает state пользователя; создаёт запись и уведомляет админа о новом."""
    uid = u["id"]
    with lock:
        row = db.execute("SELECT state FROM users WHERE tg_id=?", (uid,)).fetchone()
        if not row:
            db.execute("INSERT INTO users(tg_id,username,tg_name) VALUES(?,?,?)",
                       (uid, u.get("username"), u.get("first_name")))
            row = ("name",)
            uname = f"@{u['username']}" if u.get("username") else f"{u.get('first_name', '')} (без username)"
            call("sendMessage", chat_id=ADMIN_ID, text=f"Новый юзер {uname}\nID: {uid}")
        db.execute("UPDATE users SET last_seen=CURRENT_TIMESTAMP, username=? WHERE tg_id=?", (u.get("username"), uid))
        db.commit()
        return row[0]


def set_field(uid, **kw):
    with lock:
        cols = ",".join(f"{k}=?" for k in kw)
        db.execute(f"UPDATE users SET {cols} WHERE tg_id=?", (*kw.values(), uid))
        db.commit()


def app_btn(text, p=None):
    return {"text": text, "web_app": {"url": URL + (f"?p={p}" if p else "")}}


def kb_main():
    return {"inline_keyboard": [[app_btn("Открыть")]]}


PROBLEMS = [("fight", "Страх драться"), ("people", "Боюсь людей"), ("women", "Страх женщин"),
            ("selfesteem", "Неуверенность"), ("money", "Нет денег"), ("lazy", "Лень"),
            ("lonely", "Одиночество"), ("anxiety", "Тревога"), ("hopeless", "Тупик"),
            ("manifest", "Манифестация")]


def kb_problems():
    rows, row = [], []
    for pid, title in PROBLEMS:
        row.append(app_btn(title, pid))
        if len(row) == 2:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append([app_btn("Открыть всё приложение")])
    return {"inline_keyboard": rows}


WELCOME = ("<b>Open</b> — навигатор по жизни.\n\n"
           "Выбери, что тебя тревожит, — и я подскажу <b>конкретные шаги</b>, "
           "а также какие <b>фильмы, сериалы и книги</b> посмотреть, чтобы прокачать нужное качество: "
           "смелость, дисциплину, спокойствие, уверенность.\n\nНажми кнопку ниже")


def send(chat, text, **kw):
    call("sendMessage", chat_id=chat, text=text, parse_mode="HTML", **kw)


def handle(m):
    chat = m["chat"]["id"]
    text = (m.get("text") or "").strip()
    get_user(m["from"])  # регистрирует нового пользователя и уведомляет админа
    if text.startswith("/problems"):
        send(chat, "Что тебя сейчас беспокоит? Выбери тему", reply_markup=kb_problems())
    else:
        u = m["from"]
        nick = f"@{u['username']}" if u.get("username") else u.get("first_name", "")
        send(chat, f"Привет, {html.escape(nick)}!", reply_markup=kb_main())


# ---------- API для мини-приложения ----------
def check_init_data(init_data):
    try:
        d = dict(parse_qsl(init_data, keep_blank_values=True))
        h = d.pop("hash")
        s = "\n".join(f"{k}={v}" for k, v in sorted(d.items()))
        key = hmac.new(b"WebAppData", TOKEN.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(hmac.new(key, s.encode(), hashlib.sha256).hexdigest(), h):
            return None
        return json.loads(d["user"])
    except Exception:
        return None


class Api(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def reply(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        except Exception:
            return self.reply({"error": "bad"}, 400)
        user = check_init_data(data.get("initData", ""))
        if not user:
            return self.reply({"error": "auth"}, 403)
        state = get_user(user)
        if self.path.endswith("/me"):
            return self.reply({"registered": state == "done"})
        if self.path.endswith("/register"):
            name = str(data.get("name", "")).strip()[:40]
            city = str(data.get("city", "")).strip()[:60]
            age = data.get("age")
            if not name or not city or not isinstance(age, int) or not 10 <= age <= 99:
                return self.reply({"error": "invalid"}, 400)
            set_field(user["id"], name=name, age=age, city=city, state="done")
            return self.reply({"registered": True})
        self.reply({"error": "nf"}, 404)


def run_api():
    ThreadingHTTPServer(("127.0.0.1", 8061), Api).serve_forever()


def setup():
    call("setChatMenuButton", menu_button={"type": "web_app", "text": "Open", "web_app": {"url": URL}})
    call("setMyCommands", commands=[{"command": "start", "description": "Open"},
                                    {"command": "problems", "description": "Выбрать тему, что тревожит"}])
    call("setMyDescription", description="")


def main():
    setup()
    threading.Thread(target=run_api, daemon=True).start()
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
