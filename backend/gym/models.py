from datetime import date

from django.conf import settings
from django.db import models
from django.utils import timezone


class Program(models.Model):
    """Training style offered by the gym: Zumba, Fitness, Strength, Yoga..."""

    INTENSITY = [("low", "Low"), ("medium", "Medium"), ("high", "High")]

    name = models.CharField(max_length=60, unique=True)
    tagline = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    intensity = models.CharField(max_length=10, choices=INTENSITY, default="medium")
    accent_color = models.CharField(max_length=9, default="#FF5A36")
    image = models.ImageField(upload_to="programs/", blank=True)
    image_url = models.URLField(blank=True, help_text="Used when no image is uploaded")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Trainer(models.Model):
    """A coach who signs in to the app to run their batches (attendance, messages, fees)."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="trainer")
    phone = models.CharField(max_length=15, blank=True)
    specialty = models.CharField(max_length=80, blank=True, help_text="e.g. Zumba, Strength & conditioning")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["user__first_name"]

    def __str__(self):
        return self.user.get_full_name() or self.user.username

    @property
    def full_name(self):
        return str(self)


class Batch(models.Model):
    """A small group that trains together at a fixed time."""

    name = models.CharField(max_length=80)
    program = models.ForeignKey(Program, on_delete=models.PROTECT, related_name="batches")
    coach = models.ForeignKey(Trainer, on_delete=models.SET_NULL, null=True, blank=True, related_name="batches",
                              help_text="Trainer login that manages this batch in the app")
    trainer = models.CharField(max_length=80, blank=True, help_text="Name shown to members (filled from coach)")
    days = models.CharField(max_length=60, default="Mon - Sat")
    start_time = models.TimeField()
    end_time = models.TimeField()
    capacity = models.PositiveIntegerField(default=15)
    monthly_fee = models.DecimalField(max_digits=8, decimal_places=2, default=1500)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["start_time"]
        verbose_name_plural = "batches"

    def __str__(self):
        return f"{self.name} ({self.start_time:%I:%M %p})"

    def save(self, *args, **kwargs):
        if self.coach_id:
            u = self.coach.user
            self.trainer = f"Coach {u.first_name}" if u.first_name else u.username
        super().save(*args, **kwargs)

    @property
    def member_count(self):
        return self.members.filter(is_active=True).count()


class Member(models.Model):
    GENDER = [("F", "Female"), ("M", "Male"), ("O", "Other")]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="member")
    phone = models.CharField(max_length=15, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER, blank=True)
    batch = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True, related_name="members")
    goal = models.CharField(max_length=120, blank=True)
    height_cm = models.PositiveIntegerField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    joined_on = models.DateField(default=date.today)
    membership_ends = models.DateField(null=True, blank=True)
    photo = models.ImageField(upload_to="members/", blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["user__first_name"]

    def __str__(self):
        return self.user.get_full_name() or self.user.username

    @property
    def full_name(self):
        return str(self)


class BatchMessage(models.Model):
    """Announcements / workout notes sent by the admin to a whole batch."""

    KIND = [("announcement", "Announcement"), ("workout", "Workout"), ("tip", "Tip")]

    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="messages", null=True, blank=True,
                              help_text="Leave empty to send to all batches")
    kind = models.CharField(max_length=20, choices=KIND, default="announcement")
    title = models.CharField(max_length=120)
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    email_members = models.BooleanField(default=False, help_text="Also email this message via Brevo on save")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class DietChart(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="diet_charts", null=True, blank=True,
                              help_text="Leave empty for all batches")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="diet_charts", null=True, blank=True,
                               help_text="Optional: a personal chart for one member")
    title = models.CharField(max_length=120)
    calories = models.PositiveIntegerField(default=1800)
    early_morning = models.TextField(blank=True)
    breakfast = models.TextField(blank=True)
    mid_morning = models.TextField(blank=True)
    lunch = models.TextField(blank=True)
    evening = models.TextField(blank=True)
    dinner = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Attendance(models.Model):
    STATUS = [("present", "Present"), ("absent", "Absent")]

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="attendance")
    date = models.DateField(default=date.today)
    status = models.CharField(max_length=10, choices=STATUS, default="present")
    note = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ("member", "date")
        verbose_name_plural = "attendance"

    def __str__(self):
        return f"{self.member} - {self.date} - {self.status}"


class Payment(models.Model):
    STATUS = [("pending", "Pending"), ("paid", "Paid"), ("failed", "Failed")]

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="payments")
    title = models.CharField(max_length=80, help_text="e.g. Membership - Dec 2026")
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS, default="pending")
    order_id = models.CharField(max_length=60, blank=True, db_index=True)
    payment_session_id = models.CharField(max_length=255, blank=True)
    cf_payment_id = models.CharField(max_length=60, blank=True)
    method = models.CharField(max_length=30, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-due_date"]

    def __str__(self):
        return f"{self.member} - {self.title} - {self.status}"

    @property
    def is_overdue(self):
        return self.status != "paid" and self.due_date < date.today()


class Reminder(models.Model):
    KIND = [("payment", "Payment"), ("class", "Class"), ("diet", "Diet"), ("general", "General")]

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="reminders", null=True, blank=True,
                               help_text="Leave empty to remind a whole batch (or everyone)")
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name="reminders", null=True, blank=True)
    kind = models.CharField(max_length=10, choices=KIND, default="general")
    title = models.CharField(max_length=120)
    message = models.TextField(blank=True)
    remind_at = models.DateTimeField(default=timezone.now)
    emailed = models.BooleanField(default=False)

    class Meta:
        ordering = ["-remind_at"]

    def __str__(self):
        return self.title


class Banner(models.Model):
    """Home-screen hero slides, managed from the admin panel."""

    TARGET = [("gallery", "Gallery"), ("program", "Program"), ("pay", "Payments"), ("batch", "Batch chat"),
              ("none", "No action")]

    title = models.CharField(max_length=60)
    subtitle = models.CharField(max_length=120, blank=True)
    tag = models.CharField(max_length=24, blank=True, help_text="Small label, e.g. NEW, OFFER")
    image = models.ImageField(upload_to="banners/", blank=True)
    image_url = models.URLField(blank=True)
    cta_label = models.CharField(max_length=24, default="Explore")
    target = models.CharField(max_length=10, choices=TARGET, default="gallery")
    program = models.ForeignKey(Program, on_delete=models.SET_NULL, null=True, blank=True,
                                help_text="Used when target is Program")
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.title


class MediaItem(models.Model):
    """Gallery content: photos, videos and before/after transformations."""

    KIND = [("image", "Image"), ("video", "Video"), ("transformation", "Transformation")]

    kind = models.CharField(max_length=20, choices=KIND, default="image")
    program = models.ForeignKey(Program, on_delete=models.SET_NULL, null=True, blank=True, related_name="media")
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="gallery/", blank=True, help_text="Photo, video thumbnail or AFTER photo")
    image_url = models.URLField(blank=True)
    before_image = models.ImageField(upload_to="gallery/", blank=True, help_text="Transformation BEFORE photo")
    before_image_url = models.URLField(blank=True)
    video = models.FileField(upload_to="videos/", blank=True)
    video_url = models.URLField(blank=True)
    duration = models.CharField(max_length=10, blank=True, help_text="e.g. 12:30")
    member_name = models.CharField(max_length=80, blank=True, help_text="For transformations")
    result = models.CharField(max_length=80, blank=True, help_text="e.g. -14 kg in 5 months")
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-featured", "-created_at"]

    def __str__(self):
        return f"[{self.kind}] {self.title}"


class PushToken(models.Model):
    """An Expo push token for one device a user is signed in on."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_tokens")
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} · {self.platform}"
