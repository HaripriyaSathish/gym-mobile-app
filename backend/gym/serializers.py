from rest_framework import serializers

from .models import Attendance, Banner, Batch, BatchMessage, DietChart, MediaItem, Member, Payment, Program, Reminder


def media_url(request, file_field, fallback=""):
    if file_field:
        url = file_field.url
        return request.build_absolute_uri(url) if request else url
    return fallback or ""


class ProgramSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    batch_count = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = ["id", "name", "tagline", "description", "intensity", "accent_color", "image", "batch_count"]

    def get_image(self, obj):
        return media_url(self.context.get("request"), obj.image, obj.image_url)

    def get_batch_count(self, obj):
        return obj.batches.filter(is_active=True).count()


class BatchSerializer(serializers.ModelSerializer):
    program = serializers.CharField(source="program.name")
    member_count = serializers.IntegerField(read_only=True)
    start = serializers.SerializerMethodField()
    end = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ["id", "name", "program", "trainer", "days", "start", "end", "capacity", "member_count",
                  "monthly_fee"]

    def get_start(self, obj):
        return obj.start_time.strftime("%I:%M %p")

    def get_end(self, obj):
        return obj.end_time.strftime("%I:%M %p")


class MemberSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="full_name")
    first_name = serializers.CharField(source="user.first_name")
    email = serializers.EmailField(source="user.email")
    username = serializers.CharField(source="user.username")
    batch = BatchSerializer()
    photo = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = ["id", "name", "first_name", "username", "email", "phone", "gender", "goal", "height_cm",
                  "weight_kg", "joined_on", "membership_ends", "photo", "batch"]

    def get_photo(self, obj):
        return media_url(self.context.get("request"), obj.photo)


class BatchMessageSerializer(serializers.ModelSerializer):
    batch = serializers.SerializerMethodField()

    class Meta:
        model = BatchMessage
        fields = ["id", "kind", "title", "body", "created_at", "batch"]

    def get_batch(self, obj):
        return obj.batch.name if obj.batch else "All batches"


class DietChartSerializer(serializers.ModelSerializer):
    meals = serializers.SerializerMethodField()
    personal = serializers.SerializerMethodField()

    class Meta:
        model = DietChart
        fields = ["id", "title", "calories", "meals", "notes", "created_at", "personal"]

    def get_personal(self, obj):
        return obj.member_id is not None

    def get_meals(self, obj):
        rows = [
            ("Early morning", "06:00", obj.early_morning),
            ("Breakfast", "08:30", obj.breakfast),
            ("Mid-morning", "11:00", obj.mid_morning),
            ("Lunch", "13:30", obj.lunch),
            ("Evening", "17:00", obj.evening),
            ("Dinner", "20:00", obj.dinner),
        ]
        return [{"name": n, "time": t, "items": v} for n, t, v in rows if v]


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ["id", "date", "status", "note"]


class PaymentSerializer(serializers.ModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "title", "amount", "due_date", "status", "order_id", "method", "paid_at", "is_overdue"]


class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = ["id", "kind", "title", "message", "remind_at"]


class BannerSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    program = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = ["id", "title", "subtitle", "tag", "image", "cta_label", "target", "program"]

    def get_image(self, obj):
        return media_url(self.context.get("request"), obj.image, obj.image_url)

    def get_program(self, obj):
        return ProgramSerializer(obj.program, context=self.context).data if obj.program else None


class MediaItemSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    before_image = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    program = serializers.SerializerMethodField()

    class Meta:
        model = MediaItem
        fields = ["id", "kind", "title", "description", "image", "before_image", "video", "duration",
                  "member_name", "result", "featured", "program"]

    def get_image(self, obj):
        return media_url(self.context.get("request"), obj.image, obj.image_url)

    def get_before_image(self, obj):
        return media_url(self.context.get("request"), obj.before_image, obj.before_image_url)

    def get_video(self, obj):
        return media_url(self.context.get("request"), obj.video, obj.video_url)

    def get_program(self, obj):
        return obj.program.name if obj.program else None
