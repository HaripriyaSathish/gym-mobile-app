"""Trainer side of the app: the admin panel's day-to-day screens, scoped to the trainer's own batches.

A user with a Trainer profile sees only the batches where they are the coach.
Staff / superusers (front desk, owner) can sign in too and see every batch.
"""
from datetime import date, datetime, time, timedelta

from django.contrib.auth.models import User
from django.db.models import Count, DecimalField, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import absence, services
from .models import Attendance, Batch, BatchMessage, DietChart, Member, Payment, Reminder
from .serializers import BatchMessageSerializer


def _scope(request):
    """Batches this user may manage, or None if they aren't a trainer/staff."""
    u = request.user
    trainer = getattr(u, "trainer", None)
    if u.is_staff or u.is_superuser:
        return Batch.objects.filter(is_active=True).select_related("program"), True
    if trainer and trainer.is_active:
        return Batch.objects.filter(is_active=True, coach=trainer).select_related("program"), False
    return None, False


def _forbidden():
    return Response({"detail": "Only trainers can open this."}, status=403)


def _batch_json(b, n=None, present=None):
    return {"id": b.id, "name": b.name, "program": b.program.name, "days": b.days,
            "start": b.start_time.strftime("%I:%M %p"), "end": b.end_time.strftime("%I:%M %p"),
            "capacity": b.capacity, "members": b.member_count if n is None else n,
            "present_today": present, "monthly_fee": str(b.monthly_fee)}


def _payment_json(p):
    return {"id": p.id, "member": p.member.full_name, "member_id": p.member_id,
            "batch": p.member.batch.name if p.member.batch else "-", "title": p.title, "amount": str(p.amount),
            "due_date": p.due_date.isoformat(), "status": p.status, "is_overdue": p.is_overdue,
            "method": p.method, "paid_at": p.paid_at.isoformat() if p.paid_at else None}


# ----------------------------------------------------------------- dashboard

@api_view(["GET"])
def dashboard(request):
    batches, is_staff = _scope(request)
    if batches is None:
        return _forbidden()
    absence.mark_all(batches)
    today = date.today()
    month_start = timezone.make_aware(datetime.combine(today.replace(day=1), time.min))
    members = Member.objects.filter(is_active=True, batch__in=batches)
    pays = Payment.objects.filter(member__in=members)
    rows = batches.annotate(
        n=Count("members", filter=Q(members__is_active=True), distinct=True),
        p=Count("members__attendance", filter=Q(members__attendance__date=today,
                                                members__attendance__status="present"), distinct=True),
    )
    u = request.user
    return Response({
        "name": u.get_full_name() or u.username,
        "first_name": u.first_name or u.username,
        "is_staff": is_staff,
        "stats": {
            "members": members.count(),
            "batches": batches.count(),
            "present_today": Attendance.objects.filter(member__in=members, date=today, status="present").count(),
            "absent_today": Attendance.objects.filter(member__in=members, date=today, status="absent").count(),
            "collected": str(pays.filter(status="paid", paid_at__gte=month_start).aggregate(s=Sum("amount"))["s"] or 0),
            "pending": str(pays.exclude(status="paid").aggregate(s=Sum("amount"))["s"] or 0),
            "overdue": pays.exclude(status="paid").filter(due_date__lt=today).count(),
        },
        "batches": [_batch_json(b, b.n, b.p) for b in rows],
        "overdue": [_payment_json(p) for p in pays.exclude(status="paid").filter(due_date__lt=today)
                    .select_related("member__user", "member__batch").order_by("due_date")[:6]],
        "recent_messages": BatchMessageSerializer(
            BatchMessage.objects.filter(Q(batch__in=batches) | Q(batch__isnull=True)).select_related("batch")[:3],
            many=True).data,
        **_dashboard_sections(batches, members, today),
    })


