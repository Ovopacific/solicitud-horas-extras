window.appRecords = {
  async submitRecord() {
    const btn = document.getElementById('submitBtn');
    if (!btn) return;
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
        document.getElementById('recordForm')?.reset();
        if (document.getElementById('fecha')) {
          document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
        }
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

  renderTables() {
    this.renderUserTable();
    this.renderCopiesTable();
    if (this.state.role === 'admin' || this.state.role === 'supervisor') {
      this.renderAdminTable();
    }
  },

  renderUserTable() {
    const tbody = document.getElementById('userTableBody');
    const empty = document.getElementById('userEmpty');
    if (!tbody) return;

    const currentUserLower = (this.state.currentUser || '').toLowerCase();
    const data = this.state.data
      .filter(item => {
        const nombreLower = (item.nombre || '').toLowerCase();
        const creadorLower = (item.creador || '').toLowerCase();
        return nombreLower.includes(currentUserLower) || creadorLower === currentUserLower;
      })
      .reverse();

    if (empty) empty.classList.toggle('d-none', data.length > 0);
    tbody.innerHTML = data.map(item => `
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
    const tbody = document.getElementById('copiesTableBody');
    const empty = document.getElementById('copiesEmpty');
    if (!tbody) return;

    const current = (this.state.currentUser || '').toLowerCase();
    const copies = this.state.data
      .filter(item => (item.copia_a || '').toLowerCase() === current)
      .reverse();

    const badge = document.getElementById('copiasPendienteBadge');
    if (badge) {
      const pending = copies.filter(i => (i.copia_estado || '').toLowerCase() !== 'revisada').length;
      badge.innerText = pending;
      badge.classList.toggle('d-none', pending === 0);
    }

    if (empty) empty.classList.toggle('d-none', copies.length > 0);

    tbody.innerHTML = copies.map(item => {
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

  populateCopiaSelect() {
    const select = document.getElementById('copiaA');
    if (!select) return;
    const current = (this.state.currentUser || '').toLowerCase();
    const emps = (this.state.employees || []).filter(e => e.toLowerCase() !== current && e.toLowerCase() !== 'admin');

    select.innerHTML = '<option value="" selected>Sin copia asignada</option>' +
      emps.map(e => `<option value="${window.appUtils.escapeHTML(e)}">${window.appUtils.escapeHTML(e)}</option>`).join('');
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
    const file = fileInput?.files[0];
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
        bootstrap.Modal.getInstance(document.getElementById('bossApprovalModal')).hide();
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
        rangoEl.parentElement.style.display = 'block';
      } else {
        rangoEl.parentElement.style.display = 'none';
      }
    }
    document.getElementById('detailFecha').innerText = this.formatDate(item.fecha);
    document.getElementById('detailMotivo').innerText = item.motivo;
    document.getElementById('detailEstado').innerHTML = this.getStatusBadgeHTML(item.estado);

    const firmasSec = document.getElementById('detailFirmasSection');
    if (firmasSec) {
      if (this.state.role === 'admin') {
        firmasSec.style.display = 'block';
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

  getCopyIndicatorHTML(copia_a, copia_estado, copia_fecha_revision) {
    if (!copia_a) {
      return `<span class="copy-indicator copy-indicator-none">🚫 Sin copia asignada</span>`;
    }
    const estado = (copia_estado || '').toLowerCase();
    if (estado === 'revisada') {
      return `<span class="copy-indicator copy-indicator-revisada" title="Revisada el ${window.appUtils.escapeHTML(window.appUtils.formatDate(copia_fecha_revision, true))}">✓ Revisada · ${window.appUtils.escapeHTML(copia_a)}</span>`;
    }
    return `<span class="copy-indicator copy-indicator-pendiente">⏳ Pendiente · ${window.appUtils.escapeHTML(copia_a)}</span>`;
  },

  getStatusBadgeHTML(status) {
    const s = (status || 'pendiente').toLowerCase();
    const cssClass = s.replace(/\s+/g, '-');
    return `<span class="status-badge status-${cssClass}"><span class="status-dot"></span>${s}</span>`;
  },

  exportToExcel() {
    if (this.state.data.length === 0) return this.showToast('Sin datos', 'warning');
    const cols = [
      { k: 'nombre', l: 'Nombre' }, { k: 'apellido', l: 'Apellido' },
      { k: 'area', l: 'Área' },
      { k: 'hora_inicio', l: 'Hora Inicio' }, { k: 'hora_fin', l: 'Hora Fin' },
      { k: 'horas', l: 'Horas' },
      { k: 'fecha', l: 'Fecha' }, { k: 'motivo', l: 'Motivo' },
      { k: 'estado', l: 'Estado' },
      { k: 'copia_a', l: 'Copiado a (Jefe)' },
      { k: 'copia_estado', l: 'Estado Aprobación Jefe' },
      { k: 'copia_fecha_revision', l: 'Fecha Aprobación Jefe' }
    ];
    const rows = this.state.data.map(i => {
      const r = {};
      cols.forEach(c => {
        let val = i[c.k];
        if (c.k === 'fecha' || c.k === 'fecha_creacion') {
          if (val && typeof val === 'string' && val.includes('T')) {
            val = val.split('T')[0];
            const [y, m, d] = val.split('-');
            val = `${d}/${m}/${y}`;
          } else {
            val = this.formatDate(val);
          }
        } else if (c.k === 'copia_fecha_revision') {
          val = this.formatDate(val, true);
        } else if (c.k === 'copia_estado') {
          if (!i.copia_a) {
            val = 'No requerido';
          } else {
            val = (val || 'pendiente').toLowerCase() === 'revisada' ? 'Aprobado' : 'Pendiente';
          }
        } else if (c.k === 'horas' || c.k === 'hora_inicio' || c.k === 'hora_fin') {
          val = this.formatHoras(val);
        }
        r[c.l] = val || '';
      });
      return r;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horas');
    XLSX.writeFile(wb, `Reporte_Horas_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
};
