/**
 * ==============================================================================
 * RIDO — 3D Motion & Interactive Physics Engine (`js/motion3d.js`)
 * Powered by Motion & Modern CSS 3D Transforms / Parallax / Spring Physics
 * ==============================================================================
 */

(function () {
  'use strict';

  // 3D Motion System Namespace
  const Motion3D = {
    initialized: false,
    elementsWithTilt: new WeakSet(),

    init() {
      if (this.initialized) return;
      this.initialized = true;

      // 1. Initialize Interactive 3D Cursor Tilt Physics
      this.initTiltEffects();

      // 2. Initialize Hero 3D Parallax & Floating Vehicle Stage
      this.initHero3DParallax();

      // 3. Initialize Staggered 3D Scroll Entrances
      this.init3DScrollEntrances();

      // 4. Initialize 3D View Transitions
      this.hookViewTransitions();

      // 5. Initialize 3D Depth on Buttons & Modals
      this.initInteractiveDepth();

      console.log('⚡ [RIDO 3D Engine] Motion 3D Physics & Depth layers initialized.');
    },

    /**
     * 1. 3D Perspective Tilt on Interactive Cards (Cards, Fleet Items, Metrics)
     */
    initTiltEffects() {
      const tiltSelectors = [
        '.kpi-stat-card',
        '.ops-stat-card',
        '.landing-value-card',
        '.landing-step-card',
        '.fleet-card-container',
        '.fleet-vehicle-card',
        '.card-3d',
        '.metric-box',
        '#rido-recommended-trucks-container > div',
        '#rido-best-recommendation-container',
        '#hero-truck-container'
      ];

      const applyTiltToElement = (el, maxTilt = 8, scale = 1.02) => {
        if (!el || this.elementsWithTilt.has(el)) return;
        this.elementsWithTilt.add(el);

        el.classList.add('perspective-card-3d');

        let isHovered = false;
        let bounds = null;

        const onMouseEnter = () => {
          isHovered = true;
          bounds = el.getBoundingClientRect();
          el.style.transition = 'transform 0.12s cubic-bezier(0.2, 0, 0.38, 0.9)';
          el.style.willChange = 'transform';
        };

        const onMouseMove = (e) => {
          if (!isHovered || !bounds) return;
          const mouseX = e.clientX - bounds.left;
          const mouseY = e.clientY - bounds.top;

          const xPct = (mouseX / bounds.width - 0.5) * 2; // -1 to 1
          const yPct = (mouseY / bounds.height - 0.5) * 2; // -1 to 1

          const rotateY = (xPct * maxTilt).toFixed(2);
          const rotateX = (-yPct * maxTilt).toFixed(2);

          el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale}) translateZ(10px)`;
        };

        const onMouseLeave = () => {
          isHovered = false;
          el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0px)';
        };

        el.addEventListener('mouseenter', onMouseEnter, { passive: true });
        el.addEventListener('mousemove', onMouseMove, { passive: true });
        el.addEventListener('mouseleave', onMouseLeave, { passive: true });
      };

      const scanAndApply = () => {
        tiltSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => applyTiltToElement(el));
        });
      };

      scanAndApply();

      // Mutation observer to auto-apply 3D tilt on dynamically rendered cards
      const observer = new MutationObserver(() => scanAndApply());
      observer.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * 2. Hero 3D Gyroscope & Mouse Tracking Floating Truck & Waypoint Stage
     */
    initHero3DParallax() {
      const heroStage = document.getElementById('hero-truck-container');
      const heroTruck = document.querySelector('.hero-truck-stage');
      const heroAura = document.querySelector('.hero-truck-aura');
      const heroVector = document.querySelector('.hero-truck-vector-bg');

      if (!heroStage || !heroTruck) return;

      heroStage.classList.add('hero-3d-stage');

      let currentX = 0;
      let currentY = 0;
      let targetX = 0;
      let targetY = 0;

      window.addEventListener('mousemove', (e) => {
        const xPct = (e.clientX / window.innerWidth - 0.5) * 2;
        const yPct = (e.clientY / window.innerHeight - 0.5) * 2;
        targetX = xPct;
        targetY = yPct;
      }, { passive: true });

      const animateHero = () => {
        // Smooth lerp (linear interpolation)
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;

        const rotX = (-currentY * 12).toFixed(2);
        const rotY = (currentX * 16).toFixed(2);
        const transZ = 24;

        if (heroTruck) {
          heroTruck.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(${transZ}px)`;
        }

        if (heroAura) {
          heroAura.style.transform = `translate3d(${currentX * -20}px, ${currentY * -15}px, -30px) scale(1.08)`;
        }

        if (heroVector) {
          heroVector.style.transform = `perspective(1200px) rotateX(${rotX * 0.6}deg) rotateY(${rotY * 0.6}deg) translateZ(10px)`;
        }

        requestAnimationFrame(animateHero);
      };

      animateHero();
    },

    /**
     * 3. 3D Scroll In-View Entrance Animations
     */
    init3DScrollEntrances() {
      const animatableElements = document.querySelectorAll(`
        .landing-hero-split,
        .landing-step-card,
        .landing-value-card,
        .landing-features-strip,
        .kpi-stat-card,
        .ops-stat-card,
        #interactive-fleet-map,
        #rido-fleet-results-section
      `);

      if (!('IntersectionObserver' in window)) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-3d-view');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      });

      animatableElements.forEach((el) => {
        el.classList.add('scroll-3d-reveal');
        observer.observe(el);
      });
    },

    /**
     * 4. 3D Smooth View Transitions Hook
     */
    hookViewTransitions() {
      const origNavigate = window.App?.navigateTo;
      if (!origNavigate) return;

      // Wrap view navigation in 3D depth flip/glide
      const enhanceViewTransition = (viewId) => {
        const targetSection = document.getElementById(`view-${viewId}`) || 
                              document.getElementById(viewId === 'dashboard' ? 'view-operations' : `view-${viewId}`);

        if (targetSection) {
          targetSection.classList.remove('view-3d-slide-in');
          // Trigger reflow to restart animation
          void targetSection.offsetWidth;
          targetSection.classList.add('view-3d-slide-in');
        }
      };

      // Listen to navigation events
      window.addEventListener('rido:navigate', (e) => {
        if (e.detail?.view) enhanceViewTransition(e.detail.view);
      });

      // Hook click events on primary navigation
      document.querySelectorAll('[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
          const v = btn.getAttribute('data-nav');
          if (v) setTimeout(() => enhanceViewTransition(v), 50);
        });
      });
    },

    /**
     * 5. Interactive 3D Depth on Buttons & Action Elements
     */
    initInteractiveDepth() {
      const buttons = document.querySelectorAll(`
        .btn-hero-primary,
        .btn-hero-secondary,
        .btn-hero-tertiary,
        .btn-header-signup,
        .style-pill,
        button[onclick*="calculateRidoRoute"],
        button[onclick*="App.openFareBreakdownModal"]
      `);

      buttons.forEach(btn => {
        btn.classList.add('btn-3d-press');
      });
    }
  };

  // Expose globally
  window.Motion3D = Motion3D;

  // Auto initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Motion3D.init());
  } else {
    Motion3D.init();
  }
})();
