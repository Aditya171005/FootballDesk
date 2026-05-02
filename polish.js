/**
 * polish.js — Football Hub UI Polish
 * Handles: scroll-to-top, page loader, favourite team, copy result, mobile nav
 * Add to every page: <script src="/js/polish.js"></script>
 */

// ── 1. PAGE LOADING BAR ───────────────────────────────────
(function() {
  const bar = document.createElement('div');
  bar.id = 'page-loader';
  bar.style.cssText = `
    position:fixed;top:0;left:0;height:3px;width:0%;z-index:99999;
    background:linear-gradient(90deg,#FFD700,#FFA500,#FFD700);
    background-size:200% 100%;
    box-shadow:0 0 10px rgba(255,215,0,0.6);
    transition:width 0.3s ease;
    animation:shimmer 1.5s infinite linear;
    pointer-events:none;
  `;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  `;
  document.head.appendChild(style);
  document.body.appendChild(bar);

  let timer;
  function startLoader() {
    clearTimeout(timer);
    bar.style.width = '0%';
    bar.style.opacity = '1';
    setTimeout(() => bar.style.width = '70%', 50);
    timer = setTimeout(() => bar.style.width = '90%', 400);
  }
  function finishLoader() {
    bar.style.width = '100%';
    setTimeout(() => { bar.style.opacity = '0'; bar.style.width = '0%'; }, 300);
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a && a.href && !a.href.startsWith('#') && !a.href.startsWith('javascript') &&
        a.target !== '_blank' && a.origin === location.origin) {
      startLoader();
    }
  });

  window.addEventListener('pageshow', finishLoader);
  window.addEventListener('load', finishLoader);
})();


// ── 2. SCROLL TO TOP ──────────────────────────────────────
(function() {
  const btn = document.createElement('button');
  btn.id = 'scroll-top-btn';
  btn.innerHTML = '↑';
  btn.title = 'Back to top';
  btn.style.cssText = `
    position:fixed;bottom:28px;right:28px;z-index:9000;
    width:44px;height:44px;border-radius:50%;border:none;
    background:linear-gradient(135deg,#FFD700,#FFA500);
    color:#080c14;font-size:18px;font-weight:900;
    cursor:pointer;opacity:0;transform:translateY(20px);
    transition:all 0.3s ease;box-shadow:0 4px 20px rgba(255,215,0,0.4);
    display:flex;align-items:center;justify-content:center;
    font-family:'DM Sans',sans-serif;
  `;

  document.body.appendChild(btn);

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.style.opacity = '1';
      btn.style.transform = 'translateY(0)';
    } else {
      btn.style.opacity = '0';
      btn.style.transform = 'translateY(20px)';
    }
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-3px) scale(1.1)';
    btn.style.boxShadow = '0 8px 30px rgba(255,215,0,0.6)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = window.scrollY > 400 ? 'translateY(0)' : 'translateY(20px)';
    btn.style.boxShadow = '0 4px 20px rgba(255,215,0,0.4)';
  });
})();


// ── 3. FAVOURITE TEAM ─────────────────────────────────────
window.FavTeam = {
  get() {
    try { return JSON.parse(localStorage.getItem('fav_team')) || null; }
    catch(e) { return null; }
  },
  set(team) {
    try { localStorage.setItem('fav_team', JSON.stringify(team)); }
    catch(e) {}
  },
  clear() {
    try { localStorage.removeItem('fav_team'); }
    catch(e) {}
  },
  is(id) {
    const f = this.get();
    return f && f.id === id;
  }
};

// On team page — add star button if we're on /team/:id
(function() {
  if (!window.location.pathname.startsWith('/team/')) return;

  const teamId = parseInt(window.location.pathname.split('/team/')[1]);
  if (!teamId) return;

  // Wait for DOM
  window.addEventListener('load', () => {
    const hero = document.querySelector('.team-hero');
    if (!hero) return;

    const fav = window.FavTeam.get();
    const isFav = fav && fav.id === teamId;

    const btn = document.createElement('button');
    btn.id = 'fav-btn';
    btn.innerHTML = isFav ? '★' : '☆';
    btn.title = isFav ? 'Remove from favourites' : 'Add to favourites';
    btn.style.cssText = `
      position:absolute;top:16px;right:16px;
      background:${isFav ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'};
      border:1px solid ${isFav ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'};
      color:${isFav ? '#FFD700' : 'rgba(255,255,255,0.3)'};
      font-size:22px;width:44px;height:44px;border-radius:12px;
      cursor:pointer;transition:all 0.2s;
    `;

    // Make hero position relative
    hero.style.position = 'relative';
    hero.appendChild(btn);

    btn.addEventListener('click', () => {
      const teamNameEl = document.querySelector('.team-name-large');
      const crestEl = document.querySelector('.team-crest-large');
      const leagueEl = document.querySelector('.team-league-badge');

      if (window.FavTeam.is(teamId)) {
        window.FavTeam.clear();
        btn.innerHTML = '☆';
        btn.style.color = 'rgba(255,255,255,0.3)';
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.borderColor = 'rgba(255,255,255,0.1)';
        btn.title = 'Add to favourites';
        showToast('Removed from favourites');
      } else {
        window.FavTeam.set({
          id: teamId,
          name: teamNameEl?.textContent || '',
          crest: crestEl?.src || '',
          league: leagueEl?.textContent || ''
        });
        btn.innerHTML = '★';
        btn.style.color = '#FFD700';
        btn.style.background = 'rgba(255,215,0,0.15)';
        btn.style.borderColor = 'rgba(255,215,0,0.4)';
        btn.title = 'Remove from favourites';
        showToast('⭐ Added to favourites!');
      }
    });
  });
})();

// Inject fav team first in search dropdowns
window.injectFavInDropdown = function(teams) {
  if (!teams || !teams.length) return teams;
  const fav = window.FavTeam.get();
  if (!fav) return teams;
  const filtered = teams.filter(t => t.id !== fav.id);
  const favTeam = teams.find(t => t.id === fav.id);
  if (favTeam) {
    favTeam._isFav = true;
    return [favTeam, ...filtered];
  }
  return teams;
};


// ── 4. TOAST NOTIFICATION ─────────────────────────────────
window.showToast = function(msg, duration = 2500) {
  let existing = document.getElementById('polish-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'polish-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);
    background:#0f1623;border:1px solid rgba(255,215,0,0.3);
    color:white;padding:12px 24px;border-radius:30px;
    font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;
    z-index:99999;opacity:0;transition:all 0.3s ease;
    box-shadow:0 8px 30px rgba(0,0,0,0.5);
    white-space:nowrap;
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; }, 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};


// ── 5. COPY RESULT BUTTON (for fixture cards) ─────────────
window.addCopyButtons = function() {
  document.querySelectorAll('.fixture-item, .fixture-card').forEach(card => {
    if (card.querySelector('.copy-result-btn')) return; // already added

    const btn = document.createElement('button');
    btn.className = 'copy-result-btn';
    btn.innerHTML = '📋';
    btn.title = 'Copy result';
    btn.style.cssText = `
      position:absolute;top:8px;right:8px;
      background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
      color:rgba(255,255,255,0.4);font-size:12px;
      width:28px;height:28px;border-radius:8px;
      cursor:pointer;transition:all 0.2s;
      display:flex;align-items:center;justify-content:center;
      opacity:0;
    `;

    card.style.position = 'relative';
    card.appendChild(btn);

    card.addEventListener('mouseenter', () => btn.style.opacity = '1');
    card.addEventListener('mouseleave', () => btn.style.opacity = '0');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Build text from card content
      const teams = card.querySelectorAll('.fix-team span, .fix-team-highlight');
      const score = card.querySelector('.fix-score');
      const badge = card.querySelector('.fix-badge, .fix-FT, .fix-UP');

      let text = '';
      const allSpans = card.querySelectorAll('.fix-team span');
      if (allSpans.length >= 2) {
        const home = allSpans[0].textContent.trim();
        const away = allSpans[allSpans.length - 1].textContent.trim();
        const scoreText = score ? score.textContent.trim() : 'vs';
        text = `${home} ${scoreText} ${away}`;
      }

      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          btn.innerHTML = '✅';
          showToast('Result copied!');
          setTimeout(() => btn.innerHTML = '📋', 1500);
        }).catch(() => showToast('Could not copy'));
      }
    });
  });
};


// ── 6. MOBILE NAV (hamburger) ─────────────────────────────
(function() {
  const style = document.createElement('style');
  style.textContent = `
    #mobile-menu-btn {
      display:none;flex-direction:column;gap:5px;
      background:none;border:none;cursor:pointer;padding:8px;
    }
    #mobile-menu-btn span {
      display:block;width:22px;height:2px;
      background:rgba(255,255,255,0.8);border-radius:2px;
      transition:all 0.3s ease;
    }
    #mobile-menu-btn.open span:nth-child(1) { transform:rotate(45deg) translate(5px,5px); }
    #mobile-menu-btn.open span:nth-child(2) { opacity:0; }
    #mobile-menu-btn.open span:nth-child(3) { transform:rotate(-45deg) translate(5px,-5px); }

    #mobile-nav-overlay {
      display:none;position:fixed;top:70px;left:0;right:0;bottom:0;
      background:rgba(8,12,20,0.98);backdrop-filter:blur(16px);
      z-index:999;flex-direction:column;padding:24px;gap:8px;
      border-top:1px solid rgba(255,215,0,0.1);
    }
    #mobile-nav-overlay.open { display:flex; }
    #mobile-nav-overlay a {
      color:rgba(255,255,255,0.8);text-decoration:none;
      font-family:'DM Sans',sans-serif;font-weight:600;font-size:18px;
      padding:14px 16px;border-radius:12px;
      border:1px solid rgba(255,255,255,0.06);
      transition:all 0.2s;
    }
    #mobile-nav-overlay a:hover { color:#FFD700;background:rgba(255,215,0,0.06);border-color:rgba(255,215,0,0.2); }
    #mobile-nav-overlay .mob-login {
      background:#f70404;color:white!important;
      border-color:transparent!important;text-align:center;margin-top:8px;
    }

    @media (max-width: 768px) {
      #mobile-menu-btn { display:flex!important; }
      header nav, .topnav .nav-links { display:none!important; }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('load', () => {
    const header = document.querySelector('header') || document.querySelector('.topnav');
    if (!header) return;

    // Build hamburger button
    const menuBtn = document.createElement('button');
    menuBtn.id = 'mobile-menu-btn';
    menuBtn.setAttribute('aria-label', 'Menu');
    menuBtn.innerHTML = '<span></span><span></span><span></span>';
    header.appendChild(menuBtn);

    // Build overlay from existing nav links
    const overlay = document.createElement('div');
    overlay.id = 'mobile-nav-overlay';

    // Copy links from nav
    const navLinks = document.querySelectorAll('header nav a, .topnav .nav-links a, nav ul li a');
    navLinks.forEach(link => {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.textContent;
      if (link.classList.contains('login-btn') || link.classList.contains('mob-login')) {
        a.className = 'mob-login';
      }
      overlay.appendChild(a);
    });

    document.body.appendChild(overlay);

    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('open');
      overlay.classList.toggle('open');
      document.body.style.overflow = overlay.classList.contains('open') ? 'hidden' : '';
    });

    // Close on link click
    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menuBtn.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  });
})();