/**
 * ==============================================================================
 * RIDO — Three.js 3D Glowing Particle Truck Engine (`js/truck3d.js`)
 * High Density, Perfectly Centered, Motion.dev Dark Hologram Particle Aesthetic
 * ==============================================================================
 */

(function () {
  'use strict';

  const Truck3D = {
    scene: null,
    camera: null,
    renderer: null,
    particles: null,
    container: null,
    animationFrameId: null,
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },

    init() {
      this.container = document.getElementById('three-truck-canvas-container');
      if (!this.container) return;

      if (typeof THREE === 'undefined') {
        console.warn('[Truck3D] Waiting for Three.js...');
        setTimeout(() => this.init(), 200);
        return;
      }

      this.setupScene();
      this.buildParticleTruck();
      this.bindEvents();
      this.animate();

      console.log('✨ [Truck3D] Symmetrical, High-Definition 3D Particle Truck loaded!');
    },

    setupScene() {
      const width = this.container.clientWidth || 600;
      const height = this.container.clientHeight || 440;

      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
      // Position camera directly facing the truck's geometric origin
      this.camera.position.set(0, 0, 36);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);
    },

    /**
     * Symmetrical Heavy Logistics Truck Procedural Model
     * Perfectly centered at (0, 0, 0)
     * Total length: 22 units (x: -11 to +11, Center = 0)
     */
    buildParticleTruck() {
      const particleCount = 12000;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      // Motion.dev Signature Color Palette
      const colorAmber = new THREE.Color(0xd97706);  // Deep Amber
      const colorOrange = new THREE.Color(0xea580c); // Vibrant Orange
      const colorGold = new THREE.Color(0xf59e0b);   // Bright Gold
      const colorGlow = new THREE.Color(0xfbbf24);   // Core Light
      const colorCyan = new THREE.Color(0x0284c7);   // Headlight Blue

      let idx = 0;

      const addParticle = (x, y, z, baseColor, sizeMultiplier = 1) => {
        if (idx >= particleCount) return;

        // Subtle organic stardust offset
        const jitter = (Math.random() - 0.5) * 0.12;
        positions[idx * 3] = x + jitter;
        positions[idx * 3 + 1] = y + jitter;
        positions[idx * 3 + 2] = z + jitter;

        const c = baseColor.clone();
        c.offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.08);

        colors[idx * 3] = c.r;
        colors[idx * 3 + 1] = c.g;
        colors[idx * 3 + 2] = c.b;

        sizes[idx] = (Math.random() * 1.8 + 1.2) * sizeMultiplier;
        idx++;
      };

      // Helper to generate a 3D box boundary with uniform density
      const generateBox = (xMin, xMax, yMin, yMax, zMin, zMax, density, color, sizeMult = 1) => {
        for (let i = 0; i < density; i++) {
          const face = Math.floor(Math.random() * 6);
          let x, y, z;
          if (face === 0) { x = xMin; y = THREE.MathUtils.lerp(yMin, yMax, Math.random()); z = THREE.MathUtils.lerp(zMin, zMax, Math.random()); }
          else if (face === 1) { x = xMax; y = THREE.MathUtils.lerp(yMin, yMax, Math.random()); z = THREE.MathUtils.lerp(zMin, zMax, Math.random()); }
          else if (face === 2) { x = THREE.MathUtils.lerp(xMin, xMax, Math.random()); y = yMin; z = THREE.MathUtils.lerp(zMin, zMax, Math.random()); }
          else if (face === 3) { x = THREE.MathUtils.lerp(xMin, xMax, Math.random()); y = yMax; z = THREE.MathUtils.lerp(zMin, zMax, Math.random()); }
          else if (face === 4) { x = THREE.MathUtils.lerp(xMin, xMax, Math.random()); y = THREE.MathUtils.lerp(yMin, yMax, Math.random()); z = zMin; }
          else { x = THREE.MathUtils.lerp(xMin, xMax, Math.random()); y = THREE.MathUtils.lerp(yMin, yMax, Math.random()); z = zMax; }

          addParticle(x, y, z, color, sizeMult);
        }
      };

      // Helper to generate 3D Wheels
      const generateWheel = (cx, cy, cz, radius, width, density, color) => {
        for (let i = 0; i < density; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = radius * Math.sqrt(Math.random() * 0.3 + 0.7);
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const z = cz + (Math.random() - 0.5) * width;
          addParticle(x, y, z, color, 0.95);
        }
      };

      // 1. CARGO TRAILER / CONTAINER (Golden Dust Box)
      // Centered: x from -10.5 to +2.5 (Length = 13)
      // Height: y from -1.8 to +6.8 (Height = 8.6, Center Y ≈ +2.5)
      // Width: z from -4.0 to +4.0 (Width = 8.0)
      generateBox(-10.5, 2.5, -1.8, 6.8, -4.0, 4.0, 4500, colorGold, 1.15);

      // Vertical corrugated container ribs
      for (let rx = -9.5; rx <= 1.5; rx += 2.0) {
        for (let p = 0; p < 60; p++) {
          const y = THREE.MathUtils.lerp(-1.8, 6.8, Math.random());
          addParticle(rx, y, 4.05, colorOrange, 1.3);
          addParticle(rx, y, -4.05, colorOrange, 1.3);
        }
      }

      // 2. TRUCK CABIN (Front section: x from +3.0 to +9.5)
      // Height: y from -1.8 to +5.2
      // Width: z from -3.6 to +3.6
      generateBox(3.0, 9.5, -1.8, 5.2, -3.6, 3.6, 2800, colorOrange, 1.25);

      // Slanted Aerodynamic Windshield
      for (let i = 0; i < 650; i++) {
        const t = Math.random();
        const x = THREE.MathUtils.lerp(5.2, 9.2, t);
        const y = THREE.MathUtils.lerp(5.2, 2.2, t);
        const z = THREE.MathUtils.lerp(-3.4, 3.4, Math.random());
        addParticle(x, y, z, colorCyan, 1.4);
      }

      // 3. CHASSIS / UNDERCARRIAGE BEAM (x from -11.0 to +9.8)
      generateBox(-11.0, 9.8, -3.4, -1.8, -3.4, 3.4, 1100, colorAmber, 0.9);

      // 4. SIX HEAVY WHEELS (Symmetrically distributed)
      const wheelRadius = 1.7;
      const wheelWidth = 1.0;
      const wheelZ_left = 3.8;
      const wheelZ_right = -3.8;
      const wheelY = -3.4;

      // Front steering wheels
      generateWheel(7.5, wheelY, wheelZ_left, wheelRadius, wheelWidth, 280, colorGlow);
      generateWheel(7.5, wheelY, wheelZ_right, wheelRadius, wheelWidth, 280, colorGlow);

      // Rear tandem axles
      generateWheel(-4.8, wheelY, wheelZ_left, wheelRadius, wheelWidth, 280, colorGlow);
      generateWheel(-4.8, wheelY, wheelZ_right, wheelRadius, wheelWidth, 280, colorGlow);
      generateWheel(-8.6, wheelY, wheelZ_left, wheelRadius, wheelWidth, 280, colorGlow);
      generateWheel(-8.6, wheelY, wheelZ_right, wheelRadius, wheelWidth, 280, colorGlow);

      // 5. HEADLIGHTS & EXHAUST
      for (let i = 0; i < 100; i++) {
        addParticle(9.6, 0.2 + (Math.random() - 0.5) * 0.8, 2.7 + (Math.random() - 0.5) * 0.8, colorCyan, 2.0);
        addParticle(9.6, 0.2 + (Math.random() - 0.5) * 0.8, -2.7 + (Math.random() - 0.5) * 0.8, colorCyan, 2.0);
      }
      for (let i = 0; i < 80; i++) {
        addParticle(-10.6, -1.2 + (Math.random() - 0.5) * 0.6, 3.2 + (Math.random() - 0.5) * 0.6, colorOrange, 1.9);
        addParticle(-10.6, -1.2 + (Math.random() - 0.5) * 0.6, -3.2 + (Math.random() - 0.5) * 0.6, colorOrange, 1.9);
      }

      // 6. MOTION.DEV ORBITING STARDUST SPHERE HALO
      while (idx < particleCount) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const rad = THREE.MathUtils.lerp(11, 16.5, Math.random());

        const x = rad * Math.sin(phi) * Math.cos(theta);
        const y = rad * Math.sin(phi) * Math.sin(theta) * 0.65;
        const z = rad * Math.cos(phi);

        addParticle(x, y, z, Math.random() > 0.4 ? colorGold : colorAmber, 0.85);
      }

      // Buffer Geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      // Circular glowing particle texture
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.25, 'rgba(251,191,36,0.95)');
      grad.addColorStop(0.65, 'rgba(234,88,12,0.6)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);

      const material = new THREE.PointsMaterial({
        size: 0.72,
        vertexColors: true,
        map: texture,
        transparent: true,
        opacity: 0.95,
        blending: THREE.NormalBlending, // Crisp visibility on light & dark backgrounds
        depthWrite: false
      });

      this.particles = new THREE.Points(geometry, material);

      // Re-center geometry pivot so rotation is 100% symmetrical
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.center(); // Centers all vertices perfectly around (0,0,0)

      // Initial angle: 3/4 perspective isometric view
      this.particles.rotation.y = -0.4;
      this.particles.rotation.x = 0.15;

      this.scene.add(this.particles);
    },

    bindEvents() {
      window.addEventListener('mousemove', (e) => {
        this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 0.6;
        this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 0.35;
      }, { passive: true });

      window.addEventListener('resize', () => {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      });
    },

    animate() {
      this.animationFrameId = requestAnimationFrame(() => this.animate());

      if (!this.particles) return;

      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.06;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.06;

      // Smooth continuous self-rotation (Motion.dev aesthetic)
      this.particles.rotation.y += 0.004;

      // Mouse interactive tilt
      this.particles.rotation.x = 0.15 + this.mouse.y * 0.25;
      this.particles.rotation.z = -this.mouse.x * 0.1;

      // Gentle floating breathing cycle
      const time = performance.now() * 0.0018;
      this.particles.position.y = Math.sin(time) * 0.45;

      this.renderer.render(this.scene, this.camera);
    }
  };

  window.Truck3D = Truck3D;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Truck3D.init());
  } else {
    Truck3D.init();
  }
})();
