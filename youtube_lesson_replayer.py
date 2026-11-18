#!/usr/bin/env python3
"""
Replay vsdc_lesson.txt against eligible releases in stores.xlsx.

Files:
    stores.xlsx
    vsdc_lesson.txt
    manifest.txt (created automatically)

The manifest is the resume/skip ledger. Every catalogue marked DONE or
STOPPED_NO_CLIPBOARD is skipped on later runs. If the clipboard is empty
after the final copy-link click, the script records that catalogue and exits.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import pyperclip
from pynput import keyboard, mouse


STORES_FILE = Path("stores.xlsx")
LESSON_FILE = Path("vsdc_lesson.txt")
MANIFEST_FILE = Path("manifest.txt")
OUTPUT_FILE = Path("youtube_playlist_results.xlsx")

START_COUNTDOWN_SECONDS = 5
CYCLE_SECONDS = 5.0
CLIPBOARD_READ_DELAY = 0.25

REQUIRED_COLUMNS = [
    "Catalogue Number",
    "Release Artist",
    "Release Title",
    "Spotify URL",
    "Apple Music URL",
    "Traxsource URL",
]


def clean(value: Any) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def load_releases() -> list[dict[str, str]]:
    if not STORES_FILE.is_file():
        raise FileNotFoundError(f"Missing workbook: {STORES_FILE.resolve()}")

    # Read only stores.xlsx. Do not open releases.xlsx.
    frame = pd.read_excel(STORES_FILE, dtype=str).fillna("")

    missing = [name for name in REQUIRED_COLUMNS if name not in frame.columns]
    if missing:
        raise ValueError(
            "stores.xlsx is missing required columns: " + ", ".join(missing)
        )

    for name in REQUIRED_COLUMNS:
        frame[name] = frame[name].map(clean)

    # A non-empty Spotify URL is the eligibility gate.
    frame = frame[
        frame["Spotify URL"].ne("")
        & frame["Catalogue Number"].ne("")
        & frame["Release Artist"].ne("")
        & frame["Release Title"].ne("")
    ]

    return frame[REQUIRED_COLUMNS].to_dict(orient="records")


def load_manifest() -> dict[str, str]:
    """Read catalogue statuses already recorded; these are skipped on reruns."""
    statuses: dict[str, str] = {}

    if not MANIFEST_FILE.exists():
        return statuses

    with MANIFEST_FILE.open("r", encoding="utf-8-sig") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue

            fields = [part.strip() for part in line.split("|", 2)]
            if len(fields) >= 2 and fields[0]:
                statuses[fields[0]] = fields[1]

    return statuses


def append_manifest(catalogue: str, status: str, detail: str = "") -> None:
    """Append and flush one result immediately, so progress survives a stop."""
    is_new = not MANIFEST_FILE.exists() or MANIFEST_FILE.stat().st_size == 0

    with MANIFEST_FILE.open("a", encoding="utf-8", newline="") as handle:
        if is_new:
            handle.write("# Catalogue Number | Status | Timestamp (UTC) | Detail\n")

        timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        safe_detail = detail.replace("|", "/").replace("\n", " ").replace("\r", " ")
        handle.write(f"{catalogue} | {status} | {timestamp} | {safe_detail}\n")
        handle.flush()


def load_lesson() -> list[dict[str, Any]]:
    if not LESSON_FILE.is_file():
        raise FileNotFoundError(f"Missing lesson: {LESSON_FILE.resolve()}")

    actions: list[dict[str, Any]] = []

    with LESSON_FILE.open("r", encoding="utf-8-sig") as handle:
        for line_number, raw in enumerate(handle, start=1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue

            fields = [field.strip() for field in line.split("|")]

            try:
                kind = fields[0].upper()
                at = float(fields[1])
                if at < 0:
                    raise ValueError("timestamp cannot be negative")

                if kind == "CLICK":
                    if len(fields) != 5:
                        raise ValueError(
                            "expected CLICK|time|x|y|Button.left/right"
                        )
                    button = fields[4].replace("Button.", "").lower()
                    if button not in {"left", "right", "middle"}:
                        raise ValueError(f"unsupported mouse button: {fields[4]}")
                    actions.append({
                        "kind": "CLICK",
                        "at": at,
                        "x": int(float(fields[2])),
                        "y": int(float(fields[3])),
                        "button": button,
                    })

                elif kind == "KEY":
                    if len(fields) != 3:
                        raise ValueError("expected KEY|time|key")
                    actions.append({
                        "kind": "KEY",
                        "at": at,
                        "key": fields[2],
                    })
                else:
                    raise ValueError(f"unsupported action type: {kind}")

            except (IndexError, ValueError) as exc:
                raise ValueError(
                    f"Invalid lesson line {line_number}: {line}\n{exc}"
                ) from exc

    if not actions:
        raise ValueError("Lesson file contains no actions.")

    actions.sort(key=lambda item: item["at"])

    if actions[-1]["at"] > CYCLE_SECONDS:
        raise ValueError(
            f"Last lesson action is at {actions[-1]['at']}s, after the "
            f"{CYCLE_SECONDS}s cycle. Increase CYCLE_SECONDS."
        )

    if not any(a["kind"] == "KEY" and a.get("key") == "{QUERY}" for a in actions):
        raise ValueError("Lesson must contain KEY|time|{QUERY}.")

    if actions[-1]["kind"] != "CLICK":
        raise ValueError(
            "The final lesson action must be the click that copies the playlist link."
        )

    return actions


def perform_key(controller: keyboard.Controller, value: str, query: str) -> None:
    if value == "{QUERY}":
        controller.type(query)
        return

    if value.startswith("Key."):
        key_name = value.split(".", 1)[1]
        special = getattr(keyboard.Key, key_name, None)
        if special is None:
            raise ValueError(f"Unknown special key in lesson: {value}")
        controller.press(special)
        controller.release(special)
        return

    controller.type(value)


def replay_one(
    actions: list[dict[str, Any]],
    query: str,
    mouse_controller: mouse.Controller,
    keyboard_controller: keyboard.Controller,
) -> tuple[str, float]:
    started = time.perf_counter()

    # Clear clipboard first so a failed copy cannot reuse the previous URL.
    pyperclip.copy("")

    for index, action in enumerate(actions):
        due = started + action["at"]
        wait = due - time.perf_counter()
        if wait > 0:
            time.sleep(wait)

        if action["kind"] == "KEY":
            perform_key(keyboard_controller, action["key"], query)
        else:
            mouse_controller.position = (action["x"], action["y"])
            button = getattr(mouse.Button, action["button"])
            mouse_controller.click(button, 1)

            # The last action is the recorded Copy link click.
            if index == len(actions) - 1:
                time.sleep(CLIPBOARD_READ_DELAY)
                return pyperclip.paste().strip(), time.perf_counter() - started

    return "", time.perf_counter() - started


def save_results(rows: list[dict[str, str]]) -> None:
    pd.DataFrame(rows).to_excel(OUTPUT_FILE, index=False)


def main() -> None:
    releases = load_releases()
    manifest = load_manifest()
    lesson = load_lesson()

    # Anything present in the manifest is intentionally ignored on later runs,
    # including the catalogue at which the previous run stopped.
    pending = [
        release for release in releases
        if release["Catalogue Number"] not in manifest
    ]

    skipped = len(releases) - len(pending)

    print(f"Eligible releases in stores.xlsx: {len(releases)}")
    print(f"Already recorded in manifest and skipped: {skipped}")
    print(f"Remaining releases: {len(pending)}")
    print(f"Lesson actions loaded: {len(lesson)}")
    print(f"Manifest: {MANIFEST_FILE.resolve()}")
    print(f"Results: {OUTPUT_FILE.resolve()}")

    if not pending:
        print("Nothing to process. All eligible catalogues are already in manifest.txt.")
        return

    print()
    print("Switch to Chrome. Keep its window in the same display position and")
    print("resolution used when recording. Do not use mouse/keyboard during replay.")
    print("Press Ctrl+C in this terminal to stop safely.")
    print()

    for seconds in range(START_COUNTDOWN_SECONDS, 0, -1):
        print(f"Starting in {seconds}...")
        time.sleep(1)

    mouse_controller = mouse.Controller()
    keyboard_controller = keyboard.Controller()
    results: list[dict[str, str]] = []

    try:
        for number, release in enumerate(pending, start=1):
            catalogue = release["Catalogue Number"]
            query = f'{release["Release Artist"]} - {release["Release Title"]}'
            cycle_started = time.perf_counter()

            print(f"[{number}/{len(pending)}] {catalogue} — {query}")

            try:
                url, _elapsed = replay_one(
                    lesson, query, mouse_controller, keyboard_controller
                )
            except KeyboardInterrupt:
                raise
            except Exception as exc:
                append_manifest(catalogue, "ERROR", str(exc))
                results.append({
                    **release,
                    "YouTube Playlist URL": "",
                    "Status": f"Error: {exc}",
                })
                save_results(results)
                print(f"    ERROR: {exc}")
            else:
                if not url:
                    # Record the failed catalogue before exiting. It will be
                    # skipped on the next run, as requested.
                    append_manifest(
                        catalogue,
                        "STOPPED_NO_CLIPBOARD",
                        "Clipboard was empty after final copy-link click",
                    )
                    results.append({
                        **release,
                        "YouTube Playlist URL": "",
                        "Status": "Stopped: clipboard empty",
                    })
                    save_results(results)
                    print("    Clipboard empty. Stopping the script.")
                    print(f"    {catalogue} recorded in manifest.txt.")
                    break

                append_manifest(catalogue, "DONE", url)
                results.append({
                    **release,
                    "YouTube Playlist URL": url,
                    "Status": "Copied",
                })
                save_results(results)
                print(f"    Captured: {url}")

            # Maintain a five-second start-to-start cycle.
            remaining = CYCLE_SECONDS - (time.perf_counter() - cycle_started)
            if number < len(pending) and remaining > 0:
                time.sleep(remaining)

    except KeyboardInterrupt:
        print("\nInterrupted by user. Completed progress is already in manifest.txt.")

    finally:
        if results:
            save_results(results)

    print(f"\nRun results saved to {OUTPUT_FILE.resolve()}")
    print(f"Progress ledger saved to {MANIFEST_FILE.resolve()}")
    print("stores.xlsx was not modified.")


if __name__ == "__main__":
    main()
