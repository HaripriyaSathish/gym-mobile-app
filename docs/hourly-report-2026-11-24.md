# Hourly Work Report: PulseForge Fitness

**Date:** 24 Nov 2026  **Time:** 13:55 – 14:55 (about 1 hour)
**Project:** gym management app (React Native/Expo member app + Django admin, MySQL)

Times come from file save times on disk. Each block shows when that work finished.

| Time | Work done | Result |
|---|---|---|
| 13:55 – 14:03 | Checked installed tools: Node 25, Python 3.14, MySQL 8.0.46. Set up the Python environment. Moved from Django 6 to Django 5.2 LTS, because Django 6 needs MySQL 8.4. | Backend project created |
| 14:03 – 14:08 | Built the data model: Programs, Batches, Members, Batch messages, Diet charts, Attendance, Payments, Reminders, Media. Built the REST API with token login. Set up Cashfree (test mode) checkout and Brevo email. | API and payment pages ready |
| 14:08 – 14:11 | Admin panel: dashboard stats, one-screen attendance sheet, payment actions (mark paid, fee reminders, next month's fees), email actions, light PulseForge theme. Checked and downloaded 32 fitness images. Wrote the demo-data script. | Admin panel ready |
| 14:11 – 14:19 | Created the Expo SDK 58 app and installed packages (navigation, fonts, image, video, gradients). Wrote the MySQL setup script. Waited on the database login. | App project created |
| 14:19 – 14:27 | Member app screens: Login, Home, Gallery (photos, videos, transformations), Program, Video player, Batch messages and diet chart, Attendance calendar, Payments, Reminders, Profile. Navigation and fonts (Bebas Neue, Poppins). | All screens built |
| 14:27 – 14:31 | Database connected: migrations run, demo data loaded. Phone frame for the web view. Neon-glow hover and press animations, entrance animations, loading placeholders. | App running in browser |
| 14:31 – 14:37 | Fixes found in browser testing: page shifting, scrolling inside the phone frame, signing out on an expired login. Replaced three unrelated videos with real Zumba, HIIT, strength and yoga clips. Thumbnails made from the clips. | Smooth scrolling; matching media |
| 14:37 – 14:40 | Cloudinary storage for all images and videos (48 files uploaded). Home banner carousel with auto-slide and zoom effect, editable from the admin. | Media on Cloudinary CDN; banners live |
| 14:40 – 14:52 | Full Cashfree sandbox payment test (app → checkout → simulator → marked Paid). Brevo key and sender checked. Admin checked; monthly revenue figure fixed. README written. Moved app to port 8080. | Tested end to end |

## Status at end of hour
- **Done and tested:** member app on `localhost:8080`, admin panel on `localhost:8000/admin`, MySQL, Cashfree sandbox payment, Cloudinary media, Brevo setup.
- **Not yet tested:** the app on a real phone through Expo Go. No real email has been sent: demo members have placeholder addresses.
- **Next:** test on a phone with Expo Go, put real member emails in the admin and send one test email, then add real gym photos and videos through the admin.