def _dashboard_sections(batches, members, today):
    """Extra trainer-home sections: today's schedule, 7-day trend, who needs attention, top attendees."""
    now = timezone.localtime()

    # Today's schedule with a live status the app can count down to
    schedule = []
    for b in batches:
        if not absence.runs_on(b, today):
            continue
        start = timezone.make_aware(datetime.combine(today, b.start_time), now.tzinfo)
        end = timezone.make_aware(datetime.combine(today, b.end_time), now.tzinfo)
        status = "upcoming" if now < start else "live" if now < end else "done"
        schedule.append({"id": b.id, "name": b.name, "program": b.program.name, "trainer": b.trainer,
                         "start": b.start_time.strftime("%I:%M %p"), "end": b.end_time.strftime("%I:%M %p"),
                         "start_at": start.isoformat(), "end_at": end.isoformat(), "status": status})
    schedule.sort(key=lambda x: x["start_at"])

    # Last 7 days: present vs absent per day
    since = today - timedelta(days=6)
    counts = {}
    for row in (Attendance.objects.filter(member__in=members, date__gte=since)
                .values("date", "status").annotate(n=Count("id"))):
        counts.setdefault(row["date"], {"present": 0, "absent": 0})[row["status"]] = row["n"]
    week = []
    for i in range(7):
        d = since + timedelta(days=i)
        c = counts.get(d, {"present": 0, "absent": 0})
        week.append({"date": d.isoformat(), "label": d.strftime("%a")[:2], "present": c["present"],
                     "absent": c["absent"], "today": d == today})

    # Needs attention: 3+ absences in a row
    attention = []
    for m in members.select_related("user", "batch"):
        run = 0
        for st in m.attendance.order_by("-date").values_list("status", flat=True)[:10]:
            if st != "absent":
                break
            run += 1
        if run >= 3:
            attention.append({"id": m.id, "name": m.full_name, "batch": m.batch.name if m.batch else "-",
                              "phone": m.phone, "absent_run": run})
    attention.sort(key=lambda x: -x["absent_run"])

    # Top attendees this month
    top = (members.annotate(p=Count("attendance", filter=Q(attendance__date__gte=today.replace(day=1),
                                                           attendance__status="present")))
           .filter(p__gt=0).select_related("user", "batch").order_by("-p")[:5])

    # Checked in today
    checked = (Attendance.objects.filter(member__in=members, date=today, status="present")
               .select_related("member__user", "member__batch"))

    return {
        "schedule": schedule,
        "week": week,
        "attention": attention[:6],
        "top": [{"id": m.id, "name": m.full_name, "batch": m.batch.name if m.batch else "-", "present": m.p}
                for m in top],
        "checked_in": [{"id": a.member_id, "name": a.member.full_name,
                        "batch": a.member.batch.name if a.member.batch else "-",
                        "self": a.note == "Self check-in"} for a in checked],
    }


# ----------------------------------------------------------------- members

@api_view(["GET"])
def members(request):
    batches, _ = _scope(request)
    if batches is None:
        return _forbidden()
    qs = Member.objects.filter(is_active=True, batch__in=batches).select_related("user", "batch")
    if request.GET.get("batch"):
        qs = qs.filter(batch_id=request.GET["batch"])
    since = date.today() - timedelta(days=30)
    # Dues via a subquery: summing payments in the same query as the attendance counts would multiply them
    dues = (Payment.objects.filter(member=OuterRef("pk")).exclude(status="paid").order_by()
            .values("member").annotate(s=Sum("amount")).values("s"))
    qs = qs.annotate(
        dues=Coalesce(Subquery(dues, output_field=DecimalField()), Value(0), output_field=DecimalField()),
        present30=Count("attendance", filter=Q(attendance__date__gte=since, attendance__status="present"),
                        distinct=True),
        total30=Count("attendance", filter=Q(attendance__date__gte=since), distinct=True),
    )
    return Response([{
        "id": m.id, "name": m.full_name, "username": m.user.username, "phone": m.phone, "email": m.user.email,
        "goal": m.goal, "batch": m.batch.name if m.batch else "-", "batch_id": m.batch_id,
        "joined_on": m.joined_on.isoformat(), "dues": str(m.dues or 0),
        "attendance_rate": round(m.present30 * 100 / m.total30) if m.total30 else None,
    } for m in qs])


