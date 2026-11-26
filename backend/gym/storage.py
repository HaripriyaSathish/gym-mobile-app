"""Cloudinary-backed Django storage for all uploaded media (images + videos).

The stored file name stays a simple relative path (e.g. "gallery/pic.jpg"); it maps to the Cloudinary
public id "pulseforge/gallery/pic". Images are served with f_auto,q_auto (smaller, faster loads),
videos with q_auto.
"""
import os
import posixpath

import cloudinary
import cloudinary.api
import cloudinary.uploader
import cloudinary.utils
from django.conf import settings
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible

VIDEO_EXT = {".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"}
FOLDER = "pulseforge"


def configure():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def split(name):
    name = name.replace("\\", "/").lstrip("/")
    stem, ext = posixpath.splitext(name)
    rtype = "video" if ext.lower() in VIDEO_EXT else "image"
    return f"{FOLDER}/{stem}", ext.lower().lstrip("."), rtype


@deconstructible
class CloudinaryStorage(Storage):
    def __init__(self):
        configure()

    def _save(self, name, content):
        name = self.get_available_name(name)
        public_id, _, rtype = split(name)
        content.seek(0)
        cloudinary.uploader.upload(content, public_id=public_id, resource_type=rtype, overwrite=True,
                                   use_filename=False, unique_filename=False)
        return name

    def get_available_name(self, name, max_length=None):
        # Make names unique with a short suffix so uploads never overwrite each other.
        stem, ext = os.path.splitext(name.replace("\\", "/"))
        if self.exists(name):
            name = f"{stem}_{os.urandom(3).hex()}{ext}"
        return name

    def exists(self, name):
        public_id, _, rtype = split(name)
        try:
            cloudinary.api.resource(public_id, resource_type=rtype)
            return True
        except Exception:
            return False

    def delete(self, name):
        public_id, _, rtype = split(name)
        cloudinary.uploader.destroy(public_id, resource_type=rtype, invalidate=True)

    def url(self, name):
        public_id, fmt, rtype = split(name)
        opts = {"resource_type": rtype, "secure": True}
        if rtype == "image":
            opts.update(fetch_format="auto", quality="auto", width=1080, crop="limit")
        else:
            opts.update(format=fmt or "mp4", quality="auto")
        return cloudinary.utils.cloudinary_url(public_id, **opts)[0]

    def size(self, name):
        public_id, _, rtype = split(name)
        return cloudinary.api.resource(public_id, resource_type=rtype).get("bytes", 0)

    def open(self, name, mode="rb"):
        raise NotImplementedError("Files are served from Cloudinary; download via url().")
