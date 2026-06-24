window.appUi = {
  init3DLogin() {
    const card = document.querySelector('.login-card');
    const wrap = document.querySelector('.login-card-wrapper');
    if (!card || !wrap) return;
    wrap.onmousemove = (e) => {
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const rx = ((y - r.height / 2) / (r.height / 2)) * -15;
      const ry = ((x - r.width / 2) / (r.width / 2)) * 15;
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02, 1.02, 1.02)`;
    };
    wrap.onmouseleave = () => card.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  },

  initWaterRipple() {
    document.onclick = (e) => {
      const rip = document.createElement('div');
      rip.className = 'water-ripple';
      rip.style.left = `${e.clientX - 75}px`;
      rip.style.top = `${e.clientY - 75}px`;
      document.body.appendChild(rip);
      setTimeout(() => rip.remove(), 800);
    };
  },

  initCustomCursor() {
    const ring = document.getElementById('customCursorRing');
    const glow = document.getElementById('customCursorGlow');
    if (!ring || !glow) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    document.onmousemove = (e) => {
      mx = e.clientX; my = e.clientY;
      glow.style.left = `${mx}px`; glow.style.top = `${my}px`;
    };
    const anim = () => {
      rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
      ring.style.left = `${rx}px`; ring.style.top = `${ry}px`;
      requestAnimationFrame(anim);
    };
    anim();
  },

  createParticles() {
    const container = document.getElementById('bg-container');
    if (!container) return;
    // Keeping this legacy method as a fallback or unused
  },

  initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const particles = [];
    const count = Math.min(Math.floor((w * h) / 12000), 80);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1 + Math.random() * 2, // Pequeñas partículas elegantes (1px a 3px)
        vx: (Math.random() - 0.5) * 0.3, // Movimiento lateral muy sutil
        vy: -0.15 - Math.random() * 0.35, // Movimiento ascendente lento y elegante
        alpha: 0.15 + Math.random() * 0.45,
        colorHue: Math.random() > 0.5 ? 231 : 160 // Tono indigo o esmeralda suave
      });
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
      }, 100);
    });

    function animate() {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.vy;
        p.x += p.vx;

        // Reiniciar cuando salgan de pantalla
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        
        // Ajustar color y brillo para que contrasten mejor en fondo claro
        ctx.fillStyle = `hsla(${p.colorHue}, 80%, 55%, ${p.alpha})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = `hsla(${p.colorHue}, 80%, 55%, 0.3)`;
        ctx.fill();
      }
      ctx.shadowBlur = 0; // Reset para rendimiento
      requestAnimationFrame(animate);
    }
    animate();
  }
};
