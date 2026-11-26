import os
import sys
import threading
import time

from django.apps import AppConfig


class GymConfig(AppConfig):
    name = 'gym'

    def ready(self):
        from django.conf import settings

        # Background loop that marks no-shows absent (and pushes the missed-workout notification) a few
        # minutes after each session ends, even if nobody opens the app. Runs only in the server process
        # (not in manage.py migrate/shell, and only in the autoreloader's child under runserver).
        if not getattr(settings, "AUTO_ABSENT_SCHEDULER", True):
            return
        cmd = sys.argv[1] if len(sys.argv) > 1 else ""
        serving = (cmd == "runserver" and os.environ.get("RUN_MAIN") == "true") or "gunicorn" in sys.argv[0] \
            or "waitress" in sys.argv[0] or "uvicorn" in sys.argv[0]
        if serving:
            threading.Thread(target=_absence_loop, name="auto-absent", daemon=True).start()


def _absence_loop():
    from django.db import close_old_connections

    from .absence import mark_all

    time.sleep(10)  # let the server finish starting
    while True:
        try:
            close_old_connections()
            mark_all()
        except Exception as exc:  # never let the loop die
            print(f"[auto-absent] {exc}")
        finally:
            close_old_connections()
        time.sleep(5 * 60)
