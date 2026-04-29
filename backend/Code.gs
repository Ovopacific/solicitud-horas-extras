const SHEET_NAME = 'Registros';

function doOptions(e) {
  return HtmlService.createHtmlOutput('OK')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doGet(e) {
  try {
    const sheet = getSheet();
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResponse({ success: true, data: [] });
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const records = rows.map(row => {
      let record = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      return record;
    });
    
    return jsonResponse({ success: true, data: records });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const payload = requestData.payload;
    
    if (action === 'create') {
      return createRecord(payload);
    } else if (action === 'update_status') {
      return updateRecordStatus(payload.id, payload.estado);
    } else if (action === 'sign_record') {
      return signRecord(payload.id, payload.firma_img);
    } else if (action === 'delete') {
      return deleteRecord(payload.id);
    } else if (action === 'login_admin') {
      return loginAdmin(payload.password);
    } else if (action === 'webauthn_check') {
      return checkWebAuthnUser(payload.nombre);
    } else if (action === 'webauthn_register') {
      return registerWebAuthnUser(payload.nombre, payload.credentialId);
    } else if (action === 'webauthn_verify') {
      return verifyWebAuthnUser(payload.nombre, payload.credentialId);
    }
    
    return jsonResponse({ success: false, error: 'Acción no válida' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

function loginAdmin(enteredPassword) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName('Configuracion');
  
  if (!configSheet) {
    // Si no existe, crearla y poner la contraseña inicial "admin123"
    configSheet = ss.insertSheet('Configuracion');
    configSheet.appendRow(['Clave', 'Valor']);
    configSheet.appendRow(['admin_password', 'admin123']);
    configSheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#f3f3f3');
    configSheet.setFrozenRows(1);
    configSheet.autoResizeColumns(1, 2);
  }
  
  const data = configSheet.getDataRange().getValues();
  let currentPassword = 'admin'; // fallback por seguridad si falla algo
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'admin_password') {
      currentPassword = data[i][1];
      break;
    }
  }
  
  if (enteredPassword && enteredPassword.toString() === currentPassword.toString()) {
    return jsonResponse({ success: true, role: 'admin' });
  } else {
    return jsonResponse({ success: false, error: 'Contraseña incorrecta' });
  }
}

function createRecord(data) {
  const sheet = getSheet();
  
  // Generar ID único
  const newId = Utilities.getUuid();
  const fechaCreacion = new Date().toISOString();
  
  const rowData = [
    newId,
    data.nombre,
    data.apellido,
    data.area,
    data.horas,
    data.fecha,
    data.motivo,
    'pendiente', // estado inicial
    'no', // firmado inicial
    fechaCreacion,
    data.firma_img || ''
  ];
  
  sheet.appendRow(rowData);
  return jsonResponse({ success: true, message: 'Registro creado', id: newId });
}

function updateRecordStatus(id, newStatus) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  const estadoIndex = headers.indexOf('estado');
  const firmadoIndex = headers.indexOf('firmado');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      sheet.getRange(i + 1, estadoIndex + 1).setValue(newStatus);
      return jsonResponse({ success: true, message: 'Estado actualizado' });
    }
  }
  return jsonResponse({ success: false, error: 'Registro no encontrado' });
}

function signRecord(id, firmaImgBase64) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  const firmadoIndex = headers.indexOf('firmado');
  
  // Create firma_img column if it doesn't exist
  let firmaImgIndex = headers.indexOf('firma_img');
  if (firmaImgIndex === -1) {
    firmaImgIndex = headers.length;
    sheet.getRange(1, firmaImgIndex + 1).setValue('firma_img');
  }
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      sheet.getRange(i + 1, firmadoIndex + 1).setValue('si');
      if (firmaImgBase64) {
        sheet.getRange(i + 1, firmaImgIndex + 1).setValue(firmaImgBase64);
      }
      return jsonResponse({ success: true, message: 'Registro firmado' });
    }
  }
  return jsonResponse({ success: false, error: 'Registro no encontrado' });
}

function deleteRecord(id) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: 'Registro eliminado' });
    }
  }
  return jsonResponse({ success: false, error: 'Registro no encontrado' });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ['id', 'nombre', 'apellido', 'area', 'horas', 'fecha', 'motivo', 'estado', 'firmado', 'fecha_creacion', 'firma_img'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// --- WebAuthn Functions ---

function getCredentialsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Credenciales');
  if (!sheet) {
    sheet = ss.insertSheet('Credenciales');
    const headers = ['nombre', 'credentialId', 'fecha_registro'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

function generateChallenge() {
  // Generate a random 32-byte hex string as challenge
  const randomBytes = [];
  for (let i = 0; i < 32; i++) {
    randomBytes.push(Math.floor(Math.random() * 256));
  }
  // Convert to base64url format for the client
  const base64 = Utilities.base64Encode(randomBytes);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function checkWebAuthnUser(nombre) {
  const sheet = getCredentialsSheet();
  const data = sheet.getDataRange().getValues();
  
  const challenge = generateChallenge();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === nombre.toLowerCase()) {
      // User exists, return their credential ID for authentication
      return jsonResponse({ 
        success: true, 
        isRegistered: true, 
        credentialId: data[i][1],
        challenge: challenge
      });
    }
  }
  
  // User not found, return challenge for registration
  return jsonResponse({ 
    success: true, 
    isRegistered: false,
    challenge: challenge
  });
}

function registerWebAuthnUser(nombre, credentialId) {
  if (!nombre || !credentialId) {
    return jsonResponse({ success: false, error: 'Faltan datos de registro' });
  }
  
  const sheet = getCredentialsSheet();
  const data = sheet.getDataRange().getValues();
  
  // Check if already registered just in case
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === nombre.toLowerCase()) {
      // Overwrite existing credential
      sheet.getRange(i + 1, 2).setValue(credentialId);
      sheet.getRange(i + 1, 3).setValue(new Date().toISOString());
      return jsonResponse({ success: true, message: 'Credencial actualizada' });
    }
  }
  
  // New registration
  sheet.appendRow([nombre, credentialId, new Date().toISOString()]);
  return jsonResponse({ success: true, message: 'Dispositivo registrado correctamente' });
}

function verifyWebAuthnUser(nombre, credentialId) {
  const sheet = getCredentialsSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase() === nombre.toLowerCase()) {
      if (data[i][1] === credentialId) {
        return jsonResponse({ success: true, message: 'Autenticación exitosa' });
      } else {
        return jsonResponse({ success: false, error: 'Credencial incorrecta para este usuario' });
      }
    }
  }
  
  return jsonResponse({ success: false, error: 'Usuario no registrado' });
}
