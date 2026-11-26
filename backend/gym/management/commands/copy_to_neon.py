"""Copy all data from the local MySQL database into Neon PostgreSQL.

    python manage.py copy_to_neon            # Neon must be empty
    python manage.py copy_to_neon --replace  # wipe Neon's data first, then copy again

Needs NEON_DATABASE_URL in backend/.env (and no DATABASE_URL, so 'default' is still local MySQL).
Rows keep their ids. Images are not stored in the database: only their paths are copied, and the files
themselves live on Cloudinary (run sync_media_cloudinary first if you added images locally).
"""
import os
import tempfile

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import connections

# Login sessions / app tokens / device push tokens are per-deployment: people sign in again in production.
EXCLUDE = ["contenttypes", "auth.permission", "sessions", "authtoken.token", "authtoken.tokenproxy", "gym.pushtoken"]


class Command(BaseCommand):
    help = "Copy every table from local MySQL into Neon PostgreSQL"

    def add_arguments(self, parser):
        parser.add_argument("--replace", action="store_true", help="Delete existing data in Neon first")

    def handle(self, *args, replace=False, **opts):
        if "neon" not in connections.databases:
            raise CommandError("Add NEON_DATABASE_URL to backend/.env (and make sure DATABASE_URL is not set).")
        if connections["default"].vendor != "mysql":
            raise CommandError("'default' must be the local MySQL database.")

        self.stdout.write("1/4 Creating tables in Neon (migrate)…")
        call_command("migrate", database="neon", interactive=False, verbosity=0)

        models = [m for m in apps.get_models() if self._included(m)]
        has_data = any(m.objects.using("neon").exists() for m in models)
        if has_data and not replace:
            raise CommandError("Neon already has data. Re-run with --replace to wipe it and copy again.")
        if has_data:
            self.stdout.write("   Wiping existing Neon data…")
            call_command("flush", database="neon", interactive=False, verbosity=0)

        fd, path = tempfile.mkstemp(suffix=".json")  # holds password hashes: deleted right after
        os.close(fd)
        try:
            self.stdout.write("2/4 Reading everything from MySQL…")
            call_command("dumpdata", *[], exclude=EXCLUDE, natural_foreign=True, natural_primary=True,
                         database="default", output=path, indent=None, verbosity=0)
            self.stdout.write("3/4 Writing into Neon…")
            call_command("loaddata", path, database="neon", verbosity=0)  # also resets id sequences
        finally:
            os.remove(path)

        self.stdout.write("4/4 Checking row counts…")
        bad = 0
        for m in models:
            a, b = m.objects.using("default").count(), m.objects.using("neon").count()
            label = f"{m._meta.app_label}.{m.__name__}"
            ok = a == b
            bad += not ok
            if a or b:
                self.stdout.write(f"   {'OK ' if ok else 'MISMATCH'} {label:<28} mysql={a:<5} neon={b}")
        if bad:
            raise CommandError(f"{bad} table(s) differ.")
        self.stdout.write(self.style.SUCCESS("All data copied to Neon."))

    @staticmethod
    def _included(model):
        label = f"{model._meta.app_label}.{model._meta.model_name}"
        return model._meta.managed and not model._meta.proxy and label not in EXCLUDE \
            and model._meta.app_label not in EXCLUDE
