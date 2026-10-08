"""Installation/upgrade and launch smoke on a disposable CI emulator, never a user phone."""
import os
import json
import hashlib
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
import urllib.request
from pathlib import Path


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, stderr=subprocess.STDOUT)


def screen_tree():
    adb('shell', 'uiautomator', 'dump', '/sdcard/loqme-window.xml')
    return adb('shell', 'cat', '/sdcard/loqme-window.xml')


def tap(node):
    bounds = [int(value) for value in re.findall(r'\d+', node.attrib['bounds'])]
    adb('shell', 'input', 'tap', str((bounds[0] + bounds[2]) // 2), str((bounds[1] + bounds[3]) // 2))


evidence = Path(os.environ.get('ANDROID_EVIDENCE_DIR', 'android-device-evidence'))
evidence.mkdir(parents=True, exist_ok=True)
(evidence / 'chrome-package.txt').write_text(adb('shell', 'dumpsys', 'package', 'com.android.chrome'))
# Complete the browser's first-run screen only on this disposable emulator.
# Do not bypass Digital Asset Links or suppress real browser security UI.
adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'https://loqme.shop', 'com.android.chrome')
time.sleep(5)
for attempt in range(15):
    tree = screen_tree()
    (evidence / f'browser-setup-{attempt}.xml').write_text(tree)
    nodes = list(ET.fromstring(tree).iter('node'))
    consent = next((node for node in nodes if node.attrib.get('text') == 'Accept & continue'), None)
    if consent is not None:
        metrics = next((node for node in nodes if node.attrib.get('class') == 'android.widget.CheckBox' and node.attrib.get('checked') == 'true'), None)
        if metrics is not None:
            tap(metrics)
        tap(consent)
    else:
        skip = next((node for node in nodes if node.attrib.get('text', '').casefold() in ('no thanks', 'use without an account')), None)
        if skip is None:
            if any(node.attrib.get('resource-id') == 'com.android.chrome:id/url_bar' for node in nodes):
                break
        else:
            tap(skip)
    time.sleep(3)
else:
    raise AssertionError('Chrome onboarding did not reach a browser tab')
time.sleep(3)
adb('shell', 'am', 'force-stop', 'com.android.chrome')


apk = sys.argv[1]
package = 'ir.loqme.app' if os.environ.get('DEPLOYMENT_RUN_NUMBER', '0') != '0' else 'ir.loqme.app.debug'
previous = os.environ.get('PREVIOUS_APK')
if previous and package == 'ir.loqme.app':
    assert 'Success' in adb('install', previous), 'Previous signed release did not install'
    assert 'Success' in adb('install', '-r', apk), 'Signed upgrade was rejected'
    (evidence / 'upgrade.txt').write_text(adb('shell', 'dumpsys', 'package', package))
    assert 'Success' in adb('uninstall', package)
assert 'Success' in adb('install', apk), 'Clean installation failed'
details = adb('shell', 'dumpsys', 'package', package)
(evidence / 'installed.txt').write_text(details)
if 'ANDROID_VERSION_CODE' in os.environ:
    assert re.search(r'versionCode=' + os.environ['ANDROID_VERSION_CODE'] + r'\b', details)
adb('logcat', '-c')
launch = adb('shell', 'am', 'start', '-W', '-n', package + '/ir.loqme.app.EntryActivity')
assert 'Status: ok' in launch, launch
time.sleep(8)
log = adb('logcat', '-d')
assert not re.search(r'FATAL EXCEPTION[^\n]*\n[^\n]*Process: ' + re.escape(package), log), 'App launch crashed'
(evidence / 'launch.txt').write_text(launch)
(evidence / 'browser-packages.txt').write_text(adb('shell', 'pm', 'list', 'packages'))
(evidence / 'screen.png').write_bytes(subprocess.check_output(['adb', 'exec-out', 'screencap', '-p']))
tree = screen_tree()
(evidence / 'screen.xml').write_text(tree)
later = next((node for node in ET.fromstring(tree).iter('node') if node.attrib.get('text') == 'بعداً'), None)
if later is not None:
    tap(later)
    time.sleep(5)
    adb('shell', 'am', 'force-stop', package)
    adb('shell', 'am', 'start', '-W', '-n', package + '/ir.loqme.app.EntryActivity')
    time.sleep(4)
    assert 'بعداً' not in screen_tree(), 'Dismissed update prompted again on same day'
    (evidence / 'after-dismissal.png').write_bytes(subprocess.check_output(['adb', 'exec-out', 'screencap', '-p']))
adb('shell', 'am', 'force-stop', package)
link = adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', 'https://loqme.shop/explore', package)
assert 'Status: ok' in link, link
(evidence / 'deep-link.txt').write_text(link)
time.sleep(5)
(evidence / 'deep-link.png').write_bytes(subprocess.check_output(['adb', 'exec-out', 'screencap', '-p']))

# Clear only this disposable app's data so offline entry exercises a fresh check.
adb('shell', 'am', 'force-stop', package)
adb('shell', 'pm', 'clear', package)
adb('shell', 'svc', 'wifi', 'disable')
adb('shell', 'svc', 'data', 'disable')
try:
    adb('logcat', '-c')
    adb('shell', 'am', 'start', '-W', '-n', package + '/ir.loqme.app.EntryActivity')
    time.sleep(5)
    activity = adb('shell', 'dumpsys', 'activity', 'activities')
    resumed = '\n'.join(line for line in activity.splitlines() if 'mResumedActivity' in line)
    assert 'EntryActivity' not in resumed, 'Offline check blocked native launch'
    offline_log = adb('logcat', '-d')
    assert not re.search(r'FATAL EXCEPTION[^\n]*\n[^\n]*Process: ' + re.escape(package), offline_log), 'Offline launch crashed'
    (evidence / 'offline.txt').write_text(resumed)
    (evidence / 'offline.png').write_bytes(subprocess.check_output(['adb', 'exec-out', 'screencap', '-p']))
finally:
    adb('shell', 'svc', 'wifi', 'enable')
    adb('shell', 'svc', 'data', 'enable')
(evidence / 'acceptance.json').write_text(json.dumps({'updatePromptObserved': later is not None, 'offlineLaunchPassed': True}))
print('Clean installation, signed upgrade (when available), launch and deep link passed.')

if package.endswith('.debug'):
    # Also inspect the real public signed app; a debug signer cannot prove TWA trust.
    with urllib.request.urlopen('https://loqme.shop/api/android/latest', timeout=15) as response:
        published = json.load(response)
    code = published['versionCode']
    assert isinstance(code, int) and code > 0
    url = f'https://loqme.shop/api/android/downloads/loqme-v{code}.apk'
    assert published['apkUrl'] == url
    with urllib.request.urlopen(url, timeout=30) as response:
        binary = response.read()
    assert hashlib.sha256(binary).hexdigest() == published['sha256']
    public_apk = evidence / f'loqme-v{code}.apk'
    public_apk.write_bytes(binary)
    environment = {**os.environ, 'DEPLOYMENT_RUN_NUMBER': 'published', 'ANDROID_VERSION_CODE': str(code),
                   'ANDROID_EVIDENCE_DIR': str(evidence / 'published')}
    environment.pop('PREVIOUS_APK', None)
    subprocess.run([sys.executable, __file__, str(public_apk)], env=environment, check=True)
