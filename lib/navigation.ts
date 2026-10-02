export type TicketEvent = { id: number; type: string; detail: string; actor: string; date: string };
export type TicketComment = { id: number; text: string; author: string; date: string };
export type Ticket = {
  id: number; code: string; title: string; description: string; category: string;
  priority: string; status: string; requester: string; assignee: string | null;
  createdAt: string; events: TicketEvent[]; comments: TicketComment[];
};
export type UserContext = { userId: string; role: string };
export type QueryCriteria = {
  exactCode: string; subjectText: string; status: string; priority: string;
  category: string; technicianId: string; page: number; pageSize: number;
};
export type PagedResult = { items: Ticket[]; total: number; page: number; pageCount: number };
export const emptyCriteria = (): QueryCriteria => ({ exactCode: '', subjectText: '', status: '', priority: '', category: '', technicianId: '', page: 1, pageSize: 20 });
export const normalizeCode = (value: string): string => value.trim().toUpperCase();
export const normalizeText = (value: string): string => value.trim().toLocaleLowerCase('es');

export function validateTickets(tickets: Ticket[]): void {
  if (!Array.isArray(tickets)) throw new Error('Los datos de solicitudes no son una lista válida.');
  const codes = new Set<string>(), ids = new Set<number>();
  for (const ticket of tickets) {
    if (!ticket || !Number.isFinite(ticket.id) || typeof ticket.code !== 'string' || !normalizeCode(ticket.code)
      || ['title', 'description', 'category', 'priority', 'status', 'requester', 'createdAt'].some(key => typeof ticket[key as keyof Ticket] !== 'string')
      || (ticket.assignee !== null && typeof ticket.assignee !== 'string')
      || !Array.isArray(ticket.events) || !Array.isArray(ticket.comments)
      || !Number.isFinite(Date.parse(ticket.createdAt))) throw new Error('Una solicitud contiene campos o fechas inválidos.');
    if (codes.has(normalizeCode(ticket.code)) || ids.has(ticket.id)) throw new Error('Los códigos e identificadores de solicitudes deben ser únicos.');
    codes.add(normalizeCode(ticket.code)); ids.add(ticket.id);
  }
}

export interface CodeSearchStrategy {
  readonly name: string;
  prepare(tickets: readonly Ticket[]): void;
  find(code: string): Ticket | undefined;
  invalidate(): void;
}
export class SequentialCodeSearch implements CodeSearchStrategy {
  readonly name = 'Secuencial';
  private tickets: readonly Ticket[] | null = null;
  prepare(tickets: readonly Ticket[]) { this.tickets = tickets; }
  find(code: string) {
    if (!this.tickets) throw new Error('La estrategia requiere preparación.');
    const key = normalizeCode(code);
    return this.tickets.find(ticket => ticket.code === key);
  }
  invalidate() { this.tickets = null; }
}
export class IndexedCodeSearch implements CodeSearchStrategy {
  readonly name = 'Indexada';
  private index: Map<string, Ticket> | null = null;
  prepare(tickets: readonly Ticket[]) {
    const index = new Map<string, Ticket>();
    for (const ticket of tickets) {
      const key = normalizeCode(ticket.code);
      if (index.has(key)) throw new Error('No se puede indexar un código duplicado.');
      index.set(key, ticket);
    }
    this.index = index;
  }
  find(code: string) {
    if (!this.index) throw new Error('La estrategia requiere preparación.');
    return this.index.get(normalizeCode(code));
  }
  invalidate() { this.index = null; }
}

