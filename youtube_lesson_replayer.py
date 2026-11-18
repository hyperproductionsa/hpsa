#!/usr/bin/env python3
"""
Replay vsdc_lesson.txt against eligible releases in stores.xlsx.

Required files in the working directory:
    stores.xlsx
    vsdc_lesson.txt

Lesson format:
    CLICK|0.0|1152|148|Button.left
    CLICK|0.2|1152|148|Button.left
    KEY|0.6|{QUERY}
    KEY|1.0|Key.enter
    CLICK|4.0|1450|256|Button.right
    CLICK|4.2|1510|436|Button.left

{QUERY} becomes "Release Artist - Release Title".

Only rows with a non-empty Spotify URL are processed. The script reads
stores.xlsx but never modifies it. Results are saved incrementally to
youtube_playlist_results.xlsx.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import pandas as pd
import pyperclip
from pynput import keyboard, mouse


STORES_FILE = Path("stores.xlsx")
LESSON_FILE = Path("vsdc_lesson.txt")
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

    # Spotify URL is the eligibility gate. Also require fields needed to search
    # and identify the result.
    frame = frame[
        frame["Spotify URL"].ne("")
        & frame["Catalogue Number"].ne("")
        & frame["Release Artist"].ne("")
        & frame["Release Title"].ne("")
    ]

    return frame[REQUIRED_COLUMNS].to_dict(orient="records")


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

    # Other KEY values are typed literally.
    controller.type(value)


def replay_one(
    actions: list[dict[str, Any]],
    query: str,
    mouse_controller: mouse.Controller,
    keyboard_controller: keyboard.Controller,
) -> tuple[str, float]:
    started = time.perf_counter()

    # Prevent a failed copy from reusing the previous release's clipboard URL.
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

            # The final action is the recorded Copy link click.
            if index == len(actions) - 1:
                time.sleep(CLIPBOARD_READ_DELAY)
                copied = pyperclip.paste().strip()
                return copied, time.perf_counter() - started

    return "", time.perf_counter() - started


def save_results(rows: list[dict[str, str]]) -> None:
    pd.DataFrame(rows).to_excel(OUTPUT_FILE, index=False)


def main() -> None:
    releases = load_releases()
    lesson = load_lesson()

    if not releases:
        print("No eligible rows: no rows have a Spotify URL and complete release details.")
        return

    print(f"Eligible releases from stores.xlsx: {len(releases)}")
    print(f"Lesson actions loaded: {len(lesson)}")
    print(f"Output: {OUTPUT_FILE.resolve()}")
    print()
    print("Switch to Chrome. Keep the window maximised in the same display setup")
    print("used when recording. Do not use the mouse or keyboard during replay.")
    print("Press Ctrl+C in this terminal to stop safely.")
    print()

    for seconds in range(START_COUNTDOWN_SECONDS, 0, -1):
        print(f"Starting in {seconds}...")
        time.sleep(1)

    mouse_controller = mouse.Controller()
    keyboard_controller = keyboard.Controller()
    results: list[dict[str, str]] = []

    try:
        for number, release in enumerate(releases, start=1):
            catalogue = release["Catalogue Number"]
            query = f'{release["Release Artist"]} - {release["Release Title"]}'
            cycle_started = time.perf_counter()

            print(f"[{number}/{len(releases)}] {catalogue} — {query}")

            try:
                url, elapsed = replay_one(
                    lesson, query, mouse_controller, keyboard_controller
                )

                status = "Copied" if url else "Clipboard empty"
                results.append({
                    **release,
                    "YouTube Playlist URL": url,
                    "Status": status,
                })
                save_results(results)

                if url:
                    print(f"    {url}")
                else:
                    print("    WARNING: clipboard was empty after the copy click.")

            except KeyboardInterrupt:
                raise
            except Exception as exc:
                results.append({
                    **release,
                    "YouTube Playlist URL": "",
                    "Status": f"Error: {exc}",
                })
                save_results(results)
                print(f"    ERROR: {exc}")
                elapsed = time.perf_counter() - cycle_started

            # Schedule the next release at a five-second start-to-start interval.
            remaining = CYCLE_SECONDS - (time.perf_counter() - cycle_started)
            if number < len(releases) and remaining > 0:
                time.sleep(remaining)

    except KeyboardInterrupt:
        print("\nStopped. Saving completed results...")

    finally:
        if results:
            save_results(results)

    print(f"\nSaved {len(results)} result(s) to {OUTPUT_FILE.resolve()}")
    print("stores.xlsx was not modified.")


if __name__ == "__main__":
    main()
