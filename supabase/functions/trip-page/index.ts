/**
 * trip-page — Supabase Edge Function
 * ─────────────────────────────────────────────────────────────────────────────
 * Serves a branded HTML landing page for a shared trip URL.
 *
 * URL:  GET /functions/v1/trip-page?slug=<share_slug>
 *
 * Behaviour:
 *   • On mobile with ScrollAway installed → auto-redirects to scrollaway://trip/<slug>
 *   • On any device → shows trip title, destination, day count
 *   • If app not installed → shows App Store / Play Store download buttons
 *
 * No JWT auth required (public page).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_SCHEME               = 'scrollaway'

// App Store / Play Store links — update with real IDs when live
const IOS_STORE_URL     = 'https://apps.apple.com/app/scrollaway/id6746837810'
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.zimbot420.reelroam'

Deno.serve(async (req: Request) => {
  // Health check
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')?.trim()

  if (!slug) {
    return new Response('Missing slug', { status: 400, headers: { 'Content-Type': 'text/plain' } })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: trip, error } = await supabase
    .from('trips')
    .select('title, itinerary, share_slug, platform, created_at')
    .eq('share_slug', slug)
    .maybeSingle()

  if (error || !trip) {
    return new Response(notFoundHtml(), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const title       = (trip.itinerary?.title ?? trip.title ?? 'A Travel Itinerary') as string
  const destination = (trip.itinerary?.destination ?? '') as string
  const totalDays   = (trip.itinerary?.totalDays ?? 0) as number
  const activities  = ((trip.itinerary?.days ?? []) as { activities: unknown[] }[])
    .reduce((n, d) => n + (d.activities?.length ?? 0), 0)
  const deepLink    = `${APP_SCHEME}://trip/${slug}`

  const metaLine = [
    totalDays > 0 ? `${totalDays}-day itinerary` : null,
    activities > 0 ? `${activities} activities` : null,
    destination || null,
  ].filter(Boolean).join(' · ')

  const html = tripPageHtml({ title, destination, metaLine, deepLink })

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
})

// ─── HTML templates ───────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function tripPageHtml({
  title,
  destination,
  metaLine,
  deepLink,
}: {
  title: string
  destination: string
  metaLine: string
  deepLink: string
}): string {
  const safeTitle       = escapeHtml(title)
  const safeDestination = escapeHtml(destination)
  const safeMetaLine    = escapeHtml(metaLine)
  const safeDeepLink    = escapeHtml(deepLink)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0a0a1a">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeMetaLine || `A trip to ${safeDestination}`}">
  <meta property="og:type" content="website">
  <title>${safeTitle} — ScrollAway</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
      background: #0a0a1a;
      color: #fff;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    /* Star field */
    .stars {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .star {
      position: absolute;
      border-radius: 50%;
      background: white;
    }

    .card {
      position: relative;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 24px;
      padding: 36px 28px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .wordmark {
      font-size: 15px;
      font-weight: 800;
      color: #0D9488;
      letter-spacing: -0.3px;
      text-transform: uppercase;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .wordmark-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #0D9488;
    }

    .trip-title {
      font-size: 24px;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      color: #fff;
    }

    .trip-destination {
      font-size: 14px;
      color: rgba(255,255,255,0.55);
      margin-bottom: 6px;
    }

    .trip-meta {
      font-size: 12px;
      color: rgba(255,255,255,0.30);
      margin-bottom: 32px;
      letter-spacing: 0.2px;
    }

    .open-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #0D9488;
      color: #fff;
      text-decoration: none;
      padding: 16px 24px;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 700;
      width: 100%;
      border: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: opacity 0.15s, transform 0.1s;
    }
    .open-btn:active { opacity: 0.85; transform: scale(0.98); }

    .divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 20px 0 16px;
      color: rgba(255,255,255,0.18);
      font-size: 12px;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255,255,255,0.10);
    }

    #download-section { display: none; }

    .download-label {
      font-size: 13px;
      color: rgba(255,255,255,0.40);
      margin-bottom: 12px;
    }

    .store-links {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    .store-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.75);
      text-decoration: none;
      padding: 11px 14px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s;
    }
    .store-btn:active { background: rgba(255,255,255,0.14); }

    .footer {
      margin-top: 24px;
      font-size: 11px;
      color: rgba(255,255,255,0.18);
      letter-spacing: 0.3px;
    }
  </style>
