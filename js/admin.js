window.appAdmin = {
  displayLimit: 50,

  loadMoreAdminRecords() {
    this.displayLimit = (this.displayLimit || 50) + 50;
    this.renderAdminTable();
  },

  renderAdminTable() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filter = document.getElementById('statusFilter').value.toLowerCase();
    const tbody = document.getElementById('adminTableBody');
    const empty = document.getElementById('adminEmpty');
    if (!tbody) return;

    const filtered = window.appState.data.filter(item => {
      const matchSearch = ((item.nombre || '') + ' ' + (item.apellido || '') + ' ' + (item.area || '')).toLowerCase().includes(search);
      const matchStatus = filter === '' || (item.estado || '').toLowerCase() === filter;
      return matchSearch && matchStatus;
    }).reverse();

    const displayData = filtered.slice(0, this.displayLimit || 50);
    const hasMore = filtered.length > displayData.length;

    const loadMoreContainer = document.getElementById('adminLoadMoreContainer');
    if (loadMoreContainer) {
      loadMoreContainer.classList.toggle('d-none', !hasMore);
    }

    if (empty) empty.classList.toggle('d-none', filtered.length > 0);
    tbody.innerHTML = displayData.map(item => `
      <tr id="row-${item.id}">
        <td>
          <div class="fw-semibold">${window.appUtils.escapeHTML(item.nombre)} ${window.appUtils.escapeHTML(item.apellido)}</div>
          <div class="small text-muted">Sol: ${window.appUtils.formatDate(item.fecha_creacion, true)}</div>
          ${window.appRecords.getCopyIndicatorHTML(item.copia_a, item.copia_estado, item.copia_fecha_revision)}
        </td>
        <td><span class="badge bg-light text-dark border">${window.appUtils.escapeHTML(item.area)}</span></td>
        <td class="fw-bold">
          <div>${window.appUtils.escapeHTML(window.appUtils.formatHoras(item.horas))} h</div>
          ${item.hora_inicio && item.hora_fin ? `<div class="small text-muted fw-normal">${window.appUtils.escapeHTML(window.appUtils.formatHoras(item.hora_inicio))} - ${window.appUtils.escapeHTML(window.appUtils.formatHoras(item.hora_fin))}</div>` : ''}
        </td>
        <td>${window.appUtils.escapeHTML(window.appUtils.formatDate(item.fecha))}</td>
        <td class="small text-muted text-truncate" style="max-width: 150px; cursor: pointer; text-decoration: underline;" onclick="app.viewDetails('${item.id}')">${window.appUtils.escapeHTML(item.motivo)}</td>
        <td id="status-cell-${item.id}">${window.appAdmin.getAdminStatusHTML(item.id, item.estado)}</td>
        <td class="text-center">
          ${item.firma_jefe_img ? `<button class="btn btn-sm btn-light text-success" onclick="app.viewSignature('${item.id}', 'jefe')" title="Ver Firma Jefe"><i class="bi bi-eye"></i></button>` : '<span class="small text-muted">No</span>'}
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-light text-danger" onclick="app.deleteRecord('${item.id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  },

  async updateStatus(id, newStatus) {
    if (!confirm(`¿Cambiar estado a ${newStatus}?`)) return;

    try {
      const res = await window.appApi.fetchAPI('update_status', { id, estado: newStatus, token: window.appState.sessionToken });
      if (res.success) {
        window.appUtils.showToast('Estado actualizado', 'success');
        const item = window.appState.data.find(d => d.id === id);
        if (item) {
          item.estado = newStatus;
          window.appAdmin.updateStatusCell(id, newStatus);
          if (window.app) window.app.updateStats();
        }
      }
    } catch (e) {
      window.appUtils.showToast('Error en servidor', 'danger');
    }
  },

  updateStatusCell(id, status) {
    const cell = document.getElementById(`status-cell-${id}`);
    if (cell) {
      cell.innerHTML = window.appAdmin.getAdminStatusHTML(id, status);
      const row = document.getElementById(`row-${id}`);
      row?.classList.add('row-update');
      setTimeout(() => row?.classList.remove('row-update'), 1000);
    }
  },

  getAdminStatusHTML(id, status) {
    if (window.appState.role !== 'admin') {
      return window.appRecords.getStatusBadgeHTML(status);
    }
    const s = (status || 'pendiente').toLowerCase();
    return `
      <select class="form-select form-select-sm status-select status-select-${s}" onchange="app.updateStatus('${id}', this.value)" aria-label="Cambiar estado">
        <option value="pendiente" ${s === 'pendiente' ? 'selected' : ''}>Pendiente</option>
        <option value="aprobado" ${s === 'aprobado' ? 'selected' : ''}>Aprobado</option>
        <option value="rechazado" ${s === 'rechazado' ? 'selected' : ''}>Rechazado</option>
      </select>
    `;
  },

  async loadUsers() {
    const loader = document.getElementById('usersLoader');
    const empty = document.getElementById('usersEmpty');
    loader.classList.remove('d-none');
    empty.classList.add('d-none');
    document.getElementById('usersTableBody').innerHTML = '';

    try {
      const res = await window.appApi.fetchAPI('load_users', { token: window.appState.sessionToken });
      if (res.success) {
        window.appState.users = res.users;
        window.appAdmin.renderUsersTable();
      } else {
        window.appUtils.showToast(res.error || 'Error al cargar usuarios', 'danger');
      }
    } catch (e) {
      window.appUtils.showToast('Error de conexión', 'danger');
    } finally {
      loader.classList.add('d-none');
    }
  },

  renderUsersTable() {
    const search = (document.getElementById('userSearchInput').value || '').toLowerCase();
    const filter = (document.getElementById('userRoleFilter').value || '').toLowerCase();
    const tbody = document.getElementById('usersTableBody');
    const empty = document.getElementById('usersEmpty');
    if (!tbody) return;

    const filtered = window.appState.users.filter(u => {
      const matchSearch = ((u.usuario || '') + ' ' + (u.nombre_completo || '') + ' ' + (u.cargo || '') + ' ' + (u.area || '')).toLowerCase().includes(search);
      const matchRole = filter === '' || (u.rol || '').toLowerCase() === filter;
      return matchSearch && matchRole;
    }).reverse();

    empty.classList.toggle('d-none', filtered.length > 0);

    tbody.innerHTML = filtered.map(u => `
      <tr>
        <td>
          <div class="fw-bold text-dark">${window.appUtils.escapeHTML(u.usuario)}</div>
          <div class="small text-muted">${window.appUtils.escapeHTML(u.nombre_completo)}</div>
        </td>
        <td>
          <div class="small">${window.appUtils.escapeHTML(u.correo)}</div>
        </td>
        <td>
          <div class="fw-semibold">${window.appUtils.escapeHTML(u.cargo)}</div>
          <div class="small text-muted">${window.appUtils.escapeHTML(u.area)}</div>
        </td>
        <td>
          <span class="badge ${u.rol === 'admin' ? 'bg-primary' : u.rol === 'supervisor' ? 'bg-success' : 'bg-secondary'} user-badge-role">
            ${window.appUtils.escapeHTML(u.rol)}
          </span>
        </td>
        <td>
          <span class="status-badge status-${u.estado === 'activo' ? 'aprobado' : 'rechazado'}">
            <span class="status-dot"></span>${window.appUtils.escapeHTML(u.estado)}
          </span>
        </td>
        <td>
          <div class="small">Creación: ${window.appUtils.formatDate(u.fecha_creacion)}</div>
          <div class="small text-muted">Acceso: ${u.ultimo_acceso ? window.appUtils.formatDate(u.ultimo_acceso, true) : 'Nunca'}</div>
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

    window.appUtils.setLoading(btn, true, 'Registrando...');

    const payload = {
      token: window.appState.sessionToken,
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
      const res = await window.appApi.fetchAPI('create_user', payload);
      if (res.success) {
        window.appUtils.showToast('Usuario registrado exitosamente', 'success');
        document.getElementById('newUserForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('newUserModal')).hide();
        window.appAdmin.loadUsers();
      } else {
        window.appUtils.showToast(res.error || 'Error al registrar usuario', 'danger');
      }
    } catch (e) {
      window.appUtils.showToast('Error de conexión', 'danger');
    } finally {
      window.appUtils.setLoading(btn, false, originalText);
    }
  },

  openEditUserModal(username) {
    const u = window.appState.users.find(x => x.usuario === username);
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

    window.appUtils.setLoading(btn, true, 'Guardando...');

    const payload = {
      token: window.appState.sessionToken,
      usuario: document.getElementById('editUserUsername').value,
      nombre_completo: document.getElementById('editUserNombre').value,
      correo: document.getElementById('editUserCorreo').value,
      cargo: document.getElementById('editUserCargo').value,
      area: document.getElementById('editUserArea').value,
      rol: document.getElementById('editUserRol').value,
      estado: document.getElementById('editUserEstado').value
    };

    try {
      const res = await window.appApi.fetchAPI('update_user', payload);
      if (res.success) {
        window.appUtils.showToast('Usuario actualizado correctamente', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
        window.appAdmin.loadUsers();
      } else {
        window.appUtils.showToast(res.error || 'Error al actualizar usuario', 'danger');
      }
    } catch (e) {
      window.appUtils.showToast('Error de conexión', 'danger');
    } finally {
      window.appUtils.setLoading(btn, false, originalText);
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
      window.appUtils.showToast('La contraseña debe tener al menos 8 caracteres', 'warning');
      return;
    }

    window.appUtils.setLoading(btn, true, 'Restableciendo...');

    const payload = {
      token: window.appState.sessionToken,
      usuario: document.getElementById('resetPasswordUsername').value,
      new_password: pw
    };

    try {
      const res = await window.appApi.fetchAPI('reset_password', payload);
      if (res.success) {
        window.appUtils.showToast('Contraseña restablecida exitosamente', 'success');
        bootstrap.Modal.getInstance(document.getElementById('resetUserPasswordModal')).hide();
      } else {
        window.appUtils.showToast(res.error || 'Error al restablecer contraseña', 'danger');
      }
    } catch (e) {
      window.appUtils.showToast('Error de conexión', 'danger');
    } finally {
      window.appUtils.setLoading(btn, false, originalText);
    }
  },

  async deleteUser(username) {
    if (username.toLowerCase() === 'admin') {
      window.appUtils.showToast('No se puede eliminar el usuario administrador principal', 'danger');
      return;
    }

    if (!confirm(`¿Está seguro de que desea eliminar permanentemente al usuario ${username}?`)) return;

    try {
      const res = await window.appApi.fetchAPI('delete_user', { token: window.appState.sessionToken, usuario: username });
      if (res.success) {
        window.appUtils.showToast('Usuario eliminado correctamente', 'success');
        window.appAdmin.loadUsers();
      } else {
        window.appUtils.showToast(res.error || 'Error al eliminar usuario', 'danger');
      }
    } catch (e) {
      window.appUtils.showToast('Error de servidor', 'danger');
    }
  },

  async loadAuditLogs() {
    const loader = document.getElementById('logsLoader');
    if (!loader) return;
    loader.classList.remove('d-none');
    document.getElementById('logsTableBody').innerHTML = '';

    try {
      const res = await window.appApi.fetchAPI('load_audit_logs', { token: window.appState.sessionToken });
      if (res.success) {
        window.appState.auditLogs = res.logs;
        window.appAdmin.renderLogsTable();
      } else {
        window.appUtils.showToast(res.error || 'Error al cargar bitácora', 'danger');
      }
    } catch (e) {
      window.appUtils.showToast('Error de conexión', 'danger');
    } finally {
      loader.classList.add('d-none');
    }
  },

  renderLogsTable() {
    const search = (document.getElementById('logSearchInput')?.value || '').toLowerCase();
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;

    const filtered = window.appState.auditLogs.filter(l => {
      return ((l.usuario || '') + ' ' + (l.accion || '') + ' ' + (l.detalles || '')).toLowerCase().includes(search);
    }).reverse();

    tbody.innerHTML = filtered.map(l => `
      <tr>
        <td class="font-monospace small">${window.appUtils.escapeHTML(l.id ? l.id.substring(0, 8) : '')}</td>
        <td>${window.appUtils.escapeHTML(window.appUtils.formatDate(l.fecha_hora, true))}</td>
        <td class="fw-bold">${window.appUtils.escapeHTML(l.usuario)}</td>
        <td><span class="badge bg-light text-dark border">${window.appUtils.escapeHTML(l.accion)}</span></td>
        <td class="text-muted small">${window.appUtils.escapeHTML(l.detalles)}</td>
      </tr>
    `).join('');
  },

  renderAreasTable() {
    const tbody = document.getElementById('areasTableBody');
    const empty = document.getElementById('areasEmpty');
    if (!tbody) return;

    const search = (document.getElementById('areaSearchInput')?.value || '').toLowerCase();
    const filtered = (window.appState.areas || []).filter(a => a.toLowerCase().includes(search));

    if (empty) empty.classList.toggle('d-none', filtered.length > 0);
    tbody.innerHTML = filtered.map(a => `
      <tr>
        <td class="fw-bold">${window.appUtils.escapeHTML(a)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-light text-primary me-1" onclick="app.openEditAreaModal('${window.appUtils.escapeHTML(a)}')" title="Editar Área"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-light text-danger" onclick="app.deleteArea('${window.appUtils.escapeHTML(a)}')" title="Eliminar Área"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  },

  async submitNewArea() {
    const btn = document.getElementById('newAreaSubmitBtn');
    const originalText = btn?.innerHTML || 'Registrar Área';
    const input = document.getElementById('newAreaName');
    const areaName = input?.value.trim();

    if (!areaName) return;
    window.appUtils.setLoading(btn, true, 'Registrando...');

    try {
      const res = await window.appApi.fetchAPI('create_area', { token: window.appState.sessionToken, area: areaName });
      if (res.success) {
        window.appUtils.showToast('Área creada exitosamente', 'success');
        window.appState.areas = res.areas || [];
        if (window.app) window.app.populateAreaDropdowns();
        window.appAdmin.renderAreasTable();
        if (input) input.value = '';
        bootstrap.Modal.getInstance(document.getElementById('newAreaModal')).hide();
      } else {
        window.appUtils.showToast(res.error || 'Error al crear área', 'danger');
      }
    } catch (e) {
      window.appUtils.showToast('Error de conexión', 'danger');
    } finally {
      window.appUtils.setLoading(btn, false, originalText);
    }
  },

  openEditAreaModal(areaName) {
    document.getElementById('editAreaOldName').value = areaName;
    document.getElementById('editAreaNewName').value = areaName;
    new bootstrap.Modal(document.getElementById('editAreaModal')).show();
  },

  async submitEditArea() {
    const btn = document.getElementById('editAreaSubmitBtn');
    const originalText = btn?.innerHTML || 'Guardar Cambios';
    const oldName = document.getElementById('editAreaOldName').value;
    const newName = document.getElementById('editAreaNewName').value.trim();

    if (!newName || oldName === newName) return;
    window.appUtils.setLoading(btn, true, 'Guardando...');

    try {
      const res = await window.appApi.fetchAPI('update_area', { token: window.appState.sessionToken, area_antigua: oldName, area_nueva: newName });
      if (res.success) {
        window.appUtils.showToast('Área actualizada exitosamente', 'success');
        window.appState.areas = res.areas || [];
        if (window.app) window.app.populateAreaDropdowns();
        window.appAdmin.renderAreasTable();
        bootstrap.Modal.getInstance(document.getElementById('editAreaModal')).hide();
      } else {
        window.appUtils.showToast(res.error || 'Error al actualizar área', 'danger');
      }
    } catch (e) {
      window.appUtils.showToast('Error de conexión', 'danger');
    } finally {
      window.appUtils.setLoading(btn, false, originalText);
    }
  },

  async deleteArea(areaName) {
    if (!confirm(`¿Está seguro de que desea eliminar el área "${areaName}"? Los usuarios asociados a esta área no se eliminarán, pero se recomienda reasignar su área.`)) return;

    try {
      const res = await window.appApi.fetchAPI('delete_area', { token: window.appState.sessionToken, area: areaName });
      if (res.success) {
        window.appUtils.showToast('Área eliminada exitosamente', 'success');
        window.appState.areas = res.areas || [];
        if (window.app) window.app.populateAreaDropdowns();
        window.appAdmin.renderAreasTable();
      } else {
        window.appUtils.showToast(res.error || 'Error al eliminar área', 'danger');
      }
    } catch (e) {
      window.appUtils.showToast('Error de conexión', 'danger');
    }
  }
};
