"""External services: Brevo (transactional email) and Cashfree (payments, sandbox/test mode)."""
import logging

import requests
from django.conf import settings

log = logging.getLogger(__name__)

# --------------------------------------------------------------------------- Brevo

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def email_layout(title, body_html):
    return f"""
    <div style="font-family:Poppins,Arial,sans-serif;background:#FFF8F3;padding:24px">
      <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;
                  border:1px solid #F1E4DA">
        <div style="background:#FF5A36;color:#fff;padding:18px 24px;font-size:22px;letter-spacing:2px;
                    font-weight:700">PULSEFORGE FITNESS</div>
        <div style="padding:24px;color:#1B2340">
          <h2 style="margin:0 0 12px">{title}</h2>
          <div style="font-size:15px;line-height:1.6">{body_html}</div>
        </div>
        <div style="padding:14px 24px;background:#FFF1E9;color:#7A8199;font-size:12px">
          You are receiving this because you are a PulseForge member.
        </div>
      </div>
    </div>"""


def send_email(to_list, subject, title, body_html):
    """Send via Brevo. to_list = [(email, name), ...]. Returns (ok, info).

    Without BREVO_API_KEY the email is only printed to the console (useful for local dev).
    """
    to_list = [(e, n) for e, n in to_list if e]
    if not to_list:
        return False, "No recipients with email"
    html = email_layout(title, body_html)
    if not settings.BREVO_API_KEY or not settings.BREVO_SENDER_EMAIL:
        log.warning("[Brevo disabled] Would email %s: %s", [e for e, _ in to_list], subject)
        print(f"[Brevo disabled - console email] To: {[e for e, _ in to_list]} | {subject}")
        return True, "console"
    payload = {
        "sender": {"email": settings.BREVO_SENDER_EMAIL, "name": settings.BREVO_SENDER_NAME},
        "to": [{"email": e, "name": n or e} for e, n in to_list],
        "subject": subject,
        "htmlContent": html,
    }
    try:
        r = requests.post(
            BREVO_URL,
            json=payload,
            headers={"api-key": settings.BREVO_API_KEY, "accept": "application/json"},
            timeout=15,
        )
        if r.status_code >= 300:
            return False, f"Brevo {r.status_code}: {r.text[:200]}"
        return True, "sent"
    except requests.RequestException as exc:
        return False, str(exc)


def member_recipient(member):
    return (member.user.email, member.full_name)


# --------------------------------------------------------------------------- Cashfree

def cashfree_enabled():
    return bool(settings.CASHFREE_APP_ID and settings.CASHFREE_SECRET_KEY)


def _cf_base():
    # This project is wired for TEST mode only.
    return "https://sandbox.cashfree.com/pg"


def _cf_headers():
    return {
        "x-client-id": settings.CASHFREE_APP_ID,
        "x-client-secret": settings.CASHFREE_SECRET_KEY,
        "x-api-version": settings.CASHFREE_API_VERSION,
        "content-type": "application/json",
        "accept": "application/json",
    }


def cashfree_create_order(payment, base_url=None):
    """Create a Cashfree sandbox order. Returns dict with payment_session_id."""
    member = payment.member
    phone = "".join(ch for ch in (member.phone or "") if ch.isdigit())[-10:] or "9999999999"
    body = {
        "order_id": payment.order_id,
        "order_amount": float(payment.amount),
        "order_currency": "INR",
        "order_note": payment.title,
        "customer_details": {
            "customer_id": f"member_{member.id}",
            "customer_name": member.full_name,
            "customer_email": member.user.email or "member@example.com",
            "customer_phone": phone,
        },
        "order_meta": {
            "return_url": f"{(base_url or settings.PUBLIC_BACKEND_URL).rstrip('/')}/api/payments/return/?order_id={{order_id}}",
        },
    }
    r = requests.post(f"{_cf_base()}/orders", json=body, headers=_cf_headers(), timeout=20)
    data = r.json()
    if r.status_code >= 300:
        raise RuntimeError(data.get("message", "Cashfree order failed"))
    return data


def cashfree_order_status(order_id):
    """Returns (order_status, payment_dict_or_None)."""
    r = requests.get(f"{_cf_base()}/orders/{order_id}", headers=_cf_headers(), timeout=20)
    order = r.json()
    status = order.get("order_status")
    pay = None
    if status == "PAID":
        p = requests.get(f"{_cf_base()}/orders/{order_id}/payments", headers=_cf_headers(), timeout=20).json()
        if isinstance(p, list) and p:
            pay = p[0]
    return status, pay


# --------------------------------------------------------------------------- Expo push notifications

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push(users, title, body, data=None, channel="reminders"):
    """Send an Expo push notification to every device of the given users. Returns how many were accepted.

    Tokens Expo reports as DeviceNotRegistered (app uninstalled / signed out) are deleted.
    """
    from .models import PushToken

    tokens = list(PushToken.objects.filter(user__in=users).values_list("token", flat=True))
    if not tokens:
        return 0
    headers = {"accept": "application/json", "content-type": "application/json"}
    if getattr(settings, "EXPO_ACCESS_TOKEN", ""):
        headers["Authorization"] = f"Bearer {settings.EXPO_ACCESS_TOKEN}"
    accepted = 0
    for i in range(0, len(tokens), 100):  # Expo accepts up to 100 messages per request
        chunk = tokens[i:i + 100]
        msgs = [{"to": t, "title": title, "body": body, "data": data or {}, "sound": "default",
                 "channelId": channel, "priority": "high"} for t in chunk]
        try:
            r = requests.post(EXPO_PUSH_URL, json=msgs, headers=headers, timeout=15)
            tickets = r.json().get("data", []) if r.status_code < 300 else []
            if r.status_code >= 300:
                log.warning("Expo push %s: %s", r.status_code, r.text[:200])
        except (requests.RequestException, ValueError) as exc:
            log.warning("Expo push failed: %s", exc)
            continue
        dead = []
        for tok, t in zip(chunk, tickets):
            if t.get("status") == "ok":
                accepted += 1
            elif (t.get("details") or {}).get("error") == "DeviceNotRegistered":
                dead.append(tok)
        if dead:
            PushToken.objects.filter(token__in=dead).delete()
    return accepted
