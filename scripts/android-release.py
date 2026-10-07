"""Inspect actual APK manifests and allocate monotonically increasing release versions."""
import argparse
import hashlib
import io
import json
import os
import re
import struct
import subprocess
import zipfile
from pathlib import Path


def manifest_attributes(apk):
    """Read Android binary XML without requiring a local Android SDK."""
    with zipfile.ZipFile(io.BytesIO(apk)) as archive:
        data = archive.read('AndroidManifest.xml')
    strings, elements = [], []
    position = 8
    while position < len(data):
        kind, header, size = struct.unpack_from('<HHI', data, position)
        if size < header or size == 0 or position + size > len(data):
            raise ValueError('Malformed manifest chunk')
        if kind == 1:
            count, _, flags, start, _ = struct.unpack_from('<5I', data, position + 8)
            def length(offset, utf8):
                if utf8:
                    value = data[offset]
                    return (((value & 127) << 8) | data[offset + 1], offset + 2) if value & 128 else (value, offset + 1)
                value = struct.unpack_from('<H', data, offset)[0]
                return (((value & 32767) << 16) | struct.unpack_from('<H', data, offset + 2)[0], offset + 4) if value & 32768 else (value, offset + 2)
            for index in range(count):
                offset = position + start + struct.unpack_from('<I', data, position + header + index * 4)[0]
                count_chars, offset = length(offset, bool(flags & 256))
                if flags & 256:
                    count_chars, offset = length(offset, True)
                strings.append(data[offset:offset + count_chars * (1 if flags & 256 else 2)].decode('utf-8' if flags & 256 else 'utf-16le'))
        elif kind == 0x102:
            _, name, attribute_start, attribute_size, count = struct.unpack_from('<IIHHH', data, position + 16)
            attrs = {}
            for index in range(count):
                offset = position + 16 + attribute_start + index * attribute_size
                _, key, raw, _, _, value_type, value = struct.unpack_from('<IIIHBBI', data, offset)
                if raw != 0xffffffff:
                    decoded = strings[raw]
                elif value_type == 3:
                    decoded = strings[value]
                else:
                    decoded = value
                attrs[strings[key]] = decoded
            elements.append((strings[name], attrs))
        position += size
    return elements


def version_code(apk):
    return int(next(attrs['versionCode'] for name, attrs in manifest_attributes(apk) if name == 'manifest'))


def next_version(releases, legacy_codes):
    codes = list(legacy_codes)
    for release in releases:
        match = re.fullmatch(r'android-v([1-9]\d*)', release['tag_name'])
        if match:
            codes.append(int(match[1]))
    code = max(codes, default=2) + 1
    if code > 2100000000:
        raise ValueError('Android versionCode exhausted')
    return code


def allocate():
    repository = os.environ['GITHUB_REPOSITORY']
    pages = json.loads(subprocess.check_output(['gh', 'api', '--paginate', '--slurp', f'repos/{repository}/releases?per_page=100']))
    releases = [release for page in pages for release in page]
    legacy_codes = []
    previous_apk, previous_code = None, 0
    for release in releases:
        if re.fullmatch(r'android-v[1-9]\d*', release['tag_name']):
            continue
        # Include all historical APKs, not just the current latest pointer.
        for asset in release['assets']:
            if asset['name'].endswith('.apk'):
                apk = subprocess.check_output(['gh', 'api', f'repos/{repository}/releases/assets/{asset["id"]}', '-H', 'Accept: application/octet-stream'])
                code = version_code(apk)
                legacy_codes.append(code)
                if code > previous_code:
                    previous_apk, previous_code = apk, code
    code = next_version(releases, legacy_codes)
    for item in releases:
        match = re.fullmatch(r'android-v([1-9]\d*)', item['tag_name'])
        if match and int(match[1]) > previous_code:
            asset = next((asset for asset in item['assets'] if asset['name'] == f'loqme-v{match[1]}.apk'), None)
            if asset:
                previous_apk = subprocess.check_output(['gh', 'api', f'repos/{repository}/releases/assets/{asset["id"]}', '-H', 'Accept: application/octet-stream'])
                previous_code = version_code(previous_apk)
    if previous_apk:
        previous_path = Path(os.environ['RUNNER_TEMP']) / 'previous-loqme.apk'
        previous_path.write_bytes(previous_apk)
        with open(os.environ['GITHUB_ENV'], 'a') as output:
            output.write(f'PREVIOUS_APK={previous_path}\n')
    with open(os.environ['GITHUB_ENV'], 'a') as output:
        output.write(f'ANDROID_VERSION_CODE={code}\nANDROID_VERSION_NAME=1.1.{code}\n')
    print(f'Allocated Android version 1.1.{code} ({code})')


