"""Upload the local media/ folder (seed images, video thumbnails, videos) to Cloudinary.

    python manage.py sync_media_cloudinary

Public ids mirror the local paths (media/seed/a.jpg -> pulseforge/seed/a), so DB file names keep working.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cloudinary.uploader
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from gym.storage import configure, split


class Command(BaseCommand):
    help = "Upload local media files to Cloudinary"

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Re-upload files that already exist")

    def handle(self, *args, **opts):
        if not settings.USE_CLOUDINARY:
            raise CommandError("Set CLOUDINARY_* in backend/.env first.")
        configure()
        root = Path(settings.MEDIA_ROOT)
        files = [p for p in root.rglob("*") if p.is_file() and not p.name.startswith(".")]

        def push(path):
            rel = path.relative_to(root).as_posix()
            public_id, _, rtype = split(rel)
            try:
                cloudinary.uploader.upload(str(path), public_id=public_id, resource_type=rtype,
                                           overwrite=opts["force"], unique_filename=False)
                return f"ok   {rel}"
            except Exception as exc:
                return f"FAIL {rel}: {exc}"

        with ThreadPoolExecutor(max_workers=6) as pool:
            for line in pool.map(push, files):
                self.stdout.write(line)
        self.stdout.write(self.style.SUCCESS(f"Synced {len(files)} files to Cloudinary."))
