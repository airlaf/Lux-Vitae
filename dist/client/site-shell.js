const siteHeader = document.querySelector('.site-header');
let navScrollY = Math.max(0, scrollY);
window.addEventListener('scroll', () => {
  const y = Math.max(0, Math.min(scrollY, document.documentElement.scrollHeight - innerHeight));
  const delta = y - navScrollY;
  if (y > 32 && Math.abs(delta) < 5) return;
  siteHeader.classList.toggle('nav-away', y > 32 && delta > 0);
  navScrollY = y;
}, {passive: true});

async function submitSignup(event) {
  const form = event.currentTarget;
  const waitlist = form.id === 'signup';
  event.preventDefault();
  const button = form.querySelector('button');
  const status = form.querySelector('output');
  button.disabled = true;
  status.textContent = 'Saving…';
  try {
    const response = await fetch(form.action, {method: 'POST', body: new URLSearchParams(new FormData(form))});
    if (!response.ok || !(await response.json()).ok) throw new Error();
    if (!waitlist) form.reset();
    status.textContent = waitlist ? 'You’re on the waitlist. Your finish preference has been saved.' : 'You’re subscribed to announcements.';
  } catch {
    status.textContent = 'We couldn’t save your signup. Please try again.';
  } finally {
    button.disabled = false;
  }
}
document.querySelector('#signup')?.addEventListener('submit', submitSignup);
document.querySelector('#updates')?.addEventListener('submit', submitSignup);