# ----------------------------------------------------------------- attendance sheet

@api_view(["GET", "POST"])
def attendance(request):
    batches, _ = _scope(request)
    if batches is None:
        return _forbidden()
    src = request.data if request.method == "POST" else request.GET
    batch = get_object_or_404(batches, pk=src.get("batch")) if src.get("batch") else batches.first()
    if not batch:
        return Response({"batch": None, "batches": [], "date": date.today().isoformat(), "rows": []})
    try:
        day = date.fromisoformat(src.get("date") or date.today().isoformat())
    except ValueError:
        return Response({"detail": "Bad date"}, status=400)
    if day > date.today():
        return Response({"detail": "You can't mark attendance for a future date"}, status=400)
    if request.method == "GET" and day == date.today():
        absence.mark_batch(batch)
    mems = list(batch.members.filter(is_active=True).select_related("user"))

    info = ""
    if request.method == "POST":
        records = request.data.get("records") or {}
        absentees = []
        for m in mems:
            status = records.get(str(m.id))
            if status not in ("present", "absent"):
                continue
            Attendance.objects.update_or_create(member=m, date=day, defaults={"status": status, "note": "Coach"})
            if status == "present":
                absence.clear_missed(m, day)
            if status == "absent":
                absentees.append(m)
        info = f"Saved attendance for {batch.name}."
        if request.data.get("email_absent") and absentees:
            ok, msg = services.send_email(
                [services.member_recipient(m) for m in absentees],
                "You missed today's session", "We missed you today",
                f"You were marked absent for <b>{batch.name}</b> on {day:%d %b %Y}. "
                "Consistency builds results, so see you next session!")
            info += f" Absence email to {len(absentees)}: {msg}."

    recs = Attendance.objects.filter(member__in=mems, date=day)
    existing = {a.member_id: a.status for a in recs}
    auto = {a.member_id: a.note == absence.AUTO_NOTE for a in recs}
    return Response({
        "batch": _batch_json(batch, len(mems)),
        "batches": [{"id": b.id, "name": b.name, "start": b.start_time.strftime("%I:%M %p")} for b in batches],
        "date": day.isoformat(),
        "rows": [{"id": m.id, "name": m.full_name, "status": existing.get(m.id, ""),
                  "auto": auto.get(m.id, False)} for m in mems],
        "info": info,
    })


# ----------------------------------------------------------------- batch messages

@api_view(["GET", "POST"])
def messages(request):
    batches, is_staff = _scope(request)
    if batches is None:
        return _forbidden()
    if request.method == "GET":
        qs = BatchMessage.objects.filter(Q(batch__in=batches) | Q(batch__isnull=True)).select_related("batch")
        data = BatchMessageSerializer(qs[:60], many=True).data
        own = set(qs.filter(batch__in=batches).values_list("id", flat=True)) if not is_staff else None
        for d in data:
            d["can_delete"] = is_staff or d["id"] in own
        return Response({"messages": data,
                         "batches": [{"id": b.id, "name": b.name} for b in batches],
                         "can_send_all": is_staff})

    d = request.data
    title = (d.get("title") or "").strip()
    body = (d.get("body") or "").strip()
    kind = d.get("kind") or "announcement"
    if not title or not body:
        return Response({"detail": "Add a title and a message"}, status=400)
    if kind not in dict(BatchMessage.KIND):
        return Response({"detail": "Unknown message type"}, status=400)
    batch = None
    if d.get("batch"):
        batch = batches.filter(pk=d["batch"]).first()
        if not batch:
            return Response({"detail": "You can only message your own batches"}, status=403)
    elif not is_staff:
        return Response({"detail": "Pick one of your batches"}, status=400)

    msg = BatchMessage.objects.create(batch=batch, kind=kind, title=title[:120], body=body,
                                      email_members=bool(d.get("email_members")))
    info = ""
    if msg.email_members:
        qs = Member.objects.filter(is_active=True).select_related("user")
        qs = qs.filter(batch=batch) if batch else qs.filter(batch__in=batches)
        ok, info = services.send_email([services.member_recipient(m) for m in qs], f"{title} · PulseForge",
                                       title, body.replace("\n", "<br>"))
    recipients = Member.objects.filter(is_active=True)
    recipients = recipients.filter(batch=batch) if batch else recipients.filter(batch__in=batches)
    services.send_push(User.objects.filter(member__in=recipients), f"📣 {title}", body[:180],
                       {"type": "message", "screen": "Batch"}, channel="messages")
    out = BatchMessageSerializer(msg).data
    out["can_delete"] = True
    return Response({"message": out, "info": info}, status=201)


