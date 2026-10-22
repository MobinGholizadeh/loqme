import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("prepare", Path(__file__).with_name("prepare-rls-env.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RuntimeEnvironmentTests(unittest.TestCase):
    def test_adds_password_and_preserves_other_settings(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            prefix = "# Existing deployment\nPOSTGRES_PASSWORD=unchanged\n"
            path.write_text(prefix)
            self.assertTrue(module.prepare(path))
            content = path.read_text()
            self.assertTrue(content.startswith(prefix))
            self.assertRegex(content, r"DATABASE_RUNTIME_PASSWORD=[A-Za-z0-9_-]{43}\n$")
            self.assertFalse(module.prepare(path))
            self.assertEqual(content, path.read_text())

    def test_retains_quoted_password(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            content = 'DATABASE_RUNTIME_PASSWORD="existing-test-password-123456789"\n'
            path.write_text(content)
            self.assertFalse(module.prepare(path))
            self.assertEqual(content, path.read_text())

    def test_refuses_invalid_duplicate_or_placeholder_without_mutation(self):
        for value in ["short", "REPLACE_WITH_AT_LEAST_24_RANDOM_CHARACTERS", "unsafe/" * 8,
                      "valid-test-password-123456789\nDATABASE_RUNTIME_PASSWORD=second-test-password-123456789"]:
            with self.subTest(value=value), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / ".env"
                content = "DATABASE_RUNTIME_PASSWORD=" + value + "\n"
                path.write_text(content)
                with self.assertRaises(ValueError):
                    module.prepare(path)
                self.assertEqual(content, path.read_text())

    def test_requires_existing_environment_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            with self.assertRaises(FileNotFoundError):
                module.prepare(path)
            self.assertFalse(path.exists())


if __name__ == "__main__":
    unittest.main()