def verify(apk, code, version, commit, deployment, aapt, output):
    elements = manifest_attributes(apk)
    root = next(attrs for name, attrs in elements if name == 'manifest')
    assert root['package'] == 'ir.loqme.app', 'Wrong release package'
    assert int(root['versionCode']) == code and root['versionName'] == version, 'Wrong compiled version'
    app = next(attrs for name, attrs in elements if name == 'application')
    assert not app.get('debuggable', False), 'Debuggable release'
    assert not app.get('usesCleartextTraffic', False), 'Cleartext enabled'
    metadata = {attrs['name']: attrs.get('value') for name, attrs in elements if name == 'meta-data'}
    assert metadata['android.support.customtabs.trusted.DEFAULT_URL'] == 'https://loqme.shop', 'Wrong launch URL'
    statements = json.loads(metadata['asset_statements'])
    assert any(item['target'].get('site') == 'https://loqme.shop' for item in statements), 'Wrong app-side trust'
    assert {attrs['host'] for name, attrs in elements if name == 'data' and 'host' in attrs} == {'loqme.shop'}, 'Wrong deep-link domain'
    assert any(name == 'activity' and attrs['name'] == 'ir.loqme.app.EntryActivity' and attrs.get('exported') for name, attrs in elements), 'Update entry is not exported'
    assert any(name == 'activity' and attrs['name'] == 'ir.loqme.app.LoqmeLauncherActivity' and not attrs.get('exported') for name, attrs in elements), 'Unsafe TWA entry'
    min_sdk = int(next(attrs['minSdkVersion'] for name, attrs in elements if name == 'uses-sdk'))
    assert min_sdk == 21, 'Unexpected minimum SDK'
    assert re.fullmatch(r'[0-9a-f]{40}', commit), 'Invalid source SHA'
    # Inspect compiled adaptive vector path and decoded legacy PNG pixels.
    from PIL import Image, ImageChops
    with zipfile.ZipFile(io.BytesIO(apk)) as archive:
        manifest = subprocess.check_output([aapt, 'dump', 'badging', str(output / 'loqme.apk')], text=True)
        assert 'application-icon-' in manifest, 'Missing compiled icon'
        for density in ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']:
            for basename in ['ic_launcher', 'ic_launcher_round']:
                files = [name for name in archive.namelist() if re.fullmatch(rf'res/mipmap-{density}(?:-v\d+)?/{basename}\.png', name)]
                assert len(files) == 1, 'Missing density icon'
                actual = Image.open(io.BytesIO(archive.read(files[0]))).convert('RGBA')
                expected = Image.open(f'android/app/src/main/res/mipmap-{density}/{basename}.png').convert('RGBA')
                assert actual.size == expected.size and ImageChops.difference(actual, expected).getbbox(alpha_only=False) is None, 'Compiled icon differs from artwork'
        vector = next(name for name in archive.namelist() if name.endswith('/ic_launcher_foreground.xml'))
    tree = subprocess.check_output([aapt, 'dump', 'xmltree', str(output / 'loqme.apk'), vector], text=True)
    path_data = re.search(r'android:pathData="([^"]+)"', Path('android/app/src/main/res/drawable/ic_launcher_foreground.xml').read_text())[1]
    assert path_data in tree, 'Wrong compiled adaptive icon'
    digest = hashlib.sha256(apk).hexdigest()
    filename = f'loqme-v{code}.apk'
    (output / filename).write_bytes(apk)
    release = dict(versionCode=code, versionName=version, minSdk=min_sdk,
                   apkUrl=f'https://loqme.shop/api/android/downloads/{filename}', sha256=digest,
                   sourceCommit=commit, deploymentRunNumber=deployment)
    (output / 'release.json').write_text(json.dumps(release, indent=2) + '\n')
    (output / 'SHA256SUMS').write_text(f'{digest}  {filename}\n')
    print(json.dumps(release, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['allocate', 'verify'])
    parser.add_argument('--aapt')
    parser.add_argument('--output', default='android-release')
    args = parser.parse_args()
    if args.command == 'allocate':
        allocate()
    else:
        folder = Path(args.output)
        verify((folder / 'loqme.apk').read_bytes(), int(os.environ['ANDROID_VERSION_CODE']),
               os.environ['ANDROID_VERSION_NAME'], os.environ['RELEASE_SHA'],
               int(os.environ['DEPLOYMENT_RUN_NUMBER']), args.aapt, folder)
