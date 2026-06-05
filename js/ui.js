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
    container.innerHTML = '';

    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'glass-sphere';

      p.style.left = `${Math.random() * 80}vw`;
      p.style.top = `${Math.random() * 80}vh`;

      const size = 200 + Math.random() * 300;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;

      p.style.animationDuration = `${15 + Math.random() * 15}s`;
      p.style.animationDelay = `-${Math.random() * 10}s`;

      container.appendChild(p);
    }
  }
};
