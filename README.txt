ZENVRA AI TRADING DESK — PWA package (v26)
==========================================

WHAT A PWA NEEDS
  A PWA (installable app + offline shell) must be served over HTTPS. It cannot be
  installed from a local file or content:// link — upload this folder to any static host.

FASTEST WAYS TO HOST (free, no server code)
  Netlify Drop : go to app.netlify.com/drop and drag this whole folder onto the page.
  GitHub Pages : create a repo, upload ALL files here (keep the icons/ folder), then
                 Settings -> Pages -> Deploy from branch (main, / root).
  Cloudflare Pages / Vercel : create a project and upload the folder (no build step).

INSTALL
  Android Chrome : open your https URL -> menu (3 dots) -> "Install app" / "Add to Home screen"
                   (there is also an install button in the app's top bar when Chrome offers it).
  iPhone Safari  : Share -> "Add to Home Screen".
  Desktop Chrome/Edge : install icon in the address bar.

FILES
  docs/                 ZENVRA-v26-SYSTEM-GUIDE.md — architecture, capability matrix, API configuration, testing report, limitations
  index.html            the whole app (HTML + CSS + JS, no backend)
  manifest.webmanifest  name, icons, standalone display, shortcuts (AI Engine / Trade / Risk)
  sw.js                 service worker: caches ONLY the app shell so it opens offline.
                        Exchange/API traffic is never cached or intercepted — prices and
                        orders are always live from the network.
  icons/                192, 512, maskable 512, apple-touch 180

GOOD TO KNOW
  - Offline = the desk opens, but there are no live prices, scans or fills until you are online.
  - Browser storage (IndexedDB) belongs to the web ADDRESS. A different URL (or the WebIntoApp
    build) starts with an empty journal/Brain/paper account; nothing is migrated automatically.
  - To publish an update, upload the new files and bump VERSION in sw.js; users get a
    "reload to apply" notice.
  - Paper trading only: no exchange keys, no real orders anywhere in this app.
  - Informational/educational use only. Not financial advice.
