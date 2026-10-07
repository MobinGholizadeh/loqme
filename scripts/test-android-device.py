"""Installation/upgrade and launch smoke on a disposable CI emulator, never a user phone."""
import os
import re
import subprocess
import sys
import time
from pathlib import Path


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True, stderr=subprocess.STDOUT)


apk = sys.argv[1]
package = 'ir.loqme.app' if os.environ.get('DEPLOYMENT_RUN_NUMBER', '0') != '0' else 'ir.loqme.app.debug'
evidence = Path('android-device-evidence')
evidence.mkdir(exist_ok=True)
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
adb('shell', 'am', 'force-stop', package)
link = adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', 'https://loqme.shop/explore', package)
assert 'Status: ok' in link, link
(evidence / 'deep-link.txt').write_text(link)
print('Clean installation, signed upgrade (when available), launch and deep link passed.')