@api_view(["DELETE"])
def message_delete(request, pk):
    batches, is_staff = _scope(request)
    if batches is None:
        return _forbidden()
    qs = BatchMessage.objects.all() if is_staff else BatchMessage.objects.filter(batch__in=batches)
    get_object_or_404(qs, pk=pk).delete()
    return Response({"ok": True})


# ----------------------------------------------------------------- fees

@api_view(["GET"])
def payments(request):
    batches, _ = _scope(request)
    if batches is None:
        return _forbidden()
    qs = Payment.objects.filter(member__batch__in=batches).select_related("member__user", "member__batch")
    if request.GET.get("status") == "paid":
        qs = qs.filter(status="paid").order_by("-paid_at")[:50]
    else:
        qs = qs.exclude(status="paid").order_by("due_date")
    return Response([_payment_json(p) for p in qs])


def _own_payment(request, pk):
    batches, _ = _scope(request)
    if batches is None:
        return None
    return get_object_or_404(Payment.objects.select_related("member__user", "member__batch"),
                             pk=pk, member__batch__in=batches)


@api_view(["POST"])
def payment_cash(request, pk):
    p = _own_payment(request, pk)
    if p is None:
        return _forbidden()
    if p.status != "paid":
        p.status, p.method, p.paid_at = "paid", "cash", timezone.now()
        p.save(update_fields=["status", "method", "paid_at"])
    return Response(_payment_json(p))


@api_view(["POST"])
def payment_remind(request, pk):
    p = _own_payment(request, pk)
    if p is None:
        return _forbidden()
    if p.status == "paid":
        return Response({"detail": "Already paid"}, status=400)
    Reminder.objects.create(member=p.member, kind="payment", title=f"Fee due: {p.title}",
                            message=f"₹{p.amount} due on {p.due_date:%d %b %Y}. Pay in the app.", emailed=True)
    ok, info = services.send_email(
        [services.member_recipient(p.member)], f"Fee reminder · {p.title}", "Friendly fee reminder",
        f"Hi {p.member.user.first_name},<br>Your fee <b>₹{p.amount}</b> for <b>{p.title}</b> is due on "
        f"<b>{p.due_date:%d %b %Y}</b>.<br>Open the PulseForge app → Payments to pay securely via Cashfree.")
    return Response({"ok": True, "info": "In-app reminder sent" + (" and emailed" if ok else f" (email: {info})")})


# ----------------------------------------------------------------- diet charts

MEALS = ["early_morning", "breakfast", "mid_morning", "lunch", "evening", "dinner"]


def _diet_scope(batches, is_staff):
    """Charts this user may see and edit: their batches' charts and their members' personal charts.
    Staff also manage gym-wide charts (no batch, no member)."""
    q = Q(batch__in=batches) | Q(member__batch__in=batches)
    if is_staff:
        q |= Q(batch__isnull=True, member__isnull=True)
    return DietChart.objects.filter(q).select_related("batch", "member__user", "member__batch")


