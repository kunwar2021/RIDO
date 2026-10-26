/**
 * ==============================================================================
 * RIDO — Enhanced 3D Motion & Physics Engine (`js/motion3d.js`)
 * Real 3D Perspective, Parallax Hover, Dynamic Lighting & Float Animations
 * ==============================================================================
 */

(function () {
  'use strict';

  const Motion3D = {
    initialized: false,

    init() {
      if (this.initialized) return;
      this.initialized = true;

      // 1. Bind dynamic 3D tilt to cards and interactive panels
      this.init3DTilt();

      // 2. Bind floating physics to badges, pins, and HUD elements
      this.initFloatingBadges();

      // 3. Hook 3D View Transitions
      this.initViewTransitions();

      console.log('⚡ [RIDO 3D Engine] Active with high-depth 3D perspective and parallax!');
    },

    /**
     * Interactive 3D tilt on mousemove for cards and containers
     */
    init3DTilt() {
      const cardSelectors = [
        '.bg-white.border.border-slate-200',
        '.bg-slate-50.border.border-slate-200',
        '.landing-hero-split > div',
        '.testimonial-card',
        '#interactive-fleet-map',
        '#rido-results-main-grid > div',
        '.kpi-stat-card',
        '.ops-stat-card'
      ];

      const applyTilt = (el) => {
        if (!el || el.dataset.tilt3d === 'true') return;
        el.dataset.tilt3d = 'true';
        el.style.transformStyle = 'preserve-3d';
        el.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease';

        el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotateX = ((centerY - y) / centerY) * 7.5;
          const rotateY = ((x - centerX) / centerX) * 8.5;

          el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(8px) scale3d(1.015, 1.015, 1.015)`;
          el.style.boxShadow = `0 20px 35px -10px rgba(15, 23, 42, 0.14), 0 10px 15px -5px rgba(234, 88, 12, 0.08)`;
        });

        el.addEventListener('mouseleave', () => {
          el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)';
          el.style.boxShadow = '';
        });
      };

      const refreshCards = () => {
        cardSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => applyTilt(el));
        });
      };

      refreshCards();
      const obs = new MutationObserver(() => refreshCards());
      obs.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * Mouse tracking 3D parallax on the Hero vehicle stage
     */
    initHeroParallax() {
      const container = document.getElementById('hero-truck-container');
      const stage = document.querySelector('.hero-truck-stage');
      const aura = document.querySelector('.hero-truck-aura');
      const vector = document.querySelector('.hero-truck-vector-bg');

      if (!container || !stage) return;

      let mouseX = 0;
      let mouseY = 0;
      let curX = 0;
      let curY = 0;

      window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });

      const loop = () => {
        curX += (mouseX - curX) * 0.07;
        curY += (mouseY - curY) * 0.07;

        const rotX = (-curY * 16).toFixed(2);
        const rotY = (curX * 20).toFixed(2);

        stage.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(30px)`;

        if (aura) {
          aura.style.transform = `translate3d(${-curX * 25}px, ${-curY * 20}px, -20px) scale(1.15)`;
        }

        if (vector) {
          vector.style.transform = `perspective(1100px) rotateX(${rotX * 0.5}deg) rotateY(${rotY * 0.5}deg) translateZ(15px)`;
        }

        requestAnimationFrame(loop);
      };

      loop();
    },

    /**
     * Floating physics on badges and pill elements
     */
    initFloatingBadges() {
      const badges = document.querySelectorAll('.landing-badge, .hud-speed-badge, .nav-search-pill');
      badges.forEach(b => {
        b.style.animation = 'floatBadge3D 3.5s ease-in-out infinite alternate';
      });
    },

    /**
     * 3D View Transition animation when switching tabs
     */
    initViewTransitions() {
      document.querySelectorAll('[data-nav], [data-mob-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
          setTimeout(() => {
            const activePanel = document.querySelector('.view-panel.active');
            if (activePanel) {
              activePanel.style.animation = 'none';
              void activePanel.offsetHeight; // trigger reflow
              activePanel.style.animation = 'panel3DIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            }
          }, 30);
        });
      });
    }
  };

  window.Motion3D = Motion3D;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Motion3D.init());
  } else {
    Motion3D.init();
  }
})();
