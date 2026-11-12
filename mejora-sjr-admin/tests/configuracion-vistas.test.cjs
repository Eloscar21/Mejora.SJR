'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function loadSource(relative) {
  const filename = path.isAbsolute(relative) ? relative : path.resolve(__dirname, '..', relative);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = name => {
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(filename), name);
      for (const ext of ['.ts', '.tsx']) if (existsSync(target + ext)) return loadSource(target + ext);
    }
    return original(name);
  };
  loaded._compile(outputText, filename);
  return loaded.exports;
}

const { ConfiguracionView } = loadSource('src/views/configuracion/ConfiguracionView.tsx');
const { ResolucionPasswordDialog } = loadSource('src/views/configuracion/ResolucionPasswordDialog.tsx');
const fila = { idSolicitud: 7, idUsuario: 2, nombreUsuario: 'Pedro de prueba', email: 'pedro@test.com', idRol: 2,
  rolNombre: 'Trabajador', idDepartamento: 1, departamentoNombre: 'JAPAM', estado: 'PENDIENTE',
  fechaSolicitud: '2026-11-12T12:00:00.000Z', fechaResolucion: null, idSuperadminResolutor: null, superadminNombre: null, notasResolucion: null };
const noEjecutar = () => { throw new Error('Renderizar no debe ejecutar una operación'); };
function crearVM(rol = 4) {
  return {
    acceso: { actor: { idUsuario: rol, idRol: rol, email: 'actor@test.com' }, inicializando: false, errorAcceso: null },
    cambio: { form: { passwordActual: '', passwordNueva: '', confirmarPassword: '' }, errors: {}, estado: 'reposo',
      errorEnvio: null, mensajeExito: null, avisoIncierto: null, reautenticando: false, isSubmitting: false,
      resultadoDesconocido: false, puedeEnviar: true, enviar: noEjecutar, cambiarCampo: noEjecutar, nuevoCambio: noEjecutar, volverAlLogin: noEjecutar },
    bandeja: { puedeConsultar: rol === 4, filas: [fila], total: 1, filtroEstado: 'PENDIENTE', filtroTexto: '', isLoading: false,
      errorListado: null, cambiarEstado: noEjecutar, cambiarTexto: noEjecutar, recargar: noEjecutar },
    resolucion: { seleccion: null, notas: '', motivo: '', estado: 'reposo', error: null, errorCampo: null,
      mensaje: null, claveConfirmada: null, comprobando: false, copiando: false, mensajeCopiado: null, sinConfirmar: [],
      isSubmitting: false, puedeConfirmar: true, puedeComprobar: false, abrir: noEjecutar, revisarIncierto: noEjecutar,
      cambiarNotas: noEjecutar, cambiarMotivo: noEjecutar, confirmar: noEjecutar, comprobarResultado: noEjecutar, cerrar: noEjecutar, copiarClave: noEjecutar },
  };
}
const render = vm => renderToStaticMarkup(React.createElement(ConfiguracionView, { viewModel: vm }));
const dialogo = vm => renderToStaticMarkup(React.createElement(ResolucionPasswordDialog, { viewModel: vm }));

test('rol 3 ve solo el formulario propio, sin tickets, bandeja ni acciones de recuperación', () => {
  const html = render(crearVM(3));
  assert.match(html, /Mi contraseña/);
  assert.equal((html.match(/type="password"/g) || []).length, 3);
  assert.doesNotMatch(html, /Solicitudes de recuperación|Pedro de prueba|<table|Aprobar solicitud|<dialog/);
});

test('rol 4 ve la bandeja y sus filtros sin ejecutar operaciones al renderizar', () => {
  const html = render(crearVM());
  assert.match(html, /Solicitudes de recuperación/);
  assert.match(html, /Buscar solicitante/); assert.match(html, /Pendientes/); assert.match(html, /Aprobadas/);
  assert.match(html, /Aprobar solicitud de Pedro de prueba/); assert.match(html, /Rechazar solicitud de Pedro de prueba/);
  assert.doesNotMatch(html, /<dialog/);
});

test('los errores del formulario identifican y marcan visualmente los campos', () => {
  const vm = crearVM(3);
  vm.cambio.errors = { passwordActual: 'Actual incorrecta', confirmarPassword: 'La confirmación no coincide' };
  const html = render(vm);
  assert.equal((html.match(/aria-invalid="true"/g) || []).length, 2);
  assert.match(html, /Actual incorrecta/); assert.match(html, /La confirmación no coincide/);
  assert.match(html, /border-red-400/); assert.match(html, /aria-describedby=/);
});

