import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Hechos} from '../cli/esquema';
import {validarHechos, hayErrores, licenciaLibre} from '../cli/reglas';

const base = () => Hechos.parse(JSON.parse(readFileSync('ejemplos/hechos-ejemplo.json', 'utf8')));
const reglas = (h: Hechos) => validarHechos(h, {numerar: false}).filter((x) => x.nivel === 'error').map((x) => x.regla);

test('el ejemplo no tiene errores', () => assert.deepEqual(reglas(base()), []));

test('exige dos medios distintos o documento oficial', () => {
  const h = base();
  h.piezas[0].fuentes = [h.piezas[0].fuentes[0]];
  assert.ok(reglas(h).includes('dos-fuentes'));
  h.piezas[0].fuentes[0].documento_oficial = true;
  assert.ok(!reglas(h).includes('dos-fuentes'));
});

test('la denuncia debe redactarse como denuncia', () => {
  const h = base();
  h.piezas[0].es_denuncia = true;
  h.piezas[0].apoyo[0] = 'El ministerio firmó un contrato directo con una empresa sin pasar por el proceso de licitación pública abierta.';
  assert.ok(reglas(h).includes('denuncia'));
});

test('rechaza palabra prohibida, título sin clave y número no pedido', () => {
  const h = base();
  h.piezas[0].titulo = 'DESNUDAMOS AL MINISTERIO';
  h.piezas[0].numero = '1.';
  const r = reglas(h);
  for (const x of ['palabra-prohibida', 'titulo-clave', 'sin-numero']) assert.ok(r.includes(x), x);
  assert.ok(!validarHechos(h, {numerar: true}).some((x) => x.regla === 'sin-numero'));
});

test('el titular del recorte debe venir de una fuente listada', () => {
  const h = base();
  h.piezas[0].recorte.url = 'https://otro.invalid/x';
  assert.ok(reglas(h).includes('recorte-en-fuentes'));
});

test('solo licencias libres', () => {
  for (const l of ['CC BY-SA 4.0', 'CC0', 'Public domain']) assert.ok(licenciaLibre(l), l);
  for (const l of ['CC BY-NC 2.0', 'CC BY-ND 4.0', 'All rights reserved', undefined]) assert.ok(!licenciaLibre(l as string), String(l));
});

test('hayErrores distingue avisos de errores', () => assert.equal(hayErrores(validarHechos(base(), {numerar: false})), false));
