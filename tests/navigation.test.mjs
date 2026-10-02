import test from 'node:test';
import assert from 'node:assert/strict';
import { IndexedCodeSearch, SequentialCodeSearch, LocalStorageTicketRepository, TicketQueryService, NavigationState, generateTickets, emptyCriteria } from '../lib/navigation.ts';
import { reportCSV } from '../lib/benchmark.ts';
const context = { role: 'Agente', userId: 'Agente demo' };
function setup(size = 100, Strategy = IndexedCodeSearch) {
  const data = generateTickets(size), store = new Map();
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  const repository = new LocalStorageTicketRepository(storage, data), strategy = new Strategy(), service = new TicketQueryService(repository, strategy);
  return { data, store, storage, repository, strategy, service };
}
test('Exact strategies match an independent oracle for first, middle, last and missing codes', () => {
  for (const size of [100, 1000, 10000]) {
    const a = setup(size, SequentialCodeSearch), b = setup(size);
    for (const position of [0, Math.floor(size / 2), size - 1, -1]) {
      const expected = position < 0 ? [] : [a.data[position].code];
      const query = { ...emptyCriteria(), exactCode: position < 0 ? 'MISSING' : a.data[position].code };
      for (const fixture of [a, b]) assert.deepEqual(fixture.service.query(query, context).items.map(t => t.code), expected);
    }
  }
});
test('Exact code trims whitespace and ignores case', () => {
  assert.equal(setup().service.query({ ...emptyCriteria(), exactCode: ' sb-test-00001 ' }, context).items[0].id, 1);
});
test('Text search trims whitespace and ignores case', () => {
  const { service } = setup();
  const result = service.query({ ...emptyCriteria(), subjectText: '  RED  ' }, context);
  assert.equal(result.total, 25); assert.ok(result.items.every(t => t.category === 'Red'));
});
test('Combined filters use AND, including exact code plus subject', () => {
  const { service } = setup();
  const result = service.query({ ...emptyCriteria(), subjectText: 'portal', priority: 'Baja', status: 'Abierto', category: 'Acceso', technicianId: '__unassigned' }, context);
  assert.deepEqual(result.items.map(t => t.id), [1]);
  assert.equal(service.query({ ...emptyCriteria(), exactCode: 'SB-TEST-00001', subjectText: 'impresora' }, context).total, 0);
});
test('Pagination has no omissions or duplicates and stays ordered', () => {
  const { service } = setup(103); const ids = [];
  for (let page = 1; page <= 6; page++) { const result = service.query({ ...emptyCriteria(), page }, context); assert.equal(result.pageCount, 6); ids.push(...result.items.map(t => t.id)); }
  assert.deepEqual(ids, Array.from({ length: 103 }, (_, i) => 103 - i));
});
test('Equal timestamps use ascending code as deterministic tie-break', () => {
  const { service, data } = setup(3); service.replaceAll(data.map(t => ({ ...t, createdAt: data[0].createdAt })));
  assert.deepEqual(service.query(emptyCriteria(), context).items.map(t => t.id), [1, 2, 3]);
});
test('Page out of range clamps and zero results disable the page range', () => {
  const { service } = setup(); assert.equal(service.query({ ...emptyCriteria(), page: 99 }, context).page, 5);
  assert.deepEqual(service.query({ ...emptyCriteria(), exactCode: 'MISSING', page: 99 }, context), { items: [], total: 0, page: 1, pageCount: 0 });
});
test('Invalid page values are normalized', () => {
  const { service } = setup();
  assert.equal(service.query({ ...emptyCriteria(), page: NaN, pageSize: NaN }, context).items.length, 20);
  assert.equal(service.query({ ...emptyCriteria(), page: -10 }, context).page, 1);
});
test('Visibility applies to both exact and broad queries', () => {
  const { service } = setup();
  const collaborator = { role: 'Colaborador', userId: 'Usuario Demo 01' }, technician = { role: 'Técnico', userId: 'Técnico Demo A' };
  assert.equal(service.query(emptyCriteria(), collaborator).total, 25);
  assert.equal(service.query({ ...emptyCriteria(), exactCode: 'SB-TEST-00002' }, collaborator).total, 0);
  assert.ok(service.query(emptyCriteria(), technician).items.every(t => t.assignee === 'Técnico Demo A'));
  assert.equal(service.query({ ...emptyCriteria(), exactCode: 'SB-TEST-00001' }, technician).total, 0);
  assert.equal(service.query(emptyCriteria(), { role: 'Desconocido', userId: 'x' }).total, 0);
});
test('Navigation returns independent criteria and resets on identity or role change', () => {
  const state = new NavigationState(), criteria = { ...emptyCriteria(), subjectText: 'red', page: 3 };
  state.save(criteria, context); criteria.page = 4;
  assert.equal(state.restore(context).page, 3); const restored = state.restore(context); restored.page = 5;
  assert.equal(state.restore(context).page, 3);
  assert.deepEqual(state.restore({ ...context, userId: 'Otro' }), emptyCriteria());
  assert.deepEqual(state.restore({ ...context, role: 'Administrador' }), emptyCriteria());
});
test('Index sees newly created and renamed tickets, and drops old codes', () => {
  const { service, data } = setup(3); service.query({ ...emptyCriteria(), exactCode: data[0].code }, context);
  const ticket = { ...data[0], id: 500, code: 'NEW-CODE' }; service.create(ticket);
  assert.equal(service.query({ ...emptyCriteria(), exactCode: 'NEW-CODE' }, context).items[0].id, 500);
  service.update('NEW-CODE', { ...ticket, code: 'RENAMED', title: 'Asunto actualizado' });
  assert.equal(service.query({ ...emptyCriteria(), exactCode: 'NEW-CODE' }, context).total, 0);
  assert.equal(service.query({ ...emptyCriteria(), exactCode: 'RENAMED' }, context).items[0].title, 'Asunto actualizado');
});
test('Updates affect filtered results after an index was prepared', () => {
  const { service, data } = setup(3); service.query({ ...emptyCriteria(), exactCode: data[0].code }, context);
  service.update(data[0].code, { ...data[0], status: 'Cerrado' });
  assert.equal(service.query({ ...emptyCriteria(), exactCode: data[0].code, status: 'Abierto' }, context).total, 0);
});
test('Failed persistence keeps repository and index consistent', () => {
  const { service, storage, data } = setup(3); service.query({ ...emptyCriteria(), exactCode: data[0].code }, context);
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => service.update(data[0].code, { ...data[0], code: 'RENAMED' }), /Quota/);
  assert.equal(service.query({ ...emptyCriteria(), exactCode: data[0].code }, context).total, 1);
  assert.equal(service.query({ ...emptyCriteria(), exactCode: 'RENAMED' }, context).total, 0);
});
test('Duplicate codes and IDs are rejected without changing data', () => {
  const { service, data } = setup(3);
  assert.throws(() => service.create({ ...data[0], id: 99, code: data[0].code.toLowerCase() }), /únicos/);
  assert.throws(() => service.create({ ...data[0], code: 'NEW' }), /únicos/);
  assert.equal(service.query(emptyCriteria(), context).total, 3);
});
test('Corrupt stored data is reported and preserved', () => {
  const store = new Map([['servicebank-tickets-v2', '{invalid']]);
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.throws(() => new LocalStorageTicketRepository(storage, [])); assert.equal(store.get('servicebank-tickets-v2'), '{invalid');
});
test('Legacy Colombian dates are migrated to ISO without losing records', () => {
  const data = generateTickets(1); data[0].createdAt = '30/08/2026, 6:00 p. m.';
  const storage = { getItem: () => JSON.stringify(data), setItem: () => {} };
  const repo = new LocalStorageTicketRepository(storage, []);
  assert.equal(repo.readAll()[0].createdAt, '2026-08-30T23:00:00.000Z');
});
test('Cached repository snapshots cannot be mutated externally', () => {
  const { repository } = setup(3); assert.throws(() => { repository.readAll()[0].code = 'BROKEN'; }, TypeError);
});
test('Unknown update and ID changes are rejected', () => {
  const { service, data } = setup(3);
  assert.throws(() => service.update('MISSING', data[0]), /No existe/);
  assert.throws(() => service.update(data[0].code, { ...data[0], id: 99 }), /identificador/);
});
test('Strategy cannot search after invalidation until prepared', () => {
  for (const strategy of [new SequentialCodeSearch(), new IndexedCodeSearch()]) {
    strategy.prepare(generateTickets(1)); strategy.invalidate(); assert.throws(() => strategy.find('x'), /preparación/);
  }
});
test('CSV retains each raw timing and its batch size', () => {
  const csv = reportCSV({ measurements: [{ datasetSize: 100, strategy: 'Indexada', scenario: 'Final', phase: 'Consulta preparada', batchSize: 100, durationsMs: [.001, .002] }] });
  assert.ok(csv.includes('100;Indexada;Final;Consulta preparada;2;100;0.002')); assert.equal(csv.split('\n').length, 3);
});
