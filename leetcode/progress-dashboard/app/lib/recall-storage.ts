"use client";

import { useSyncExternalStore } from "react";
import { mergeRecallProgress, readRecallProgress, withRecallRating } from "./review";
import type { RecallRecord } from "./review";

export const recallStorageKey = "leetcode-recall-v1";
const changedEvent = "leetcode-recall-changed";
let unsavedSnapshot: string | null = null;
let lastReadSnapshot = "";
let storageWarning = "";

function getSnapshot(): string | null {
  if (unsavedSnapshot !== null) return unsavedSnapshot;
  try {
    lastReadSnapshot = window.localStorage.getItem(recallStorageKey) ?? "";
    return lastReadSnapshot;
  } catch {
    storageWarning = "浏览器存储不可用，本次记录只能暂存；离开前请导出。";
    return lastReadSnapshot;
  }
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === recallStorageKey || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changedEvent, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changedEvent, listener);
  };
}

export function saveRecall(record: RecallRecord): boolean {
  let persistent: string;
  try {
    persistent = window.localStorage.getItem(recallStorageKey) ?? "";
  } catch {
    unsavedSnapshot = JSON.stringify(withRecallRating(
      readRecallProgress(unsavedSnapshot ?? lastReadSnapshot), record,
    ));
    storageWarning = "无法读取已有自评，本次先暂存，请导出记录备份。";
    window.dispatchEvent(new Event(changedEvent));
    return false;
  }
  const combined = mergeRecallProgress(readRecallProgress(persistent), readRecallProgress(unsavedSnapshot));
  const updated = withRecallRating(combined, record);
  const raw = JSON.stringify(updated);
  let saved = true;
  try {
    window.localStorage.setItem(recallStorageKey, raw);
    lastReadSnapshot = raw;
    unsavedSnapshot = null;
    storageWarning = "";
  } catch {
    unsavedSnapshot = raw;
    storageWarning = "本次自评尚未写入浏览器存储，请导出记录备份。";
    saved = false;
  }
  window.dispatchEvent(new Event(changedEvent));
  return saved;
}

export function useRecallProgress() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const progress = readRecallProgress(raw);
  let corrupt = false;
  if (raw) {
    try {
      const value = JSON.parse(raw);
      corrupt = value?.schemaVersion !== 1 || !value.records
        || typeof value.records !== "object" || Array.isArray(value.records);
    } catch { corrupt = true; }
  }
  return {
    progress,
    ready: raw !== null,
    warning: storageWarning || (corrupt ? "旧的自评数据无法读取，本次可以重新记录。" : ""),
  };
}
