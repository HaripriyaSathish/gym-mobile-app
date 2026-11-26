from datetime import date

from django.contrib import admin, messages
from django.shortcuts import redirect, render

from . import services
from .models import Attendance, Batch


def attendance_sheet(request):
    """Mark present/absent for a whole batch on one screen."""
    batches = Batch.objects.filter(is_active=True).select_related("program")
    batch_id = request.GET.get("batch") or request.POST.get("batch") or (batches[0].id if batches else None)
    day_str = request.GET.get("date") or request.POST.get("date") or date.today().isoformat()
    day = date.fromisoformat(day_str)
    batch = Batch.objects.filter(id=batch_id).first() if batch_id else None
    members = list(batch.members.filter(is_active=True).select_related("user")) if batch else []

    if request.method == "POST" and batch:
        absentees = []
        for m in members:
            st = request.POST.get(f"m_{m.id}", "absent")
            Attendance.objects.update_or_create(member=m, date=day, defaults={"status": st})
            if st == "absent":
                absentees.append(m)
        msg = f"Saved attendance for {len(members)} member(s) in {batch.name}."
        if request.POST.get("email_absent") and absentees:
            ok, info = services.send_email(
                [services.member_recipient(m) for m in absentees],
                "You missed today's session", "We missed you today",
                f"You were marked absent for <b>{batch.name}</b> on {day:%d %b %Y}. "
                "Consistency builds results, so see you next session!")
            msg += f" Absence email to {len(absentees)}: {info}."
        messages.success(request, msg)
        return redirect(f"/admin/attendance-sheet/?batch={batch.id}&date={day.isoformat()}")

    existing = {a.member_id: a.status for a in Attendance.objects.filter(member__in=members, date=day)}
    rows = [{"m": m, "status": existing.get(m.id, "")} for m in members]
    ctx = {
        **admin.site.each_context(request),
        "title": "Attendance sheet",
        "batches": batches,
        "batch": batch,
        "day": day,
        "rows": rows,
        "present": sum(1 for r in rows if r["status"] == "present"),
        "absent": sum(1 for r in rows if r["status"] == "absent"),
    }
    return render(request, "admin/attendance_sheet.html", ctx)
