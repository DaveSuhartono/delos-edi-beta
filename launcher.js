/**
 * EDI launcher. Opened as the installed app: the first time a "Masuk dengan Google" button (Google asks for the
 * account on EDI's own page), after that straight to EDI, with a bar and an estimated percentage until EDI's page
 * replaces this one. Opened in a browser tab: how to install it (the button on Android and laptops, Safari's steps on
 * iPhone, a link to copy into Safari from other iPhone browsers).
 * Language (ID / EN) and light / dark mode at the top right: a choice made here goes to EDI the next time it opens
 * (?lang=…&theme=…), and EDI keeps it from then on.
 * Loaded in <head> without defer, so the theme is set before the page is drawn.
 */
(() => {
  // Google's page reports no progress, so the bar estimates it: fast at first, slowing towards 95%, until EDI
  // replaces this page (about 60% after 2 s, 90% after 6 s).
  const OPEN_TIME_MS = 2500;
  const OPEN_MAX_PERCENT = 95;
  const KEY = { lang: 'edi.lang', theme: 'edi.theme', toApp: 'edi.toApp', signedIn: 'edi.signedIn' };
  const STATUS_BAR = { light: '#ffffff', dark: '#101413' }; // the phone's status bar takes the page's colour
  const WORDS = {
    id: {
      headline: 'Semua aset teknik,<br>satu aplikasi.',
      install: 'Pasang aplikasi',
      no_button: 'Tombol tidak muncul? Menu <b>⋮</b> Chrome → <b>Instal aplikasi</b>',
      step_share: 'Ketuk <b>Bagikan</b>',
      step_more: 'Ketuk <b>⋯</b> lalu <b>Bagikan</b>',
      step_add: 'Pilih <b>Tambah ke Layar Utama</b>',
      step_open: 'Buka EDI dari ikonnya',
      whatsapp: 'Dari WhatsApp? Ketuk dulu ikon <b>Safari</b> (kompas).',
      share: 'Bagikan',
      safari_title: 'Pasang lewat Safari',
      safari_text: 'Salin link, buka Safari, tempel di kolom alamat.',
      copy: 'Salin link',
      copied: 'Link disalin. Tempel di Safari.',
      google: 'Masuk dengan Google',
      account: 'Gunakan akun <b>@delosaqua.com</b>',
      opening: 'Membuka EDI…',
      in_browser: 'Buka di browser saja',
      foot: 'Dokumen internal Delos Aqua',
      lang: 'Bahasa',
      to_dark: 'Mode gelap',
      to_light: 'Mode terang',
    },
    en: {
      headline: 'All assets,<br>one app.',
      install: 'Install app',
      no_button: 'No button? Chrome menu <b>⋮</b> → <b>Install app</b>',
      step_share: 'Tap <b>Share</b>',
      step_more: 'Tap <b>⋯</b>, then <b>Share</b>',
      step_add: 'Choose <b>Add to Home Screen</b>',
      step_open: 'Open EDI from its icon',
      whatsapp: 'From WhatsApp? First tap the <b>Safari</b> (compass) icon.',
      share: 'Share',
      safari_title: 'Install with Safari',
      safari_text: 'Copy the link, open Safari, paste it in the address bar.',
      copy: 'Copy link',
      copied: 'Link copied. Paste it in Safari.',
      google: 'Sign in with Google',
      account: 'Use your <b>@delosaqua.com</b> account',
      opening: 'Opening EDI…',
      in_browser: 'Just open it in the browser',
      foot: 'Internal document, Delos Aqua',
      lang: 'Language',
      to_dark: 'Dark mode',
      to_light: 'Light mode',
    },
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => document.querySelectorAll(selector);
  // The browser may refuse storage (private browsing): the launcher then simply forgets.
  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { /* not kept */ }
    },
  };
  const deviceDark = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = () => ['light', 'dark'].find(name => name === store.get(KEY.theme));
  const prefs = {
    lang: store.get(KEY.lang) === 'en' ? 'en' : 'id',
    theme: savedTheme() || (deviceDark.matches ? 'dark' : 'light'),
  };
  let appAddress = '';

  applyTheme();
  deviceDark.addEventListener('change', event => {
    if (savedTheme()) return;
    prefs.theme = event.matches ? 'dark' : 'light';
    applyTheme();
    render();
  });
  document.addEventListener('DOMContentLoaded', start);

  function start() {
    // The service worker is what makes the launcher installable (and lets it open without a signal).
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
    const openLink = $('#open-app');
    appAddress = openLink.href; // the one place EDI's address is written
    openLink.addEventListener('click', () => { openLink.href = appUrl(); });
    $$('[data-lang]').forEach(button => button.addEventListener('click', () => choose('lang', button.dataset.lang)));
    $('#mode').addEventListener('click', () => choose('theme', prefs.theme === 'dark' ? 'light' : 'dark'));
    $('#sign-in').addEventListener('click', () => {
      store.set(KEY.signedIn, '1');
      openApp();
    });

    const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (installed) {
      if (store.get(KEY.signedIn)) openApp();
      else show('sign-in');
    } else {
      showInstall();
    }
    render();
  }

  /** Shows the parts of one screen: each part's data-show lists the screens it belongs to. */
  function show(screen) {
    $$('[data-show]').forEach(part => { part.hidden = !part.dataset.show.split(' ').includes(screen); });
  }

  /** Fills the texts in the language chosen, and labels the choices. */
  function render() {
    const words = WORDS[prefs.lang];
    document.documentElement.lang = prefs.lang;
    $$('[data-t]').forEach(part => { part.innerHTML = words[part.dataset.t]; });
    $$('[data-lang]').forEach(button => button.setAttribute('aria-pressed', button.dataset.lang === prefs.lang));
    $('.seg').setAttribute('aria-label', words.lang);
    const mode = $('#mode');
    mode.title = prefs.theme === 'dark' ? words.to_light : words.to_dark;
    mode.setAttribute('aria-label', mode.title);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = prefs.theme;
    document.querySelector('meta[name="theme-color"]').content = STATUS_BAR[prefs.theme];
  }

  /** Keeps a language or mode chosen here, and passes it to EDI the next time it opens. */
  function choose(name, value) {
    prefs[name] = value;
    store.set(KEY[name], value);
    const toApp = new Set((store.get(KEY.toApp) || '').split(',').filter(Boolean)).add(name);
    store.set(KEY.toApp, [...toApp].join(','));
    if (name === 'theme') applyTheme();
    render();
  }

  /** EDI's address, with the choices made here since EDI last opened. */
  function appUrl() {
    const url = new URL(appAddress);
    (store.get(KEY.toApp) || '').split(',').filter(name => name in prefs)
      .forEach(name => url.searchParams.set(name, prefs[name]));
    store.set(KEY.toApp, '');
    return url.href;
  }

  function openApp() {
    document.body.classList.add('opening');
    show('opening');
    showProgress();
    location.replace(appUrl());
  }

  /**
   * iPhone, iPad (iPadOS says "Macintosh" but has a touch screen): Safari's steps. Chrome, Firefox, Edge, Opera and
   * the pages apps open themselves (Google, Facebook, Instagram, Line) cannot add to the Home Screen: copy the link.
   * Android and laptops: our own install button instead of the browser's mini bar.
   */
  function showInstall() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
      if (/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|Line\//.test(ua)) {
        show('ios-other');
        offerCopy();
      } else {
        show('ios');
        // Safari 26 keeps Share in its ⋯ menu; before, it sat mid bottom bar on iPhone (the iPad's is at the top).
        const safari = Number((/Version\/(\d+)/.exec(ua) || [])[1]);
        if (safari >= 26) $('#step-share').dataset.t = 'step_more';
        $('#pointer').hidden = safari >= 26 || !/iPhone|iPod/.test(ua);
      }
      return;
    }
    show('android');
    const installButton = $('#install-btn');
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
  }

  function offerCopy() {
    const button = $('#copy-link');
    const label = button.querySelector('[data-t]');
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(location.href)
        .then(() => {
          label.dataset.t = 'copied';
          render();
        })
        .catch(() => { // copy by hand
          delete label.dataset.t;
          label.textContent = location.href;
        });
    });
  }

  function showProgress() {
    const fill = $('#open-fill');
    const label = $('#open-percent');
    const begin = performance.now();
    const step = now => {
      const percent = Math.round(OPEN_MAX_PERCENT * (1 - Math.exp(-(now - begin) / OPEN_TIME_MS)));
      fill.style.width = `${percent}%`;
      label.textContent = `${percent}%`;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
})();
