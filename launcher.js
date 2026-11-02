/**
 * Opened as the installed app: open EDI (the address is the "Buka EDI" link's), with a bar and an estimated
 * percentage under the icon until it shows. On Android EDI opens inside this page's own frame, so no browser bar
 * sits over it (David, 02/11/2026); elsewhere, or when the frame does not work, EDI's page replaces this one.
 * Opened in a browser tab: offer to install, with the steps for Android and iPhone.
 * EDI Beta's own copy of the team launcher's script (pwa/launcher.js): changes are tried here first.
 */
(() => {
  // Google's page reports no progress, so the bar estimates it: fast at first, slowing towards 95%, until EDI
  // shows (about 60% after 2 s, 90% after 6 s).
  const OPEN_TIME_MS = 2500;
  const OPEN_MAX_PERCENT = 95;
  // EDI says "ready" from inside Google's frames (app.js); without it — not signed in to Google in this browser,
  // or Google's cookies kept from frames — EDI opens the usual way, and does so straight away for a day.
  const FRAME_WAIT_MS = 8000; // after the frame has loaded
  const FRAME_MAX_MS = 25000; // in all
  const FRAME_RETRY_MS = 86400000;
  const FRAME_FAILED_KEY = 'edi-frame-failed';
  const EDI_ORIGIN = /^https:\/\/[\w-]+-script\.googleusercontent\.com$/; // where EDI's page runs inside Google's
  const appUrl = document.getElementById('open-app').href;
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  // iPhone, iPad (iPadOS says "Macintosh" but has a touch screen).
  const ua = navigator.userAgent;
  const apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

  // The service worker is what makes the launcher installable (and lets it open without a signal).
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

  if (installed) {
    document.body.classList.add('launching');
    showProgress();
    if (frameMayWork()) openInFrame();
    else location.replace(appUrl);
    return;
  }

  // iPhone and iPad: Safari's steps. Chrome, Firefox, Edge, Opera and the pages apps open themselves (Google,
  // Facebook, Instagram, Line) cannot add to the Home Screen: copy the link.
  if (apple) {
    document.getElementById('help-ios').hidden = false;
    document.getElementById('help-android').hidden = true;
    if (/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|Line\//.test(ua)) offerCopy();
  }

  // Chrome / Edge on Android and laptops: our own button instead of the browser's mini bar.
  const installButton = document.getElementById('install-btn');
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener('click', async () => {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener('appinstalled', () => { installButton.hidden = true; });

  function offerCopy() {
    document.getElementById('ios-other').hidden = false;
    const button = document.getElementById('copy-link');
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(location.href)
        .then(() => { button.textContent = 'Link disalin. Tempel di Safari.'; })
        .catch(() => { button.textContent = location.href; }); // copy by hand
    });
  }

  /** Not on iPhone or iPad (Safari keeps Google's sign-in from frames), nor for a day after the frame failed. */
  function frameMayWork() {
    if (apple) return false;
    try {
      return Date.now() - Number(localStorage.getItem(FRAME_FAILED_KEY) || 0) > FRAME_RETRY_MS;
    } catch {
      return true;
    }
  }

  /** EDI in a frame over the whole screen, shown once it says it is ready; no word in time: the usual way. */
  function openInFrame() {
    const frame = document.createElement('iframe');
    frame.className = 'app-frame';
    frame.title = 'EDI';
    frame.src = appUrl;
    let wait;
    const giveUp = () => {
      try {
        localStorage.setItem(FRAME_FAILED_KEY, String(Date.now()));
      } catch { // no storage: the frame is tried again next time
      }
      location.replace(appUrl);
    };
    const deadline = setTimeout(giveUp, FRAME_MAX_MS);
    frame.addEventListener('load', () => {
      clearTimeout(wait);
      wait = setTimeout(giveUp, FRAME_WAIT_MS);
    });
    window.addEventListener('message', event => {
      if (!EDI_ORIGIN.test(event.origin) || event.data?.edi !== 'ready') return;
      clearTimeout(deadline);
      clearTimeout(wait);
      document.body.classList.add('framed');
    });
    document.body.append(frame);
  }

  function showProgress() {
    const fill = document.getElementById('open-fill');
    const label = document.getElementById('open-percent');
    const start = performance.now();
    const step = now => {
      const percent = Math.round(OPEN_MAX_PERCENT * (1 - Math.exp(-(now - start) / OPEN_TIME_MS)));
      fill.style.width = `${percent}%`;
      label.textContent = `${percent}%`;
      if (!document.body.classList.contains('framed')) requestAnimationFrame(step); // EDI shows: done
    };
    requestAnimationFrame(step);
  }
})();
