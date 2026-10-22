"""Provision a missing server-owned runtime password without printing or rotating it."""
import os
import re
import secrets
import sys
import tempfile
from pathlib import Path


def prepare(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    matches = re.findall(r"^DATABASE_RUNTIME_PASSWORD=(.*)$", text, re.MULTILINE)
    if matches:
        value = matches[0].strip().strip("\"'")
        if len(matches) != 1 or not re.fullmatch(r"[A-Za-z0-9_-]{24,}", value) or value.startswith("REPLACE_"):
            raise ValueError("Invalid existing runtime password; explicit repair is required")
        return False
    content = text.rstrip() + "\nDATABASE_RUNTIME_PASSWORD=" + secrets.token_urlsafe(32) + "\n"
    descriptor, staged = tempfile.mkstemp(prefix=".env.rls.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(staged, 0o600)
        os.replace(staged, path)
    finally:
        if os.path.exists(staged):
            os.unlink(staged)
    return True


if __name__ == "__main__":
    try:
        created = prepare(Path(sys.argv[1] if len(sys.argv) > 1 else ".env"))
        print("Runtime database password prepared" if created else "Existing runtime database password retained")
    except (OSError, ValueError):
        sys.exit("Runtime password setup failed; no secret values are logged")
