import uuid
from datetime import date, timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import absence, services
from .models import (Attendance, Banner, Batch, BatchMessage, DietChart, MediaItem, Member, Payment, Program,
                     PushToken, Reminder)
from .serializers import (AttendanceSerializer, BannerSerializer, BatchMessageSerializer, BatchSerializer, DietChartSerializer,
                          MediaItemSerializer, MemberSerializer, PaymentSerializer, ProgramSerializer,
                          ReminderSerializer)


def _member(request):
    # One query for member + batch + program (instead of one each, later)
    return (Member.objects.select_related("user", "batch__program").filter(user_id=request.user.id).first()
            if request.user.is_authenticated else None)


def _programs():
    return Program.objects.annotate(n_batches=Count("batches", filter=Q(batches__is_active=True))).order_by("order", "name")


def _no_member():
    return Response({"detail": "This login is not linked to a gym member."}, status=403)


# ----------------------------------------------------------------- auth

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    ident = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    username = ident
    if "@" in ident:
        u = User.objects.filter(email__iexact=ident).first()
        username = u.username if u else ident
    user = authenticate(username=username, password=password)
    if not user:
        return Response({"detail": "Invalid username or password"}, status=400)
    token, _ = Token.objects.get_or_create(user=user)
    if hasattr(user, "member"):
        return Response({"token": token.key, "role": "member",
                         "member": MemberSerializer(user.member, context={"request": request}).data})
    trainer = getattr(user, "trainer", None)
    if (trainer and trainer.is_active) or user.is_staff:
        return Response({"token": token.key, "role": "trainer", "name": user.get_full_name() or user.username})
    return Response({"detail": "This login isn't linked to a member or trainer yet. Ask the front desk."}, status=403)


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """Self sign-up from the member app: creates the login + member profile and signs them in."""
    d = request.data
    name = (d.get("name") or "").strip()
    username = (d.get("username") or "").strip().lower()
    email = (d.get("email") or "").strip().lower()
    phone = (d.get("phone") or "").strip().replace(" ", "")
    password = d.get("password") or ""
    batch_id = d.get("batch")

    if not name:
        return Response({"detail": "Enter your full name"}, status=400)
    if len(username) < 3 or not username.replace("_", "").replace(".", "").isalnum():
        return Response({"detail": "Username needs 3+ letters or numbers (. and _ allowed)"}, status=400)
    if User.objects.filter(username__iexact=username).exists():
        return Response({"detail": "That username is taken"}, status=400)
    try:
        validate_email(email)
    except ValidationError:
        return Response({"detail": "Enter a valid email"}, status=400)
    if User.objects.filter(email__iexact=email).exists():
        return Response({"detail": "An account with this email already exists"}, status=400)
    digits = phone.lstrip("+")
    if phone and (not digits.isdigit() or not 10 <= len(digits) <= 13):
        return Response({"detail": "Enter a valid phone number"}, status=400)

    batch = None
    if batch_id:
        batch = Batch.objects.filter(pk=batch_id, is_active=True).first()
        if not batch:
            return Response({"detail": "That batch is no longer available"}, status=400)
        if batch.member_count >= batch.capacity:
            return Response({"detail": f"{batch.name} is full. Pick another batch."}, status=400)

    if len(password) < 8:
        return Response({"detail": "Password needs at least 8 characters"}, status=400)

    first, _, last = name.partition(" ")
    user = User(username=username, email=email, first_name=first, last_name=last.strip())
    try:
        validate_password(password, user)
    except ValidationError as e:
        return Response({"detail": " ".join(e.messages)}, status=400)

    with transaction.atomic():
        user.set_password(password)
        user.save()
        member = Member.objects.create(user=user, phone=phone, batch=batch)
        token = Token.objects.create(user=user)
    return Response({"token": token.key, "role": "member",
                     "member": MemberSerializer(member, context={"request": request}).data}, status=201)


@api_view(["POST"])
def logout(request):
    if request.data.get("push_token"):
        PushToken.objects.filter(user=request.user, token=request.data["push_token"]).delete()
    Token.objects.filter(user=request.user).delete()
    return Response({"ok": True})


@api_view(["POST"])
def push_register(request):
    """Save this device's Expo push token so the server can send missed-workout / message notifications."""
    token = (request.data.get("token") or "").strip()
    if not token.startswith(("ExponentPushToken[", "ExpoPushToken[")):
        return Response({"detail": "Not an Expo push token"}, status=400)
    PushToken.objects.update_or_create(token=token, defaults={"user": request.user,
                                                              "platform": (request.data.get("platform") or "")[:10]})
    return Response({"ok": True})


