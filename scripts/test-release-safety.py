import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("cleanup", Path(__file__).with_name("prune-deployment-images.py"))
cleanup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cleanup)


class RetentionTests(unittest.TestCase):
    def image(self, identifier, repo="loqme-rollback", created="2026-01-01", digest=True):
        return {"Id": identifier, "Created": created, "RepoTags": [repo + ":" + identifier],
                "RepoDigests": ["ghcr.io/mobingholizadeh/loqme@sha256:" + identifier] if digest else []}

    def test_keeps_all_container_images_and_two_newest_rollbacks(self):
        images = [self.image("old"), self.image("running"), self.image("new", created="2026-03-01"),
                  self.image("previous", created="2026-02-01")]
        self.assertEqual([item["Id"] for item in cleanup.candidates(images, {"running"})], ["old"])

    def test_never_prunes_other_repositories_or_unidentified_images(self):
        images = [self.image("db", "postgis/postgis", digest=False),
                  {"Id": "unknown", "Created": "2026-01-01", "RepoTags": [], "RepoDigests": []},
                  {**self.image("mixed"), "RepoTags": ["loqme-rollback:mixed", "other-app:release"]}]
        self.assertEqual(cleanup.candidates(images, set()), [])

    def test_unused_project_digest_can_be_reclaimed(self):
        image = {"Id": "old", "Created": "2026-01-01", "RepoTags": [],
                 "RepoDigests": ["ghcr.io/mobingholizadeh/loqme@sha256:old"]}
        self.assertEqual(cleanup.candidates([image], set()), [image])


if __name__ == "__main__":
    unittest.main()
