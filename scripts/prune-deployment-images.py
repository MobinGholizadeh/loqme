"""Remove only obsolete Loqme images, retaining containers and two rollbacks."""
import json
import subprocess

REPOSITORIES = {"loqme-rollback", "ghcr.io/mobingholizadeh/loqme"}


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True).strip()


def candidates(images, container_images):
    rollbacks = sorted(
        (image for image in images if any(tag.startswith("loqme-rollback:") for tag in image.get("RepoTags") or [])),
        key=lambda image: image["Created"], reverse=True,
    )
    protected = set(container_images) | {image["Id"] for image in rollbacks[:2]}
    result = []
    for image in images:
        references = (image.get("RepoTags") or []) + (image.get("RepoDigests") or [])
        repos = {ref.split("@")[0].rsplit(":", 1)[0] for ref in references}
        if image["Id"] not in protected and repos and repos <= REPOSITORIES:
            result.append(image)
    return result


if __name__ == "__main__":
    ids = docker("image", "ls", "-q", "--no-trunc").splitlines()
    images = json.loads(docker("image", "inspect", *sorted(set(ids)))) if ids else []
    containers = docker("ps", "-aq").splitlines()
    used = {item["Image"] for item in json.loads(docker("inspect", *containers))} if containers else set()
    for image in candidates(images, used):
        # Never force removal: Docker protects containers created after the snapshot.
        refs = (image.get("RepoTags") or []) + (image.get("RepoDigests") or [])
        for ref in refs:
            subprocess.run(["docker", "image", "rm", ref], check=False)
    subprocess.run(["docker", "builder", "prune", "--force", "--filter", "until=168h"], check=True)