# ----------------------------------------------------------------- helpers

def attendance_summary(member, recs=None):
    """Streaks, month counts and today's status, all from one query of the last 90 records."""
    today = date.today()
    start = today.replace(day=1)
    if recs is None:
        recs = list(member.attendance.order_by("-date")[:90])
    present = sum(1 for r in recs if r.date >= start and r.status == "present")
    absent = sum(1 for r in recs if r.date >= start and r.status == "absent")
    total = present + absent
    streak = 0
    absent_run = 0
    for r in recs:
        if r.status == "present":
            streak += 1
        else:
            break
    for r in recs:
        if r.status == "absent":
            absent_run += 1
        else:
            break
    return {
        "present": present,
        "absent": absent,
        "rate": round(present * 100 / total) if total else 0,
        "streak": streak,
        "consecutive_absent": absent_run,
        "checked_in_today": bool(recs) and recs[0].date == today and recs[0].status == "present",
    }


def member_messages(member):
    return BatchMessage.objects.filter(Q(batch=member.batch) | Q(batch__isnull=True))


def member_diets(member):
    return DietChart.objects.filter(
        Q(member=member) | Q(member__isnull=True, batch=member.batch) | Q(member__isnull=True, batch__isnull=True)
    )


def member_reminders(member):
    return Reminder.objects.filter(
        Q(member=member) | Q(member__isnull=True, batch=member.batch) | Q(member__isnull=True, batch__isnull=True)
    )


# ----------------------------------------------------------------- member API

@api_view(["GET"])
def home(request):
    m = _member(request)
    if not m:
        return _no_member()
    ctx = {"request": request}
    recs = list(m.attendance.order_by("-date")[:90])
    today_rec = recs[0] if recs and recs[0].date == timezone.localdate() else None
    if m.batch and not today_rec and absence.mark_batch(m.batch):
        # session over and no check-in -> just marked absent + missed-workout alert
        recs = list(m.attendance.order_by("-date")[:90])
        today_rec = recs[0] if recs and recs[0].date == timezone.localdate() else None
    missed = None
    if today_rec and today_rec.status == "absent" and m.batch:
        missed = {"date": today_rec.date.isoformat(), "batch": m.batch.name,
                  "start": m.batch.start_time.strftime("%I:%M %p"), "end": m.batch.end_time.strftime("%I:%M %p"),
                  "title": absence.MISSED_TITLE, "message": absence.missed_message(m.batch)}
    next_due = m.payments.exclude(status="paid").order_by("due_date").first()
    msg = member_messages(m).first()
    diet = member_diets(m).first()
    featured = MediaItem.objects.filter(featured=True).select_related("program")[:6]
    programs = list(_programs())
    ctx["programs_by_id"] = {p.id: p for p in programs}
    reminders = member_reminders(m).filter(remind_at__gte=timezone.now() - timedelta(days=3)).order_by("remind_at")[:3]
    return Response({
        "member": MemberSerializer(m, context=ctx).data,
        "attendance": attendance_summary(m, recs),
        "missed_today": missed,
        "next_payment": PaymentSerializer(next_due).data if next_due else None,
        "latest_message": BatchMessageSerializer(msg).data if msg else None,
        "diet": DietChartSerializer(diet).data if diet else None,
        "reminders": ReminderSerializer(reminders, many=True).data,
        "featured": MediaItemSerializer(featured, many=True, context=ctx).data,
        "banners": BannerSerializer(Banner.objects.filter(is_active=True).select_related("program"), many=True,
                                    context=ctx).data,
        "programs": ProgramSerializer(programs, many=True, context=ctx).data,
        "gym_name": settings.GYM_NAME,
    })


@api_view(["GET"])
def me(request):
    m = _member(request)
    if not m:
        return _no_member()
    return Response(MemberSerializer(m, context={"request": request}).data)


@api_view(["GET"])
def messages(request):
    m = _member(request)
    if not m:
        return _no_member()
    return Response(BatchMessageSerializer(member_messages(m)[:50], many=True).data)


@api_view(["GET"])
def diet_charts(request):
    m = _member(request)
    if not m:
        return _no_member()
    return Response(DietChartSerializer(member_diets(m)[:20], many=True).data)


@api_view(["GET"])
def attendance(request):
    m = _member(request)
    if not m:
        return _no_member()
    recs = m.attendance.filter(date__gte=date.today() - timedelta(days=60))
    return Response({"summary": attendance_summary(m), "records": AttendanceSerializer(recs, many=True).data})


