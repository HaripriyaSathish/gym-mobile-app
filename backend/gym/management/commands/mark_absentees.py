"""Mark members absent (and notify them) for every batch whose session ended today.

    python manage.py mark_absentees

Safe to run as often as you like, e.g. every 15 minutes from Windows Task Scheduler.
"""
from django.core.management.base import BaseCommand

from gym.absence import mark_all


class Command(BaseCommand):
    help = "Auto-mark no-shows absent and send them a missed-workout notification"

    def handle(self, *args, **opts):
        n = mark_all()
        self.stdout.write(self.style.SUCCESS(f"Marked {n} member(s) absent."))
