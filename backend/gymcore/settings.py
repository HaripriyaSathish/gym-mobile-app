"""PulseForge Fitness - Django settings."""
import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-insecure-change-me")
DEBUG = os.getenv("DEBUG", "1") == "1"
ALLOWED_HOSTS = ["*"]

# Render sets RENDER_EXTERNAL_HOSTNAME (e.g. pulseforge-api.onrender.com)
RENDER_HOST = os.getenv("RENDER_EXTERNAL_HOSTNAME", "")
CSRF_TRUSTED_ORIGINS = [f"https://{RENDER_HOST}"] if RENDER_HOST else []
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "gym",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # serves admin CSS/JS on Render
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "gymcore.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "gymcore.wsgi.application"

# Database
#   Render / production: DATABASE_URL = the Neon PostgreSQL URL (set in Render's environment).
#   Local development:  no DATABASE_URL, so the local MySQL below is used.
DATABASE_URL = os.getenv("DATABASE_URL", "")
NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL", "")


def _postgres(url):
    cfg = dj_database_url.parse(url, conn_max_age=60, conn_health_checks=True, ssl_require=True)
    cfg["DISABLE_SERVER_SIDE_CURSORS"] = True  # Neon's "-pooler" host is PgBouncer (transaction mode)
    return cfg


if DATABASE_URL:
    DATABASES = {"default": _postgres(DATABASE_URL)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("DB_NAME", "pulseforge_gym"),
            "USER": os.getenv("DB_USER", "root"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "127.0.0.1"),
            "PORT": os.getenv("DB_PORT", "3306"),
            "OPTIONS": {"charset": "utf8mb4"},
        }
    }
    # Extra connection, local only, used to copy local MySQL data into Neon (manage.py copy_to_neon)
    if NEON_DATABASE_URL:
        DATABASES["neon"] = _postgres(NEON_DATABASE_URL)

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---- Cloudinary (all uploaded media: images, videos) ----
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")
USE_CLOUDINARY = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

STORAGES = {
    "default": {
        "BACKEND": "gym.storage.CloudinaryStorage" if USE_CLOUDINARY
        else "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage" if DEBUG
                    else "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
}

CORS_ALLOW_ALL_ORIGINS = True

# ---- Brevo (email) ----
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "PulseForge Fitness")

# ---- Cashfree (payments, TEST mode) ----
CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID", "")
CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY", "")
CASHFREE_ENV = os.getenv("CASHFREE_ENV", "sandbox")  # sandbox only for this project
CASHFREE_API_VERSION = "2023-08-01"
PUBLIC_BACKEND_URL = os.getenv("PUBLIC_BACKEND_URL") or os.getenv("RENDER_EXTERNAL_URL") or "http://localhost:8000"
CASHFREE_RETURN_URL = os.getenv(
    "CASHFREE_RETURN_URL", PUBLIC_BACKEND_URL + "/api/payments/return/?order_id={order_id}"
)

GYM_NAME = "PulseForge Fitness"
