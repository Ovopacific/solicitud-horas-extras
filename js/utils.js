window.appUtils = {
  formatDate(str, includeTime = false) {
    if (!str) return '';
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const date = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    return includeTime ? `${date} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : date;
  },

  formatHoras(val) {
    if (!val) return '0';
    const s = String(val);
    if (s.includes('T') && s.includes('1899')) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
      }
    }
    return s;
  },

  async compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > 250) { h *= 250 / w; w = 250; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });
  },

  base64urlToBuffer: b => Uint8Array.from(atob(b.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer,
  bufferToBase64url: b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
  escapeHTML: s => s ? String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '',

  setLoading(btn, loading, text) {
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading ? `<span class="spinner-border spinner-border-sm me-2"></span>${text}` : text;
  },

  toggleLoader(show) {
    const adminLoader = document.getElementById('adminLoader');
    const userLoader = document.getElementById('userLoader');
    if (this.state.role === 'admin' || this.state.role === 'supervisor') {
      adminLoader?.classList.toggle('d-none', !show);
    } else {
      userLoader?.classList.toggle('d-none', !show);
    }
  },

  showToast(msg, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    const toastMsgEl = document.getElementById('toastMessage');
    if (!toastEl || !toastMsgEl) return;
    toastMsgEl.innerText = msg;
    toastEl.className = `toast border-0 shadow align-items-center text-bg-${type}`;
    new bootstrap.Toast(toastEl).show();
  }
};