test('la carga y el acceso rechazado no muestran datos ni formularios de una sesión anterior', () => {
  const vm = crearVM(); vm.acceso.inicializando = true;
  assert.match(render(vm), /Cargando configuración/);
  assert.doesNotMatch(render(vm), /Pedro de prueba|<form/);
  vm.acceso.inicializando = false; vm.acceso.actor = null; vm.acceso.errorAcceso = 'Sesión expirada';
  assert.match(render(vm), /Sesión expirada/); assert.match(render(vm), /Volver al login/);
  assert.doesNotMatch(render(vm), /Pedro de prueba|<form/);
});

test('un cambio propio incierto ofrece comprobar acceso sin otro envío', () => {
  const vm = crearVM(3);
  vm.cambio.estado = 'incierto'; vm.cambio.resultadoDesconocido = true; vm.cambio.puedeEnviar = false;
  vm.cambio.avisoIncierto = 'Comprueba el acceso antes de continuar';
  const html = render(vm);
  assert.match(html, /Volver al login para comprobar/);
  assert.doesNotMatch(html, />Actualizar contraseña</);
  assert.match(html, /<fieldset disabled=""/);
});

test('el historial muestra resolución sin botones de aprobación o rechazo', () => {
  const vm = crearVM(); vm.bandeja.filtroEstado = 'APROBADA';
  vm.bandeja.filas = [{ ...fila, estado: 'APROBADA', notasResolucion: 'Identidad verificada', fechaResolucion: '2026-11-12T13:00:00.000Z' }];
  const html = render(vm);
  assert.match(html, /Identidad verificada/); assert.match(html, /Aprobada/);
  assert.doesNotMatch(html, /aria-label="Aprobar solicitud|aria-label="Rechazar solicitud/);
});

test('un resultado incierto cerrado conserva un acceso a la comprobación', () => {
  const vm = crearVM(); vm.resolucion.sinConfirmar = [{ idSolicitud: 7, nombreUsuario: fila.nombreUsuario, tipo: 'aprobar' }];
  const html = render(vm);
  assert.match(html, /resultados pendientes de comprobar/); assert.match(html, /Revisar resultado/);
});

test('un error de consulta muestra el aviso y deshabilita las acciones sobre filas conservadas', () => {
  const vm = crearVM(); vm.bandeja.errorListado = 'No se pudo consultar';
  const html = render(vm);
  assert.match(html, /No se pudo consultar/);
  assert.match(html, /disabled="" aria-label="Aprobar solicitud/);
  assert.match(html, /Pedro de prueba/);
});

test('el diálogo identifica a la persona y presenta notas sin generar una clave al abrir', () => {
  const vm = crearVM().resolucion; vm.seleccion = { tipo: 'aprobar', solicitud: fila };
  const html = dialogo(vm);
  assert.match(html, /<dialog/); assert.match(html, /aria-modal="true"/);
  assert.match(html, /Pedro de prueba/); assert.match(html, /Notas de verificación/);
  assert.match(html, /Aprobar y generar clave/); assert.doesNotMatch(html, /Copiar clave/);
});

test('la clave confirmada solo aparece en el diálogo de resultado y desaparece al cerrarlo', () => {
  const vm = crearVM(); const clave = Buffer.alloc(16, 7).toString('base64url');
  vm.resolucion.seleccion = { tipo: 'aprobar', solicitud: fila }; vm.resolucion.estado = 'confirmado';
  vm.resolucion.puedeConfirmar = false;
  vm.resolucion.claveConfirmada = { idSolicitud: 7, estado: 'APROBADA', email: fila.email, passwordTemporal: clave };
  let html = render(vm);
  assert.match(html, new RegExp(clave)); assert.match(html, /Copiar clave/);
  assert.doesNotMatch(html, /Aprobar y generar clave/);
  vm.resolucion.seleccion = null; vm.resolucion.claveConfirmada = null;
  html = render(vm); assert.doesNotMatch(html, new RegExp(clave));
});

test('resultado incierto exige consulta y solo la comprobación pendiente ofrece reintento manual', () => {
  const vm = crearVM().resolucion; vm.seleccion = { tipo: 'aprobar', solicitud: fila };
  vm.estado = 'incierto'; vm.puedeConfirmar = false; vm.puedeComprobar = true;
  assert.match(dialogo(vm), /Consultar estado/); assert.doesNotMatch(dialogo(vm), /Aprobar y generar clave|Reintentar manualmente/);
  vm.estado = 'reintentoDisponible'; vm.puedeConfirmar = true;
  assert.match(dialogo(vm), /Reintentar manualmente/);
});

test('mientras guarda, bloquea el cierre y muestra progreso sin otro botón de confirmación', () => {
  const vm = crearVM().resolucion; vm.seleccion = { tipo: 'rechazar', solicitud: fila };
  vm.estado = 'enviando'; vm.isSubmitting = true; vm.puedeConfirmar = false;
  const html = dialogo(vm);
  assert.match(html, /Guardando resolución/);
  assert.match(html, /aria-label="Cerrar diálogo" disabled=""/);
  assert.doesNotMatch(html, /Confirmar rechazo/);
});
