"""Automatic absence: once a batch's session is over, members who never checked in are marked absent
and get a "you missed today's workout" notification in the app (and optionally an email).

It runs on its own in two ways, so it doesn't depend on a scheduler being set up:
  * lazily, whenever a member opens the app or a trainer opens their dashboard / attendance sheet;
  * on a schedule with `python manage.py mark_absentees` (Windows Task Scheduler / cron), every 15-30 min.
Running it again is safe: members who already have a record for the day are skipped.
"""
from datetime import datetime, timedelta

from django.conf import settings
from django.utils import timezone

from . import services
from .models import Attendance, Batch, Reminder

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
GRACE = timedelta(minutes=getattr(settings, "AUTO_ABSENT_GRACE_MINUTES", 15))
AUTO_NOTE = "Auto: no check-in"
MISSED_TITLE = "😢 You missed today's workout"


def runs_on(batch, day):
    """Parse the batch's days text ("Mon - Fri", "Mon · Wed · Fri", "Daily") and check the weekday."""
    text = (batch.days or "").lower().replace("–", "-")
    if not text.strip() or "daily" in text or "every" in text:
        return True
    found = [i for i, d in enumerate(DAYS) if d in text]
    if not found:
        return True  # unknown format: don't guess the session is off
    if "-" in text and len(found) == 2:
        a, b = found
        span = range(a, b + 1) if a <= b else list(range(a, 7)) + list(range(0, b + 1))
        return day.weekday() in span
    return day.weekday() in found


def session_over(batch, now=None):
    now = now or timezone.localtime()
    end = timezone.make_aware(datetime.combine(now.date(), batch.end_time), now.tzinfo)
    return now >= end + GRACE


def missed_message(batch):
    return (f"No check-in for {batch.name} today ({batch.start_time:%I:%M %p} - {batch.end_time:%I:%M %p}). "
            "One missed session is fine. Two becomes a habit, so see you next class! 💪")


def mark_batch(batch, now=None):
    """Mark today's no-shows in one batch. Returns the members marked absent."""
    now = now or timezone.localtime()
    today = now.date()
    if not batch.is_active or not runs_on(batch, today) or not session_over(batch, now):
        return []
    done = set(Attendance.objects.filter(member__batch=batch, date=today).values_list("member_id", flat=True))
    missing = list(batch.members.filter(is_active=True, joined_on__lte=today).exclude(id__in=done)
                   .select_related("user"))
    marked = []
    for m in missing:
        _, created = Attendance.objects.get_or_create(member=m, date=today,
                                                      defaults={"status": "absent", "note": AUTO_NOTE})
        if created:
            marked.append(m)
            Reminder.objects.create(member=m, kind="class", title=MISSED_TITLE, message=missed_message(batch),
                                    remind_at=now, emailed=bool(getattr(settings, "AUTO_ABSENT_EMAIL", False)))
    if marked:
        services.send_push([m.user for m in marked], MISSED_TITLE,
                           f"No check-in for {batch.name} today. See you next class! 💪",
                           {"type": "missed", "screen": "Home", "date": today.isoformat()}, channel="missed")
    if marked and getattr(settings, "AUTO_ABSENT_EMAIL", False):
        services.send_email([services.member_recipient(m) for m in marked], "We missed you today 😢",
                            "You missed today's workout", missed_message(batch))
    return marked


def mark_all(batches=None, now=None):
    batches = Batch.objects.filter(is_active=True) if batches is None else batches
    return sum(len(mark_batch(b, now)) for b in batches)


def _day_range(day):
    # Explicit range instead of remind_at__date: MySQL without timezone tables returns nothing for __date.
    start = timezone.make_aware(datetime.combine(day, datetime.min.time()))
    return start, start + timedelta(days=1)


def clear_missed(member, day):
    """Late check-in: drop that day's 'missed workout' notification."""
    Reminder.objects.filter(member=member, kind="class", title=MISSED_TITLE,
                            remind_at__range=_day_range(day)).delete()
