/**
 * OVOPACIFIC - Gestión de Horas Extra
 * Versión Refactorizada y Optimizada
 */

const app = {
  // ==========================================
  // 1. CONFIGURACIÓN Y ESTADO
  // ==========================================
  config: {
    apiUrl: 'https://script.google.com/macros/s/AKfycbyAf-ZPADaYNyUM87KQxY_huzyxSJr7CIKePTHCDGjIngqSYRBy_2glPZ8a2FDSJkTb2w/exec'
  },

  state: {
    data: [],
    loginMode: 'user',
    role: null,
    currentUser: null,
    sessionToken: null,
    activeAdminTab: 'hours',
    captchaAnswer: 0,
    failedAttempts: 0,
    inactivityTimer: null,
    users: [],
    auditLogs: [],
    areas: []
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
    this.createParticles();
    this.setupInactivityTimer();

    // Fecha por defecto
    if (this.el.fechaInput) {
      this.el.fechaInput.value = new Date().toISOString().split('T')[0];
    }

    // Verificar si hay una sesión activa guardada
    this.restoreSession();
  },

  restoreSession() {
    const token = sessionStorage.getItem('sessionToken');
    const role = sessionStorage.getItem('role');
    const user = sessionStorage.getItem('currentUser');

    if (token && role && user) {
      this.state.sessionToken = token;
      this.state.role = role;
      this.state.currentUser = user;

      if (document.getElementById('nombre')) {
        document.getElementById('nombre').value = user;
      }

      this.completeLogin();
    }
  },

  cacheElements() {
    this.el = {
      loginForm: document.getElementById('loginForm'),
      recordForm: document.getElementById('recordForm'),
      searchInput: document.getElementById('searchInput'),
      statusFilter: document.getElementById('statusFilter'),
      fechaInput: document.getElementById('fecha'),
      horaInicioInput: document.getElementById('horaInicio'),
      horaFinInput: document.getElementById('horaFin'),
      horasInput: document.getElementById('horas'),
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
      statRechazado: document.getElementById('statRechazado'),
      copiaASelect: document.getElementById('copiaA'),
      copiesTableBody: document.getElementById('copiesTableBody'),
      copiesEmpty: document.getElementById('copiesEmpty'),
      adminPanelAreas: document.getElementById('adminPanelAreas'),
      areasTableBody: document.getElementById('areasTableBody'),
      areasEmpty: document.getElementById('areasEmpty'),
      newAreaForm: document.getElementById('newAreaForm'),
      editAreaForm: document.getElementById('editAreaForm')
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

    document.getElementById('bossApprovalForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitBossApproval();
    });

    // Filtros de horas extra
    this.el.searchInput?.addEventListener('input', () => this.renderAdminTable());
    this.el.statusFilter?.addEventListener('change', () => this.renderAdminTable());

    // Filtros de usuarios y bitácora
    document.getElementById('userSearchInput')?.addEventListener('input', () => this.renderUsersTable());
    document.getElementById('userRoleFilter')?.addEventListener('change', () => this.renderUsersTable());
    document.getElementById('logSearchInput')?.addEventListener('input', () => this.renderLogsTable());

    // Formularios de administración de usuarios
    document.getElementById('newUserForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitNewUser();
    });

    document.getElementById('editUserForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitEditUser();
    });

    document.getElementById('resetUserPasswordForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitResetPassword();
    });

    // Validación de fortaleza de contraseña
    document.getElementById('newPassword')?.addEventListener('input', (e) => {
      this.checkPasswordStrength(e.target.value);
    });

    document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitInitialPasswordChange();
    });

    const calcHoras = () => {
      if (this.el.horaInicioInput && this.el.horaFinInput && this.el.horasInput) {
        if (this.el.horaInicioInput.value && this.el.horaFinInput.value) {
          const [h1, m1] = this.el.horaInicioInput.value.split(':').map(Number);
          const [h2, m2] = this.el.horaFinInput.value.split(':').map(Number);
          let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
          if (diff < 0) diff += 24;

          const totalMinutos = Math.round(diff * 60);
          const h = Math.floor(totalMinutos / 60);
          const m = totalMinutos % 60;

          this.el.horasInput.value = `${h}:${m.toString().padStart(2, '0')}`;
        }
      }
    };

    // Formularios de administración de áreas
    this.el.newAreaForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitNewArea();
    });

    this.el.editAreaForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitEditArea();
    });

    this.el.horaInicioInput?.addEventListener('change', calcHoras);
    this.el.horaFinInput?.addEventListener('change', calcHoras);
  },

  // ==========================================
  // 3. AUTENTICACIÓN
  // ==========================================

  async login() {
    const btn = document.querySelector('.login-btn');
    const originalText = btn.innerHTML;

    try {
      if (this.state.failedAttempts >= 1) {
        const captchaAns = Number(document.getElementById('captchaAnswer').value);
        if (captchaAns !== this.state.captchaAnswer) {
          this.showToast('Respuesta de seguridad incorrecta. Intente de nuevo.', 'danger');
          this.generateCaptcha();
          return;
        }
      }

      this.setLoading(btn, true, 'Verificando...');

      const name = document.getElementById('loginName').value.trim();
      const pass = document.getElementById('loginPass').value.trim();

      if (!name || !pass) {
        this.showToast('Ingresa nombre y contraseña', 'warning');
        return;
      }

      const res = await this.fetchAPI('login_user_password', { nombre: name, password: pass });
      if (res.success) {
        this.state.failedAttempts = 0;
        document.getElementById('captchaBox').classList.add('d-none');
        document.getElementById('captchaAnswer').removeAttribute('required');

        this.state.role = res.role;
        this.state.currentUser = name;
        this.state.sessionToken = res.token;

        if (document.getElementById('nombre')) {
          document.getElementById('nombre').value = name;
        }

        if (res.cambiar_password) {
          this.showChangePasswordModal();
        } else {
          this.completeLogin();
        }
      } else {
        this.state.failedAttempts++;
        this.showToast(res.error || 'Acceso denegado', 'danger');
        this.generateCaptcha();
      }
    } catch (error) {
      this.showToast('Error de conexión', 'danger');
    } finally {
      this.setLoading(btn, false, originalText);
    }
  },

  generateCaptcha() {
    if (this.state.failedAttempts >= 1) {
      const n1 = Math.floor(Math.random() * 9) + 1;
      const n2 = Math.floor(Math.random() * 9) + 1;
      this.state.captchaAnswer = n1 + n2;

      document.getElementById('captchaQuestion').innerText = `${n1} + ${n2} =`;
      document.getElementById('captchaAnswer').value = '';
      document.getElementById('captchaAnswer').setAttribute('required', 'true');
      document.getElementById('captchaBox').classList.remove('d-none');
    }
  },

  showChangePasswordModal() {
    const modalEl = document.getElementById('changePasswordModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  },

  checkPasswordStrength(pw) {
    const bar = document.getElementById('pwStrengthBar');
    const txt = document.getElementById('pwStrengthText');
    if (!bar || !txt) return;

    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    bar.className = 'progress-bar';
    if (pw.length === 0) {
      bar.style.width = '0%';
      txt.innerText = 'Fortaleza: Muy débil';
    } else if (score <= 2) {
      bar.style.width = '33%';
      bar.classList.add('bg-weak');
      txt.innerText = 'Fortaleza: Débil';
    } else if (score <= 4) {
      bar.style.width = '66%';
      bar.classList.add('bg-fair');
      txt.innerText = 'Fortaleza: Aceptable';
    } else {
      bar.style.width = '100%';
      bar.classList.add('bg-strong');
      txt.innerText = 'Fortaleza: Fuerte';
    }
  },

  async submitInitialPasswordChange() {
    const pw = document.getElementById('newPassword').value;
    const confirmPw = document.getElementById('confirmPassword').value;

    if (pw !== confirmPw) {
      this.showToast('Las contraseñas no coinciden', 'danger');
      return;
    }

    if (pw.length < 8) {
      this.showToast('La contraseña debe tener al menos 8 caracteres', 'warning');
      return;
    }

    // Validar complejidad básica
    if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
      this.showToast('La contraseña debe incluir al menos una mayúscula y un número', 'warning');
      return;
    }

    const btn = document.getElementById('changePasswordSubmitBtn');
    const originalText = btn.innerHTML;
    this.setLoading(btn, true, 'Guardando...');

    try {
      const res = await this.fetchAPI('change_initial_password', {
        token: this.state.sessionToken,
        new_password: pw
      });
      if (res.success) {
        this.showToast('Contraseña actualizada correctamente', 'success');
        bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
        this.completeLogin();
      } else {
        this.showToast(res.error || 'Error al cambiar contraseña', 'danger');
      }
    } catch (e) {
      this.showToast('Error de servidor', 'danger');
    } finally {
      this.setLoading(btn, false, originalText);
    }
  },

  setupInactivityTimer() {
    const resetTimer = () => {
      if (this.state.sessionToken) {
        clearTimeout(this.state.inactivityTimer);
        this.state.inactivityTimer = setTimeout(() => {
          this.showToast('Sesión expirada por inactividad', 'warning');
          this.logout();
        }, 30 * 60 * 1000); // 30 minutos
      }
    };

    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
  },

  completeLogin() {
    this.el.loginScreen.classList.add('d-none');
    this.el.appContent.classList.remove('d-none');
    this.el.mainNav.classList.remove('d-none');

    this.el.roleBadge.innerText = `Hola, ${this.state.currentUser}`;
    this.el.roleBadge.className = `badge bg-light text-primary py-2 px-3 border rounded-pill`;

    // Guardar sesión en sessionStorage para persistir en recargas (F5)
    sessionStorage.setItem('sessionToken', this.state.sessionToken);
    sessionStorage.setItem('role', this.state.role);
    sessionStorage.setItem('currentUser', this.state.currentUser);

    this.loadData();
    this.updateUIByRole();
  },

  logout() {
    clearTimeout(this.state.inactivityTimer);
    this.state.role = null;
    this.state.currentUser = null;
    this.state.sessionToken = null;
    this.state.data = [];
    this.state.users = [];
    this.state.auditLogs = [];
    this.state.failedAttempts = 0;

    // Limpiar sessionStorage
    sessionStorage.removeItem('sessionToken');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('currentUser');

    this.el.loginScreen.classList.remove('d-none');
    this.el.appContent.classList.add('d-none');
    this.el.mainNav.classList.add('d-none');
    this.el.loginForm?.reset();
    document.getElementById('captchaBox').classList.add('d-none');
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
        this.state.employees = res.employees || [];
        this.state.areas = res.areas || [];
        this.populateAreaDropdowns();
        this.populateCopiaSelect();
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
    const originalText = btn.innerHTML;

    this.setLoading(btn, true, 'Enviando...');

    try {
      const payload = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        area: document.getElementById('area').value,
        horas: document.getElementById('horas').value,
        hora_inicio: document.getElementById('horaInicio').value,
        hora_fin: document.getElementById('horaFin').value,
        fecha: document.getElementById('fecha').value,
        motivo: document.getElementById('motivo').value,
        copia_a: document.getElementById('copiaA').value,
        firma_img: '',
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

    const isAdmin = this.state.role === 'admin';
    const isSupervisor = this.state.role === 'supervisor';
    const isUser = this.state.role === 'user' || (!isAdmin && !isSupervisor);

    // El admin ve la vista de administración. El supervisor y los empleados ven la vista de usuario.
    isVisible('adminView', isAdmin);
    isVisible('userView', isUser || isSupervisor);

    const usersTabBtn = document.getElementById('adminTabBtnUsers');
    const areasTabBtn = document.getElementById('adminTabBtnAreas');
    const logsTabBtn = document.getElementById('adminTabBtnLogs');
    if (usersTabBtn) usersTabBtn.classList.toggle('d-none', !isAdmin);
    if (areasTabBtn) areasTabBtn.classList.toggle('d-none', !isAdmin);
    if (logsTabBtn) logsTabBtn.classList.toggle('d-none', !isAdmin);

    // Ocultar la pestaña "Copias de Solicitudes" para el rol de empleado común (user)
    const copiasTabBtn = document.getElementById('tabBtnCopias');
    if (copiasTabBtn) {
      copiasTabBtn.classList.toggle('d-none', this.state.role === 'user');
    }

    if (isUser || isSupervisor) {
      // Si es supervisor y tiene oculta la pestaña de misHoras por defecto o quiere ir directo a copias
      if (isSupervisor) {
        this.switchTab('copias');
      } else {
        this.switchTab('misHoras');
      }
    } else {
      this.switchAdminTab('hours');
    }
  },

  switchTab(tab) {
    const panels = { misHoras: 'tabPanelMisHoras', copias: 'tabPanelCopias' };
    const btns = { misHoras: 'tabBtnMisHoras', copias: 'tabBtnCopias' };
    Object.entries(panels).forEach(([key, id]) => {
      const panel = document.getElementById(id);
      const btn = document.getElementById(btns[key]);
      if (panel) panel.classList.toggle('d-none', key !== tab);
      if (btn) btn.classList.toggle('active', key === tab);
    });
  },

  populateCopiaSelect() {
    if (!this.el.copiaASelect) return;
    const current = (this.state.currentUser || '').toLowerCase();
    const emps = (this.state.employees || []).filter(e => e.toLowerCase() !== current);

    this.el.copiaASelect.innerHTML = '<option value="" selected>Sin copia asignada</option>' +
      emps.map(e => `<option value="${this.escapeHTML(e)}">${this.escapeHTML(e)}</option>`).join('');
  },

  async confirmCopyRead(id, btn) {
    const originalText = btn.innerHTML;
    this.setLoading(btn, true, 'Confirmando...');

    try {
      const res = await this.fetchAPI('confirm_copy_read', { id, token: this.state.sessionToken });
      if (res.success) {
        this.showToast('Lectura confirmada', 'success');
        this.loadData();
      } else {
        this.showToast(res.error || 'Error al confirmar', 'danger');
        this.setLoading(btn, false, originalText);
      }
    } catch (e) {
      this.showToast('Error de conexión', 'danger');
      this.setLoading(btn, false, originalText);
    }
  },

  openBossApprovalModal(id) {
    const item = this.state.data.find(x => x.id === id);
    if (!item) return;

    document.getElementById('bossApproveRecordId').value = item.id;
    document.getElementById('bossApproveEmpleado').innerText = `${item.nombre} ${item.apellido}`;
    document.getElementById('bossApproveFecha').innerText = this.formatDate(item.fecha);
    document.getElementById('bossApproveHoras').innerText = `${this.formatHoras(item.horas)} h`;
    document.getElementById('bossApproveArea').innerText = item.area;

    const fileInput = document.getElementById('bossSignatureFile');
    if (fileInput) fileInput.value = '';

    new bootstrap.Modal(document.getElementById('bossApprovalModal')).show();
  },

  async submitBossApproval() {
    const btn = document.getElementById('bossApproveSubmitBtn');
    const fileInput = document.getElementById('bossSignatureFile');
    const file = fileInput.files[0];
    const id = document.getElementById('bossApproveRecordId').value;
    const originalText = btn.innerHTML;

    if (!file) {
      this.showToast('Por favor, seleccione un archivo de firma', 'warning');
      return;
    }

    this.setLoading(btn, true, 'Procesando...');

    try {
      let base64 = await this.compressImage(file);
      const res = await this.fetchAPI('confirm_copy_read', {
        id,
        token: this.state.sessionToken,
        firma_jefe_img: base64
      });
      if (res.success) {
        this.showToast('Firma y revisión registradas exitosamente', 'success');
        const modalEl = document.getElementById('bossApprovalModal');
        bootstrap.Modal.getInstance(modalEl).hide();
        this.loadData();
      } else {
        this.showToast(res.error || 'Error al registrar la firma', 'danger');
      }
    } catch (e) {
      this.showToast('Error de conexión o al procesar la imagen', 'danger');
    } finally {
      this.setLoading(btn, false, originalText);
    }
  },

  renderTables() {
    this.renderUserTable();
    this.renderCopiesTable();
    if (this.state.role === 'admin') this.renderAdminTable();
  },

  renderUserTable() {
    const currentUserLower = (this.state.currentUser || '').toLowerCase();
    const data = this.state.data
      .filter(item => {
        const nombreLower = (item.nombre || '').toLowerCase();
        return nombreLower.includes(currentUserLower);
      })
      .reverse();

    this.el.userEmpty.classList.toggle('d-none', data.length > 0);
    this.el.userTableBody.innerHTML = data.map(item => `
      <tr>
        <td>
          <div class="fw-semibold">${this.escapeHTML(item.nombre)} ${this.escapeHTML(item.apellido)}</div>
          <div class="small text-muted">${item.id ? item.id.substring(0, 8) : ''}</div>
          ${this.getCopyIndicatorHTML(item.copia_a, item.copia_estado, item.copia_fecha_revision)}
        </td>
        <td><span class="badge bg-light text-dark border">${this.escapeHTML(item.area)}</span></td>
        <td class="fw-bold">
          <div>${this.escapeHTML(this.formatHoras(item.horas))} h</div>
          ${item.hora_inicio && item.hora_fin ? `<div class="small text-muted fw-normal">${this.escapeHTML(this.formatHoras(item.hora_inicio))} - ${this.escapeHTML(this.formatHoras(item.hora_fin))}</div>` : ''}
        </td>
        <td>${this.escapeHTML(this.formatDate(item.fecha))}</td>
        <td class="small text-muted text-truncate" style="max-width: 150px; cursor: pointer; text-decoration: underline;" onclick="app.viewDetails('${item.id}')">${this.escapeHTML(item.motivo)}</td>
        <td>${this.getStatusBadgeHTML(item.estado)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-light text-danger" onclick="app.deleteRecord('${item.id}')" ${(item.estado || '').toLowerCase() !== 'pendiente' ? 'disabled' : ''}>
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  renderCopiesTable() {
    if (!this.el.copiesTableBody) return;
    const current = (this.state.currentUser || '').toLowerCase();
    const copies = this.state.data
      .filter(item => (item.copia_a || '').toLowerCase() === current)
      .reverse();

    // Update badge on tab button
    const badge = document.getElementById('copiasPendienteBadge');
    if (badge) {
      const pending = copies.filter(i => (i.copia_estado || '').toLowerCase() !== 'revisada').length;
      badge.innerText = pending;
      badge.classList.toggle('d-none', pending === 0);
    }

    this.el.copiesEmpty.classList.toggle('d-none', copies.length > 0);

    this.el.copiesTableBody.innerHTML = copies.map(item => {
      const isRevisada = (item.copia_estado || '').toLowerCase() === 'revisada';
      let actionBtn = '';
      if (!isRevisada) {
        actionBtn = `
          <button class="btn-confirm-copy" onclick="app.openBossApprovalModal('${item.id}')">
            <i class="bi bi-shield-check"></i> Aprobar con Firma
          </button>
        `;
      } else {
        actionBtn = `
          <span class="copy-confirmed-badge">
            <i class="bi bi-check-circle-fill"></i> Vista el ${this.escapeHTML(this.formatDate(item.copia_fecha_revision, true))}
          </span>
        `;
      }

      return `
        <tr>
          <td>
            <div class="fw-semibold">${this.escapeHTML(item.nombre)} ${this.escapeHTML(item.apellido)}</div>
            <div class="small text-muted">${item.id ? item.id.substring(0, 8) : ''}</div>
          </td>
          <td><span class="badge bg-light text-dark border">${this.escapeHTML(item.area)}</span></td>
          <td class="fw-bold">
            <div>${this.escapeHTML(this.formatHoras(item.horas))} h</div>
            ${item.hora_inicio && item.hora_fin ? `<div class="small text-muted fw-normal">${this.escapeHTML(this.formatHoras(item.hora_inicio))} - ${this.escapeHTML(this.formatHoras(item.hora_fin))}</div>` : ''}
          </td>
          <td>${this.escapeHTML(this.formatDate(item.fecha))}</td>
          <td class="small text-muted text-truncate" style="max-width: 150px; cursor: pointer; text-decoration: underline;" onclick="app.viewDetails('${item.id}')">${this.escapeHTML(item.motivo)}</td>
          <td>${this.getStatusBadgeHTML(item.estado)}</td>
          <td class="text-end">${actionBtn}</td>
        </tr>
      `;
    }).join('');
  },

  renderAdminTable() {
    const search = this.el.searchInput.value.toLowerCase();
    const filter = this.el.statusFilter.value.toLowerCase();

    const filtered = this.state.data.filter(item => {
      const matchSearch = ((item.nombre || '') + ' ' + (item.apellido || '') + ' ' + (item.area || '')).toLowerCase().includes(search);
      const matchStatus = filter === '' || (item.estado || '').toLowerCase() === filter;
      return matchSearch && matchStatus;
    }).reverse();

    this.el.adminEmpty.classList.toggle('d-none', filtered.length > 0);
    this.el.adminTableBody.innerHTML = filtered.map(item => `
      <tr id="row-${item.id}">
        <td>
          <div class="fw-semibold">${this.escapeHTML(item.nombre)} ${this.escapeHTML(item.apellido)}</div>
          <div class="small text-muted">Sol: ${this.formatDate(item.fecha_creacion, true)}</div>
          ${this.getCopyIndicatorHTML(item.copia_a, item.copia_estado, item.copia_fecha_revision)}
        </td>
        <td><span class="badge bg-light text-dark border">${this.escapeHTML(item.area)}</span></td>
        <td class="fw-bold">
          <div>${this.escapeHTML(this.formatHoras(item.horas))} h</div>
          ${item.hora_inicio && item.hora_fin ? `<div class="small text-muted fw-normal">${this.escapeHTML(this.formatHoras(item.hora_inicio))} - ${this.escapeHTML(this.formatHoras(item.hora_fin))}</div>` : ''}
        </td>
        <td>${this.escapeHTML(this.formatDate(item.fecha))}</td>
        <td class="small text-muted text-truncate" style="max-width: 150px; cursor: pointer; text-decoration: underline;" onclick="app.viewDetails('${item.id}')">${this.escapeHTML(item.motivo)}</td>
        <td id="status-cell-${item.id}">${this.getAdminStatusHTML(item.id, item.estado)}</td>
        <td class="text-center">
          ${item.firma_jefe_img ? `<button class="btn btn-sm btn-light text-success" onclick="app.viewSignature('${item.id}', 'jefe')" title="Ver Firma Jefe"><i class="bi bi-eye"></i></button>` : '<span class="small text-muted">No</span>'}
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
    if (this.state.role !== 'admin') {
      return this.getStatusBadgeHTML(status);
    }
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
    if (this.state.role === 'admin' || this.state.role === 'supervisor') {
      this.el.adminLoader?.classList.toggle('d-none', !show);
    } else {
      this.el.userLoader?.classList.toggle('d-none', !show);
    }
  },

  showToast(msg, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    document.getElementById('toastMessage').innerText = msg;
    toastEl.className = `toast border-0 shadow align-items-center text-bg-${type}`;
    new bootstrap.Toast(toastEl).show();
  },

  getStatusBadgeHTML(status) {
    const s = (status || 'pendiente').toLowerCase();
    const cssClass = s.replace(/\s+/g, '-');
    return `<span class="status-badge status-${cssClass}"><span class="status-dot"></span>${s}</span>`;
  },

  formatDate(str, includeTime = false) {
    if (!str) return '';
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const date = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    return includeTime ? `${date} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : date;
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

  exportToExcel() {
    if (this.state.data.length === 0) return this.showToast('Sin datos', 'warning');
    const cols = [
      { k: 'nombre', l: 'Nombre' }, { k: 'apellido', l: 'Apellido' },
      { k: 'area', l: 'Área' },
      { k: 'hora_inicio', l: 'Hora Inicio' }, { k: 'hora_fin', l: 'Hora Fin' },
      { k: 'horas', l: 'Horas' },
      { k: 'fecha', l: 'Fecha' }, { k: 'motivo', l: 'Motivo' },
      { k: 'estado', l: 'Estado' }
    ];
    const rows = this.state.data.map(i => {
      const r = {};
      cols.forEach(c => {
        let val = i[c.k];
        // Formateo específico para Excel
        if (c.k === 'fecha' || c.k === 'fecha_creacion') {
          if (val && typeof val === 'string' && val.includes('T')) {
            val = val.split('T')[0]; // Extrae solo YYYY-MM-DD
            const [y, m, d] = val.split('-');
            val = `${d}/${m}/${y}`; // Formato DD/MM/AAAA
          } else {
            val = this.formatDate(val);
          }
        } else if (c.k === 'horas' || c.k === 'hora_inicio' || c.k === 'hora_fin') {
          val = this.formatHoras(val);
        }
        r[c.l] = val;
      });
      return r;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horas');
    XLSX.writeFile(wb, `Reporte_Horas_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  viewSignature(id, type = 'empleado') {
    const item = this.state.data.find(x => x.id === id);
    const src = type === 'empleado' ? item?.firma_img : item?.firma_jefe_img;
    if (src) {
      document.getElementById('fullSizeImage').src = src;
      new bootstrap.Modal(document.getElementById('imageViewerModal')).show();
    }
  },

  viewSignatureDirect(src) {
    if (src) {
      document.getElementById('fullSizeImage').src = src;
      new bootstrap.Modal(document.getElementById('imageViewerModal')).show();
    }
  },

  viewDetails(id) {
    const item = this.state.data.find(x => x.id === id);
    if (!item) return;
    document.getElementById('detailNombre').innerText = `${item.nombre} ${item.apellido}`;
    document.getElementById('detailArea').innerText = item.area;
    document.getElementById('detailHoras').innerText = `${this.formatHoras(item.horas)} h`;
    const rangoEl = document.getElementById('detailRangoHoras');
    if (rangoEl) {
      if (item.hora_inicio && item.hora_fin) {
        rangoEl.innerText = `${this.formatHoras(item.hora_inicio)} a ${this.formatHoras(item.hora_fin)}`;
        rangoEl.style.display = 'block';
      } else {
        rangoEl.style.display = 'none';
      }
    }
    document.getElementById('detailFecha').innerText = this.formatDate(item.fecha);
    document.getElementById('detailEstado').innerHTML = this.getStatusBadgeHTML(item.estado);
    document.getElementById('detailMotivo').innerText = item.motivo;

    const copiaA = document.getElementById('detailCopiaA');
    const copiaEstado = document.getElementById('detailCopiaEstado');
    const copiaFecha = document.getElementById('detailCopiaFecha');

    if (item.copia_a) {
      copiaA.innerText = item.copia_a;
      const estado = (item.copia_estado || '').toLowerCase();
      if (estado === 'revisada') {
        copiaEstado.innerHTML = `<span>✓ Revisada</span>`;
        copiaFecha.innerText = `${this.formatDate(item.copia_fecha_revision, true)}`;
        copiaFecha.style.display = 'block';
      } else {
        copiaEstado.innerHTML = `<span>⏳ Pendiente de revisión</span>`;
        copiaFecha.style.display = 'none';
      }
    } else {
      copiaA.innerHTML = `<span class="text-muted">Ninguno</span>`;
      copiaEstado.innerHTML = `<span>🚫 Sin copia asignada</span>`;
      copiaFecha.style.display = 'none';
    }

    const isAdm = this.state.role === 'admin';
    const firmasSec = document.getElementById('detailFirmasSeccion');

    if (firmasSec) {
      if (isAdm) {
        firmasSec.style.display = 'flex';

        const imgEmp = document.getElementById('detailFirmaEmpleado');
        const noneEmp = document.getElementById('detailFirmaEmpleadoNone');
        if (item.firma_img) {
          imgEmp.src = item.firma_img;
          imgEmp.style.display = 'block';
          imgEmp.onclick = () => this.viewSignatureDirect(item.firma_img);
          noneEmp.style.display = 'none';
        } else {
          imgEmp.style.display = 'none';
          noneEmp.style.display = 'block';
        }

        const imgJefe = document.getElementById('detailFirmaJefe');
        const noneJefe = document.getElementById('detailFirmaJefeNone');
        if (item.firma_jefe_img) {
          imgJefe.src = item.firma_jefe_img;
          imgJefe.style.display = 'block';
          imgJefe.onclick = () => this.viewSignatureDirect(item.firma_jefe_img);
          noneJefe.style.display = 'none';
        } else {
          imgJefe.style.display = 'none';
          noneJefe.style.display = 'block';
        }
      } else {
        firmasSec.style.display = 'none';
      }
    }

    new bootstrap.Modal(document.getElementById('detailsModal')).show();
  },

  getCopyIndicatorHTML(copia_a, copia_estado, copia_fecha_revision) {
    if (!copia_a) {
      return `<span class="copy-indicator copy-indicator-none">🚫 Sin copia asignada</span>`;
    }
    const estado = (copia_estado || '').toLowerCase();
    if (estado === 'revisada') {
      return `<span class="copy-indicator copy-indicator-revisada" title="Revisada el ${this.escapeHTML(this.formatDate(copia_fecha_revision, true))}">✓ Revisada · ${this.escapeHTML(copia_a)}</span>`;
    }
    return `<span class="copy-indicator copy-indicator-pendiente">⏳ Pendiente · ${this.escapeHTML(copia_a)}</span>`;
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
    container.innerHTML = '';

    // Creamos 6 esferas gigantes para el efecto Glassmorphism
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'glass-sphere';

      // Posiciones aleatorias
      p.style.left = `${Math.random() * 80}vw`;
      p.style.top = `${Math.random() * 80}vh`;

      // Tamaños enormes (entre 200px y 500px)
      const size = 200 + Math.random() * 300;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;

      // Animación súper suave y lenta
      p.style.animationDuration = `${15 + Math.random() * 15}s`;
      p.style.animationDelay = `-${Math.random() * 10}s`; // Tiempo negativo para que ya estén desfasadas

      container.appendChild(p);
    }
  },

  // ==========================================
  // 8. ADMINISTRACIÓN DE USUARIOS
  // ==========================================
  switchAdminTab(tab) {
    this.state.activeAdminTab = tab;

    // Toggle active state on buttons
    document.getElementById('adminTabBtnHours').classList.toggle('active', tab === 'hours');
    document.getElementById('adminTabBtnUsers').classList.toggle('active', tab === 'users');
    document.getElementById('adminTabBtnAreas')?.classList.toggle('active', tab === 'areas');
    document.getElementById('adminTabBtnLogs').classList.toggle('active', tab === 'logs');

    // Toggle active panels
    document.getElementById('adminPanelHours').classList.toggle('d-none', tab !== 'hours');
    document.getElementById('adminPanelUsers').classList.toggle('d-none', tab !== 'users');
    document.getElementById('adminPanelAreas')?.classList.toggle('d-none', tab !== 'areas');
    document.getElementById('adminPanelLogs').classList.toggle('d-none', tab !== 'logs');

    if (tab === 'users') {
      this.loadUsers();
    } else if (tab === 'logs') {
      this.loadAuditLogs();
    } else if (tab === 'areas') {
      this.renderAreasTable();
    }
  },

  async loadUsers() {
    const loader = document.getElementById('usersLoader');
    const empty = document.getElementById('usersEmpty');
    loader.classList.remove('d-none');
    empty.classList.add('d-none');
    document.getElementById('usersTableBody').innerHTML = '';

    try {
      const res = await this.fetchAPI('load_users', { token: this.state.sessionToken });
      if (res.success) {
        this.state.users = res.users;
        this.renderUsersTable();
      } else {
        this.showToast(res.error || 'Error al cargar usuarios', 'danger');
      }
    } catch (e) {
      this.showToast('Error de conexión', 'danger');
    } finally {
      loader.classList.add('d-none');
    }
  },

  renderUsersTable() {
    const search = (document.getElementById('userSearchInput').value || '').toLowerCase();
    const filter = (document.getElementById('userRoleFilter').value || '').toLowerCase();
    const tbody = document.getElementById('usersTableBody');
    const empty = document.getElementById('usersEmpty');

    const filtered = this.state.users.filter(u => {
      const matchSearch = ((u.usuario || '') + ' ' + (u.nombre_completo || '') + ' ' + (u.cargo || '') + ' ' + (u.area || '')).toLowerCase().includes(search);
      const matchRole = filter === '' || (u.rol || '').toLowerCase() === filter;
      return matchSearch && matchRole;
    }).reverse();

    empty.classList.toggle('d-none', filtered.length > 0);

    tbody.innerHTML = filtered.map(u => `
      <tr>
        <td>
          <div class="fw-bold text-dark">${this.escapeHTML(u.usuario)}</div>
          <div class="small text-muted">${this.escapeHTML(u.nombre_completo)}</div>
        </td>
        <td>
          <div class="small">${this.escapeHTML(u.correo)}</div>
        </td>
        <td>
          <div class="fw-semibold">${this.escapeHTML(u.cargo)}</div>
          <div class="small text-muted">${this.escapeHTML(u.area)}</div>
        </td>
        <td>
          <span class="badge ${u.rol === 'admin' ? 'bg-primary' : u.rol === 'supervisor' ? 'bg-success' : 'bg-secondary'} user-badge-role">
            ${this.escapeHTML(u.rol)}
          </span>
        </td>
        <td>
          <span class="status-badge status-${u.estado === 'activo' ? 'aprobado' : 'rechazado'}">
            <span class="status-dot"></span>${this.escapeHTML(u.estado)}
          </span>
        </td>
        <td>
          <div class="small">Creación: ${this.formatDate(u.fecha_creacion)}</div>
          <div class="small text-muted">Acceso: ${u.ultimo_acceso ? this.formatDate(u.ultimo_acceso, true) : 'Nunca'}</div>
        </td>
        <td class="text-end">
          <div class="dropdown d-inline-block">
            <button class="btn btn-sm btn-light border dropdown-toggle" data-bs-toggle="dropdown">
              Acciones
            </button>
            <ul class="dropdown-menu shadow">
              <li><button class="dropdown-item" onclick="app.openEditUserModal('${u.usuario}')"><i class="bi bi-pencil-square"></i> Editar</button></li>
              <li><button class="dropdown-item text-warning" onclick="app.openResetPasswordModal('${u.usuario}', '${u.nombre_completo}')"><i class="bi bi-key"></i> Restablecer Clave</button></li>
              <li><button class="dropdown-item text-danger" onclick="app.deleteUser('${u.usuario}')"><i class="bi bi-trash"></i> Eliminar</button></li>
            </ul>
          </div>
        </td>
      </tr>
    `).join('');
  },

  async submitNewUser() {
    const btn = document.getElementById('newUserSubmitBtn');
    const originalText = btn.innerHTML;

    this.setLoading(btn, true, 'Registrando...');

    const payload = {
      token: this.state.sessionToken,
      usuario: document.getElementById('newUsername').value,
      nombre_completo: document.getElementById('newUserNombre').value,
      correo: document.getElementById('newUserCorreo').value,
      cargo: document.getElementById('newUserCargo').value,
      area: document.getElementById('newUserArea').value,
      rol: document.getElementById('newUserRol').value,
      estado: document.getElementById('newUserEstado').value,
      password: document.getElementById('newUserPassword').value
    };

    try {
      const res = await this.fetchAPI('create_user', payload);
      if (res.success) {
        this.showToast('Usuario registrado exitosamente', 'success');
        document.getElementById('newUserForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('newUserModal')).hide();
        this.loadUsers();
      } else {
        this.showToast(res.error || 'Error al registrar usuario', 'danger');
      }
    } catch (e) {
      this.showToast('Error de conexión', 'danger');
    } finally {
      this.setLoading(btn, false, originalText);
    }
  },

  openEditUserModal(username) {
    const u = this.state.users.find(x => x.usuario === username);
    if (!u) return;

    document.getElementById('editUserUsername').value = u.usuario;
    document.getElementById('editUserNombre').value = u.nombre_completo || '';
    document.getElementById('editUserCorreo').value = u.correo || '';
    document.getElementById('editUserCargo').value = u.cargo || '';
    document.getElementById('editUserArea').value = u.area || '';
    document.getElementById('editUserRol').value = u.rol || 'user';
    document.getElementById('editUserEstado').value = u.estado || 'activo';

    new bootstrap.Modal(document.getElementById('editUserModal')).show();
  },

  async submitEditUser() {
    const btn = document.getElementById('editUserSubmitBtn');
    const originalText = btn.innerHTML;

    this.setLoading(btn, true, 'Guardando...');

    const payload = {
      token: this.state.sessionToken,
      usuario: document.getElementById('editUserUsername').value,
      nombre_completo: document.getElementById('editUserNombre').value,
      correo: document.getElementById('editUserCorreo').value,
      cargo: document.getElementById('editUserCargo').value,
      area: document.getElementById('editUserArea').value,
      rol: document.getElementById('editUserRol').value,
      estado: document.getElementById('editUserEstado').value
    };

    try {
      const res = await this.fetchAPI('update_user', payload);
      if (res.success) {
        this.showToast('Usuario actualizado correctamente', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
        this.loadUsers();
      } else {
        this.showToast(res.error || 'Error al actualizar usuario', 'danger');
      }
    } catch (e) {
      this.showToast('Error de conexión', 'danger');
    } finally {
      this.setLoading(btn, false, originalText);
    }
  },

  openResetPasswordModal(username, fullname) {
    document.getElementById('resetPasswordUsername').value = username;
    document.getElementById('resetPasswordTargetUser').innerText = `${fullname} (${username})`;
    document.getElementById('resetNewPassword').value = '';

    new bootstrap.Modal(document.getElementById('resetUserPasswordModal')).show();
  },

  async submitResetPassword() {
    const btn = document.getElementById('resetUserPasswordSubmitBtn');
    const originalText = btn.innerHTML;
    const pw = document.getElementById('resetNewPassword').value;

    if (pw.length < 8) {
      this.showToast('La contraseña debe tener al menos 8 caracteres', 'warning');
      return;
    }

    this.setLoading(btn, true, 'Restableciendo...');

    const payload = {
      token: this.state.sessionToken,
      usuario: document.getElementById('resetPasswordUsername').value,
      new_password: pw
    };

    try {
      const res = await this.fetchAPI('reset_password', payload);
      if (res.success) {
        this.showToast('Contraseña restablecida exitosamente', 'success');
        bootstrap.Modal.getInstance(document.getElementById('resetUserPasswordModal')).hide();
      } else {
        this.showToast(res.error || 'Error al restablecer contraseña', 'danger');
      }
    } catch (e) {
      this.showToast('Error de conexión', 'danger');
    } finally {
      this.setLoading(btn, false, originalText);
    }
  },

  async deleteUser(username) {
    if (username.toLowerCase() === 'admin') {
      this.showToast('No se puede eliminar el usuario administrador principal', 'danger');
      return;
    }

    if (!confirm(`¿Está seguro de que desea eliminar permanentemente al usuario ${username}?`)) return;

    try {
      const res = await this.fetchAPI('delete_user', { token: this.state.sessionToken, usuario: username });
      if (res.success) {
        this.showToast('Usuario eliminado correctamente', 'success');
        this.loadUsers();
      } else {
        this.showToast(res.error || 'Error al eliminar usuario', 'danger');
      }
    } catch (e) {
      this.showToast('Error de servidor', 'danger');
    }
  },

  async loadAuditLogs() {
    const loader = document.getElementById('logsLoader');
    loader.classList.remove('d-none');
    document.getElementById('logsTableBody').innerHTML = '';

    try {
      const res = await this.fetchAPI('load_audit_logs', { token: this.state.sessionToken });
      if (res.success) {
        this.state.auditLogs = res.logs;
        this.renderLogsTable();
      } else {
        this.showToast(res.error || 'Error al cargar bitácora', 'danger');
      }
    } catch (e) {
      this.showToast('Error de conexión', 'danger');
    } finally {
      loader.classList.add('d-none');
    }
  },

  renderLogsTable() {
    const search = (document.getElementById('logSearchInput').value || '').toLowerCase();
    const tbody = document.getElementById('logsTableBody');

    const filtered = this.state.auditLogs.filter(l => {
      return ((l.usuario || '') + ' ' + (l.accion || '') + ' ' + (l.detalles || '')).toLowerCase().includes(search);
    }).reverse();

    tbody.innerHTML = filtered.map(l => `
      <tr>
        <td class="font-monospace small">${this.escapeHTML(l.id ? l.id.substring(0, 8) : '')}</td>
        <td>${this.escapeHTML(this.formatDate(l.fecha_hora, true))}</td>
        <td class="fw-bold">${this.escapeHTML(l.usuario)}</td>
        <td><span class="badge bg-light text-dark border">${this.escapeHTML(l.accion)}</span></td>
        <td class="text-muted small">${this.escapeHTML(l.detalles)}</td>
      </tr>
    `).join('');
  },

  populateAreaDropdowns() {
    const areas = this.state.areas || [];

    // 1. New request area select
    const areaSelect = document.getElementById('area');
    if (areaSelect) {
      const selectedVal = areaSelect.value;
      areaSelect.innerHTML = '<option value="" selected disabled>Seleccione área...</option>' +
        areas.map(a => `<option value="${this.escapeHTML(a)}">${this.escapeHTML(a)}</option>`).join('');
      if (selectedVal && areas.includes(selectedVal)) {
        areaSelect.value = selectedVal;
      }
    }

    // 2. New user area select
    const newUserAreaSelect = document.getElementById('newUserArea');
    if (newUserAreaSelect) {
      newUserAreaSelect.innerHTML = '<option value="" selected disabled>Seleccione...</option>' +
        areas.map(a => `<option value="${this.escapeHTML(a)}">${this.escapeHTML(a)}</option>`).join('');
    }

    // 3. Edit user area select
    const editUserAreaSelect = document.getElementById('editUserArea');
    if (editUserAreaSelect) {
      const selectedVal = editUserAreaSelect.value;
      editUserAreaSelect.innerHTML = '<option value="" selected disabled>Seleccione...</option>' +
        areas.map(a => `<option value="${this.escapeHTML(a)}">${this.escapeHTML(a)}</option>`).join('');
      if (selectedVal && areas.includes(selectedVal)) {
        editUserAreaSelect.value = selectedVal;
      }
    }
  },

  renderAreasTable() {
    if (!this.el.areasTableBody) return;
    const search = (document.getElementById('areaSearchInput')?.value || '').toLowerCase();
    const filtered = (this.state.areas || []).filter(a => a.toLowerCase().includes(search));

    this.el.areasEmpty.classList.toggle('d-none', filtered.length > 0);
    this.el.areasTableBody.innerHTML = filtered.map(a => `
      <tr>
        <td class="fw-bold">${this.escapeHTML(a)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-light text-primary me-1" onclick="app.openEditAreaModal('${this.escapeHTML(a)}')" title="Editar Área"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-light text-danger" onclick="app.deleteArea('${this.escapeHTML(a)}')" title="Eliminar Área"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  },

  async submitNewArea() {
    const btn = document.getElementById('newAreaSubmitBtn');
    const originalText = btn.innerHTML;
    const input = document.getElementById('newAreaName');
    const areaName = input.value.trim();

    if (!areaName) return;
    this.setLoading(btn, true, 'Registrando...');

    try {
      const res = await this.fetchAPI('create_area', { token: this.state.sessionToken, area: areaName });
      if (res.success) {
        this.showToast('Área creada exitosamente', 'success');
        this.state.areas = res.areas || [];
        this.populateAreaDropdowns();
        this.renderAreasTable();
        input.value = '';
        bootstrap.Modal.getInstance(document.getElementById('newAreaModal')).hide();
      } else {
        this.showToast(res.error || 'Error al crear área', 'danger');
      }
    } catch (e) {
      this.showToast('Error de conexión', 'danger');
    } finally {
      this.setLoading(btn, false, originalText);
    }
  },

  openEditAreaModal(areaName) {
    document.getElementById('editAreaOldName').value = areaName;
    document.getElementById('editAreaNewName').value = areaName;
    new bootstrap.Modal(document.getElementById('editAreaModal')).show();
  },

  async submitEditArea() {
    const btn = document.getElementById('editAreaSubmitBtn');
    const originalText = btn.innerHTML;
    const oldName = document.getElementById('editAreaOldName').value;
    const newName = document.getElementById('editAreaNewName').value.trim();

    if (!newName || oldName === newName) return;
    this.setLoading(btn, true, 'Guardando...');

    try {
      const res = await this.fetchAPI('update_area', { token: this.state.sessionToken, area_antigua: oldName, area_nueva: newName });
      if (res.success) {
        this.showToast('Área actualizada exitosamente', 'success');
        this.state.areas = res.areas || [];
        this.populateAreaDropdowns();
        this.renderAreasTable();
        bootstrap.Modal.getInstance(document.getElementById('editAreaModal')).hide();
      } else {
        this.showToast(res.error || 'Error al actualizar área', 'danger');
      }
    } catch (e) {
      this.showToast('Error de conexión', 'danger');
    } finally {
      this.setLoading(btn, false, originalText);
    }
  },

  async deleteArea(areaName) {
    if (!confirm(`¿Está seguro de que desea eliminar el área "${areaName}"? Los usuarios asociados a esta área no se eliminarán, pero se recomienda reasignar su área.`)) return;

    try {
      const res = await this.fetchAPI('delete_area', { token: this.state.sessionToken, area: areaName });
      if (res.success) {
        this.showToast('Área eliminada exitosamente', 'success');
        this.state.areas = res.areas || [];
        this.populateAreaDropdowns();
        this.renderAreasTable();
      } else {
        this.showToast(res.error || 'Error al eliminar área', 'danger');
      }
    } catch (e) {
      this.showToast('Error de conexión', 'danger');
    }
  },

  base64urlToBuffer: b => Uint8Array.from(atob(b.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer,
  bufferToBase64url: b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
  escapeHTML: s => s ? String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : ''
};

document.addEventListener('DOMContentLoaded', () => app.init());

