"""Seed PulseForge Fitness with demo data.

    python manage.py seed_gym          # create data (idempotent-ish; skips if programs exist)
    python manage.py seed_gym --reset  # wipe gym data first

Demo logins (local development only):
    Admin panel  -> admin / admin123
    Member app   -> demo  / Demo@123
    Trainer app  -> meera / Coach@123  (also ananya, rahul, vikram)

    python manage.py seed_gym --trainers  # only add trainer logins and link them to existing batches
"""
import random
from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from gym.models import (Attendance, Banner, Batch, BatchMessage, DietChart, MediaItem, Member, Payment, Program,
                        Reminder, Trainer)

IMG = "seed/{}.jpg"  # files live in media/seed/

# username, first, last, specialty, batch trainer label used by the seed batches
TRAINERS = [
    ("ananya", "Ananya", "Menon", "Zumba & dance cardio", "Coach Ananya"),
    ("rahul", "Rahul", "Verma", "HIIT & conditioning", "Coach Rahul"),
    ("vikram", "Vikram", "Singh", "Strength & powerlifting", "Coach Vikram"),
    ("meera", "Meera", "Iyer", "Hatha & vinyasa yoga", "Coach Meera"),
]


def ensure_trainers():
    """Create the demo trainer logins and link each to the batches carrying their name."""
    made = 0
    for i, (un, fn, ln, spec, label) in enumerate(TRAINERS):
        u = User.objects.filter(username=un).first()
        if not u:
            u = User.objects.create_user(un, f"{un}@pulseforge.example", "Coach@123", first_name=fn, last_name=ln)
        t, created = Trainer.objects.get_or_create(user=u, defaults={"specialty": spec,
                                                                     "phone": f"98860{55100 + i:05d}"})
        made += created
        for b in Batch.objects.filter(trainer=label, coach__isnull=True):
            b.coach = t
            b.save()
    return made


