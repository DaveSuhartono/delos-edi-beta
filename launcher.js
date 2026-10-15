/**
 * Opened as the installed app: go straight to EDI (the address is the "Buka EDI" link's), with a bar and an
 * estimated percentage under the icon until EDI's page replaces this one.
 * Opened in a browser tab: offer to install, with the steps for Android and iPhone.
 * EDI Beta's own copy of the team launcher's script (pwa/launcher.js): changes are tried here first.
 */
(() => {
  // Google's page reports no progress, so the bar estimates it: fast at first, slowing towards 95%, until EDI
  // replaces this page (about 60% after 2 s, 90% after 6 s).
  const OPEN_TIME_MS = 2500;
  const OPEN_MAX_PERCENT = 95;
  const appUrl = document.getElementById('open-app').href;
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  // The service worker is what makes the launcher installable (and lets it open without a signal).
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

  if (installed) {
    document.body.classList.add('launching');
    showProgress();
    location.replace(appUrl);
    return;
  }

  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    document.getElementById('help-ios').hidden = false;
    document.getElementById('help-android').hidden = true;
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

  function showProgress() {
    const fill = document.getElementById('open-fill');
    const label = document.getElementById('open-percent');
    const start = performance.now();
    const step = now => {
      const percent = Math.round(OPEN_MAX_PERCENT * (1 - Math.exp(-(now - start) / OPEN_TIME_MS)));
      fill.style.width = `${percent}%`;
      label.textContent = `${percent}%`;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
})();
