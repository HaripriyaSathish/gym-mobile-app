# PulseForge Fitness

Gym management system: a member mobile app (React Native + Expo) and a Django admin panel on MySQL.
Payments go through Cashfree (test mode), emails through Brevo, and media through Cloudinary.

```
backend/   Django 5.2 + DRF API, admin panel, MySQL, Cashfree, Brevo, Cloudinary storage
mobile/    Expo SDK 58 app (Expo Go on phone, phone-framed web view on desktop)
```

## Run it

**1. Backend (API + admin), port 8000**
```powershell
cd "C:\gym mobile app\backend"
.\venv\Scripts\python manage.py runserver 0.0.0.0:8000
```
Admin panel: http://localhost:8000/admin

**2. Member app**
```powershell
cd "C:\gym mobile app\mobile"
npx expo start --web --port 8080
```
- Desktop browser: http://localhost:8080 shows the app inside a realistic phone frame.
- Phone: install **Expo Go**, scan the QR code in the terminal (same Wi-Fi). The app reaches the backend
  on your PC's LAN IP automatically; allow Python through Windows Firewall if asked.

> If port 8080 is busy, the Oracle XE listener (TNSLSNR) usually has it. Stop the
> `OracleXETNSListener` service, or use another port, e.g. `--port 8081`.

## Demo logins (local development only)

| Where | Username | Password |
|---|---|---|
| Admin panel | `admin` | `admin123` |
| Member app | `demo` | `Demo@123` |
| Other members (arjun, kavya, rohan…) | username | `Member@123` |
| Trainer app (same login screen) | `meera`, `ananya`, `rahul`, `vikram` | `Coach@123` |

The app picks the screens from the login: members get the member tabs, trainers get the trainer tabs
(Dashboard, Attendance, Messages, Members, Fees) scoped to the batches they coach. Admin/staff logins
see every batch. New members can sign up in the app; trainers are added by the admin
(Users → add user, then Trainers → add, then set the trainer as **Coach** on their batches).

## Automatic absence
When a batch's session has ended (+15 min grace) and a member hasn't checked in, they are marked absent
and get an animated "you missed today's workout" popup on the app's Home screen plus a reminder.
This happens automatically when members or trainers open the app. To also run it on a schedule
(e.g. every 15 minutes with Windows Task Scheduler):
```powershell
.\venv\Scripts\python manage.py mark_absentees
```
Optional settings: `AUTO_ABSENT_GRACE_MINUTES` (default 15), `AUTO_ABSENT_EMAIL = True` to also email absentees.

## Features

**Member app:** home with auto-sliding banners, batch card with one-tap check-in, streak and attendance stats;
batch messages and diet charts (batch-wide or personal); attendance calendar with absence tracking;
fees with Cashfree checkout and history; reminders; gallery with photos, workout videos and before/after
transformations; Zumba, Fitness, Strength and Yoga program pages; profile with BMI.
Light theme in Bebas Neue and Poppins, with neon-glow hover and press effects, entrance animations
and skeleton loaders.

**Admin panel:** dashboard (members, today's attendance, revenue, dues, overdue), batch management with capacity,
one-screen attendance sheet (optional "email absentees"), payments (mark paid as cash, Brevo fee reminders,
generate next month's fees), batch messages (optional email), diet charts, reminders, banners and media uploads
(stored on Cloudinary).

## Config: `backend/.env` (not committed)
`DB_*` (MySQL), `CASHFREE_APP_ID/SECRET_KEY` (sandbox), `BREVO_API_KEY` + `BREVO_SENDER_EMAIL` (verified sender),
`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`.

Useful commands:
```powershell
.\venv\Scripts\python manage.py seed_gym --reset      # fresh demo data
.\venv\Scripts\python manage.py sync_media_cloudinary # push local media/ to Cloudinary
```

**Cashfree sandbox testing:** in checkout choose Net Banking, pick any bank, and use the simulator's OTP with SUCCESS.
Use UPI `testsuccess@gocash`. No real money moves.