def _diet_json(c):
    if c.member_id:
        target, label = "member", f"{c.member.full_name} (personal)"
    elif c.batch_id:
        target, label = "batch", c.batch.name
    else:
        target, label = "all", "All batches"
    return {"id": c.id, "title": c.title, "calories": c.calories, "notes": c.notes,
            "target": target, "target_label": label, "batch": c.batch_id, "member": c.member_id,
            "member_name": c.member.full_name if c.member_id else None,
            "created_at": c.created_at.isoformat(), **{m: getattr(c, m) for m in MEALS}}


def _diet_save(request, chart, batches, is_staff):
    d = request.data
    title = (d.get("title") or "").strip()
    if not title:
        return None, Response({"detail": "Give the chart a title"}, status=400)
    try:
        calories = int(d.get("calories") or 0)
    except (TypeError, ValueError):
        return None, Response({"detail": "Calories must be a number"}, status=400)
    if not 500 <= calories <= 6000:
        return None, Response({"detail": "Calories should be between 500 and 6000"}, status=400)
    if not any((d.get(m) or "").strip() for m in MEALS):
        return None, Response({"detail": "Add at least one meal"}, status=400)

    member = batch = None
    if d.get("member"):
        member = Member.objects.filter(pk=d["member"], is_active=True, batch__in=batches).first()
        if not member:
            return None, Response({"detail": "You can only plan diets for your own members"}, status=403)
    elif d.get("batch"):
        batch = batches.filter(pk=d["batch"]).first()
        if not batch:
            return None, Response({"detail": "You can only plan diets for your own batches"}, status=403)
    elif not is_staff:
        return None, Response({"detail": "Pick a batch or a member"}, status=400)

    chart = chart or DietChart()
    chart.title, chart.calories, chart.notes = title[:120], calories, (d.get("notes") or "").strip()
    chart.member, chart.batch = member, batch
    for m in MEALS:
        setattr(chart, m, (d.get(m) or "").strip())
    chart.save()
    return chart, None


def _diet_notify(chart, batches, created):
    if chart.member_id:
        users = [chart.member.user]
    else:
        qs = Member.objects.filter(is_active=True)
        qs = qs.filter(batch=chart.batch) if chart.batch_id else qs.filter(batch__in=batches)
        users = User.objects.filter(member__in=qs)
    services.send_push(users, f"🥗 {'New' if created else 'Updated'} diet chart",
                       f"{chart.title} · {chart.calories} kcal. Open the app to see your meals.",
                       {"type": "diet", "screen": "Batch", "tab": "diet"}, channel="messages")


@api_view(["GET", "POST"])
def diets(request):
    batches, is_staff = _scope(request)
    if batches is None:
        return _forbidden()
    if request.method == "GET":
        mems = Member.objects.filter(is_active=True, batch__in=batches).select_related("user", "batch")
        return Response({
            "charts": [_diet_json(c) for c in _diet_scope(batches, is_staff)[:100]],
            "batches": [{"id": b.id, "name": b.name} for b in batches],
            "members": [{"id": m.id, "name": m.full_name, "batch": m.batch.name, "goal": m.goal} for m in mems],
            "can_target_all": is_staff,
        })
    chart, err = _diet_save(request, None, batches, is_staff)
    if err:
        return err
    if request.data.get("notify"):
        _diet_notify(chart, batches, True)
    return Response(_diet_json(chart), status=201)


@api_view(["PUT", "DELETE"])
def diet_detail(request, pk):
    batches, is_staff = _scope(request)
    if batches is None:
        return _forbidden()
    chart = get_object_or_404(_diet_scope(batches, is_staff), pk=pk)
    if request.method == "DELETE":
        chart.delete()
        return Response({"ok": True})
    chart, err = _diet_save(request, chart, batches, is_staff)
    if err:
        return err
    if request.data.get("notify"):
        _diet_notify(chart, batches, False)
    return Response(_diet_json(chart))
