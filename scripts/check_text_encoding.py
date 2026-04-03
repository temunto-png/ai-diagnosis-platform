from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET_DIRS = ("src", ".github")
TARGET_SUFFIXES = {".ts", ".tsx", ".astro", ".json", ".md", ".mdx", ".yml", ".yaml"}
SUSPICIOUS_TOKENS = ("縺", "繧", "蜀", "逕ｻ", "險ｺ", "螟ｱ", "")


def iter_targets() -> list[Path]:
    paths: list[Path] = []
    for directory in TARGET_DIRS:
        for path in (ROOT / directory).rglob("*"):
            if path.is_file() and path.suffix in TARGET_SUFFIXES:
                paths.append(path)
    return paths


def main() -> int:
    failures: list[str] = []

    for path in iter_targets():
        text = path.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), start=1):
            if any(token in line for token in SUSPICIOUS_TOKENS):
                failures.append(f"{path.relative_to(ROOT)}:{line_number}: suspicious mojibake text")

    if failures:
        print("Detected suspicious mojibake markers:")
        print("\n".join(failures))
        return 1

    print("No suspicious mojibake markers detected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
