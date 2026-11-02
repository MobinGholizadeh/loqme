import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, call

from android_device_ui import DUMP_PATH, capture_screen_tree


TREE = '<?xml version="1.0"?><hierarchy><node text="Accept &amp; continue" /></hierarchy>'


class ScreenCaptureTests(unittest.TestCase):
    def test_valid_fresh_dump(self):
        adb = Mock(side_effect=['', 'UI hierarchy dumped', TREE])
        self.assertEqual(capture_screen_tree(adb), TREE)
        self.assertEqual(adb.call_args_list, [
            call('shell', 'rm', '-f', DUMP_PATH, timeout=10),
            call('shell', 'uiautomator', 'dump', '--compressed', DUMP_PATH, timeout=20),
            call('shell', 'cat', DUMP_PATH, timeout=10),
        ])

    def test_missing_dump_after_success_exit_retries_and_records_output(self):
        missing = subprocess.CalledProcessError(1, ['adb', 'shell', 'cat'], output='No such file')
        adb = Mock(side_effect=['', 'ERROR: could not get idle state', missing, '', 'dumped', TREE])
        sleep = Mock()
        with tempfile.TemporaryDirectory() as directory:
            evidence = Path(directory)
            self.assertEqual(capture_screen_tree(adb, evidence, sleep=sleep), TREE)
            self.assertIn('could not get idle state', (evidence / 'ui-dump-failure-1.txt').read_text())
            self.assertIn('No such file', (evidence / 'ui-dump-failure-1.txt').read_text())
        sleep.assert_called_once_with(1)
        self.assertEqual(adb.call_args_list.count(call('shell', 'rm', '-f', DUMP_PATH, timeout=10)), 2)

    def test_malformed_or_empty_hierarchy_is_not_accepted(self):
        for invalid in ['', '<hierarchy>', '<hierarchy />', '<unrelated><node /></unrelated>']:
            with self.subTest(invalid=invalid):
                adb = Mock(side_effect=['', 'dumped', invalid, '', 'dumped', TREE])
                self.assertEqual(capture_screen_tree(adb, sleep=Mock()), TREE)

    def test_timeout_and_adb_failure_are_retried(self):
        errors = [subprocess.TimeoutExpired(['adb'], 20), subprocess.CalledProcessError(1, ['adb'], output='device offline')]
        for error in errors:
            with self.subTest(error=error):
                adb = Mock(side_effect=['', error, '', 'dumped', TREE])
                self.assertEqual(capture_screen_tree(adb, sleep=Mock()), TREE)

    def test_persistent_failure_is_bounded_and_fails_verification(self):
        adb = Mock(side_effect=subprocess.TimeoutExpired(['adb'], 10))
        sleep = Mock()
        with self.assertRaisesRegex(RuntimeError, 'verification failed'):
            capture_screen_tree(adb, attempts=3, sleep=sleep)
        self.assertEqual(adb.call_count, 3)
        self.assertEqual(sleep.call_args_list, [call(1), call(2)])


if __name__ == '__main__':
    unittest.main()