class Command(BaseCommand):
    help = "Seed demo data for PulseForge Fitness"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true")
        parser.add_argument("--trainers", action="store_true", help="Only add trainer logins")

    def handle(self, *args, **opts):
        random.seed(7)
        if opts["trainers"]:
            self.stdout.write(f"Trainers created: {ensure_trainers()}. Password: Coach@123")
            return
        if opts["reset"]:
            for model in (Banner, Attendance, Payment, Reminder, DietChart, BatchMessage, MediaItem, Member, Batch, Trainer,
                          Program):
                model.objects.all().delete()
            User.objects.filter(is_staff=False).delete()
        if Program.objects.exists():
            self.stdout.write("Data already present. Use --reset to re-seed.")
            return

        # ---------------- admin
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@pulseforge.example", "admin123",
                                          first_name="Studio", last_name="Admin")

        # ---------------- programs
        P = {}
        for i, (name, tag, desc, inten, color, img) in enumerate([
            ("Zumba", "Dance it out, burn it off",
             "High-energy Latin-inspired dance cardio. Great music, great vibes, 500+ kcal per session.",
             "medium", "#FF5A36", "1524594152303-9fd13543fe6e"),
            ("Fitness", "Functional HIIT & conditioning",
             "Circuit training mixing bodyweight, kettlebells and battle ropes to build stamina and burn fat.",
             "high", "#FF8A3D", "1599058917212-d750089bc07e"),
            ("Strength", "Lift heavy, move better",
             "Coached barbell & dumbbell training: squats, deadlifts, presses with progressive overload.",
             "high", "#1B2340", "1517836357463-d25dfeac3438"),
            ("Yoga", "Breathe, stretch, recover",
             "Hatha & vinyasa flows for mobility, core strength and calm. Perfect recovery days.",
             "low", "#22B07D", "1544367567-0f2fcb009e0b"),
        ]):
            p = Program.objects.create(name=name, tagline=tag, description=desc, intensity=inten,
                                       accent_color=color, order=i)
            p.image.name = IMG.format(img)
            p.save()
            P[name] = p

        # ---------------- batches (small groups)
        B = {}
        for name, prog, trainer, days, s, e, cap, fee in [
            ("Sunrise Zumba", "Zumba", "Coach Ananya", "Mon · Wed · Fri", time(6, 0), time(7, 0), 12, 1200),
            ("Evening Zumba Party", "Zumba", "Coach Ananya", "Tue · Thu · Sat", time(18, 30), time(19, 30), 15, 1200),
            ("HIIT Warriors", "Fitness", "Coach Rahul", "Mon - Sat", time(7, 0), time(8, 0), 10, 1800),
            ("Power Lift Club", "Strength", "Coach Vikram", "Mon - Sat", time(19, 0), time(20, 15), 8, 2200),
            ("Morning Flow Yoga", "Yoga", "Coach Meera", "Mon - Fri", time(5, 45), time(6, 45), 12, 1000),
        ]:
            B[name] = Batch.objects.create(name=name, program=P[prog], trainer=trainer, days=days, start_time=s,
                                           end_time=e, capacity=cap, monthly_fee=Decimal(fee))
        ensure_trainers()

        # ---------------- members
        people = [
            ("demo", "Priya", "Sharma", "F", "HIIT Warriors", "Lose 8 kg & build stamina", 162, 68),
            ("arjun", "Arjun", "Mehta", "M", "Power Lift Club", "100 kg deadlift", 178, 74),
            ("kavya", "Kavya", "Iyer", "F", "Sunrise Zumba", "Stay active & happy", 158, 60),
            ("rohan", "Rohan", "Das", "M", "HIIT Warriors", "Get lean for summer", 175, 82),
            ("sneha", "Sneha", "Reddy", "F", "Evening Zumba Party", "Lose 5 kg", 160, 66),
            ("vivek", "Vivek", "Nair", "M", "Power Lift Club", "Gain muscle", 180, 70),
            ("divya", "Divya", "Pillai", "F", "Morning Flow Yoga", "Flexibility & calm", 165, 57),
            ("karthik", "Karthik", "Rao", "M", "HIIT Warriors", "Run a 10K", 172, 77),
            ("meghna", "Meghna", "Joshi", "F", "Sunrise Zumba", "Post-pregnancy fitness", 163, 71),
            ("aditya", "Aditya", "Kulkarni", "M", "Evening Zumba Party", "Cardio fitness", 176, 85),
            ("nisha", "Nisha", "Gupta", "F", "Morning Flow Yoga", "Back pain relief", 155, 62),
            ("sameer", "Sameer", "Khan", "M", "Power Lift Club", "Strength & posture", 182, 88),
        ]
        today = date.today()
        members = []
        for i, (un, fn, ln, g, batch, goal, h, w) in enumerate(people):
            pwd = "Demo@123" if un == "demo" else "Member@123"
            u = User.objects.create_user(un, f"{un}@pulseforge.example", pwd, first_name=fn, last_name=ln)
            m = Member.objects.create(user=u, phone=f"98450{12340 + i:05d}", gender=g, batch=B[batch], goal=goal,
                                      height_cm=h, weight_kg=Decimal(w),
                                      joined_on=today - timedelta(days=random.randint(60, 300)),
                                      membership_ends=today + timedelta(days=random.randint(10, 120)))
            members.append(m)

        # ---------------- attendance (last 45 days, skip Sundays)
        for m in members:
            rate = 0.88 if m.user.username == "demo" else random.uniform(0.6, 0.95)
            for d in range(45, 0, -1):
                day = today - timedelta(days=d)
                if day.weekday() == 6:
                    continue
                st = "present" if random.random() < rate else "absent"
                Attendance.objects.create(member=m, date=day, status=st)
            # recent streak for demo user so the home screen looks alive
        demo = members[0]
        for d in range(1, 6):
            day = today - timedelta(days=d)
            if day.weekday() != 6:
                Attendance.objects.update_or_create(member=demo, date=day, defaults={"status": "present"})
        # one member with 3+ absences in a row (absent tracking demo)
        for d in range(1, 5):
            Attendance.objects.update_or_create(member=members[3], date=today - timedelta(days=d),
                                                defaults={"status": "absent"})

        # ---------------- payments
        def month_label(d):
            return d.strftime("%b %Y")

        this_month = today.replace(day=5)
        prev1 = (today.replace(day=1) - timedelta(days=1)).replace(day=5)
        prev2 = (prev1.replace(day=1) - timedelta(days=1)).replace(day=5)
        nxt = (today.replace(day=28) + timedelta(days=8)).replace(day=5)
        for i, m in enumerate(members):
            fee = m.batch.monthly_fee
            for due in (prev2, prev1):
                Payment.objects.create(member=m, title=f"Membership - {month_label(due)}", amount=fee, due_date=due,
                                       status="paid", method=random.choice(["upi", "card", "cash"]),
                                       paid_at=timezone.now() - timedelta(days=(today - due).days - 1),
                                       order_id=f"SEED{m.id}{due:%m%y}")
            cur_paid = i % 3 != 0 and m.user.username != "demo"
            Payment.objects.create(member=m, title=f"Membership - {month_label(this_month)}", amount=fee,
                                   due_date=this_month, status="paid" if cur_paid else "pending",
                                   method="upi" if cur_paid else "",
                                   paid_at=timezone.now() - timedelta(days=12) if cur_paid else None)
            Payment.objects.create(member=m, title=f"Membership - {month_label(nxt)}", amount=fee, due_date=nxt)
        Payment.objects.create(member=demo, title="Personal training add-on (4 sessions)", amount=Decimal(999),
                               due_date=today + timedelta(days=3))

        # ---------------- batch messages
        now = timezone.now()
        msgs = [
            (None, "announcement", "Gym closed on Sunday for deep cleaning",
             "Hi team! The studio will be closed this Sunday for deep cleaning & equipment servicing. "
             "Normal timings resume Monday.", 1),
            ("HIIT Warriors", "workout", "This week: 30-20-10 finisher",
             "Finisher every session this week:\n• 30 kettlebell swings\n• 20 burpees\n• 10 battle-rope slams x3\n"
             "Bring a towel and extra water!", 2),
            ("HIIT Warriors", "tip", "Sleep is your secret weapon",
             "Aim for 7-8 hours. Recovery is where fat loss & muscle repair happen.", 4),
            ("Sunrise Zumba", "announcement", "New Bollywood mix on Friday!",
             "Coach Ananya is bringing a brand new Bollywood-Latin fusion playlist. Wear comfy shoes!", 1),
            ("Evening Zumba Party", "announcement", "Saturday Zumba Party 🎉",
             "Last Saturday of the month = theme party. Theme: Neon! Bring a friend for free.", 3),
            ("Power Lift Club", "workout", "Deload week",
             "We're running 60% of your working sets this week. Focus on bar speed and form.", 2),
            ("Morning Flow Yoga", "tip", "Hydrate before practice",
             "Drink a glass of warm water 30 minutes before class. Avoid heavy meals.", 2),
            (None, "announcement", "Transformation Challenge starts 1st Dec",
             "8-week challenge with weekly check-ins, diet support and prizes. Register at the front desk!", 5),
        ]
        for batch, kind, title, body, ago in msgs:
            BatchMessage.objects.create(batch=B.get(batch), kind=kind, title=title, body=body,
                                        created_at=now - timedelta(days=ago, hours=random.randint(0, 8)))

        # ---------------- diet charts
        DietChart.objects.create(
            batch=B["HIIT Warriors"], title="Fat-loss plan · Week 4", calories=1700,
            early_morning="Warm water with lemon + 5 soaked almonds",
            breakfast="Vegetable oats upma (1 bowl) + 2 boiled egg whites / paneer bhurji (50 g)",
            mid_morning="1 apple or guava + green tea",
            lunch="2 multigrain rotis, 1 bowl dal, mixed veg sabzi, salad, buttermilk",
            evening="Roasted chana (30 g) + black coffee (pre-workout)",
            dinner="Grilled chicken / tofu (120 g) with sautéed veggies and a small bowl of brown rice",
            notes="3-4 L water daily. No sugar drinks. One cheat meal on Sunday.",
            created_at=now - timedelta(days=1))
        DietChart.objects.create(
            batch=B["Power Lift Club"], title="Lean bulk plan", calories=2800,
            early_morning="Banana + 10 almonds",
            breakfast="4 egg omelette, 2 toast, peanut butter, milk",
            mid_morning="Whey shake + oats",
            lunch="Rice, chicken curry / rajma, curd, salad",
            evening="Paneer sandwich + fruit",
            dinner="3 rotis, fish / soya chunks, veggies",
            notes="1.8 g protein per kg bodyweight.", created_at=now - timedelta(days=3))
        DietChart.objects.create(
            batch=None, title="Zumba & Yoga balanced plan", calories=1900,
            early_morning="Jeera water", breakfast="Poha with peanuts + sprouts",
            mid_morning="Coconut water", lunch="Roti, dal, sabzi, curd",
            evening="Fruit bowl + handful of nuts", dinner="Khichdi with veggies & salad",
            notes="Eat dinner before 8:30 PM.", created_at=now - timedelta(days=6))
        DietChart.objects.create(
            member=demo, title="Priya's personal plan (by Coach Rahul)", calories=1600,
            early_morning="Methi water + 4 walnuts halves",
            breakfast="Moong dal chilla (2) with mint chutney",
            mid_morning="Papaya bowl", lunch="1 jowar roti + quinoa pulao, dal, salad",
            evening="Sprouts chaat", dinner="Paneer tikka (100 g) + clear soup",
            notes="Track steps: 8,000+/day.", created_at=now - timedelta(hours=10))

        # ---------------- reminders
        Reminder.objects.create(member=demo, kind="payment", title="Personal training fee due soon",
                                message="₹999 is due in 3 days. Pay in the app via Cashfree.",
                                remind_at=now + timedelta(hours=2))
        Reminder.objects.create(batch=B["HIIT Warriors"], kind="class", title="Body composition check-in",
                                message="Weigh-in & measurements before class on Saturday.",
                                remind_at=now + timedelta(days=2))
        Reminder.objects.create(kind="diet", title="Drink water 💧", message="Have you had 2 litres yet today?",
                                remind_at=now + timedelta(hours=5))
        Reminder.objects.create(kind="general", title="Transformation Challenge registration closes Friday",
                                message="Sign up at the front desk.", remind_at=now + timedelta(days=3))

        # ---------------- media
        def media(kind, title, img, prog=None, desc="", featured=False, video="", duration="", before="",
                  member_name="", result="", ago=0):
            mi = MediaItem(kind=kind, title=title, description=desc, program=P.get(prog), featured=featured,
                           duration=duration, member_name=member_name, result=result,
                           created_at=now - timedelta(days=ago))
            mi.image.name = IMG.format(img)
            if before:
                mi.before_image.name = IMG.format(before)
            if video:
                mi.video.name = f"videos/{video}"
                mi.image.name = f"thumbs/{video.rsplit('.', 1)[0]}.jpg"  # real frame from the clip
            mi.save()

        media("image", "Zumba Friday night", "1524594152303-9fd13543fe6e", "Zumba", "Our biggest class yet!", True)
        media("image", "Group class energy", "1517130038641-a774d04afb3c", "Zumba", ago=2)
        media("image", "Dance cardio", "1518310383802-640c2de311b2", "Zumba", ago=4)
        media("image", "Battle ropes finisher", "1599058917212-d750089bc07e", "Fitness", featured=True, ago=1)
        media("image", "Mat work circuit", "1518611012118-696072aa579a", "Fitness", ago=3)
        media("image", "Push-up challenge", "1594737625785-a6cbdabd333c", "Fitness", ago=5)
        media("image", "Outdoor run club", "1607962837359-5e7e89f86776", "Fitness", ago=6)
        media("image", "Deadlift day", "1517836357463-d25dfeac3438", "Strength", featured=True, ago=1)
        media("image", "Squat rack", "1574680096145-d05b474e2155", "Strength", ago=3)
        media("image", "Curl station", "1581009146145-b5ef050c2e1e", "Strength", ago=7)
        media("image", "Sunset flow", "1544367567-0f2fcb009e0b", "Yoga", featured=True, ago=2)
        media("image", "Core & breath", "1571019613454-1cb2f99b2d8b", "Yoga", ago=8)
        media("image", "Our studio floor", "1540497077202-7c8a3999166f", desc="Fully equipped strength zone", ago=9)
        media("image", "Dumbbell wall", "1534438327276-14e5300c3a48", ago=10)

        media("video", "Zumba dance party", "1524594152303-9fd13543fe6e", "Zumba", "High-energy group choreography",
              True, video="zumba1.mp4", duration="0:30")
        media("video", "Groove & burn", "1518310383802-640c2de311b2", "Zumba", "Follow-along dance cardio",
              video="zumba2.mp4", duration="0:25", ago=2)
        media("video", "Battle-rope blast", "1599058917212-d750089bc07e", "Fitness", "30 seconds of all-out effort",
              True, video="hiit1.mp4", duration="0:15", ago=1)
        media("video", "Box jump power", "1518611012118-696072aa579a", "Fitness", "Explosive leg drill",
              video="hiit2.mp4", duration="0:20", ago=3)
        media("video", "Push-up form check", "1594737625785-a6cbdabd333c", "Fitness", "Chest, core & control",
              video="pushups.mp4", duration="0:20", ago=4)
        media("video", "Barbell strength", "1517963879433-6ad2b056d712", "Strength", "Controlled single-arm bar work",
              True, video="strength1.mp4", duration="0:20", ago=2)
        media("video", "Fight-ready conditioning", "1574680096145-d05b474e2155", "Strength", "Boxing footwork & guard",
              video="boxing.mp4", duration="0:08", ago=5)
        media("video", "Group yoga flow", "1544367567-0f2fcb009e0b", "Yoga", "Twists & side stretches to cool down",
              True, video="yoga1.mp4", duration="0:15", ago=1)

        media("transformation", "From tired to unstoppable", "1546483875-ad9014c88eba", "Fitness",
              "Sample story: 5 months of HIIT Warriors + diet plan.", True, before="1532384748853-8f54a8f476e2",
              member_name="Sample member A", result="-14 kg in 5 months")
        media("transformation", "Strength unlocked", "1581009146145-b5ef050c2e1e", "Strength",
              "Sample story: Power Lift Club, 3x a week.", True, before="1598971639058-fab3c3109a00",
              member_name="Sample member B", result="+6 kg lean mass", ago=3)
        media("transformation", "Danced her way fit", "1518611012118-696072aa579a", "Zumba",
              "Sample story: Zumba 3x a week + balanced diet.", before="1571019613454-1cb2f99b2d8b",
              member_name="Sample member C", result="-9 kg in 4 months", ago=6)

        # ---------------- home banners
        for i, (title, sub, tag, img, cta, target, prog) in enumerate([
            ("Transformation Challenge", "8 weeks. Coaching + diet support + prizes. Starts 1st Dec.", "NEW",
             "1546483875-ad9014c88eba", "See results", "gallery", None),
            ("Zumba Party Saturdays", "Neon theme night. Bring a friend free!", "EVENT",
             "1524594152303-9fd13543fe6e", "Join Zumba", "program", "Zumba"),
            ("Lift Heavy. Move Better.", "Coached strength batches with only 8 members.", "STRENGTH",
             "1517836357463-d25dfeac3438", "View batches", "program", "Strength"),
            ("Flow Into Calm", "Sunrise yoga for mobility & recovery.", "YOGA",
             "1506126613408-eca07ce68773", "Explore yoga", "program", "Yoga"),
            ("Pay Fees in Seconds", "UPI, cards & netbanking via Cashfree.", "EASY PAY",
             "1534438327276-14e5300c3a48", "Pay now", "pay", None),
        ]):
            b = Banner(title=title, subtitle=sub, tag=tag, cta_label=cta, target=target, order=i,
                       program=P.get(prog) if prog else None)
            b.image.name = IMG.format(img)
            b.save()

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Program.objects.count()} programs, {Batch.objects.count()} batches, "
            f"{Member.objects.count()} members, {Attendance.objects.count()} attendance rows, "
            f"{Payment.objects.count()} payments, {MediaItem.objects.count()} media items."))
