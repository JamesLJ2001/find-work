#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 data/recruitment_events.csv 生成：
1. dashboard/events.json：给本地看板使用
2. dashboard/recruitment.ics：给手机日历订阅/导入使用

用法：
    python scripts/make_calendar.py

注意：
- CSV 里的 date 使用 YYYY-MM-DD。
- 这里使用全天事件，提醒时间由手机日历 App 设置。
- 不依赖第三方库，方便在公司/家里/Actions 上都能跑。
"""

from __future__ import annotations

import csv
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVENTS_CSV = ROOT / "data" / "recruitment_events.csv"
DASHBOARD_DIR = ROOT / "dashboard"
EVENTS_JSON = DASHBOARD_DIR / "events.json"
ICS_FILE = DASHBOARD_DIR / "recruitment.ics"


def escape_ics_text(text: str) -> str:
    """转义 ICS 文本中的特殊字符。"""
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def load_events() -> list[dict]:
    """读取招聘事件 CSV。"""
    events: list[dict] = []
    with EVENTS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row.get("date"):
                continue
            events.append(row)
    return events


def write_events_json(events: list[dict]) -> None:
    """生成看板使用的 JSON。"""
    DASHBOARD_DIR.mkdir(parents=True, exist_ok=True)
    EVENTS_JSON.write_text(
        json.dumps(events, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def write_ics(events: list[dict]) -> None:
    """生成 ICS 日历文件。"""
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//find-work//Recruitment Calendar//CN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    for idx, event in enumerate(events, start=1):
        start = datetime.strptime(event["date"], "%Y-%m-%d")
        end = start + timedelta(days=1)
        uid = f"find-work-{event['company']}-{event['event']}-{event['date']}-{idx}@local"
        summary = f"{event['company']}：{event['event']}"
        description = (
            f"阶段：{event.get('stage', '')}\n"
            f"优先级：{event.get('priority', '')}\n"
            f"链接：{event.get('url', '')}\n"
            f"备注：{event.get('notes', '')}"
        )
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{escape_ics_text(uid)}",
                f"DTSTAMP:{now}",
                f"DTSTART;VALUE=DATE:{start.strftime('%Y%m%d')}",
                f"DTEND;VALUE=DATE:{end.strftime('%Y%m%d')}",
                f"SUMMARY:{escape_ics_text(summary)}",
                f"DESCRIPTION:{escape_ics_text(description)}",
                "END:VEVENT",
            ]
        )

    lines.append("END:VCALENDAR")
    # Keep generated output deterministic across Windows and Linux.  Using
    # newline="" avoids Windows turning each LF into CRLF during the write.
    with ICS_FILE.open("w", encoding="utf-8", newline="") as f:
        f.write("\n".join(lines) + "\n")


def main() -> None:
    events = load_events()
    write_events_json(events)
    write_ics(events)
    print(f"已生成：{EVENTS_JSON}")
    print(f"已生成：{ICS_FILE}")


if __name__ == "__main__":
    main()
