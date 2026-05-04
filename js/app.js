/**
 * app.js - Lógica principal de la aplicación
 * Organizado en secciones para facilitar su mantenimiento:
 * 1. Estado de la Aplicación
 * 2. Inicialización
 * 3. Efectos Visuales
 * 4. Autenticación y Seguridad
 * 5. Llamadas a la API y Datos
 * 6. Renderizado y Vistas
 * 7. Componentes UI y Modales
 * 8. Utilidades
 */

const app = {
  // ==========================================
  // 1. ESTADO DE LA APLICACIÓN (STATE)
  // ==========================================

  data: [], // Almacena los registros obtenidos de la API
  loginMode: 'user', // Modo de inicio de sesión actual: 'user' o 'admin'
  role: null, // Rol del usuario autenticado: 'user' o 'admin'
  currentUser: null, // Nombre del usuario autenticado
  sessionToken: null, // Token de sesión emitido por el backend
  apiUrl: 'https://script.google.com/macros/s/AKfycby1FsCAwl01GH-Xf1BpLBz6cvmQ0AAvNsMd_8THACGirerJVVSFMIZTkdpBlzR3h1NN/exec',

  // ==========================================
  // 2. INICIALIZACIÓN (INITIALIZATION)
  // ==========================================

  /**
   * Función de arranque principal. Configura eventos y efectos visuales.
   */
  init() {
    this.setupEventListeners();

    // Limpia temas previos del DOM (si existen)
    localStorage.removeItem('appTheme');
    document.body.removeAttribute('data-theme');

    // Inicializa efectos visuales
    setTimeout(() => this.init3DLogin(), 100);
    this.initWaterRipple();
    this.initCustomCursor();
  },

  /**
   * Configura los listeners de los eventos principales del DOM.
   */
  setupEventListeners() {
    // Formulario de inicio de sesión
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });

    // Formulario para crear un nuevo registro
    document.getElementById('recordForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitRecord();
    });

    // Filtros de búsqueda (Vista Admin)
    document.getElementById('searchInput').addEventListener('input', () => this.renderAdminTable());
    document.getElementById('statusFilter').addEventListener('change', () => this.renderAdminTable());

    // Inicializa el campo de fecha con el día actual por defecto
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = today;
  },

  // ==========================================
  // 3. EFECTOS VISUALES (VISUAL EFFECTS)
  // ==========================================

  /**
   * Inicializa el efecto 3D dinámico al mover el ratón sobre la tarjeta de login.
   */
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

      // Cálculo del grado de inclinación basado en la posición del ratón
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

  /**
   * Crea un efecto de expansión tipo "gota de agua" al hacer clic en cualquier parte.
   */
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

      // Reacción del cursor personalizado al hacer clic
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

  /**
   * Configura y anima el cursor personalizado de la aplicación.
   */
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
      // Actualización instantánea del punto central brillante
      glow.style.left = mouseX + 'px';
      glow.style.top = mouseY + 'px';
    });

    // Retardo suave para el anillo exterior usando requestAnimationFrame
    const render = () => {
      ringX += (mouseX - ringX) * 0.2;
      ringY += (mouseY - ringY) * 0.2;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    // Efectos de hover sobre elementos interactivos
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

  /**
   * Genera partículas flotantes animadas en el fondo.
   */
  createOrbs() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    container.innerHTML = ''; // Limpiar si existe previamente

    const dropCount = 40; // Número de partículas
    for (let i = 0; i < dropCount; i++) {
      const orb = document.createElement('div');
      orb.classList.add('particle');

      // Posición, velocidad y retardo aleatorio
      orb.style.left = `${Math.random() * 100}vw`;
      orb.style.animationDuration = `${10 + Math.random() * 15}s`;
      orb.style.animationDelay = `${Math.random() * 10}s`;

      // Tamaño aleatorio sutil
      const size = Math.random() * 4 + 3;
      orb.style.width = `${size}px`;
      orb.style.height = `${size}px`;
      orb.style.opacity = Math.random() * 0.6 + 0.2;

      container.appendChild(orb);
    }
  },

  // ==========================================
  // 4. AUTENTICACIÓN Y SEGURIDAD (AUTH & WEBAUTHN)
  // ==========================================

  /**
   * Alterna entre el panel de acceso de Usuario y Administrador.
   */
  switchLoginTab(mode) {
    this.loginMode = mode;
    document.getElementById('btnTabUser').classList.toggle('active', mode === 'user');
    document.getElementById('btnTabAdmin').classList.toggle('active', mode === 'admin');

    document.getElementById('userLoginFields').classList.toggle('d-none', mode === 'admin');
    document.getElementById('adminLoginFields').classList.toggle('d-none', mode === 'user');
  },

  /**
   * Procesa el formulario de login, derivando al flujo correspondiente.
   */
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
          this.sessionToken = resData.token;
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
      const pass = document.getElementById('loginPass').value.trim();
      if (name.length > 2) {
        if (pass.length > 0) {
          this.handleUserPasswordLogin(name, pass);
        } else {
          this.handleUserLogin(name);
        }
      } else {
        this.showToast('Por favor ingresa un nombre válido', 'danger');
      }
    }
  },

  /**
   * Gestiona el inicio de sesión tradicional con usuario y contraseña.
   */
  async handleUserPasswordLogin(name, pass) {
    const btn = document.querySelector('.login-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Verificando...';
    btn.disabled = true;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login_user_password', payload: { nombre: name, password: pass } })
      });
      const resData = await response.json();

      if (resData.success) {
        this.role = 'user';
        this.currentUser = name;
        this.sessionToken = resData.token;
        document.getElementById('nombre').value = name;
        this.completeLogin();
      } else {
        this.showToast(resData.error || 'Contraseña incorrecta', 'danger');
      }
    } catch (error) {
      console.error(error);
      this.showToast('Error de conexión con el servidor', 'danger');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  /**
   * Gestiona el flujo de autenticación biométrica o PIN (WebAuthn) para usuarios normales.
   */
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
      // 1. Verificar si el usuario está registrado y obtener desafío (challenge)
      const checkRes = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'webauthn_check', payload: { nombre: name } })
      });
      const checkData = await checkRes.json();

      if (!checkData.success) throw new Error(checkData.error);

      if (checkData.isRegistered) {
        // --- FLUJO DE AUTENTICACIÓN (LOGIN) ---
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
              userVerification: 'required', // Exige PIN/Biometría
              timeout: 60000
            }
          });

          const credentialId = this.bufferToBase64url(assertion.rawId);

          btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Verificando...';

          // 2. Verificar en el servidor que la credencial coincida
          const verifyRes = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'webauthn_verify', payload: { nombre: name, credentialId: credentialId } })
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            this.role = 'user';
            this.currentUser = name;
            this.sessionToken = verifyData.token;
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
        // --- FLUJO DE REGISTRO (SIGN UP) ---
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
                authenticatorAttachment: 'platform', // Preferir autenticadores integrados
                userVerification: 'required' // Forzar PIN/Biometría
              },
              timeout: 60000,
              attestation: 'none'
            }
          });

          const credentialId = this.bufferToBase64url(credential.rawId);

          btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...';

          // Guardar el ID de credencial en el servidor
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
            this.sessionToken = regData.token;
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
      this.showToast(error.message || 'Error de conexión con el servidor', 'danger');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  /**
   * Se ejecuta tras una autenticación exitosa para ocultar login y mostrar app.
   */
  completeLogin() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('appContent').classList.remove('d-none');
    document.getElementById('mainNav').classList.remove('d-none');

    document.getElementById('roleBadge').innerText = 'Hola, ' + this.currentUser;
    document.getElementById('roleBadge').className = this.role === 'admin'
      ? 'badge bg-danger text-white px-3 py-2 border rounded-pill'
      : 'badge bg-primary text-white px-3 py-2 border rounded-pill';

    this.loadData();
    this.updateView();
  },

  /**
   * Cierra la sesión activa y reinicia el estado.
   */
  logout() {
    this.role = null;
    this.currentUser = null;
    this.sessionToken = null;
    this.data = [];
    document.getElementById('loginScreen').classList.remove('d-none');
    document.getElementById('appContent').classList.add('d-none');
    document.getElementById('mainNav').classList.add('d-none');
    document.getElementById('loginForm').reset();
  },

  // ==========================================
  // 5. LLAMADAS A LA API Y DATOS (API & DATA)
  // ==========================================

  /**
   * Carga los datos de las horas extras desde la API (Google Sheets).
   */
  async loadData() {
    if (!this.apiUrl) return;

    this.showLoader(true);
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'load_data', payload: { token: this.sessionToken } })
      });
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

  /**
   * Envía un nuevo registro de horas extra a la API.
   */
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
      firma_img: base64,
      token: this.sessionToken
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

        // Restablece la fecha a hoy
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('fecha').value = today;

        // Oculta el modal
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

  /**
   * Actualiza el estado de una solicitud (Aprobado, Rechazado, Pendiente).
   */
  async updateStatus(id, newStatus) {
    if (!confirm(`¿Estás seguro de cambiar el estado a ${newStatus}?`)) return;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'update_status', payload: { id, estado: newStatus, token: this.sessionToken } })
      });

      const resData = await response.json();

      if (resData.success) {
        this.showToast('Estado actualizado', 'success');

        // Actualización optimista local
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

  /**
   * Elimina un registro de horas extra.
   */
  async deleteRecord(id) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', payload: { id, token: this.sessionToken } })
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

  // ==========================================
  // 6. RENDERIZADO Y VISTAS (RENDERING & VIEWS)
  // ==========================================

  /**
   * Muestra la vista apropiada según el rol (Usuario o Administrador).
   */
  updateView() {
    if (this.role === 'admin') {
      document.getElementById('userView').classList.add('d-none');
      document.getElementById('adminView').classList.remove('d-none');
    } else {
      document.getElementById('adminView').classList.add('d-none');
      document.getElementById('userView').classList.remove('d-none');
    }
  },

  /**
   * Renderiza ambas tablas según los datos y el rol activo.
   */
  renderTables() {
    this.renderUserTable();
    if (this.role === 'admin') {
      this.renderAdminTable();
    }
  },

  /**
   * Renderiza la tabla de registros para el usuario normal (filtrada por su nombre).
   */
  renderUserTable() {
    const tbody = document.getElementById('userTableBody');
    const emptyState = document.getElementById('userEmpty');

    // Filtra datos solo para este usuario
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
          <div class="fw-semibold">${this.escapeHTML(item.nombre)} ${this.escapeHTML(item.apellido)}</div>
          <div class="small text-muted">${item.id ? item.id.substring(0, 8) : ''}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${this.escapeHTML(item.area)}</span></td>
        <td class="fw-bold">${item.horas} h</td>
        <td>${this.formatDate(item.fecha)}</td>
        <td class="small text-muted text-truncate" style="max-width: 150px; cursor: pointer; text-decoration: underline; text-decoration-color: #dee2e6;" onclick="app.viewDetails('${item.id}')" title="Clic para ver detalle completo">${this.escapeHTML(item.motivo)}</td>
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

  /**
   * Renderiza la tabla completa para administradores, incluyendo filtros de búsqueda.
   */
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
      return `
      <tr>
        <td>
          <div class="fw-semibold">${this.escapeHTML(item.nombre)} ${this.escapeHTML(item.apellido)}</div>
          <div class="small text-muted">Sol: ${this.formatDate(item.fecha_creacion, true)}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${this.escapeHTML(item.area)}</span></td>
        <td class="fw-bold">${item.horas} h</td>
        <td>${this.formatDate(item.fecha)}</td>
        <td class="small text-muted text-truncate" style="max-width: 150px; cursor: pointer; text-decoration: underline; text-decoration-color: #dee2e6;" onclick="app.viewDetails('${item.id}')" title="Clic para ver detalle completo">${this.escapeHTML(item.motivo)}</td>
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

  /**
   * Actualiza los cuadros estadísticos en la vista de Administrador.
   */
  updateStats() {
    document.getElementById('statTotal').innerText = this.data.length;
    document.getElementById('statPendiente').innerText = this.data.filter(d => (d.estado || '').toLowerCase() === 'pendiente').length;
    document.getElementById('statAprobado').innerText = this.data.filter(d => (d.estado || '').toLowerCase() === 'aprobado').length;
    document.getElementById('statRechazado').innerText = this.data.filter(d => (d.estado || '').toLowerCase() === 'rechazado').length;
  },

  // ==========================================
  // 7. COMPONENTES UI Y MODALES (UI COMPONENTS)
  // ==========================================

  /**
   * Muestra u oculta el spinner de carga en las tablas.
   */
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

  /**
   * Muestra un mensaje flotante tipo Toast.
   */
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

  /**
   * Genera el HTML de la etiqueta de estado con colores dinámicos.
   */
  getStatusBadgeHTML(status) {
    const s = status ? status.toLowerCase() : 'pendiente';
    return `
      <span class="status-badge status-${s}">
        <span class="status-dot"></span>
        ${s}
      </span>
    `;
  },

  /**
   * Genera el HTML de la imagen de firma o el estado no firmado para la tabla de usuario.
   */
  getSignedHTML(item) {
    const imgHtml = item.firma_img
      ? `<div class="mt-2 text-center" style="cursor: pointer;" onclick="app.viewSignature('${item.firma_img}')" title="Haz clic para ver firma completa">
           <span class="small text-muted d-block fw-bold" style="font-size:0.65rem; text-transform:uppercase;"><i class="bi bi-search"></i> Firma Adjunta</span>
           <img src="${item.firma_img}" style="max-height: 40px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); background: white;" class="shadow-sm">
         </div>`
      : `<div class="text-nowrap mt-1"><i class="bi bi-circle unsigned-x"></i> <span class="small text-muted ms-1">No Firmado</span></div>`;

    return `<div class="d-flex flex-column align-items-center">${imgHtml}</div>`;
  },

  /**
   * Muestra el modal con la imagen de la firma ampliada.
   */
  viewSignature(imgSrc) {
    document.getElementById('fullSizeImage').src = imgSrc;
    new bootstrap.Modal(document.getElementById('imageViewerModal')).show();
  },

  /**
   * Muestra el modal con el detalle completo de un registro.
   */
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

  // ==========================================
  // 8. UTILIDADES Y AYUDANTES (UTILITIES & HELPERS)
  // ==========================================

  /**
   * Formatea una cadena de fecha a formato local amigable.
   */
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

  /**
   * Comprime una imagen adjunta antes de enviarla al servidor (base64).
   */
  compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 250; // Límite de ancho para la compresión
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

  /**
   * Exporta los datos visualizados en pantalla a un archivo CSV descargable.
   */
  exportToCSV() {
    if (this.data.length === 0) {
      this.showToast('No hay datos para exportar', 'danger');
      return;
    }

    // Encabezados dinámicos a partir del primer objeto
    const headers = Object.keys(this.data[0]);

    // Contenido CSV
    const csvContent = [
      headers.join(','),
      ...this.data.map(row => headers.map(fieldName => {
        let cell = row[fieldName] === null || row[fieldName] === undefined ? '' : String(row[fieldName]);
        // Escapar comillas y ajustar formato
        cell = cell.replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(','))
    ].join('\n');

    // Crea el archivo descargable
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `horas_extra_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Ayudante de WebAuthn: Convierte Buffer a Base64 URL-safe.
   */
  bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const charCode of bytes) {
      str += String.fromCharCode(charCode);
    }
    const base64String = btoa(str);
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },

  /**
   * Ayudante de WebAuthn: Convierte Base64 URL-safe a Buffer.
   */
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

  /**
   * Limpia cadenas de texto para evitar XSS al renderizar en el DOM.
   */
  escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(match) {
      const escape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escape[match];
    });
  }
};

// ==========================================
// ARRANQUE DE LA APLICACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  app.init();
  app.createOrbs();
});

