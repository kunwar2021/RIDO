/**
 * ==============================================================================
 * RIDO — Three.js 3D Glowing Particle Truck Engine (`js/truck3d.js`)
 * Inspired by Motion.dev Particle Sphere & Holographic 3D Point-Clouds
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

      // Check Three.js availability
      if (typeof THREE === 'undefined') {
        console.warn('[Truck3D] Three.js is not loaded yet. Retrying...');
        setTimeout(() => this.init(), 300);
        return;
      }

      this.setupScene();
      this.buildParticleTruck();
      this.bindEvents();
      this.animate();

      console.log('✨ [Truck3D] 3D Holographic Particle Truck initialized!');
    },

    setupScene() {
      const width = this.container.clientWidth || 580;
      const height = this.container.clientHeight || 420;

      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      this.camera.position.set(0, 5, 42);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);
    },

    /**
     * Procedurally constructs thousands of particles forming a detailed 3D Commercial Freight Truck
     */
    buildParticleTruck() {
      const particleCount = 7500;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      // Color Palette: Golden Amber, Electric Orange, Pure White Core
      const colorAmber = new THREE.Color(0xf59e0b);  // #f59e0b
      const colorOrange = new THREE.Color(0xea580c); // #ea580c
      const colorGold = new THREE.Color(0xfbbf24);   // #fbbf24
      const colorCyan = new THREE.Color(0x38bdf8);   // Headlights

      let idx = 0;

      const addParticle = (x, y, z, baseColor, sizeMultiplier = 1) => {
        if (idx >= particleCount) return;
        
        // Micro jitter for organic stardust particle texture
        const jitter = (Math.random() - 0.5) * 0.15;
        positions[idx * 3] = x + jitter;
        positions[idx * 3 + 1] = y + jitter;
        positions[idx * 3 + 2] = z + jitter;

        // Slight color variation
        const c = baseColor.clone();
        c.offsetHSL((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.1);

        colors[idx * 3] = c.r;
        colors[idx * 3 + 1] = c.g;
        colors[idx * 3 + 2] = c.b;

        sizes[idx] = (Math.random() * 1.5 + 1.2) * sizeMultiplier;
        idx++;
      };

      // Helper to generate a hollow particle box (Cab / Cargo Container)
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

      // Helper to generate cylindrical particle wheels
      const generateWheel = (cx, cy, cz, radius, width, density, color) => {
        for (let i = 0; i < density; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = radius + (Math.random() - 0.5) * 0.2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const z = cz + (Math.random() - 0.5) * width;
          addParticle(x, y, z, color, 0.9);
        }
      };

      // 1. CARGO TRAILER / CONTAINER (Golden Dust Box)
      // Long container from x = -13 to x = 2, height y = -1.5 to 7.5, width z = -4.5 to 4.5
      generateBox(-13, 2, -1.5, 7.8, -4.6, 4.6, 2800, colorGold, 1.1);

      // Cargo Container Structural Ribs / Panels
      for (let rx = -12; rx <= 1.5; rx += 2.5) {
        for (let p = 0; p < 45; p++) {
          const y = THREE.MathUtils.lerp(-1.5, 7.8, Math.random());
          addParticle(rx, y, 4.65, colorAmber, 1.3);
          addParticle(rx, y, -4.65, colorAmber, 1.3);
        }
      }

      // 2. DRIVER CABIN (Forward section from x = 2.5 to 8.5)
      generateBox(2.5, 8.5, -1.5, 6.2, -4.2, 4.2, 1800, colorOrange, 1.2);

      // Windshield & Slanted Aerodynamic Roof
      for (let i = 0; i < 400; i++) {
        const t = Math.random();
        const x = THREE.MathUtils.lerp(4.5, 8.2, t);
        const y = THREE.MathUtils.lerp(6.2, 3.2, t);
        const z = THREE.MathUtils.lerp(-4.0, 4.0, Math.random());
        addParticle(x, y, z, colorCyan, 1.25);
      }

      // 3. CHASSIS / LOWER FRAME
      generateBox(-13.5, 8.8, -3.2, -1.5, -3.8, 3.8, 700, colorAmber, 0.85);

      // 4. WHEELS (6 Heavy Highway Wheels)
      const wheelRadius = 1.9;
      const wheelWidth = 1.2;
      const wheelZ_left = 4.3;
      const wheelZ_right = -4.3;
      const wheelY = -3.2;

      // Front steering axle
      generateWheel(6.2, wheelY, wheelZ_left, wheelRadius, wheelWidth, 220, colorGold);
      generateWheel(6.2, wheelY, wheelZ_right, wheelRadius, wheelWidth, 220, colorGold);

      // Rear tandem axles
      generateWheel(-7.2, wheelY, wheelZ_left, wheelRadius, wheelWidth, 220, colorGold);
      generateWheel(-7.2, wheelY, wheelZ_right, wheelRadius, wheelWidth, 220, colorGold);
      generateWheel(-10.8, wheelY, wheelZ_left, wheelRadius, wheelWidth, 220, colorGold);
      generateWheel(-10.8, wheelY, wheelZ_right, wheelRadius, wheelWidth, 220, colorGold);

      // 5. BRIGHT HEADLIGHT BEAMS & TAILLIGHTS
      for (let i = 0; i < 70; i++) {
        addParticle(8.6, 0.5 + (Math.random() - 0.5) * 0.8, 3.2 + (Math.random() - 0.5) * 0.8, colorCyan, 1.8);
        addParticle(8.6, 0.5 + (Math.random() - 0.5) * 0.8, -3.2 + (Math.random() - 0.5) * 0.8, colorCyan, 1.8);
      }
      // Taillights (Red / Orange)
      for (let i = 0; i < 60; i++) {
        addParticle(-13.2, -1.0 + (Math.random() - 0.5) * 0.6, 3.5 + (Math.random() - 0.5) * 0.6, colorOrange, 1.8);
        addParticle(-13.2, -1.0 + (Math.random() - 0.5) * 0.6, -3.5 + (Math.random() - 0.5) * 0.6, colorOrange, 1.8);
      }

      // 6. AMBIENT ORBITING STARDUST PARTICLES (Like Motion.dev sphere halo)
      while (idx < particleCount) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const rad = THREE.MathUtils.lerp(12, 19, Math.random());

        const x = rad * Math.sin(phi) * Math.cos(theta);
        const y = (rad * Math.sin(phi) * Math.sin(theta)) * 0.6;
        const z = rad * Math.cos(phi);

        addParticle(x, y, z, Math.random() > 0.5 ? colorGold : colorOrange, 0.75);
      }

      // Geometry & Material
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
      grad.addColorStop(0.3, 'rgba(251,191,36,0.9)');
      grad.addColorStop(0.7, 'rgba(234,88,12,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);

      const material = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        map: texture,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.particles = new THREE.Points(geometry, material);
      
      // Initial cinematic angle (Three-quarter perspective)
      this.particles.rotation.y = -0.45;
      this.particles.rotation.x = 0.12;

      this.scene.add(this.particles);
    },

    bindEvents() {
      window.addEventListener('mousemove', (e) => {
        this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 0.8;
        this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 0.5;
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

      // Smooth mouse follow
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

      // Continuous gentle 3D rotation (Motion.dev style)
      this.particles.rotation.y += 0.0035;

      // Responsive interactive tilt
      this.particles.rotation.x = 0.12 + this.mouse.y * 0.35;
      this.particles.rotation.z = -this.mouse.x * 0.15;

      // Floating breathing wave
      const time = performance.now() * 0.0015;
      this.particles.position.y = Math.sin(time) * 0.6;

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
