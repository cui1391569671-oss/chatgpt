#!/usr/bin/env python3
"""登录 tracker 后按路径抓取接口/页面，把结果存到 .secrets/out/。

用法: python3 tools/tracker_api.py /api/project-core-information /api/project-calendar
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tracker_fetch as tf  # noqa: E402


def slug(path):
    s = re.sub(r"[^a-zA-Z0-9]+", "-", path).strip("-")
    return s or "root"


def main():
    paths = sys.argv[1:]
    if not paths:
        sys.exit("用法: python3 tools/tracker_api.py <path> [path...]")
    cfg = json.load(open(tf.SECRETS, encoding="utf-8"))
    opener = tf.login(cfg)
    os.makedirs(tf.OUT, exist_ok=True)

    for path in paths:
        url = path if path.startswith("http") else tf.BASE + path
        status, final, body = tf.get(opener, url)
        out = os.path.join(tf.OUT, slug(path) + ".raw")
        with open(out, "w", encoding="utf-8") as f:
            f.write(body)
        print(f"\n### {path} -> {status} {len(body)}b  saved={out}")
        try:
            data = json.loads(body)
            pretty = json.dumps(data, ensure_ascii=False, indent=2)
            print(pretty[:6000])
            with open(os.path.join(tf.OUT, slug(path) + ".json"), "w", encoding="utf-8") as f:
                f.write(pretty)
        except json.JSONDecodeError:
            print(body[:1500])


if __name__ == "__main__":
    main()