export interface TicketRepository {
  readAll(): readonly Ticket[];
  replaceAll(tickets: Ticket[]): void;
  create(ticket: Ticket): void;
  update(previousCode: string, ticket: Ticket): void;
}
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export class LocalStorageTicketRepository implements TicketRepository {
  private storage: StoragePort;
  private key: string;
  private snapshot: readonly Ticket[];
  constructor(storage: StoragePort, seed: Ticket[], key = 'servicebank-tickets-v2') {
    this.storage = storage; this.key = key;
    const raw = storage.getItem(key);
    // Version 1 stored Colombian display dates. Migrate to canonical ISO dates.
    const loaded = (raw === null ? seed : JSON.parse(raw)) as Ticket[];
    if (!Array.isArray(loaded)) throw new Error('El almacenamiento no contiene una lista de solicitudes.');
    const migrated = loaded.map(ticket => ({ ...ticket, code: normalizeCode(ticket.code), createdAt: migrateDate(ticket.createdAt) }));
    validateTickets(migrated);
    this.snapshot = immutableCopy(migrated);
  }
  readAll() { return this.snapshot; }
  replaceAll(tickets: Ticket[]) {
    const canonical = tickets.map(ticket => ({ ...ticket, code: normalizeCode(ticket.code) }));
    validateTickets(canonical);
    const next = immutableCopy(canonical);
    // Persist first: a failed write must not change the current snapshot or index.
    this.storage.setItem(this.key, JSON.stringify(next));
    this.snapshot = next;
  }
  create(ticket: Ticket) { this.replaceAll([...this.snapshot, ticket]); }
  update(previousCode: string, ticket: Ticket) {
    const index = this.snapshot.findIndex(item => item.code === normalizeCode(previousCode));
    if (index < 0) throw new Error('No existe la solicitud que se intenta actualizar.');
    if (this.snapshot[index].id !== ticket.id) throw new Error('No se puede cambiar el identificador de una solicitud.');
    this.replaceAll(this.snapshot.map((item, position) => position === index ? ticket : item));
  }
}
function immutableCopy(tickets: Ticket[]): readonly Ticket[] {
  const copy = structuredClone(tickets);
  for (const ticket of copy) {
    ticket.events.forEach(Object.freeze); ticket.comments.forEach(Object.freeze);
    Object.freeze(ticket.events); Object.freeze(ticket.comments); Object.freeze(ticket);
  }
  return Object.freeze(copy);
}
function migrateDate(value: string): string {
  if (typeof value !== 'string') throw new Error('Fecha de creación inválida.');
  const legacy = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a|p)/i.exec(value);
  if (legacy) {
    const [, day, month, year, hour, minute, second, period] = legacy;
    const h = Number(hour) % 12 + (period.toLowerCase() === 'p' ? 12 : 0);
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${String(h).padStart(2, '0')}:${minute}:${second || '00'}-05:00`).toISOString();
  }
  if (!Number.isFinite(Date.parse(value))) throw new Error('Fecha de creación inválida.');
  return new Date(value).toISOString();
}

export function isVisible(ticket: Ticket, context: UserContext) {
  if (context.role === 'Colaborador') return ticket.requester === context.userId;
  if (context.role === 'Técnico') return ticket.assignee === context.userId;
  return ['Agente', 'Administrador'].includes(context.role);
}
export class TicketQueryService {
  private repository: TicketRepository;
  private strategy: CodeSearchStrategy;
  private preparedSnapshot: readonly Ticket[] | null = null;
  constructor(repository: TicketRepository, strategy: CodeSearchStrategy) { this.repository = repository; this.strategy = strategy; }
  query(criteria: QueryCriteria, context: UserContext): PagedResult {
    const tickets = this.repository.readAll();
    let candidates: readonly Ticket[];
    if (criteria.exactCode.trim()) {
      if (this.preparedSnapshot !== tickets) { this.strategy.prepare(tickets); this.preparedSnapshot = tickets; }
      const found = this.strategy.find(criteria.exactCode);
      candidates = found && isVisible(found, context) ? [found] : [];
    } else candidates = tickets.filter(ticket => isVisible(ticket, context));
    const text = normalizeText(criteria.subjectText);
    const filtered = candidates.filter(ticket => (!text || normalizeText(ticket.title).includes(text))
      && (!criteria.status || ticket.status === criteria.status)
      && (!criteria.priority || ticket.priority === criteria.priority)
      && (!criteria.category || ticket.category === criteria.category)
      && (!criteria.technicianId || (criteria.technicianId === '__unassigned' ? ticket.assignee === null : ticket.assignee === criteria.technicianId)));
    filtered.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
    const size = Number.isFinite(criteria.pageSize) ? Math.max(1, Math.min(100, Math.trunc(criteria.pageSize))) : 20;
    const pageCount = Math.ceil(filtered.length / size);
    const requested = Number.isFinite(criteria.page) ? Math.max(1, Math.trunc(criteria.page)) : 1;
    const page = Math.min(requested, Math.max(1, pageCount));
    return { items: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, pageCount };
  }
  create(ticket: Ticket) { this.repository.create(ticket); this.invalidate(); }
  update(previousCode: string, ticket: Ticket) { this.repository.update(previousCode, ticket); this.invalidate(); }
  replaceAll(tickets: Ticket[]) { this.repository.replaceAll(tickets); this.invalidate(); }
  private invalidate() { this.strategy.invalidate(); this.preparedSnapshot = null; }
}
export class NavigationState {
  private contextKey = '';
  private criteria = emptyCriteria();
  save(criteria: QueryCriteria, context: UserContext) { this.contextKey = `${context.role}:${context.userId}`; this.criteria = { ...criteria }; }
  restore(context: UserContext) { return this.contextKey === `${context.role}:${context.userId}` ? { ...this.criteria } : emptyCriteria(); }
  reset() { this.contextKey = ''; this.criteria = emptyCriteria(); }
}

export function generateTickets(size: number): Ticket[] {
  return Array.from({ length: size }, (_, i) => ({
    id: i + 1, code: `SB-TEST-${String(i + 1).padStart(5, '0')}`,
    title: ['Acceso al portal', 'Impresora sin respuesta', 'Actualización de software', 'Intermitencia de red'][i % 4] + ` — caso ${i + 1}`,
    description: 'Solicitud sintética para evaluación académica.',
    category: ['Acceso', 'Hardware', 'Software', 'Red'][i % 4],
    priority: ['Baja', 'Media', 'Alta', 'Crítica'][Math.floor(i / 4) % 4],
    status: ['Abierto', 'En progreso', 'Resuelto', 'Cerrado'][Math.floor(i / 16) % 4],
    requester: `Usuario Demo ${String(i % 4 + 1).padStart(2, '0')}`,
    assignee: i % 5 === 0 ? null : `Técnico Demo ${['A', 'B', 'C', 'D'][i % 4]}`,
    createdAt: new Date(Date.UTC(2026, 8, 1) + i * 60000).toISOString(), events: [], comments: [],
  }));
}
