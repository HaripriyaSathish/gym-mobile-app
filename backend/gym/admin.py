from datetime import date, datetime, time, timedelta

from django.contrib import admin, messages
from django.contrib.auth.models import User
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.html import format_html

from . import services
from .models import (Attendance, Banner, Batch, BatchMessage, DietChart, MediaItem, Member, Payment, Program, Reminder,
                     PushToken, Trainer)


# ------------------------------------------------------------------ dashboard on admin index

_original_index = admin.site.index


def dashboard_index(request, extra_context=None):
    today = date.today()
    month_start = today.replace(day=1)
    extra_context = extra_context or {}
    present_today = Attendance.objects.filter(date=today, status="present").count()
    active = Member.objects.filter(is_active=True).count()
    extra_context["stats"] = {
        "members": active,
        "batches": Batch.objects.filter(is_active=True).count(),
        "present_today": present_today,
        "absent_today": Attendance.objects.filter(date=today, status="absent").count(),
        "collected": Payment.objects.filter(status="paid", paid_at__gte=timezone.make_aware(datetime.combine(month_start, time.min)))
        .aggregate(s=Sum("amount"))["s"] or 0,
        "pending": Payment.objects.exclude(status="paid").aggregate(s=Sum("amount"))["s"] or 0,
        "overdue": Payment.objects.exclude(status="paid").filter(due_date__lt=today).count(),
    }
    extra_context["batches_today"] = Batch.objects.filter(is_active=True).select_related("program").annotate(
        n=Count("members", filter=Q(members__is_active=True)),
        p=Count("members__attendance", filter=Q(members__attendance__date=today,
                                                members__attendance__status="present")),
    )
    extra_context["overdue_list"] = Payment.objects.exclude(status="paid").filter(
        due_date__lt=today).select_related("member__user")[:8]
    return _original_index(request, extra_context)


admin.site.index = dashboard_index


# ------------------------------------------------------------------ helpers

def status_pill(text, color):
    return format_html(
        '<span style="background:{}1A;color:{};padding:3px 10px;border-radius:20px;font-weight:600;'
        'font-size:11px">{}</span>', color, color, text)


# ------------------------------------------------------------------ Program / Batch

@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ("name", "tagline", "intensity", "order", "thumb")
    list_editable = ("order",)

    @admin.display(description="Image")
    def thumb(self, obj):
        url = obj.image.url if obj.image else obj.image_url
        return format_html('<img src="{}" style="height:40px;border-radius:8px">', url) if url else "-"


class MemberInline(admin.TabularInline):
    model = Member
    fields = ("user", "phone", "goal", "is_active")
    extra = 0
    show_change_link = True


@admin.register(Trainer)
class TrainerAdmin(admin.ModelAdmin):
    list_display = ("full_name", "username", "specialty", "phone", "batch_list", "is_active")
    list_filter = ("is_active",)
    search_fields = ("user__first_name", "user__last_name", "user__username", "phone")
    autocomplete_fields = ("user",)

    @admin.display(description="Username")
    def username(self, obj):
        return obj.user.username

    @admin.display(description="Batches")
    def batch_list(self, obj):
        return ", ".join(b.name for b in obj.batches.all()) or "-"


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ("name", "program", "coach", "days", "start_time", "end_time", "filled", "monthly_fee",
                    "is_active", "attendance_link")
    list_filter = ("program", "is_active")
    search_fields = ("name", "trainer")
    autocomplete_fields = ("coach",)
    inlines = [MemberInline]

    @admin.display(description="Members")
    def filled(self, obj):
        n = obj.member_count
        color = "#E5484D" if n >= obj.capacity else "#22B07D"
        return status_pill(f"{n}/{obj.capacity}", color)

    @admin.display(description="Attendance")
    def attendance_link(self, obj):
        return format_html('<a class="button" href="/admin/attendance-sheet/?batch={}">Mark today</a>', obj.id)


# ------------------------------------------------------------------ Member

