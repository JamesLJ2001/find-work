#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
输出未来 N 天内的招聘提醒。
可以被 GitHub Actions、Hermes/OpenClaw 或本地 crontab 调用。
"""

from __future__ import annotations

import csv
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVENTS_CSV = ROOT / "data" / "recruitment_events.csv"
LOOKAHEAD_DAYS = 14


def main() -> None:
    today = date.today()
    deadline = today + timedelta(days=LOOKAHEAD_DAYS)
    rows = []
    with EVENTS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            if not row.get("date"):
                continue
            d = datetime.strptime(row["date"], "%Y-%m-%d").date()
            if today <= d <= deadline:
                rows.append((d, row))

    rows.sort(key=lambda item: (item[0], item[1].get("priority", "")))

    if not rows:
        print(f"未来 {LOOKAHEAD_DAYS} 天暂无招聘提醒。")
        return

    print(f"未来 {LOOKAHEAD_DAYS} 天招聘提醒：")
    for d, row in rows:
        print(
            f"- {d} | {row['company']} | {row['event']} | "
            f"优先级：{row.get('priority', '')} | {row.get('url', '')}"
        )


if __name__ == "__main__":
    main()
