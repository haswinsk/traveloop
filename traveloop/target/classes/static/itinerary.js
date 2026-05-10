/**
 * itinerary.js  — self-contained IIFE, NO ES module syntax
 *
 * Load as a plain <script src="itinerary.js"> at the very end of <body>.
 * Do NOT use type="module" — that makes it asynchronous and breaks the
 * window.itinerary reference that index.html depends on.
 *
 * Public API exposed on window.itinerary:
 *   .renderItinerary()  — re-render day cards from overviewState now
 *   .initItinerary()    — first render + wire observers (called automatically)
 *   .daysArray(s,e)     — exposed for console testing
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════
     DATE HELPERS
  ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Parse "YYYY-MM-DD" → local-midnight Date.
   * new Date("YYYY-MM-DD") would give UTC midnight (wrong day in UTC+5:30).
   */
  function parseISODate(iso) {
    var p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  /**
   * Return one Date per calendar day from startISO to endISO inclusive.
   *
   * ── THE CORE BUG (now fixed) ──────────────────────────────────────────
   * The old code:
   *   for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1))
   *
   * JavaScript's relational operators (<, <=, >, >=) call valueOf() on each
   * operand.  For Date objects valueOf() returns milliseconds — so d <= e
   * DOES work... BUT only when the loop variable `d` is NOT mutated between
   * the comparison and the next setDate() call.
   *
   * The real killer: after setDate() mutates `d`, the push() inside the loop
   * pushes the SAME object reference every time (not a snapshot).  So `arr`
   * ends up full of references all pointing to the same Date, which by the
   * end of the loop equals endDate.  The result: arr.length is correct but
   * every element is the same final date.
   *
   * Fix: push `new Date(cur)` (a snapshot) and keep a separate `cur` cursor.
   */
  function daysArray(startISO, endISO) {
    var endMs  = parseISODate(endISO).getTime();
    var cur    = parseISODate(startISO);          // mutable cursor
    var result = [];

    while (cur.getTime() <= endMs) {
      result.push(new Date(cur));                 // ← SNAPSHOT before mutation
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }

  /** "Sunday, May 18th" */
  function formatWithOrdinal(d) {
    var DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var MONTH_NAMES = ['January','February','March','April','May','June',
      'July','August','September','October','November','December'];
    var day = d.getDate();
    var sfx = (day % 10 === 1 && day !== 11) ? 'st'
        : (day % 10 === 2 && day !== 12) ? 'nd'
            : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
    return DAY_NAMES[d.getDay()] + ', ' + MONTH_NAMES[d.getMonth()] + ' ' + day + sfx;
  }

  /** "May 18 – May 24" */
  function shortRange(startISO, endISO) {
    return parseISODate(startISO).toLocaleString('en-US', {month:'short', day:'numeric'})
        + ' – '
        + parseISODate(endISO).toLocaleString('en-US', {month:'short', day:'numeric'});
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MINIMAL DOM BUILDER
  ═══════════════════════════════════════════════════════════════════════ */

  function h(tag, opts, children) {
    opts     = opts     || {};
    children = children || [];
    var node = document.createElement(tag);
    if (opts.cls)  node.className   = opts.cls;
    if (opts.html) node.innerHTML   = opts.html;
    if (opts.text) node.textContent = opts.text;
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(function (k) { node.setAttribute(k, opts.attrs[k]); });
    }
    if (opts.css) {
      Object.keys(opts.css).forEach(function (k) { node.style[k] = opts.css[k]; });
    }
    children.forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     TOAST HELPER
  ═══════════════════════════════════════════════════════════════════════ */

  var _toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     ACTION BUTTONS
  ═══════════════════════════════════════════════════════════════════════ */

  function makeActionBtn(type) {
    var cfg = type === 'autofill'
        ? {
            label: 'Auto-fill day',
            bg: '#F3E8FF',
            border: '1px solid #DDD6FE',
            msg: 'Auto-filling activities…',
            iconHtml: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4"/><path d="M21 5h-4"/></svg>'
          }
        : {
            label: 'Optimize route',
            bg: '#F5F3FF',
            border: '1px solid #DDD6FE',
            msg: 'Optimizing route…',
            iconHtml: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>'
          };

    var iconWrap = h('span', {
      css: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' },
      html: cfg.iconHtml
    });
    var children = [iconWrap, h('span', { text: cfg.label })];
    if (type === 'optimize') {
      children.push(h('span', {
        text: 'PRO',
        css: {
          fontSize: '9px', fontWeight: '800', letterSpacing: '0.04em',
          color: '#92400E', background: 'linear-gradient(180deg,#FDE68A,#FBBF24)',
          padding: '2px 6px', borderRadius: '4px', lineHeight: '1.2',
          border: '1px solid #D97706', marginLeft: '2px'
        }
      }));
    }
    var btn = h('button', {
      attrs: { type: 'button' },
      css: {
        padding: '5px 10px', fontSize: '11px', fontWeight: '600',
        borderRadius: '999px', border: cfg.border,
        background: cfg.bg, marginLeft: type === 'autofill' ? '0' : '6px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap',
        color: '#4C1D95'
      }
    }, children);
    btn.addEventListener('click', function () { toast(cfg.msg); });
    return btn;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PER-DAY SECTION
  ═══════════════════════════════════════════════════════════════════════ */

  function createDaySection(dateObj, index, startISO, endISO) {

    /* ── Sticky header ──────────────────────────────────────────────────
     * Rules for position:sticky to work:
     *  1. The sticky element needs an explicit top/bottom/left/right value.
     *  2. NO ancestor between the sticky element and the scroll container
     *     may have overflow:hidden or overflow:clip.
     *  3. The scroll container itself must be the one that actually scrolls
     *     (in this app it's div.content, which has overflow-y:auto).
     *
     * The card wrapper below uses overflow:visible to satisfy rule #2.
     ─────────────────────────────────────────────────────────────────── */
    var subHeadLink = h('a', {
      text: 'Add subheading',
      attrs: { href: '#' },
      css: {
        color: '#9CA3AF', fontSize: '12px', textDecoration: 'none', fontFamily: "'Inter',sans-serif",
        display: 'block', marginTop: '8px', fontWeight: '500'
      }
    });
    subHeadLink.addEventListener('click', function (e) {
      e.preventDefault();
      toast('Add subheading');
    });

    var header = h('div', {
      cls: 'itin-day-header',
      css: {
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        gap: '0', padding: '10px 12px 8px',
        position: 'sticky',
        top: '0px',
        zIndex: '40',
        background: '#ffffff',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '12px 12px 0 0'
      }
    }, [
      h('div', {
        css: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }
      }, [
        h('div', {
          text: formatWithOrdinal(dateObj),
          css: {
            fontSize: '17px', fontWeight: '700',
            color: '#111827', fontFamily: "'Inter',sans-serif", lineHeight: '1.25', minWidth: '0'
          }
        }),
        h('div', { css: { display: 'flex', alignItems: 'center', flexShrink: '0' } }, [
          makeActionBtn('autofill'),
          makeActionBtn('optimize')
        ])
      ]),
      subHeadLink
    ]);

    /* ── Body ─────────────────────────────────────────────────────────── */
    var body = h('div', {
      cls: 'itin-day-body',
      css: { padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }
    });

    /* Promo card — first day only */
    if (index === 0) {
      var promoCard = h('div', {
        css: {
          background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
          border: '1px solid #C4B5FD',
          borderRadius: '10px', padding: '12px 14px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '12px',
          flexWrap: 'wrap',
          boxShadow: '0 2px 10px rgba(109, 40, 217, 0.1)'
        }
      }, [
        h('div', { css: { flex: '1', minWidth: '168px' } }, [
          h('div', {
            text: 'Need a place to stay?',
            css: { fontSize: '14px', fontWeight: '700', color: '#5B21B6', fontFamily: "'Inter',sans-serif" }
          }),
          h('div', {
            html: 'Looks like you don\u2019t have lodging for <strong style="color:#5B21B6">' + shortRange(startISO, endISO) + '</strong> yet.',
            css: { fontSize: '12px', color: '#6D28D9', marginTop: '6px', fontFamily: "'Inter',sans-serif", lineHeight: '1.45' }
          }),
          (function () {
            var cta = h('button', {
              text: 'Book hotels',
              attrs: { type: 'button' },
              css: {
                background: '#7B61FF', color: '#fff', border: 'none',
                padding: '8px 14px', borderRadius: '8px',
                fontWeight: '700', cursor: 'pointer',
                fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap',
                fontSize: '12px',
                marginTop: '10px',
                boxShadow: '0 2px 10px rgba(123,97,255,0.3)'
              }
            });
            cta.addEventListener('click', function () { toast('Opening hotel search…'); });
            return cta;
          }())
        ]),
        h('img', {
          attrs: {
            src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=280&q=82',
            alt: ''
          },
          css: {
            width: '118px', height: '88px', objectFit: 'cover', borderRadius: '10px',
            flexShrink: '0', border: '1px solid #DDD6FE', alignSelf: 'center'
          }
        })
      ]);
      body.appendChild(promoCard);

      var chromeIcon = h('div', {
        attrs: { 'aria-hidden': 'true' },
        html: '<svg width="26" height="26" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#FFC107" d="M24 4C14 4 5.7 10.2 3 19h13.2L24 4z"/><path fill="#4CAF50" d="M24 44c10 0 18.3-6.2 21-15H31.8L24 44z"/><path fill="#F44336" d="M3 19c-1 2.3-1.5 4.8-1.5 7.5S2 31.7 3 34l10.5-18.2L3 19z"/><path fill="#2196F3" d="M24 14c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10z"/><path fill="#FFF" d="M24 18c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6 2.7-6 6-6z"/><circle cx="24" cy="24" r="3" fill="#2196F3"/></svg>',
        css: {
          width: '40px', height: '40px', flexShrink: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#fff', borderRadius: '10px', border: '1px solid #FDBA74', boxShadow: '0 1px 3px rgba(0,0,0,.06)'
        }
      });

      var extBanner = h('div', {
        css: {
          background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
          border: '1px solid #FDBA74',
          borderRadius: '10px', padding: '12px 14px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '12px',
          flexWrap: 'wrap'
        }
      }, [
        h('div', { css: { display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '200px' } }, [
          chromeIcon,
          h('div', {}, [
            h('div', {
              text: 'Add places from anywhere on the web',
              css: { fontSize: '13px', fontWeight: '700', color: '#9A3412', fontFamily: "'Inter',sans-serif" }
            }),
            h('div', {
              text: 'Save spots to this trip while you browse with our Chrome extension.',
              css: { fontSize: '11px', color: '#C2410C', marginTop: '4px', fontFamily: "'Inter',sans-serif", lineHeight: '1.4' }
            })
          ])
        ]),
        (function () {
          var dl = h('button', {
            text: 'Download',
            attrs: { type: 'button' },
            css: {
              background: '#EA580C', color: '#fff', border: 'none',
              padding: '7px 12px', borderRadius: '8px',
              fontWeight: '700', cursor: 'pointer', fontSize: '12px',
              fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap'
            }
          });
          dl.addEventListener('click', function () { toast('Chrome extension coming soon'); });
          return dl;
        }())
      ]);
      body.appendChild(extBanner);
    }

    /* Add-a-place row */
    var addInput = h('input', {
      attrs: {
        type: 'text',
        placeholder: 'Add a place',
        'aria-label': 'Add a place for ' + formatWithOrdinal(dateObj)
      },
      css: {
        flex: '1', border: 'none', outline: 'none',
        background: 'transparent', fontSize: '14px',
        fontFamily: "'Inter',sans-serif", color: '#374151'
      }
    });
    var pinIcon = h('span', {
      attrs: { 'aria-hidden': 'true' },
      html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      css: { display: 'flex', flexShrink: '0', opacity: '0.9', alignItems: 'center' }
    });

    var noteBtn = h('button', {
      attrs: { type: 'button', title: 'Notes', 'aria-label': 'Notes' },
      html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
      css: {
        width: '32px', height: '32px', border: 'none', borderRadius: '8px', background: 'transparent',
        color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0'
      }
    });
    noteBtn.addEventListener('click', function (e) { e.stopPropagation(); toast('Notes'); });

    var listBtn = h('button', {
      attrs: { type: 'button', title: 'List view', 'aria-label': 'List view' },
      html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
      css: {
        width: '32px', height: '32px', border: 'none', borderRadius: '8px', background: 'transparent',
        color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0'
      }
    });
    listBtn.addEventListener('click', function (e) { e.stopPropagation(); toast('List view'); });

    var addTools = h('div', {
      css: { display: 'flex', alignItems: 'center', gap: '2px', flexShrink: '0' }
    }, [noteBtn, listBtn]);

    body.appendChild(h('div', {
      css: {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', borderRadius: '10px',
        background: '#F3F4F6', border: '1px solid #E5E7EB'
      }
    }, [pinIcon, addInput, addTools]));

    /* ── Card wrapper ───────────────────────────────────────────────────
     * overflow:visible is MANDATORY here.
     * If overflow is hidden/clip the browser silently disables sticky on
     * all descendants (this is per CSS spec, not a browser bug).
     ─────────────────────────────────────────────────────────────────── */
    var card = h('div', {
      cls: 'itin-day-card',
      attrs: { 'data-day-index': String(index) },
      css: {
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #E8EAED',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        marginBottom: '8px',
        overflow: 'visible'   /* ← CRITICAL for sticky header */
      }
    }, [header, body]);

    return card;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════ */

  function renderItinerary(mountId) {
    mountId = mountId || 'itinerary-days-mount';

    /* 1. Guard: overviewState must exist */
    if (!window.overviewState) {
      console.warn('[itinerary] window.overviewState not available yet');
      return;
    }

    var startISO = window.overviewState.startDate;
    var endISO   = window.overviewState.endDate;

    /* 2. Guard: dates must look like ISO strings */
    if (!startISO || !endISO || startISO.indexOf('-') < 0) {
      console.warn('[itinerary] Bad dates in overviewState:', startISO, endISO);
      return;
    }

    /* 3. Guard: mount point must exist */
    var mount = document.getElementById(mountId);
    if (!mount) {
      console.warn('[itinerary] #' + mountId + ' not found in DOM');
      return;
    }

    /* 4. Build days array — one Date per calendar day inclusive */
    var days = daysArray(startISO, endISO);

    /* Console log so you can verify day count without opening source */
    console.log(
        '[itinerary] ' + days.length + ' day(s): ' + startISO + ' → ' + endISO,
        days.map(function (d) { return d.toDateString(); })
    );

    /* 5. Clear & re-render */
    mount.innerHTML = '';
    days.forEach(function (dateObj, i) {
      mount.appendChild(createDaySection(dateObj, i, startISO, endISO));
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     INIT  — wire up observers and do first render
  ═══════════════════════════════════════════════════════════════════════ */

  function initItinerary() {
    /* First render */
    renderItinerary();

    /* Apply is wired in index.html (overview partial) — calls renderItinerary() after state update */

    /* Re-render when sidebar trip dates text updates */
    var sbDates = document.getElementById('sb-trip-dates-text');
    if (sbDates) {
      new MutationObserver(function () {
        setTimeout(renderItinerary, 0);
      }).observe(sbDates, { childList: true, characterData: true, subtree: true });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     EXPOSE & AUTO-INIT
  ═══════════════════════════════════════════════════════════════════════ */

  window.itinerary = {
    renderItinerary: renderItinerary,
    initItinerary:   initItinerary,
    daysArray:       daysArray    /* handy for console: itinerary.daysArray('2025-05-18','2025-05-24') */
  };

  /* Auto-init: script is at end of <body> so DOM + overviewState are ready.
   * setTimeout(0) yields to any same-tick scripts that might still be running. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(initItinerary, 0); });
  } else {
    setTimeout(initItinerary, 0);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     3D ENHANCEMENTS FOR CARDS
  ═══════════════════════════════════════════════════════════════════════ */

  /**
   * Add 3D tilt effect to itinerary day cards and experience cards
   */
  function apply3DEnhancementsToCards() {
    // Add Vanilla Tilt to itinerary day cards
    var dayCards = document.querySelectorAll('.itinerary-day-card, .exp-card');
    if (dayCards.length > 0 && typeof VanillaTilt !== 'undefined') {
      dayCards.forEach(function(card) {
        if (!card.vanillaTilt) {
          VanillaTilt.init(card, {
            max: 12,
            scale: 1.015,
            speed: 300,
            transition: true,
            easing: "cubic-bezier(.03,.98,.52,.81)"
          });
        }
      });
    }

    // Add floating animation to icon elements
    var flightIcons = document.querySelectorAll('[data-icon="flight"]');
    var lodgingIcons = document.querySelectorAll('[data-icon="lodging"]');
    var carIcons = document.querySelectorAll('[data-icon="car"]');

    flightIcons.forEach(function(icon) {
      icon.style.animation = 'float-icon-flight 4s ease-in-out infinite';
    });
    lodgingIcons.forEach(function(icon) {
      icon.style.animation = 'float-icon-lodging 4.5s ease-in-out infinite';
    });
    carIcons.forEach(function(icon) {
      icon.style.animation = 'float-icon-car 4.2s ease-in-out infinite';
    });

    // Add glassmorphism to modals and sidebars
    applyGlassmorphism();
  }

  /**
   * Apply glassmorphism effect to modals and sidebars
   */
  function applyGlassmorphism() {
    // Sidebar glassmorphism
    var sidebar = document.querySelector('.sidebar');
    if (sidebar && !sidebar.hasAttribute('data-glassmorphism')) {
      sidebar.style.background = 'rgba(255, 255, 255, 0.8)';
      sidebar.style.backdropFilter = 'blur(10px)';
      sidebar.style.webkitBackdropFilter = 'blur(10px)';
      sidebar.setAttribute('data-glassmorphism', 'true');
    }

    // Modal glassmorphism
    var modal = document.querySelector('.ov-modal');
    if (modal && !modal.hasAttribute('data-glassmorphism')) {
      modal.style.background = 'rgba(255, 255, 255, 0.85)';
      modal.style.backdropFilter = 'blur(12px)';
      modal.style.webkitBackdropFilter = 'blur(12px)';
      modal.setAttribute('data-glassmorphism', 'true');
    }

    // Modal backdrop blur
    var backdrop = document.querySelector('.ov-modal-backdrop');
    if (backdrop && !backdrop.hasAttribute('data-glassmorphism')) {
      backdrop.style.backdropFilter = 'blur(5px)';
      backdrop.style.webkitBackdropFilter = 'blur(5px)';
      backdrop.setAttribute('data-glassmorphism', 'true');
    }
  }

  /**
   * Add CSS animations for floating icons (inject into style tag if not present)
   */
  function injectFloatingAnimations() {
    var styleId = 'floating-animations-3d';
    if (!document.getElementById(styleId)) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes float-icon-flight {
          0%, 100% { transform: translateY(0px) rotateZ(0deg); }
          50% { transform: translateY(-12px) rotateZ(2deg); }
        }
        @keyframes float-icon-lodging {
          0%, 100% { transform: translateY(0px) rotateZ(0deg); }
          50% { transform: translateY(-15px) rotateZ(-2deg); }
        }
        @keyframes float-icon-car {
          0%, 100% { transform: translateY(0px) rotateZ(0deg); }
          50% { transform: translateY(-10px) rotateZ(1.5deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Initialize 3D enhancements when DOM is ready
   */
  function init3DEnhancements() {
    injectFloatingAnimations();
    apply3DEnhancementsToCards();

    // Re-apply when cards are dynamically added
    var observer = new MutationObserver(function() {
      apply3DEnhancementsToCards();
    });

    var observerOptions = {
      childList: true,
      subtree: true,
      attributes: false
    };

    var targetNode = document.querySelector('.content') || document.body;
    observer.observe(targetNode, observerOptions);
  }

  // Auto-init 3D enhancements
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3DEnhancements);
  } else {
    setTimeout(init3DEnhancements, 100);
  }

}()); /* end IIFE */