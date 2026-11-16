#!/usr/bin/env python3
"""登录 tracker 并抓取 /work?view=projects。

用法: python3 tools/tracker_fetch.py
凭据来源(按优先级): .secrets/tracker.json 中的 cookie, 或 username/password。
产物: .secrets/out/projects.html, .secrets/out/projects.txt
"""
import http.cookiejar
import json
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser

# 运行目录即工作目录；可用环境变量覆盖，避免把凭据写进仓库
ROOT = os.getcwd()
CANDIDATES = [
    os.environ.get("TRACKER_CREDENTIALS", ""),
    os.path.join(ROOT, "tracker-credentials.json"),
    os.path.join(ROOT, ".secrets", "tracker.json"),
]
CANDIDATES = [p for p in CANDIDATES if p]
SECRETS = next((p for p in CANDIDATES if os.path.exists(p)), CANDIDATES[0])
OUT = os.environ.get("TRACKER_OUT") or os.path.join(ROOT, ".secrets", "out")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"


class FormParser(HTMLParser):
    """收集 <input name value> 与 <form action method>。"""

    def __init__(self):
        super().__init__()
        self.inputs = {}
        self.action = None
        self.method = "post"

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "form":
            self.action = d.get("action")
            self.method = (d.get("method") or "post").lower()
        elif tag == "input" and d.get("name"):
            self.inputs[d["name"]] = d.get("value", "")


class TextExtractor(HTMLParser):
    SKIP = {"script", "style", "noscript", "template"}

    def __init__(self):
        super().__init__()
        self.depth = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.depth += 1
        if tag in ("p", "div", "li", "tr", "h1", "h2", "h3", "h4", "br", "td", "th"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if not self.depth:
            t = data.strip()
            if t:
                self.parts.append(t + " ")

    def text(self):
        raw = "".join(self.parts)
        lines = [re.sub(r"\s+", " ", l).strip() for l in raw.split("\n")]
        return "\n".join(l for l in lines if l)


def build_opener(cookie_string=None):
    jar = http.cookiejar.CookieJar()
    ctx = ssl.create_default_context()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(jar), urllib.request.HTTPSHandler(context=ctx)
    )
    opener.addheaders = [("User-Agent", UA), ("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")]
    if cookie_string:
        # 手动把 "k=v; k2=v2" 注入 jar，随后同一 opener 会带上
        host = urllib.parse.urlsplit(BASE).hostname
        for pair in cookie_string.split(";"):
            if "=" not in pair:
                continue
            k, v = pair.split("=", 1)
            jar.set_cookie(http.cookiejar.Cookie(
                version=0, name=k.strip(), value=v.strip(), port=None, port_specified=False,
                domain=host, domain_specified=True, domain_initial_dot=False, path="/",
                path_specified=True, secure=True, expires=None, discard=False, comment=None,
                comment_url=None, rest={"HttpOnly": None}, rfc2109=False,
            ))
    return opener


def get(opener, url, data=None):
    if data is not None:
        body = urllib.parse.urlencode(data).encode()
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        req.add_header("Origin", BASE)
        req.add_header("Referer", BASE + "/work")
    else:
        req = urllib.request.Request(url, method="GET")
    try:
        with opener.open(req, timeout=30) as r:
            return r.status, r.geturl(), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, url, e.read().decode("utf-8", "replace")


def looks_logged_out(html):
    return "登录我的工作台" in html or 'action="/auth/login"' in html


def login(cfg):
    """按凭据登录，返回带会话的 opener；BASE 会被设置。"""
    global BASE
    BASE = cfg.get("base_url", "https://tracker.managementplatformlee.com").rstrip("/")
    cookie = (cfg.get("_方式2_直接给已登录的Cookie") or {}).get("cookie", "").strip()
    user = (cfg.get("_方式1_账号密码") or {}).get("username", "").strip()
    pwd = (cfg.get("_方式1_账号密码") or {}).get("password", "")
    if not cookie and not (user and pwd):
        sys.exit("凭据文件里还没有填用户名/密码或 cookie。")
    opener = build_opener(cookie or None)
    if cookie:
        return opener
    status, _, login_html = get(opener, BASE + "/work")
    form = FormParser()
    form.feed(login_html)
    data = {
        "username": user,
        "password": pwd,
        "csrf": form.inputs.get("csrf", ""),
        "next": "/work",
        "remember": "yes",
    }
    status, url, body = get(opener, BASE + (form.action or "/auth/login"), data)
    print(f"[login] POST -> {status} {url}", file=sys.stderr)
    if looks_logged_out(body):
        sys.exit("登录失败：仍停留在登录页（账号、密码或 CSRF 可能不对）。")
    return opener


def main():
    if not os.path.exists(SECRETS):
        sys.exit(f"缺少 {SECRETS}")
    cfg = json.load(open(SECRETS, encoding="utf-8"))
    target = cfg.get("target_path", "/work?view=projects")
    os.makedirs(OUT, exist_ok=True)
    opener = login(cfg)

    status, url, html = get(opener, BASE + target)
    print(f"[projects] GET {url} -> {status}, {len(html)} bytes")
    if looks_logged_out(html):
        sys.exit("取 Projects 时仍要求登录：cookie 无效或已过期。")

    with open(os.path.join(OUT, "projects.html"), "w", encoding="utf-8") as f:
        f.write(html)
    tx = TextExtractor()
    tx.feed(html)
    text = tx.text()
    with open(os.path.join(OUT, "projects.txt"), "w", encoding="utf-8") as f:
        f.write(text)
    print("[saved]", os.path.join(OUT, "projects.html"))
    print("--- 可见文本预览 ---")
    print(text[:4000])


if __name__ == "__main__":
    main()
