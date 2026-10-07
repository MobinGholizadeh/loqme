"""Server-side staged publication. Never replace immutable APKs or regress latest."""
import argparse
import hashlib
import json
import os
import re
import shutil
import tempfile
from pathlib import Path


def can_promote(candidate, current, deployed):
    return (candidate['sourceCommit'] == deployed['sourceCommit']
            and candidate['deploymentRunNumber'] == deployed['deploymentRunNumber']
            and (current is None or (candidate['versionCode'] > current['versionCode']
                 and candidate['deploymentRunNumber'] >= current['deploymentRunNumber'])))


def publish(stage, root, deployment_file, promote=False):
    import fcntl  # Publisher executes on the Linux production host.
    root.mkdir(parents=True, exist_ok=True)
    candidate = json.loads((stage / 'release.json').read_text())
    code = candidate['versionCode']
    assert isinstance(code, int) and 0 < code <= 2100000000
    assert candidate['versionName'] == f'1.1.{code}'
    assert candidate['minSdk'] == 21
    assert re.fullmatch('[a-f0-9]{40}', candidate['sourceCommit'])
    filename = f'loqme-v{code}.apk'
    assert candidate['apkUrl'] == f'https://loqme.shop/api/android/downloads/{filename}'
    apk = stage / filename
    assert hashlib.sha256(apk.read_bytes()).hexdigest() == candidate['sha256'], 'APK checksum mismatch'
    with (root / '.publish.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        deployed = json.loads(deployment_file.read_text())
        current = json.loads((root / 'latest.json').read_text()) if (root / 'latest.json').exists() else None
        assert can_promote(candidate, current, deployed), 'Refusing stale or duplicate Android promotion'
        destination = root / filename
        if destination.exists():
            assert hashlib.sha256(destination.read_bytes()).hexdigest() == candidate['sha256'], 'Immutable version collision'
        else:
            temporary = root / (filename + '.part')
            shutil.copyfile(apk, temporary)
            temporary.chmod(0o644)
            os.replace(temporary, destination)
        if promote:
            with tempfile.NamedTemporaryFile(mode='w', dir=root, prefix='.latest-', delete=False) as temporary:
                json.dump(candidate, temporary)
                temporary.flush()
                os.fsync(temporary.fileno())
            os.chmod(temporary.name, 0o644)
            os.replace(temporary.name, root / 'latest.json')
    print('Promoted Android update' if promote else 'Staged immutable APK')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--stage', type=Path, required=True)
    parser.add_argument('--root', type=Path, default=Path('/opt/loqme/android-releases'))
    parser.add_argument('--deployment-file', type=Path, default=Path('/opt/loqme/deployed-revision.json'))
    parser.add_argument('--promote', action='store_true')
    args = parser.parse_args()
    publish(args.stage, args.root, args.deployment_file, args.promote)
