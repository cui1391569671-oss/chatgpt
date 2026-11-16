#!/usr/bin/env python3
"""把 /api/project-core-information + /api/project-calendar 的数据整理成报表。

输入: .secrets/out/api-project-core-information.json / api-project-calendar.json
输出: projects-report.md, projects.csv（工作区根目录）
"""
import csv
import json
import os
import re

ROOT = os.getcwd()
OUT = os.environ.get("TRACKER_OUT") or os.path.join(ROOT, ".secrets", "out")


def load(name, default=None):
    p = os.path.join(OUT, name)
    if not os.path.exists(p):
        return default
    return json.load(open(p, encoding="utf-8"))


def first_line(s, n=90):
    s = (s or "").strip()
    if not s:
        return ""
    line = s.split("\n")[0]
    line = re.sub(r"^[^：:]*[：:]", "", line) if "：" in line[:20] or ":" in line[:20] else line
    line = line.strip("；; ")
    return line if len(line) <= n else line[: n - 1] + "…"


def efficiency_brief(s, n=60):
    s = (s or "").strip()
    m = re.search(r"(出入库合计≥?\s*[\d.,]+\s*托/小时|合计\s*[\d.,]+\s*托/小时)", s)
    return m.group(1) if m else first_line(s, n)


def money(v):
    return (v or "").strip()


def main():
    core = load("api-project-core-information.json", {"items": []})
    cal = load("api-project-calendar.json", {"items": [], "summary": {}})
    items = core.get("items", [])

    rows = []
    for it in items:
        b = it.get("budget") or {}
        rows.append({
            "项目代号": it.get("projectCode", ""),
            "项目名称": it.get("projectName", ""),
            "合同金额": money(it.get("contractAmount")),
            "已识别费用合计": b.get("identifiedSubtotal", ""),
            "预算合计": b.get("total", ""),
            "币种/口径": b.get("currency", ""),
            "费用复核": b.get("review", ""),
            "效率要求": efficiency_brief(it.get("efficiency")),
            "数据源工作表": it.get("sourceSheet", ""),
            "风险费用": b.get("risk", ""),
            "安装费": b.get("installation", ""),
            "运输费": b.get("transport", ""),
            "质保费": b.get("warranty", ""),
            "实施费": b.get("implementation", ""),
        })

    csv_path = os.path.join(ROOT, "projects.csv")
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["项目代号"])
        w.writeheader()
        w.writerows(rows)

    md = []
    md.append("# Tracker · Projects 视图数据\n")
    md.append(f"- 数据源：`{core.get('sourceTitle','')}`（Spreadsheet `{core.get('sourceSpreadsheetId','')}`）")
    md.append(f"- 同步日期：{core.get('syncedAt','')}　项目数：**{len(items)}**")
    s = cal.get("summary") or {}
    if s:
        md.append(f"- 日历侧汇总：进行中项目 {s.get('activeProjects','-')} 个／未结问题 {s.get('openIssues','-')} 条／逾期 {s.get('overdueIssues','-')} 条")
    md.append("")
    md.append("## 项目一览\n")
    md.append("| 代号 | 项目名称 | 合同金额 | 已识别费用合计 | 币种/口径 | 费用复核 | 效率要求 |")
    md.append("| --- | --- | --- | --- | --- | --- | --- |")
    for r in rows:
        md.append("| {项目代号} | {项目名称} | {合同金额} | {已识别费用合计} | {币种/口径} | {费用复核} | {效率要求} |".format(**r))
    md.append("")

    if cal.get("items"):
        md.append("## 项目日历（近期节点）\n")
        md.append("| 日期 | 项目 | 事项 | 状态 | 备注 |")
        md.append("| --- | --- | --- | --- | --- |")
        for c in sorted(cal["items"], key=lambda x: x.get("date", "")):
            md.append(f"| {c.get('date','')} | {c.get('project','')} | {c.get('title','')} | {c.get('status','')} | {(c.get('note') or '').replace('|','／')} |")
        md.append("")

    md_path = os.path.join(ROOT, "projects-report.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    print("saved:", md_path)
    print("saved:", csv_path)
    print("\n".join(md[:40]))


if __name__ == "__main__":
    main()
