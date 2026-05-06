/**
 * OVOPACIFIC - Gestión de Horas Extra
 * Versión Refactorizada y Optimizada
 */

const app = {
  // ==========================================
  // 1. CONFIGURACIÓN Y ESTADO
  // ==========================================
  config: {
    apiUrl: 'https://script.google.com/macros/s/AKfycby1FsCAwl01GH-Xf1BpLBz6cvmQ0AAvNsMd_8THACGirerJVVSFMIZTkdpBlzR3h1NN/exec'
  },

  state: {
    data: [],
    loginMode: 'user',
    role: null,
    currentUser: null,
    sessionToken: null
  },

  // Caché de elementos del DOM para rendimiento
  el: {},

  // ==========================================
  // 2. INICIALIZACIÓN
  // ==========================================
  init() {
    this.cacheElements();
    this.setupEventListeners();
    
    // Inicialización de UI
    setTimeout(() => this.init3DLogin(), 100);
    this.initWaterRipple();
    this.initCustomCursor();
    this.createOrbs();

    // Fecha por defecto
    if (this.el.fechaInput) {
      this.el.fechaInput.value = new Date().toISOString().split('T')[0];
    }
  },

  cacheElements() {
    this.el = {
      loginForm: document.getElementById('loginForm'),
      recordForm: document.getElementById('recordForm'),
      searchInput: document.getElementById('searchInput'),
      statusFilter: document.getElementById('statusFilter'),
      fechaInput: document.getElementById('fecha'),
      loginScreen: document.getElementById('loginScreen'),
      appContent: document.getElementById('appContent'),
      mainNav: document.getElementById('mainNav'),
      roleBadge: document.getElementById('roleBadge'),
      userTableBody: document.getElementById('userTableBody'),
      adminTableBody: document.getElementById('adminTableBody'),
      userLoader: document.getElementById('userLoader'),
      adminLoader: document.getElementById('adminLoader'),
      userEmpty: document.getElementById('userEmpty'),
      adminEmpty: document.getElementById('adminEmpty'),
      statTotal: document.getElementById('statTotal'),
      statPendiente: document.getElementById('statPendiente'),
      statAprobado: document.getElementById('statAprobado'),
      statRechazado: document.getElementById('statRechazado')
    };
  },

  setupEventListeners() {
    this.el.loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });

    this.el.recordForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitRecord();
    });

    this.el.searchInput?.addEventListener('input', () => this.renderAdminTable());
    this.el.statusFilter?.addEventListener('change', () => this.renderAdminTable());
  },

  // ==========================================
  // 3. AUTENTICACIÓN
  // ==========================================
  switchLoginTab(mode) {
    this.state.loginMode = mode;
    document.getElementById('btnTabUser').classList.toggle('active', mode === 'user');
    document.getElementById('btnTabAdmin').classList.toggle('active', mode === 'admin');
    document.getElementById('userLoginFields').classList.toggle('d-none', mode === 'admin');
    document.getElementById('adminLoginFields').classList.toggle('d-none', mode === 'user');
  },

  async login() {
    const btn = document.querySelector('.login-btn');
    const originalText = btn.innerHTML;
    
    try {
      this.setLoading(btn, true, 'Verificando...');

      if (this.state.loginMode === 'admin') {
        const user = document.getElementById('adminUser').value;
        const pass = document.getElementById('adminPass').value;

        const response = await this.fetchAPI('login_admin', { password: pass });
        if (response.success && user === 'admin') {
          this.state.role = 'admin';
          this.state.currentUser = 'Administrador';
          this.state.sessionToken = response.token;
          this.completeLogin();
        } else {
          this.showToast('Contraseña de administrador incorrecta', 'danger');
        }
      } else {
        const name = document.getElementById('loginName').value.trim();
        const pass = document.getElementById('loginPass').value.trim();
        
        if (!name || !pass) {
          this.showToast('Ingresa nombre y contraseña', 'warning');
          return;
        }

        const res = await this.fetchAPI('login_user_password', { nombre: name, password: pass });
        if (res.success) {
          this.state.role = 'user';
          this.state.currentUser = name;
          this.state.sessionToken = res.token;
          document.getElementById('nombre').value = name;
          this.completeLogin();
        } else {
          this.showToast(res.error || 'Acceso denegado', 'danger');
        }
      }
    } catch (error) {
      this.showToast('Error de conexión', 'danger');
    } finally {
      this.setLoading(btn, false, originalText);
    }
  },

  completeLogin() {
    this.el.loginScreen.classList.add('d-none');
    this.el.appContent.classList.remove('d-none');
    this.el.mainNav.classList.remove('d-none');
    
    this.el.roleBadge.innerText = `Hola, ${this.state.currentUser}`;
    this.el.roleBadge.className = `badge bg-light text-primary py-2 px-3 border rounded-pill`;
    
    this.loadData();
    this.updateUIByRole();
  },

  logout() {
    this.state.role = null;
    this.state.sessionToken = null;
    this.state.data = [];
    this.el.loginScreen.classList.remove('d-none');
    this.el.appContent.classList.add('d-none');
    this.el.mainNav.classList.add('d-none');
    this.el.loginForm.reset();
  },

  // ==========================================
  // 4. GESTIÓN DE DATOS
  // ==========================================
  async loadData() {
    this.toggleLoader(true);
    try {
      const res = await this.fetchAPI('load_data', { token: this.state.sessionToken });
      if (res.success) {
        this.state.data = res.data;
        this.renderTables();
        this.updateStats();
      }
    } catch (e) {
      this.showToast('Error al cargar datos', 'danger');
    } finally {
      this.toggleLoader(false);
    }
  },

  async submitRecord() {
    const btn = document.getElementById('submitBtn');
    const file = document.getElementById('creacionFirma').files[0];
    const originalText = btn.innerHTML;

    this.setLoading(btn, true, 'Enviando...');
    
    try {
      let base64 = file ? await this.compressImage(file) : '';
      const payload = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        area: document.getElementById('area').value,
        horas: document.getElementById('horas').value,
        fecha: document.getElementById('fecha').value,
        motivo: document.getElementById('motivo').value,
        firma_img: base64,
        token: this.state.sessionToken
      };

      const res = await this.fetchAPI('create', payload);
      if (res.success) {
        this.showToast('Solicitud enviada', 'success');
        this.el.recordForm.reset();
        this.el.fechaInput.value = new Date().toISOString().split('T')[0];
        bootstrap.Modal.getInstance(document.getElementById('newRecordModal')).hide();
        this.loadData();
      } else {
        this.showToast(res.error, 'danger');
      }
    } catch (e) {
      this.showToast('Error al enviar', 'danger');
    } finally {
      this.setLoading(btn, false, originalText);
    }
  },

  async updateStatus(id, newStatus) {
    if (!confirm(`¿Cambiar estado a ${newStatus}?`)) return;

    try {
      const res = await this.fetchAPI('update_status', { id, estado: newStatus, token: this.state.sessionToken });
      if (res.success) {
        this.showToast('Estado actualizado', 'success');
        const item = this.state.data.find(d => d.id === id);
        if (item) {
          item.estado = newStatus;
          this.updateStatusCell(id, newStatus);
          this.updateStats();
        }
      }
    } catch (e) {
      this.showToast('Error en servidor', 'danger');
    }
  },

  async deleteRecord(id) {
    if (!confirm('¿Eliminar este registro definitivamente?')) return;

    try {
      const res = await this.fetchAPI('delete', { id, token: this.state.sessionToken });
      if (res.success) {
        this.showToast('Registro eliminado', 'success');
        this.state.data = this.state.data.filter(d => d.id !== id);
        this.renderTables();
        this.updateStats();
      }
    } catch (e) {
      this.showToast('Error al eliminar', 'danger');
    }
  },

  // ==========================================
  // 5. RENDERIZADO
  // ==========================================
  updateUIByRole() {
    const isVisible = (id, show) => document.getElementById(id).classList.toggle('d-none', !show);
    isVisible('adminView', this.state.role === 'admin');
    isVisible('userView', this.state.role !== 'admin');
  },

  renderTables() {
    this.renderUserTable();
    if (this.state.role === 'admin') this.renderAdminTable();
  },

  renderUserTable() {
    const data = this.state.data
      .filter(item => item.nombre.toLowerCase().includes(this.state.currentUser.toLowerCase()))
      .reverse();

    this.el.userEmpty.classList.toggle('d-none', data.length > 0);
    this.el.userTableBody.innerHTML = data.map(item => `
      <tr>
        <td>
          <div class="fw-semibold">${this.escapeHTML(item.nombre)} ${this.escapeHTML(item.apellido)}</div>
          <div class="small text-muted">${item.id ? item.id.substring(0, 8) : ''}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${this.escapeHTML(item.area)}</span></td>
        <td class="fw-bold">${this.escapeHTML(item.horas)} h</td>
        <td>${this.escapeHTML(this.formatDate(item.fecha))}</td>
        <td class="small text-muted text-truncate" style="max-width: 150px; cursor: pointer; text-decoration: underline;" onclick="app.viewDetails('${item.id}')">${this.escapeHTML(item.motivo)}</td>
        <td>${this.getStatusBadgeHTML(item.estado)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-light text-danger" onclick="app.deleteRecord('${item.id}')" ${item.estado.toLowerCase() !== 'pendiente' ? 'disabled' : ''}>
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  renderAdminTable() {
    const search = this.el.searchInput.value.toLowerCase();
    const filter = this.el.statusFilter.value.toLowerCase();

    const filtered = this.state.data.filter(item => {
      const matchSearch = (item.nombre + ' ' + item.apellido + ' ' + item.area).toLowerCase().includes(search);
      const matchStatus = filter === '' || (item.estado || '').toLowerCase() === filter;
      return matchSearch && matchStatus;
    }).reverse();

    this.el.adminEmpty.classList.toggle('d-none', filtered.length > 0);
    this.el.adminTableBody.innerHTML = filtered.map(item => `
      <tr id="row-${item.id}">
        <td>
          <div class="fw-semibold">${this.escapeHTML(item.nombre)} ${this.escapeHTML(item.apellido)}</div>
          <div class="small text-muted">Sol: ${this.formatDate(item.fecha_creacion, true)}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${this.escapeHTML(item.area)}</span></td>
        <td class="fw-bold">${this.escapeHTML(item.horas)} h</td>
        <td>${this.escapeHTML(this.formatDate(item.fecha))}</td>
        <td class="small text-muted text-truncate" style="max-width: 150px; cursor: pointer; text-decoration: underline;" onclick="app.viewDetails('${item.id}')">${this.escapeHTML(item.motivo)}</td>
        <td id="status-cell-${item.id}">${this.getAdminStatusHTML(item.id, item.estado)}</td>
        <td class="text-center">
          ${item.firma_img ? `<button class="btn btn-sm btn-light text-primary" onclick="app.viewSignature('${item.id}')"><i class="bi bi-eye"></i></button>` : '<span class="small text-muted">No</span>'}
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-light text-danger" onclick="app.deleteRecord('${item.id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  },

  updateStatusCell(id, status) {
    const cell = document.getElementById(`status-cell-${id}`);
    if (cell) {
      cell.innerHTML = this.getAdminStatusHTML(id, status);
      const row = document.getElementById(`row-${id}`);
      row?.classList.add('row-update');
      setTimeout(() => row?.classList.remove('row-update'), 1000);
    }
  },

  getAdminStatusHTML(id, status) {
    return `
      <div class="dropdown">
        <button class="btn btn-sm btn-light border dropdown-toggle w-100 text-start" data-bs-toggle="dropdown" data-bs-boundary="viewport">
          ${this.getStatusBadgeHTML(status)}
        </button>
        <ul class="dropdown-menu shadow">
          <li><button class="dropdown-item text-warning" onclick="app.updateStatus('${id}', 'pendiente')">Pendiente</button></li>
          <li><button class="dropdown-item text-success" onclick="app.updateStatus('${id}', 'aprobado')">Aprobar</button></li>
          <li><button class="dropdown-item text-danger" onclick="app.updateStatus('${id}', 'rechazado')">Rechazar</button></li>
        </ul>
      </div>
    `;
  },

  updateStats() {
    const d = this.state.data;
    this.el.statTotal.innerText = d.length;
    this.el.statPendiente.innerText = d.filter(x => (x.estado || '').toLowerCase() === 'pendiente').length;
    this.el.statAprobado.innerText = d.filter(x => (x.estado || '').toLowerCase() === 'aprobado').length;
    this.el.statRechazado.innerText = d.filter(x => (x.estado || '').toLowerCase() === 'rechazado').length;
  },

  // ==========================================
  // 6. UTILIDADES
  // ==========================================
  async fetchAPI(action, payload) {
    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    return response.json();
  },

  setLoading(btn, loading, text) {
    btn.disabled = loading;
    btn.innerHTML = loading ? `<span class="spinner-border spinner-border-sm me-2"></span>${text}` : text;
  },

  toggleLoader(show) {
    if (this.state.role === 'admin') this.el.adminLoader.classList.toggle('d-none', !show);
    else this.el.userLoader.classList.toggle('d-none', !show);
  },

  showToast(msg, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    document.getElementById('toastMessage').innerText = msg;
    toastEl.className = `toast border-0 shadow align-items-center text-bg-${type}`;
    new bootstrap.Toast(toastEl).show();
  },

  getStatusBadgeHTML(status) {
    const s = (status || 'pendiente').toLowerCase();
    return `<span class="status-badge status-${s}"><span class="status-dot"></span>${s}</span>`;
  },

  formatDate(str, includeTime = false) {
    if (!str) return '';
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const date = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    return includeTime ? `${date} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : date;
  },

  async compressImage(file) {
    return new Promise((resolve) => {
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
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  exportToExcel() {
    if (this.state.data.length === 0) return this.showToast('Sin datos', 'warning');
    const cols = [
      { k: 'nombre', l: 'Nombre' }, { k: 'apellido', l: 'Apellido' },
      { k: 'area', l: 'Área' }, { k: 'horas', l: 'Horas' },
      { k: 'fecha', l: 'Fecha' }, { k: 'motivo', l: 'Motivo' },
      { k: 'estado', l: 'Estado' }
    ];
    const rows = this.state.data.map(i => {
      const r = {};
      cols.forEach(c => r[c.l] = i[c.k]);
      return r;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horas');
    XLSX.writeFile(wb, `Reporte_Horas_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  viewSignature(id) {
    const item = this.state.data.find(x => x.id === id);
    if (item?.firma_img) {
      document.getElementById('fullSizeImage').src = item.firma_img;
      new bootstrap.Modal(document.getElementById('imageViewerModal')).show();
    }
  },

  viewDetails(id) {
    const item = this.state.data.find(x => x.id === id);
    if (!item) return;
    document.getElementById('detailNombre').innerText = `${item.nombre} ${item.apellido}`;
    document.getElementById('detailArea').innerText = item.area;
    document.getElementById('detailHoras').innerText = `${item.horas} h`;
    document.getElementById('detailFecha').innerText = this.formatDate(item.fecha);
    document.getElementById('detailEstado').innerHTML = this.getStatusBadgeHTML(item.estado);
    document.getElementById('detailMotivo').innerText = item.motivo;
    new bootstrap.Modal(document.getElementById('detailsModal')).show();
  },

  // ==========================================
  // 7. EFECTOS VISUALES
  // ==========================================
  init3DLogin() {
    const card = document.querySelector('.login-card');
    const wrap = document.querySelector('.login-card-wrapper');
    if (!card || !wrap) return;
    wrap.onmousemove = (e) => {
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const rx = ((y - r.height/2) / (r.height/2)) * -15;
      const ry = ((x - r.width/2) / (r.width/2)) * 15;
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

  createOrbs() {
    const container = document.getElementById('bg-container');
    for (let i = 0; i < 40; i++) {
      const orb = document.createElement('div');
      orb.className = 'particle';
      orb.style.left = `${Math.random() * 100}vw`;
      orb.style.animationDuration = `${10 + Math.random() * 15}s`;
      orb.style.animationDelay = `${Math.random() * 10}s`;
      container.appendChild(orb);
    }
  },

  base64urlToBuffer: b => Uint8Array.from(atob(b.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer,
  bufferToBase64url: b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
  escapeHTML: s => s ? String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : ''
};

document.addEventListener('DOMContentLoaded', () => app.init());

