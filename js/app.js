/**
 * app.js - Main Application Logic
 */

const app = {
  data: [],
  loginMode: 'user', // tab in login screen
  role: null, // 'user' or 'admin'
  currentUser: null, // name of the user
  apiUrl: 'https://script.google.com/macros/s/AKfycbzOtk9XFMWsS6p8_WYW7kRIyWgOZNJ4pdcGpYU2rRJCbYfgrA9vDoknh0T5WuEkuQCK/exec',

  init() {
    this.setupEventListeners();
    localStorage.removeItem('appTheme');
    document.body.removeAttribute('data-theme');

    // Initialize 3D effects
    setTimeout(() => this.init3DLogin(), 100);
    this.initWaterRipple();
    this.initCustomCursor();
    // Don't log in automatically. The beautiful login screen is visible by default.
  },

  setupEventListeners() {
    // Login Submit
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });

    // Form Submit
    document.getElementById('recordForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitRecord();
    });

    // Filters Admin
    document.getElementById('searchInput').addEventListener('input', () => this.renderAdminTable());
    document.getElementById('statusFilter').addEventListener('change', () => this.renderAdminTable());

    // Restore date input to today by default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = today;
  },

  switchLoginTab(mode) {
    this.loginMode = mode;
    document.getElementById('btnTabUser').classList.toggle('active', mode === 'user');
    document.getElementById('btnTabAdmin').classList.toggle('active', mode === 'admin');

    document.getElementById('userLoginFields').classList.toggle('d-none', mode === 'admin');
    document.getElementById('adminLoginFields').classList.toggle('d-none', mode === 'user');
  },

  init3DLogin() {
    const card = document.querySelector('.login-card');
    const wrapper = document.querySelector('.login-card-wrapper');
    if (!card || !wrapper) return;

    wrapper.addEventListener('mousemove', (e) => {
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // More pronounced tilt for dramatic effect
      const rotateX = ((y - centerY) / centerY) * -15;
      const rotateY = ((x - centerX) / centerX) * 15;

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    wrapper.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
      card.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;

      setTimeout(() => {
        card.style.transition = 'transform 0.1s ease-out';
      }, 600);
    });

    wrapper.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.1s ease-out';
    });
  },

  initWaterRipple() {
    document.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      ripple.classList.add('water-ripple');

      const size = 150;
      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - size / 2) + 'px';
      ripple.style.top = (e.clientY - size / 2) + 'px';

      document.body.appendChild(ripple);

      // Cursor click feedback
      const cursorRing = document.getElementById('customCursorRing');
      if (cursorRing) {
        cursorRing.style.width = '35px';
        cursorRing.style.height = '35px';
        cursorRing.style.background = 'rgba(99, 102, 241, 0.2)';
        setTimeout(() => {
          cursorRing.style.width = '24px';
          cursorRing.style.height = '24px';
          cursorRing.style.background = 'transparent';
        }, 150);
      }

      setTimeout(() => ripple.remove(), 800);
    });
  },

  initCustomCursor() {
    const ring = document.getElementById('customCursorRing');
    const glow = document.getElementById('customCursorGlow');
    if (!ring || !glow) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      // Instant update for the glow point
      glow.style.left = mouseX + 'px';
      glow.style.top = mouseY + 'px';
    });

    // Smooth delay for the ring
    const render = () => {
      ringX += (mouseX - ringX) * 0.2;
      ringY += (mouseY - ringY) * 0.2;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    // Hover effects on buttons/links
    document.querySelectorAll('button, a, input, select, .login-card').forEach(el => {
      el.addEventListener('mouseenter', () => {
        ring.style.width = '40px';
        ring.style.height = '40px';
        ring.style.borderColor = 'transparent';
        ring.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
      });
      el.addEventListener('mouseleave', () => {
        ring.style.width = '24px';
        ring.style.height = '24px';
        ring.style.borderColor = 'var(--primary-color)';
        ring.style.backgroundColor = 'transparent';
      });
    });
  },

  async login() {
    if (this.loginMode === 'admin') {
      const user = document.getElementById('adminUser').value;
      const pass = document.getElementById('adminPass').value;

      const btn = document.querySelector('.login-btn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Verificando...';
      btn.disabled = true;

      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'login_admin', payload: { password: pass } })
        });
        const resData = await response.json();

        if (resData.success && user === 'admin') {
          this.role = 'admin';
          this.currentUser = 'Administrador';
          this.completeLogin();
        } else {
          this.showToast('Contraseña de administrador incorrecta', 'danger');
        }
      } catch (error) {
        console.error("Login error:", error);
        this.showToast('Error de conexión con el servidor', 'danger');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }

    } else {
      const name = document.getElementById('loginName').value.trim();
      if (name.length > 2) {
        this.handleUserLogin(name);
      } else {
        this.showToast('Por favor ingresa un nombre válido', 'danger');
      }
    }
  },

  async handleUserLogin(name) {
    if (!window.PublicKeyCredential) {
      this.showToast('Tu navegador no soporta autenticación biométrica.', 'danger');
      return;
    }

    const btn = document.querySelector('.login-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Conectando...';
    btn.disabled = true;

    try {
      // 1. Check if user is registered and get challenge
      const checkRes = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'webauthn_check', payload: { nombre: name } })
      });
      const checkData = await checkRes.json();

      if (!checkData.success) throw new Error(checkData.error);

      if (checkData.isRegistered) {
        // --- AUTHENTICATION FLOW ---
        this.showToast('Solicitando huella/PIN para acceder...', 'info');

        try {
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge: this.base64urlToBuffer(checkData.challenge),
              allowCredentials: [{
                id: this.base64urlToBuffer(checkData.credentialId),
                type: 'public-key',
                transports: ['internal', 'usb', 'ble', 'nfc']
              }],
              userVerification: 'required', // Enforces PIN/Biometrics
              timeout: 60000
            }
          });

          const credentialId = this.bufferToBase64url(assertion.rawId);

          btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Verificando...';
          // 2. Verify credentialId matches on server
          const verifyRes = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'webauthn_verify', payload: { nombre: name, credentialId: credentialId } })
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            this.role = 'user';
            this.currentUser = name;
            document.getElementById('nombre').value = name;
            this.completeLogin();
          } else {
            this.showToast(verifyData.error || 'Fallo de autenticación', 'danger');
          }

        } catch (err) {
          console.error(err);
          this.showToast('Autenticación cancelada o fallida.', 'danger');
        }

      } else {
        // --- REGISTRATION FLOW ---
        const wantsToRegister = confirm(`Hola ${name}. No tienes un dispositivo registrado.\n\nPara proteger tu acceso, necesitamos registrar este dispositivo. El sistema usará tu huella, FaceID o PIN de Windows/celular.\n\n¿Deseas registrar este dispositivo ahora?`);
        if (!wantsToRegister) {
          this.showToast('Registro cancelado.', 'info');
          return;
        }

        try {
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge: this.base64urlToBuffer(checkData.challenge),
              rp: {
                name: 'Sistema de Horas Extra',
                ...(window.location.hostname ? { id: window.location.hostname } : {})
              },
              user: {
                id: this.base64urlToBuffer(this.bufferToBase64url(new TextEncoder().encode(name))),
                name: name,
                displayName: name
              },
              pubKeyCredParams: [
                { type: 'public-key', alg: -7 }, // ES256
                { type: 'public-key', alg: -257 } // RS256
              ],
              authenticatorSelection: {
                authenticatorAttachment: 'platform', // Prefer built-in authenticators
                userVerification: 'required' // Force PIN/Biometric
              },
              timeout: 60000,
              attestation: 'none'
            }
          });

          const credentialId = this.bufferToBase64url(credential.rawId);

          btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...';
          // Save credential ID to server
          const regRes = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'webauthn_register', payload: { nombre: name, credentialId: credentialId } })
          });
          const regData = await regRes.json();

          if (regData.success) {
            this.showToast('¡Dispositivo registrado exitosamente!', 'success');
            this.role = 'user';
            this.currentUser = name;
            document.getElementById('nombre').value = name;
            this.completeLogin();
          } else {
            this.showToast(regData.error || 'Error al guardar credencial', 'danger');
          }

        } catch (err) {
          console.error(err);
          this.showToast('Registro cancelado o dispositivo no compatible.', 'danger');
        }
      }

    } catch (error) {
      console.error(error);
      this.showToast('Error de conexión con el servidor', 'danger');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  // --- WebAuthn Helpers ---
  bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const charCode of bytes) {
      str += String.fromCharCode(charCode);
    }
    const base64String = btoa(str);
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },

  base64urlToBuffer(base64url) {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
  },

  completeLogin() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('appContent').classList.remove('d-none');
    document.getElementById('mainNav').classList.remove('d-none');

    document.getElementById('roleBadge').innerText = 'Hola, ' + this.currentUser;
    document.getElementById('roleBadge').className = this.role === 'admin' ? 'badge bg-danger text-white px-3 py-2 border rounded-pill' : 'badge bg-primary text-white px-3 py-2 border rounded-pill';

    this.loadData();
    this.updateView();
  },

  logout() {
    this.role = null;
    this.currentUser = null;
    this.data = [];
    document.getElementById('loginScreen').classList.remove('d-none');
    document.getElementById('appContent').classList.add('d-none');
    document.getElementById('mainNav').classList.add('d-none');
    document.getElementById('loginForm').reset();
  },

  updateView() {
    if (this.role === 'admin') {
      document.getElementById('userView').classList.add('d-none');
      document.getElementById('adminView').classList.remove('d-none');
    } else {
      document.getElementById('adminView').classList.add('d-none');
      document.getElementById('userView').classList.remove('d-none');
    }
  },

  // Removed saveApiUrl as it's hardcoded now

  showToast(message, type = 'info') {
    document.getElementById('toastMessage').innerText = message;
    const icon = document.getElementById('toastIcon');
    const toastEl = document.getElementById('liveToast');

    toastEl.className = 'toast border-0 shadow align-items-center text-bg-' + type;

    if (type === 'success') icon.className = 'bi bi-check-circle-fill';
    else if (type === 'danger') icon.className = 'bi bi-exclamation-triangle-fill';
    else icon.className = 'bi bi-info-circle-fill';

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  },

  // --- API Calls ---

  async loadData() {
    if (!this.apiUrl) return;

    this.showLoader(true);
    try {
      const response = await fetch(this.apiUrl);
      const resData = await response.json();

      if (resData.success) {
        this.data = resData.data;
        this.renderTables();
        this.updateStats();
      } else {
        this.showToast('Error: ' + resData.error, 'danger');
      }
    } catch (error) {
      console.error(error);
      this.showToast('Error de conexión. Verifica la URL de la API.', 'danger');
    } finally {
      this.showLoader(false);
    }
  },

  async submitRecord() {
    const submitBtn = document.getElementById('submitBtn');
    const loader = document.getElementById('submitLoader');
    const file = document.getElementById('creacionFirma').files[0];

    submitBtn.disabled = true;
    loader.classList.remove('d-none');

    let base64 = '';
    if (file) {
      base64 = await this.compressImage(file);
    }

    const payload = {
      nombre: document.getElementById('nombre').value,
      apellido: document.getElementById('apellido').value,
      area: document.getElementById('area').value,
      horas: document.getElementById('horas').value,
      fecha: document.getElementById('fecha').value,
      motivo: document.getElementById('motivo').value,
      firma_img: base64
    };

    submitBtn.disabled = true;
    loader.classList.remove('d-none');

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'create', payload: payload })
      });

      const resData = await response.json();

      if (resData.success) {
        this.showToast('Solicitud enviada exitosamente', 'success');
        document.getElementById('recordForm').reset();

        // Reset date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('fecha').value = today;

        // Hide Modal
        bootstrap.Modal.getInstance(document.getElementById('newRecordModal')).hide();

        this.loadData();
      } else {
        this.showToast('Error al enviar: ' + resData.error, 'danger');
      }
    } catch (error) {
      console.error(error);
      this.showToast('Error de conexión', 'danger');
    } finally {
      submitBtn.disabled = false;
      loader.classList.add('d-none');
    }
  },

  async updateStatus(id, newStatus) {
    if (!confirm(`¿Estás seguro de cambiar el estado a ${newStatus}?`)) return;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_status', payload: { id, estado: newStatus } })
      });

      const resData = await response.json();

      if (resData.success) {
        this.showToast('Estado actualizado', 'success');

        // Update local data optimistically
        const item = this.data.find(d => d.id === id);
        if (item) item.estado = newStatus;
        this.renderTables();
        this.updateStats();
      } else {
        this.showToast('Error: ' + resData.error, 'danger');
      }
    } catch (error) {
      this.showToast('Error de conexión', 'danger');
    }
  },

  viewSignature(imgSrc) {
    document.getElementById('fullSizeImage').src = imgSrc;
    new bootstrap.Modal(document.getElementById('imageViewerModal')).show();
  },

  viewDetails(id) {
    const item = this.data.find(d => d.id === id);
    if (!item) return;

    document.getElementById('detailNombre').innerText = item.nombre + ' ' + item.apellido;
    document.getElementById('detailArea').innerText = item.area;
    document.getElementById('detailHoras').innerText = item.horas + ' h';
    document.getElementById('detailFecha').innerText = this.formatDate(item.fecha);
    document.getElementById('detailEstado').innerHTML = this.getStatusBadgeHTML(item.estado);
    document.getElementById('detailMotivo').innerText = item.motivo;

    new bootstrap.Modal(document.getElementById('detailsModal')).show();
  },

  compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 250;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  async deleteRecord(id) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', payload: { id } })
      });

      const resData = await response.json();

      if (resData.success) {
        this.showToast('Registro eliminado', 'success');
        this.data = this.data.filter(d => d.id !== id);
        this.renderTables();
        this.updateStats();
      } else {
        this.showToast('Error: ' + resData.error, 'danger');
      }
    } catch (error) {
      this.showToast('Error de conexión', 'danger');
    }
  },

  // --- UI Rendering ---

  showLoader(show) {
    if (this.role === 'admin') {
      const loader = document.getElementById('adminLoader');
      const table = document.getElementById('adminTable').parentElement;
      if (show) { loader.classList.remove('d-none'); table.classList.add('d-none'); }
      else { loader.classList.add('d-none'); table.classList.remove('d-none'); }
    } else {
      const loader = document.getElementById('userLoader');
      const table = document.getElementById('userTable').parentElement;
      if (show) { loader.classList.remove('d-none'); table.classList.add('d-none'); }
      else { loader.classList.add('d-none'); table.classList.remove('d-none'); }
    }
  },

  renderTables() {
    this.renderUserTable();
    if (this.role === 'admin') {
      this.renderAdminTable();
    }
  },

  getStatusBadgeHTML(status) {
    const s = status ? status.toLowerCase() : 'pendiente';
    return `
      <span class="status-badge status-${s}">
        <span class="status-dot"></span>
        ${s}
      </span>
    `;
  },

  getSignedHTML(item) {
    const isSigned = (item.firmado === 'si' || item.firmado === 'Sí');
    // For admin, we primarily care about the signature image uploaded by user
    const imgHtml = item.firma_img
      ? `<div class="mt-2 text-center" style="cursor: pointer;" onclick="app.viewSignature('${item.firma_img}')" title="Haz clic para ver firma completa">
           <span class="small text-muted d-block fw-bold" style="font-size:0.65rem; text-transform:uppercase;"><i class="bi bi-search"></i> Firma Adjunta</span>
           <img src="${item.firma_img}" style="max-height: 40px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); background: white;" class="shadow-sm">
         </div>`
      : `<div class="text-nowrap mt-1"><i class="bi bi-circle unsigned-x"></i> <span class="small text-muted ms-1">No Firmado</span></div>`;

    return `<div class="d-flex flex-column align-items-center">${imgHtml}</div>`;
  },

  renderUserTable() {
    const tbody = document.getElementById('userTableBody');
    const emptyState = document.getElementById('userEmpty');

    // Filter data by currentUser for User Role
    const userSpecificData = this.data.filter(item =>
      item.nombre.toLowerCase().includes(this.currentUser.toLowerCase())
    );

    const reversedData = [...userSpecificData].reverse();

    if (reversedData.length === 0) {
      tbody.innerHTML = '';
      emptyState.classList.remove('d-none');
      return;
    }

    emptyState.classList.add('d-none');

    tbody.innerHTML = reversedData.map(item => `
      <tr>
        <td>
          <div class="fw-semibold">${item.nombre} ${item.apellido}</div>
          <div class="small text-muted">${item.id ? item.id.substring(0, 8) : ''}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${item.area}</span></td>
        <td class="fw-bold">${item.horas} h</td>
        <td>${this.formatDate(item.fecha)}</td>
        <td class="small text-muted text-truncate" style="max-width: 150px; cursor: pointer; text-decoration: underline; text-decoration-color: #dee2e6;" onclick="app.viewDetails('${item.id}')" title="Clic para ver detalle completo">${item.motivo}</td>
        <td>${this.getStatusBadgeHTML(item.estado)}</td>
        <td>${this.getSignedHTML(item)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-light text-danger" onclick="app.deleteRecord('${item.id}')" title="Eliminar registro" ${item.estado.toLowerCase() !== 'pendiente' ? 'disabled' : ''}>
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    const emptyState = document.getElementById('adminEmpty');

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value.toLowerCase();

    const filteredData = this.data.filter(item => {
      const matchesSearch = (item.nombre + ' ' + item.apellido + ' ' + item.area + ' ' + item.motivo).toLowerCase().includes(searchTerm);
      const matchesStatus = statusFilter === '' ? true : (item.estado || '').toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    }).reverse();

    if (filteredData.length === 0) {
      tbody.innerHTML = '';
      emptyState.classList.remove('d-none');
      return;
    }

    emptyState.classList.add('d-none');

    tbody.innerHTML = filteredData.map(item => {
      const isSigned = (item.firmado === 'si');

      return `
      <tr>
        <td>
          <div class="fw-semibold">${item.nombre} ${item.apellido}</div>
          <div class="small text-muted">Sol: ${this.formatDate(item.fecha_creacion, true)}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${item.area}</span></td>
        <td class="fw-bold">${item.horas} h</td>
        <td>${this.formatDate(item.fecha)}</td>
        <td class="small text-muted text-truncate" style="max-width: 150px; cursor: pointer; text-decoration: underline; text-decoration-color: #dee2e6;" onclick="app.viewDetails('${item.id}')" title="Clic para ver detalle completo">${item.motivo}</td>
        <td>
          <div class="dropdown">
            <button class="btn btn-sm btn-light border dropdown-toggle w-100 text-start" type="button" data-bs-toggle="dropdown">
              ${this.getStatusBadgeHTML(item.estado)}
            </button>
            <ul class="dropdown-menu shadow-sm">
              <li><button class="dropdown-item text-warning" onclick="app.updateStatus('${item.id}', 'pendiente')"><i class="bi bi-clock me-2"></i>Pendiente</button></li>
              <li><button class="dropdown-item text-success" onclick="app.updateStatus('${item.id}', 'aprobado')"><i class="bi bi-check-circle me-2"></i>Aprobar</button></li>
              <li><button class="dropdown-item text-danger" onclick="app.updateStatus('${item.id}', 'rechazado')"><i class="bi bi-x-circle me-2"></i>Rechazar</button></li>
            </ul>
          </div>
        </td>
        <td class="text-center align-middle">
          ${item.firma_img ? `<button class="btn btn-sm btn-light text-primary fw-bold" title="Ver Firma" onclick="app.viewSignature('${item.firma_img}')"><i class="bi bi-eye"></i> Ver Firma</button>` : `<span class="small text-muted fst-italic">Sin firma</span>`}
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-light text-danger" onclick="app.deleteRecord('${item.id}')" title="Eliminar registro">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `}).join('');
  },

  updateStats() {
    document.getElementById('statTotal').innerText = this.data.length;
    document.getElementById('statPendiente').innerText = this.data.filter(d => (d.estado || '').toLowerCase() === 'pendiente').length;
    document.getElementById('statAprobado').innerText = this.data.filter(d => (d.estado || '').toLowerCase() === 'aprobado').length;
    document.getElementById('statRechazado').innerText = this.data.filter(d => (d.estado || '').toLowerCase() === 'rechazado').length;
  },

  formatDate(dateString, includeTime = false) {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString; // fallback

      const datePart = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      if (includeTime) {
        return datePart + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      }
      return datePart;
    } catch (e) {
      return dateString;
    }
  },

  exportToCSV() {
    if (this.data.length === 0) {
      this.showToast('No hay datos para exportar', 'danger');
      return;
    }

    // Get headers
    const headers = Object.keys(this.data[0]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...this.data.map(row => headers.map(fieldName => {
        let cell = row[fieldName] === null || row[fieldName] === undefined ? '' : String(row[fieldName]);
        // Escape quotes and wrap in quotes if contains comma
        cell = cell.replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `horas_extra_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  createOrbs() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    container.innerHTML = ''; // Limpiar si existe canvas

    const dropCount = 40; // Number of floating particles
    for (let i = 0; i < dropCount; i++) {
      const orb = document.createElement('div');
      orb.classList.add('particle');
      // Randomize position, speed, and delay
      orb.style.left = `${Math.random() * 100}vw`;
      orb.style.animationDuration = `${10 + Math.random() * 15}s`;
      orb.style.animationDelay = `${Math.random() * 10}s`;
      // Randomize size slightly
      const size = Math.random() * 4 + 3;
      orb.style.width = `${size}px`;
      orb.style.height = `${size}px`;
      orb.style.opacity = Math.random() * 0.6 + 0.2;
      container.appendChild(orb);
    }
  }
};

// Initialize after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  app.init();
  app.createOrbs();
});
