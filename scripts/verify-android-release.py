"""Fail closed unless the APK signer matches both committed and deployed trust."""
import argparse
import json
import re
import time
import urllib.request
from pathlib import Path


def verify(statements, fingerprint):
    return any(
        "delegate_permission/common.handle_all_urls" in statement.get("relation", [])
        and statement.get("target", {}).get("namespace") == "android_app"
        and statement["target"].get("package_name") == "ir.loqme.app"
        and fingerprint in [value.replace(":", "").lower() for value in
                            statement["target"].get("sha256_cert_fingerprints", [])]
        for statement in statements
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("certificate_output")
    parser.add_argument("--wait-seconds", type=int, default=0)
    args = parser.parse_args()
    text = Path(args.certificate_output).read_text()
    # SDK versions use different signer prefixes; the verified certificate digest
    # label is stable. Require exactly one signing certificate.
    matches = re.findall(r"certificate SHA-256 digest:\s*([a-fA-F0-9]{64})", text)
    if len(set(matches)) != 1:
        raise SystemExit("APK certificate was not verified by apksigner")
    fingerprint = matches[0].lower()
    statements = json.loads(Path("apps/web/public/.well-known/assetlinks.json").read_text())
    if not verify(statements, fingerprint):
        raise SystemExit("APK signer does not match the committed website association")
    deadline = time.monotonic() + args.wait_seconds
    while True:
        try:
            url = "https://loqme.shop/.well-known/assetlinks.json"
            request = urllib.request.Request(url, headers={"Cache-Control": "no-cache"})
            with urllib.request.urlopen(request, timeout=20) as response:
                if response.status == 200 and response.url == url and verify(json.load(response), fingerprint):
                    print("Release signer matches committed and live website trust.")
                    break
        except (OSError, ValueError):
            pass
        if time.monotonic() >= deadline:
            raise SystemExit("Website association is not deployed; refusing to publish an unverified APK")
        time.sleep(15)
