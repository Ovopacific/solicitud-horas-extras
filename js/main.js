const app = {
  config: window.appConfig,
  state: window.appState,
  ...window.appUtils,
  ...window.appApi,
  ...window.appUi,
  ...window.appAuth,
  ...window.appRecords,
  ...window.appAdmin,

  el: {},

  init() {
    this.cacheElements();
    this.setupEventListeners();

    // Inicialización de UI
    // setTimeout(() => this.init3DLogin(), 100);
    // this.initWaterRipple();
    this.initCustomCursor();
    this.initParticles();
    this.setupInactivityTimer();

    // Fecha por defecto
    if (this.el.fechaInput) {
      this.el.fechaInput.value = new Date().toISOString().split('T')[0];
    }

    // Verificar si hay una sesión activa guardada
    this.restoreSession();
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

    document.getElementById('userSearchInput')?.addEventListener('input', () => this.renderUsersTable());
    document.getElementById('userRoleFilter')?.addEventListener('change', () => this.renderUsersTable());

    this.el.searchInput?.addEventListener('input', () => {
      this.displayLimit = 50;
      this.renderAdminTable();
    });
    this.el.statusFilter?.addEventListener('change', () => {
      this.displayLimit = 50;
      this.renderAdminTable();
    });
    document.getElementById('logSearchInput')?.addEventListener('input', () => this.renderLogsTable());

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

    document.getElementById('newPassword')?.addEventListener('input', (e) => {
      this.checkPasswordStrength(e.target.value);
    });

    document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitInitialPasswordChange();
    });

    this.el.newAreaForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitNewArea();
    });

    this.el.editAreaForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitEditArea();
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

    this.el.horaInicioInput?.addEventListener('change', calcHoras);
    this.el.horaFinInput?.addEventListener('change', calcHoras);
  },

  updateStats() {
    const d = this.state.data;
    if (this.el.statTotal) this.el.statTotal.innerText = d.length;
    if (this.el.statPendiente) this.el.statPendiente.innerText = d.filter(x => (x.estado || '').toLowerCase() === 'pendiente').length;
    if (this.el.statAprobado) this.el.statAprobado.innerText = d.filter(x => (x.estado || '').toLowerCase() === 'aprobado').length;
    if (this.el.statRechazado) this.el.statRechazado.innerText = d.filter(x => (x.estado || '').toLowerCase() === 'rechazado').length;
  },

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
        this.displayLimit = 50;
        this.renderTables();
        this.updateStats();
      }
    } catch (e) {
      console.error("Error en loadData:", e);
      this.showToast('Error al cargar datos', 'danger');
    } finally {
      this.toggleLoader(false);
    }
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
  }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