class PaymentInline(admin.TabularInline):
    model = Payment
    fields = ("title", "amount", "due_date", "status", "paid_at")
    readonly_fields = ("paid_at",)
    extra = 0


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "batch", "joined_on", "membership_ends", "attendance_rate",
                    "dues", "is_active")
    list_filter = ("batch", "is_active", "gender")
    search_fields = ("user__first_name", "user__last_name", "user__username", "user__email", "phone")
    autocomplete_fields = ("user",)
    inlines = [PaymentInline]
    actions = ["email_absence_check"]

    @admin.display(description="Attendance (30d)")
    def attendance_rate(self, obj):
        recs = obj.attendance.filter(date__gte=date.today() - timedelta(days=30))
        total = recs.count()
        if not total:
            return "-"
        rate = round(recs.filter(status="present").count() * 100 / total)
        return status_pill(f"{rate}%", "#22B07D" if rate >= 75 else "#FFB020" if rate >= 50 else "#E5484D")

    @admin.display(description="Dues")
    def dues(self, obj):
        pending = obj.payments.exclude(status="paid").aggregate(s=Sum("amount"))["s"]
        return status_pill(f"₹{pending}", "#E5484D") if pending else status_pill("Clear", "#22B07D")

    @admin.action(description="Email 'we miss you' to members absent 3+ days in a row")
    def email_absence_check(self, request, queryset):
        sent = 0
        for m in queryset:
            last = list(m.attendance.order_by("-date")[:3])
            if len(last) == 3 and all(a.status == "absent" for a in last):
                ok, _ = services.send_email(
                    [services.member_recipient(m)], "We miss you at PulseForge!", "We miss you!",
                    f"Hi {m.user.first_name}, you've missed your last 3 sessions in <b>{m.batch}</b>. "
                    "Your batch is waiting for you, so come back stronger!")
                sent += ok
        self.message_user(request, f"Absence emails sent to {sent} member(s).")


# Make User searchable for Member autocomplete
admin.site.unregister(User)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    search_fields = ("username", "first_name", "last_name", "email")
    list_display = ("username", "first_name", "last_name", "email", "is_staff")
    fields = ("username", "first_name", "last_name", "email", "password", "is_staff", "is_superuser", "is_active")

    def save_model(self, request, obj, form, change):
        raw = form.cleaned_data.get("password", "")
        if raw and not raw.startswith(("pbkdf2_", "argon2", "bcrypt")):
            obj.set_password(raw)
        super().save_model(request, obj, form, change)


# ------------------------------------------------------------------ Attendance

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("member", "batch", "date", "colored_status", "note")
    list_filter = ("status", "date", "member__batch")
    search_fields = ("member__user__first_name", "member__user__username")
    date_hierarchy = "date"
    actions = ["mark_present", "mark_absent"]
    change_list_template = "admin/gym/attendance/change_list.html"

    @admin.display(description="Batch")
    def batch(self, obj):
        return obj.member.batch

    @admin.display(description="Status")
    def colored_status(self, obj):
        return status_pill(obj.get_status_display(), "#22B07D" if obj.status == "present" else "#E5484D")

    @admin.action(description="Mark selected as present")
    def mark_present(self, request, qs):
        qs.update(status="present")

    @admin.action(description="Mark selected as absent")
    def mark_absent(self, request, qs):
        qs.update(status="absent")


# ------------------------------------------------------------------ Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("member", "title", "amount", "due_date", "colored_status", "method", "paid_at", "order_id")
    list_filter = ("status", "due_date", "member__batch")
    search_fields = ("member__user__first_name", "member__user__username", "order_id", "title")
    date_hierarchy = "due_date"
    actions = ["mark_paid_cash", "send_payment_reminder", "generate_next_month"]
    readonly_fields = ("order_id", "payment_session_id", "cf_payment_id", "created_at")

    @admin.display(description="Status")
    def colored_status(self, obj):
        if obj.is_overdue:
            return status_pill("Overdue", "#E5484D")
        return status_pill(obj.get_status_display(),
                           {"paid": "#22B07D", "pending": "#FFB020", "failed": "#E5484D"}[obj.status])

    @admin.action(description="Mark as paid (cash at front desk)")
    def mark_paid_cash(self, request, qs):
        n = qs.exclude(status="paid").update(status="paid", method="cash", paid_at=timezone.now())
        self.message_user(request, f"{n} payment(s) marked paid.")

    @admin.action(description="Email payment reminder (Brevo) + in-app reminder")
    def send_payment_reminder(self, request, qs):
        sent = 0
        for p in qs.exclude(status="paid").select_related("member__user"):
            Reminder.objects.create(member=p.member, kind="payment", title=f"Fee due: {p.title}",
                                    message=f"₹{p.amount} due on {p.due_date:%d %b %Y}. Pay in the app.",
                                    emailed=True)
            ok, info = services.send_email(
                [services.member_recipient(p.member)], f"Fee reminder · {p.title}", "Friendly fee reminder",
                f"Hi {p.member.user.first_name},<br>Your fee <b>₹{p.amount}</b> for <b>{p.title}</b> is due on "
                f"<b>{p.due_date:%d %b %Y}</b>.<br>Open the PulseForge app → Payments to pay securely via Cashfree.")
            sent += ok
        self.message_user(request, f"Reminders sent: {sent}.", messages.SUCCESS)

    @admin.action(description="Create next month's fee for these members")
    def generate_next_month(self, request, qs):
        n = 0
        for p in qs.select_related("member__batch"):
            nxt = (p.due_date.replace(day=1) + timedelta(days=32)).replace(day=5)
            title = f"Membership - {nxt:%b %Y}"
            _, created = Payment.objects.get_or_create(
                member=p.member, title=title,
                defaults={"amount": p.member.batch.monthly_fee if p.member.batch else p.amount, "due_date": nxt})
            n += created
        self.message_user(request, f"{n} new fee(s) created.")


