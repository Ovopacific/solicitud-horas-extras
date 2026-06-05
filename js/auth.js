window.appAuth = {
  async login() {
    const btn = document.querySelector('.login-btn');
    if (!btn) return;
    const originalText = btn.innerHTML;

    this.setLoading(btn, true, 'Verificando...');

    const name = document.getElementById('loginName').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (!name || !pass) {
      this.showToast('Ingresa nombre y contraseña', 'warning');
      this.setLoading(btn, false, originalText);
      return;
    }

    try {
      if (this.state.failedAttempts >= 1) {
        const captchaAns = Number(document.getElementById('captchaAnswer').value);
        if (captchaAns !== this.state.captchaAnswer) {
          this.showToast('Respuesta de seguridad incorrecta. Intente de nuevo.', 'danger');
          this.generateCaptcha();
          this.setLoading(btn, false, originalText);
          return;
        }
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
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('appContent').classList.remove('d-none');
    document.getElementById('mainNav').classList.remove('d-none');

    const roleBadge = document.getElementById('roleBadge');
    if (roleBadge) {
      roleBadge.innerText = `Hola, ${this.state.currentUser}`;
      roleBadge.className = `badge bg-light text-primary py-2 px-3 border rounded-pill`;
    }

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

    sessionStorage.removeItem('sessionToken');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('currentUser');

    document.getElementById('loginScreen').classList.remove('d-none');
    document.getElementById('appContent').classList.add('d-none');
    document.getElementById('mainNav').classList.add('d-none');
    document.getElementById('loginForm')?.reset();
    document.getElementById('captchaBox').classList.add('d-none');
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
  }
};
