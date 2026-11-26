from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

from gym.admin_views import attendance_sheet

admin.site.site_header = "PulseForge Fitness · Admin"
admin.site.site_title = "PulseForge Admin"
admin.site.index_title = "Gym control center"

urlpatterns = [
    path("", RedirectView.as_view(url="/admin/")),
    path("admin/attendance-sheet/", admin.site.admin_view(attendance_sheet), name="attendance_sheet"),
    path("admin/", admin.site.urls),
    path("api/", include("gym.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