# ------------------------------------------------------------------ Messages / Diet / Reminders / Media

def _recipients(batch=None, member=None):
    if member:
        return [services.member_recipient(member)]
    qs = Member.objects.filter(is_active=True).select_related("user")
    if batch:
        qs = qs.filter(batch=batch)
    return [services.member_recipient(m) for m in qs]


@admin.register(BatchMessage)
class BatchMessageAdmin(admin.ModelAdmin):
    list_display = ("title", "batch", "kind", "created_at")
    list_filter = ("kind", "batch")

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.email_members:
            ok, info = services.send_email(_recipients(obj.batch), f"{obj.title} · PulseForge", obj.title,
                                           obj.body.replace("\n", "<br>"))
            self.message_user(request, f"Email: {info}", messages.SUCCESS if ok else messages.WARNING)


@admin.register(DietChart)
class DietChartAdmin(admin.ModelAdmin):
    list_display = ("title", "batch", "member", "calories", "created_at")
    list_filter = ("batch",)
    autocomplete_fields = ("member",)
    actions = ["email_chart"]
    fieldsets = (
        (None, {"fields": ("title", "batch", "member", "calories")}),
        ("Meals", {"fields": ("early_morning", "breakfast", "mid_morning", "lunch", "evening", "dinner", "notes")}),
    )

    @admin.action(description="Email this diet chart to its members")
    def email_chart(self, request, qs):
        for d in qs:
            rows = "".join(f"<p><b>{label}</b><br>{val}</p>" for label, val in [
                ("Early morning", d.early_morning), ("Breakfast", d.breakfast), ("Mid-morning", d.mid_morning),
                ("Lunch", d.lunch), ("Evening", d.evening), ("Dinner", d.dinner)] if val)
            ok, info = services.send_email(_recipients(d.batch, d.member), f"New diet chart · {d.title}",
                                           d.title, f"Target: {d.calories} kcal/day{rows}<p>{d.notes}</p>")
            self.message_user(request, f"{d.title}: {info}")


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "member", "batch", "remind_at", "emailed")
    list_filter = ("kind", "emailed", "batch")
    autocomplete_fields = ("member",)
    actions = ["email_now"]

    @admin.action(description="Send selected reminders by email now (Brevo)")
    def email_now(self, request, qs):
        n = 0
        for r in qs:
            ok, _ = services.send_email(_recipients(r.batch, r.member), r.title, r.title, r.message)
            if ok:
                r.emailed = True
                r.save(update_fields=["emailed"])
                n += 1
        self.message_user(request, f"{n} reminder(s) emailed.")


@admin.register(MediaItem)
class MediaItemAdmin(admin.ModelAdmin):
    list_display = ("thumb", "title", "kind", "program", "featured", "created_at")
    list_display_links = ("thumb", "title")
    list_filter = ("kind", "program", "featured")
    list_editable = ("featured",)

    @admin.display(description="")
    def thumb(self, obj):
        url = obj.image.url if obj.image else obj.image_url
        return format_html('<img src="{}" style="height:44px;width:60px;object-fit:cover;border-radius:8px">',
                           url) if url else "-"


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ("thumb", "title", "tag", "target", "order", "is_active")
    list_display_links = ("thumb", "title")
    list_editable = ("order", "is_active")

    @admin.display(description="")
    def thumb(self, obj):
        url = obj.image.url if obj.image else obj.image_url
        return format_html('<img src="{}" style="height:44px;width:80px;object-fit:cover;border-radius:8px">',
                           url) if url else "-"


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "created_at", "last_seen")
    search_fields = ("user__username",)
    readonly_fields = ("user", "token", "platform", "created_at", "last_seen")
