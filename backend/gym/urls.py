from django.urls import path

from . import coach_views, views

urlpatterns = [
    # trainer side
    path("coach/dashboard/", coach_views.dashboard),
    path("coach/members/", coach_views.members),
    path("coach/attendance/", coach_views.attendance),
    path("coach/messages/", coach_views.messages),
    path("coach/messages/<int:pk>/", coach_views.message_delete),
    path("coach/payments/", coach_views.payments),
    path("coach/payments/<int:pk>/cash/", coach_views.payment_cash),
    path("coach/payments/<int:pk>/remind/", coach_views.payment_remind),
    # member side
    path("auth/login/", views.login),
    path("auth/register/", views.register),
    path("auth/logout/", views.logout),
    path("push/register/", views.push_register),
    path("home/", views.home),
    path("me/", views.me),
    path("messages/", views.messages),
    path("diet/", views.diet_charts),
    path("attendance/", views.attendance),
    path("attendance/checkin/", views.check_in),
    path("reminders/", views.reminders),
    path("payments/", views.payments),
    path("payments/<int:pk>/pay/", views.start_payment),
    path("payments/checkout/<str:order_id>/", views.checkout_page),
    path("payments/return/", views.payment_return),
    path("programs/", views.programs),
    path("batches/", views.batches),
    path("media/", views.media),
]
