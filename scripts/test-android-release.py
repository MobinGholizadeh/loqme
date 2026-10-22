import hashlib
import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path


def module(filename, name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


release = module('android-release.py', 'android_release')
publisher = module('publish-android-release.py', 'publisher')


class PolicyTests(unittest.TestCase):
    def test_compiled_icon_paths_resolve_after_resource_shortening(self):
        table = '''
        spec resource 0x7f0c0000 ir.loqme.app:mipmap/ic_launcher: flags=0x0
        config mdpi-v4:
          resource 0x7f0c0000 ir.loqme.app:mipmap/ic_launcher: t=0x03 d=0x01
            (string8) "res/A.png"
          resource 0x7f0c0001 ir.loqme.app:mipmap/ic_launcher_round: t=0x03 d=0x02
            (string8) "res/B.png"
        config hdpi-v4:
          resource 0x7f0c0000 ir.loqme.app:mipmap/ic_launcher: t=0x03 d=0x03
            (string8) "res/mipmap-hdpi-v4/ic_launcher.png"
        '''
        self.assertEqual(release.resource_files(table, 'mipmap/ic_launcher'),
                         ['res/A.png', 'res/mipmap-hdpi-v4/ic_launcher.png'])
        self.assertEqual(release.resource_files(table, 'drawable/missing'), [])

    def test_versions_exceed_legacy_and_new_releases_including_drafts(self):
        self.assertEqual(release.next_version([{'tag_name': 'latest'}, {'tag_name': 'android-v501'}], [117, 600]), 601)
        self.assertEqual(release.next_version([{'tag_name': 'android-v501'}], [117]), 502)
        with self.assertRaises(ValueError):
            release.next_version([], [2100000000])

    def test_only_new_current_deployment_can_be_promoted(self):
        deployed = {'sourceCommit': 'a', 'deploymentRunNumber': 10}
        candidate = {**deployed, 'versionCode': 200}
        current = {**deployed, 'versionCode': 199}
        self.assertTrue(publisher.can_promote(candidate, None, deployed))
        self.assertTrue(publisher.can_promote(candidate, current, deployed))
        self.assertFalse(publisher.can_promote(candidate, candidate, deployed))
        self.assertFalse(publisher.can_promote({**candidate, 'sourceCommit': 'b'}, current, deployed))
        self.assertFalse(publisher.can_promote({**candidate, 'deploymentRunNumber': 9}, current, deployed))
        self.assertFalse(publisher.can_promote(candidate, {**current, 'deploymentRunNumber': 11}, deployed))

    def test_release_is_tied_to_successful_deployment_and_exact_sha(self):
        workflow = Path('.github/workflows/build-android.yml').read_text()
        deploy = Path('.github/workflows/deploy.yml').read_text()
        self.assertIn('workflow_call:', workflow)
        self.assertNotIn('\n  push:', workflow)
        self.assertIn('ref: ${{ inputs.source_sha || github.sha }}', workflow)
        self.assertIn('needs: deploy', deploy)
        self.assertIn('source_sha: ${{ github.sha }}', deploy)
        self.assertIn('group: android-release-publication', workflow)
        self.assertIn('disk-size: 2G', workflow)
        self.assertIn('--latest=false', workflow)


@unittest.skipIf(os.name != 'posix', 'Production publisher uses Linux flock; exercised on Ubuntu CI')
class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        folder = Path(self.tmp.name)
        self.stage, self.root = folder / 'stage', folder / 'public'
        self.stage.mkdir()
        self.marker = folder / 'deployed.json'
        self.deployed = {'sourceCommit': 'a' * 40, 'deploymentRunNumber': 9}
        self.marker.write_text(json.dumps(self.deployed))
        self.apk = self.stage / 'loqme-v200.apk'
        self.apk.write_bytes(b'apk')
        self.meta = {**self.deployed, 'versionCode': 200, 'versionName': '1.1.200', 'minSdk': 21,
                     'apkUrl': 'https://loqme.shop/api/android/downloads/loqme-v200.apk',
                     'sha256': hashlib.sha256(b'apk').hexdigest()}
        (self.stage / 'release.json').write_text(json.dumps(self.meta))

    def tearDown(self):
        self.tmp.cleanup()

    def test_stage_does_not_replace_latest_until_download_verified(self):
        publisher.publish(self.stage, self.root, self.marker)
        self.assertTrue((self.root / self.apk.name).exists())
        self.assertFalse((self.root / 'latest.json').exists())
        publisher.publish(self.stage, self.root, self.marker, True)
        self.assertEqual(json.loads((self.root / 'latest.json').read_text()), self.meta)

    def test_wrong_checksum_preserves_previous_release(self):
        self.root.mkdir()
        old = json.dumps({'versionCode': 199})
        (self.root / 'latest.json').write_text(old)
        self.apk.write_bytes(b'corrupt')
        with self.assertRaises(AssertionError):
            publisher.publish(self.stage, self.root, self.marker, True)
        self.assertEqual((self.root / 'latest.json').read_text(), old)

    def test_changed_deployment_cannot_promote_staged_apk(self):
        publisher.publish(self.stage, self.root, self.marker)
        self.marker.write_text(json.dumps({**self.deployed, 'deploymentRunNumber': 10}))
        with self.assertRaises(AssertionError):
            publisher.publish(self.stage, self.root, self.marker, True)
        self.assertFalse((self.root / 'latest.json').exists())

    def test_immutable_artifact_cannot_be_overwritten(self):
        self.root.mkdir()
        (self.root / self.apk.name).write_bytes(b'previous')
        with self.assertRaises(AssertionError):
            publisher.publish(self.stage, self.root, self.marker, True)
        self.assertEqual((self.root / self.apk.name).read_bytes(), b'previous')


if __name__ == '__main__':
    unittest.main()