</head>
<body>
  <div class="stars" id="stars"></div>

  <div class="card">
    <div class="wordmark">
      <div class="wordmark-dot"></div>
      ScrollAway
      <div class="wordmark-dot"></div>
    </div>

    <div class="trip-title">${safeTitle}</div>
    ${safeDestination ? `<div class="trip-destination">${safeDestination}</div>` : ''}
    ${safeMetaLine   ? `<div class="trip-meta">${safeMetaLine}</div>` : ''}

    <a href="${safeDeepLink}" class="open-btn" id="open-btn" onclick="onOpenTap(event)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12h18M13 6l6 6-6 6"/>
      </svg>
      Open in ScrollAway
    </a>

    <div id="download-section">
      <div class="divider">Don't have the app?</div>
      <div class="download-label">Download ScrollAway to view the full interactive trip</div>
      <div class="store-links">
        <a href="${IOS_STORE_URL}" class="store-btn" id="ios-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          App Store
        </a>
        <a href="${ANDROID_STORE_URL}" class="store-btn" id="android-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341l1.408 2.438c.101.175.041.398-.135.499-.175.101-.398.041-.499-.135l-1.43-2.476A7.446 7.446 0 0 1 12 16.75a7.446 7.446 0 0 1-4.867-1.083l-1.43 2.476c-.101.176-.324.236-.499.135-.176-.101-.236-.324-.135-.499l1.408-2.438A7.5 7.5 0 0 1 4.75 12h14.5a7.5 7.5 0 0 1-1.727 3.341zM8.5 13a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zm7 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zM14.7 5.169l1.283-2.221c.101-.175.041-.398-.135-.499-.175-.101-.398-.041-.499.135L14.044 4.86A7.455 7.455 0 0 0 12 4.5c-.707 0-1.39.097-2.044.36L8.651 2.584c-.101-.176-.324-.236-.499-.135-.176.101-.236.324-.135.499L9.3 5.169A7.498 7.498 0 0 0 4.75 12h14.5A7.498 7.498 0 0 0 14.7 5.169z"/></svg>
          Play Store
        </a>
      </div>
    </div>
  </div>

  <div class="footer">Powered by ScrollAway</div>

  <script>
    // ── Star field ──────────────────────────────────────────────────────────
    (function() {
      var container = document.getElementById('stars');
      for (var i = 0; i < 60; i++) {
        var s = document.createElement('div');
        s.className = 'star';
        var size = 1 + Math.random() * 1.5;
        s.style.cssText = [
          'width:' + size + 'px',
          'height:' + size + 'px',
          'left:' + (Math.random() * 100) + '%',
          'top:' + (Math.random() * 100) + '%',
          'opacity:' + (0.15 + Math.random() * 0.45),
        ].join(';');
        container.appendChild(s);
      }
    })();

    // ── App-open logic ──────────────────────────────────────────────────────
    var deepLink = '${safeDeepLink}';
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    var isIOS    = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    var hasApp   = false;

    function showDownload() {
      document.getElementById('download-section').style.display = 'block';
    }

    function onOpenTap(e) {
      // Prevent default anchor navigation — we handle it manually
      e.preventDefault();
      tryOpenApp();
    }

    function tryOpenApp() {
      // Attempt to open via custom scheme; if the app isn't installed the
      // browser will stay on this page and we reveal the download links.
      var start = Date.now();
      window.location.href = deepLink;
      setTimeout(function() {
        // If app opened, the page would have been hidden (visibilitychange fired)
        // or we'd be navigating away. If we're still here after the timeout,
        // the app isn't installed.
        if (!hasApp && Date.now() - start < 3200) {
          showDownload();
        }
      }, 2500);
    }

    // Detect if we successfully left the page (= app opened)
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) hasApp = true;
    });

    // On iOS and Android: auto-attempt the deep link after a short delay
    // so the page renders first (better UX than an immediate redirect).
    if (isMobile) {
      // Show the correct store button first
      if (isIOS) {
        document.getElementById('android-btn').style.display = 'none';
      } else {
        document.getElementById('ios-btn').style.display = 'none';
      }
      setTimeout(tryOpenApp, 600);
    } else {
      // Desktop: skip auto-redirect, just show download links immediately
      showDownload();
    }
  </script>
</body>
</html>`
}

function notFoundHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip not found — ScrollAway</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a1a; color: #fff;
      display: flex; align-items: center; justify-content: center; min-height: 100dvh; text-align: center; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    p  { color: rgba(255,255,255,0.4); font-size: 14px; }
  </style>
</head>
<body>
  <div>
    <h1>Trip not found</h1>
    <p>This link may have expired or been removed.</p>
  </div>
</body>
</html>`
}
