"""Деплой: SSH_PASS=... BOT_TOKEN=... python deploy.py  (BOT_TOKEN нужен только при первом запуске)"""
import sys; sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import os, sys, paramiko

HOST, USER = "84.200.33.70", "root"
DOMAIN = "zayber.skffmassage.com"
ROOT = os.path.dirname(os.path.abspath(__file__))

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=os.environ["SSH_PASS"], timeout=20)
sftp = c.open_sftp()


def run(cmd):
    i, o, e = c.exec_command(cmd, timeout=180)
    out, err = o.read().decode(errors="replace"), e.read().decode(errors="replace")
    print(f"$ {cmd[:90]}\n{out}{err}")
    return out


def put(local, remote):
    sftp.put(local, remote)


run("mkdir -p /var/www/zayber /opt/zayber-bot")
for f in os.listdir(os.path.join(ROOT, "web")):
    put(os.path.join(ROOT, "web", f), f"/var/www/zayber/{f}")
put(os.path.join(ROOT, "bot", "bot.py"), "/opt/zayber-bot/bot.py")

if os.environ.get("BOT_TOKEN"):
    with sftp.open("/etc/zayber.env", "w") as f:
        f.write(f"BOT_TOKEN={os.environ['BOT_TOKEN']}\nWEBAPP_URL=https://{DOMAIN}/\n")
    run("chmod 600 /etc/zayber.env")

unit = """[Unit]
Description=Zayber Telegram bot
After=network.target
[Service]
EnvironmentFile=/etc/zayber.env
ExecStart=/usr/bin/python3 /opt/zayber-bot/bot.py
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
"""
with sftp.open("/etc/systemd/system/zayber_bot.service", "w") as f:
    f.write(unit)

nginx = f"""server {{
    listen 80;
    server_name {DOMAIN};
    root /var/www/zayber;
    index index.html;
    gzip on;
    gzip_types text/css application/javascript;
    location / {{
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ /index.html;
    }}
}}
"""
if DOMAIN not in run("ls /etc/letsencrypt/live"):
    with sftp.open(f"/etc/nginx/sites-available/{DOMAIN}", "w") as f:
        f.write(nginx)
    run(f"ln -sf /etc/nginx/sites-available/{DOMAIN} /etc/nginx/sites-enabled/{DOMAIN}")
    run("nginx -t && systemctl reload nginx")
    run(f"certbot --nginx -d {DOMAIN} --non-interactive --agree-tos --register-unsafely-without-email --redirect")
else:
    print("cert already present, skipping nginx overwrite")

run("systemctl daemon-reload && systemctl enable zayber_bot && systemctl restart zayber_bot")
run("sleep 2; systemctl is-active zayber_bot; journalctl -u zayber_bot -n 5 --no-pager")