@api_view(["POST"])
def check_in(request):
    m = _member(request)
    if not m:
        return _no_member()
    rec, _ = Attendance.objects.update_or_create(member=m, date=date.today(), defaults={"status": "present",
                                                                                        "note": "Self check-in"})
    absence.clear_missed(m, rec.date)
    return Response({"ok": True, "summary": attendance_summary(m)})


@api_view(["GET"])
def reminders(request):
    m = _member(request)
    if not m:
        return _no_member()
    return Response(ReminderSerializer(member_reminders(m)[:30], many=True).data)


@api_view(["GET"])
def payments(request):
    m = _member(request)
    if not m:
        return _no_member()
    return Response({
        "cashfree_mode": "sandbox" if services.cashfree_enabled() else "demo",
        "items": PaymentSerializer(m.payments.all(), many=True).data,
    })


@api_view(["POST"])
def start_payment(request, pk):
    m = _member(request)
    if not m:
        return _no_member()
    p = get_object_or_404(Payment, pk=pk, member=m)
    if p.status == "paid":
        return Response({"detail": "Already paid"}, status=400)
    p.order_id = f"PF{p.id}_{uuid.uuid4().hex[:10]}"
    if services.cashfree_enabled():
        try:
            data = services.cashfree_create_order(p, request.build_absolute_uri("/"))
        except Exception as exc:  # network / Cashfree error
            return Response({"detail": f"Cashfree: {exc}"}, status=502)
        p.payment_session_id = data.get("payment_session_id", "")
    else:
        p.payment_session_id = ""
    p.save(update_fields=["order_id", "payment_session_id"])
    checkout_url = request.build_absolute_uri(f"/api/payments/checkout/{p.order_id}/")
    return Response({"order_id": p.order_id, "checkout_url": checkout_url,
                     "mode": "sandbox" if services.cashfree_enabled() else "demo"})


# ----------------------------------------------------------------- public API

@api_view(["GET"])
@permission_classes([AllowAny])
def programs(request):
    return Response(ProgramSerializer(_programs(), many=True, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def batches(request):
    qs = Batch.objects.filter(is_active=True).select_related("program").annotate(
        n_members=Count("members", filter=Q(members__is_active=True))).order_by("start_time")
    if request.GET.get("program"):
        qs = qs.filter(program__name__iexact=request.GET["program"])
    return Response(BatchSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def media(request):
    qs = MediaItem.objects.select_related("program")
    kind = request.GET.get("kind")
    if kind:
        qs = qs.filter(kind=kind)
    program = request.GET.get("program")
    if program:
        qs = qs.filter(program__name__iexact=program)
    return Response(MediaItemSerializer(qs[:100], many=True, context={"request": request}).data)


# ----------------------------------------------------------------- Cashfree checkout pages (HTML)

def _mark_paid(p, method="", cf_payment_id=""):
    if p.status == "paid":
        return
    p.status = "paid"
    p.paid_at = timezone.now()
    p.method = method[:30]
    p.cf_payment_id = str(cf_payment_id)[:60]
    p.save()
    services.send_email(
        [services.member_recipient(p.member)],
        f"Payment received - {p.title}",
        "Payment received. Thank you!",
        f"Hi {p.member.user.first_name},<br>We received <b>Rs. {p.amount}</b> for <b>{p.title}</b>.<br>"
        f"Order ID: {p.order_id}<br>Keep pushing your limits!",
    )


def checkout_page(request, order_id):
    p = get_object_or_404(Payment, order_id=order_id)
    return render(request, "gym/checkout.html", {
        "p": p,
        "sandbox": services.cashfree_enabled(),
        "session_id": p.payment_session_id,
    })


def payment_return(request):
    order_id = request.GET.get("order_id", "")
    p = get_object_or_404(Payment, order_id=order_id)
    if request.GET.get("demo") == "success" and not services.cashfree_enabled():
        _mark_paid(p, method="demo", cf_payment_id="DEMO")
    elif services.cashfree_enabled():
        try:
            st, pay = services.cashfree_order_status(order_id)
        except Exception:
            st, pay = None, None
        if st == "PAID":
            _mark_paid(p, method=(pay or {}).get("payment_group", "cashfree"),
                       cf_payment_id=(pay or {}).get("cf_payment_id", ""))
        elif st in ("EXPIRED", "TERMINATED"):
            p.status = "failed"
            p.save(update_fields=["status"])
    return render(request, "gym/payment_result.html", {"p": p})
