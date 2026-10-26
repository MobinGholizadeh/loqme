"""Fresh, bounded UI hierarchy capture for disposable Android CI emulators."""
import subprocess
import time
import xml.etree.ElementTree as ET


DUMP_PATH = '/data/local/tmp/loqme-window.xml'


def capture_screen_tree(adb, evidence=None, attempts=5, sleep=time.sleep):
    """Retry transient UiAutomator startup/idle failures, never reuse an old dump."""
    failures = []
    for attempt in range(1, attempts + 1):
        output = ''
        try:
            adb('shell', 'rm', '-f', DUMP_PATH, timeout=10)
            output = adb('shell', 'uiautomator', 'dump', '--compressed', DUMP_PATH, timeout=20)
            tree = adb('shell', 'cat', DUMP_PATH, timeout=10)
            root = ET.fromstring(tree)
            if root.tag != 'hierarchy' or root.find('.//node') is None:
                raise ValueError('UI dump contains no hierarchy nodes')
            return tree
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ET.ParseError, ValueError) as error:
            detail = f'Attempt {attempt}/{attempts}: {error}\n{output}\n{getattr(error, "output", "") or ""}'
            failures.append(detail)
            if evidence is not None:
                (evidence / f'ui-dump-failure-{attempt}.txt').write_text(detail, encoding='utf-8')
            if attempt < attempts:
                sleep(attempt)
    raise RuntimeError('Unable to capture a fresh Android UI hierarchy; verification failed\n' + '\n'.join(failures))
