import { api } from './api';
import { prefetchImages } from './images';

/**
 * After the first screen has loaded, quietly fetch the other tabs' data and download their images,
 * so every tab and every picture opens instantly instead of showing a spinner.
 */
let warmed = null;

const quiet = (path) => api(path).catch(() => null);

export function warmMember(home) {
  if (warmed === 'member' || !home) return;
  warmed = 'member';
  // Images on Home first (banners are big and seen first)
  prefetchImages(home.banners?.map((b) => b.image), 'md');
  prefetchImages(home.featured?.map((m) => m.image), 'sm');
  prefetchImages(home.programs?.map((p) => p.image), 'sm');
  prefetchImages(home.programs?.map((p) => p.image), 'lg'); // program page hero

  // Then the other tabs' data, then their images
  setTimeout(async () => {
    const [media] = await Promise.all([
      quiet('/media/'), quiet('/me/'), quiet('/messages/'), quiet('/diet/'), quiet('/payments/'),
      quiet('/reminders/'), quiet('/attendance/'),
    ]);
    if (Array.isArray(media)) {
      prefetchImages(media.map((m) => m.image), 'sm');
      prefetchImages(media.map((m) => m.before_image), 'sm');
    }
    // Program pages (same URLs ProgramScreen asks for)
    (home.programs || []).forEach((p) => {
      const name = encodeURIComponent(p.name);
      quiet(`/batches/?program=${name}`);
      quiet(`/media/?program=${name}`).then((items) => Array.isArray(items) && prefetchImages(items.map((m) => m.image), 'sm'));
    });
  }, 600);
}

export function warmCoach() {
  if (warmed === 'coach') return;
  warmed = 'coach';
  setTimeout(() => {
    const d = new Date();
    const today = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    [`/coach/attendance/?batch=&date=${today}`, '/coach/messages/', '/coach/members/', '/coach/payments/?status=due', '/coach/diet/']
      .forEach(quiet);
  }, 400);
}

export function resetWarm() {
  warmed = null;
}
