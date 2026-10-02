import { IndexedCodeSearch, SequentialCodeSearch, LocalStorageTicketRepository, TicketQueryService, generateTickets, emptyCriteria } from './navigation.ts';
import type { CodeSearchStrategy, QueryCriteria, Ticket } from './navigation.ts';
export type Measurement = { datasetSize: number; strategy: string; scenario: string; phase: string; repetitions: number; batchSize: number; durationsMs: number[]; medianMs: number; p10Ms: number; p90Ms: number; checksum: number };
export type BenchmarkReport = { author: string; executedAt: string; environment: string; sizes: number[]; warmup: number; repetitions: number; batchSize: number; measurements: Measurement[]; limitations: string[] };
function percentile(values: number[], fraction: number) { const sorted = [...values].sort((a, b) => a - b); const position = (sorted.length - 1) * fraction; const lower = Math.floor(position); return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower); }
function measurement(size: number, strategy: string, scenario: string, phase: string, batch: number, durations: number[], checksum: number): Measurement {
  return { datasetSize: size, strategy, scenario, phase, repetitions: durations.length, batchSize: batch, durationsMs: durations, medianMs: percentile(durations, .5), p10Ms: percentile(durations, .1), p90Ms: percentile(durations, .9), checksum };
}
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));
export async function runBenchmark(environment: string, progress: (text: string) => void = () => {}): Promise<BenchmarkReport> {
  const sizes = [100, 1000, 10000], repetitions = 20, batch = 1000, warmup = 20, measurements: Measurement[] = [];
  for (const size of sizes) {
    progress(`Evaluando ${size.toLocaleString('es-CO')} solicitudes…`); await pause();
    const data = generateTickets(size), factories = [() => new SequentialCodeSearch(), () => new IndexedCodeSearch()];
    const scenarios = [{ name: 'Inicio', code: data[0].code }, { name: 'Mitad', code: data[Math.floor(size / 2)].code }, { name: 'Final', code: data[size - 1].code }, { name: 'Inexistente', code: 'SB-NO-EXISTE' }];
    const preparation: number[][] = [[], []];
    // Alternate order to reduce systematic warmup/order bias. Allocation included.
    for (let repetition = 0; repetition < repetitions; repetition++) {
      for (const index of repetition % 2 ? [1, 0] : [0, 1]) {
        const start = performance.now(); const strategy = factories[index](); strategy.prepare(data); preparation[index].push(performance.now() - start);
      }
    }
    const strategies: CodeSearchStrategy[] = factories.map(factory => { const strategy = factory(); strategy.prepare(data); return strategy; });
    strategies.forEach((strategy, i) => measurements.push(measurement(size, strategy.name, 'Preparar', 'Preparación', 1, preparation[i], 0)));
    for (const scenario of scenarios) {
      const samples: number[][] = [[], []], sums = [0, 0];
      strategies.forEach(strategy => { for (let w = 0; w < warmup; w++) strategy.find(scenario.code); });
      const batches = [batch, batch * 10];
      for (let repetition = 0; repetition < repetitions; repetition++) {
        for (const index of repetition % 2 ? [1, 0] : [0, 1]) {
          const start = performance.now(); let sum = 0;
          for (let count = 0; count < batches[index]; count++) sum += strategies[index].find(scenario.code)?.id || 0;
          samples[index].push((performance.now() - start) / batches[index]); sums[index] += sum;
        }
        if (repetition % 5 === 4) await pause();
      }
      if (sums[0] / batches[0] !== sums[1] / batches[1]) throw new Error('Las estrategias produjeron resultados diferentes.');
      strategies.forEach((strategy, i) => measurements.push(measurement(size, strategy.name, scenario.name, 'Consulta preparada', batches[i], samples[i], sums[i])));
      await pause();
    }
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const repository = new LocalStorageTicketRepository(storage, data, 'benchmark-only');
    const services = factories.map(factory => new TicketQueryService(repository, factory()));
    const context = { userId: 'Agente demo', role: 'Agente' };
    const criteria: { name: string; value: QueryCriteria }[] = [
      { name: 'Código final y visibilidad', value: { ...emptyCriteria(), exactCode: data[size - 1].code } },
      { name: 'Texto, filtros, orden y página', value: { ...emptyCriteria(), subjectText: 'red', status: 'Abierto', page: 2 } },
    ];
    for (const scenario of criteria) {
      const samples: number[][] = [[], []], sums = [0, 0];
      const expected = services.map(service => service.query(scenario.value, context));
      if (JSON.stringify(expected[0]) !== JSON.stringify(expected[1])) throw new Error('El recorrido completo produjo resultados diferentes.');
      const serviceBatch = scenario.value.exactCode ? 1000 : 10;
      for (let repetition = 0; repetition < repetitions; repetition++) {
        for (const index of repetition % 2 ? [1, 0] : [0, 1]) {
          const start = performance.now(); let sum = 0;
          for (let count = 0; count < serviceBatch; count++) sum += services[index].query(scenario.value, context).total;
          samples[index].push((performance.now() - start) / serviceBatch); sums[index] += sum;
        }
        await pause();
      }
      strategies.forEach((strategy, i) => measurements.push(measurement(size, strategy.name, scenario.name, 'Servicio completo en memoria', serviceBatch, samples[i], sums[i])));
      await pause();
    }
  }
  return { author: 'Adriana Ramirez Bernal', executedAt: new Date().toISOString(), environment, sizes, warmup, repetitions, batchSize: batch, measurements, limitations: [
    'Datos sintéticos deterministas; resultados dependientes del equipo, motor y carga de ejecución.',
    'La consulta preparada excluye construcción del índice y persistencia.',
    'El servicio completo incluye lectura de la instantánea en memoria, visibilidad, filtros, orden y página; excluye carga JSON inicial y renderizado de la interfaz.',
    'La búsqueda textual no usa el índice por código.',
    'Lotes de 1.000 consultas secuenciales y 10.000 indexadas; servicio por código: 1.000; servicio textual: 10. Se informa tiempo por operación.',
    'No evalúa concurrencia, servidor ni base de datos compartida; tiempos muy pequeños tienen precisión limitada. Un cero significa que el reloj no resolvió la duración, no que la operación sea instantánea.',
  ] };
}
export function reportCSV(report: BenchmarkReport): string {
  const lines = ['tamaño;estrategia;escenario;fase;repetición;lote;ms_por_operación'];
  for (const m of report.measurements) m.durationsMs.forEach((duration, i) => lines.push(`${m.datasetSize};${m.strategy};${m.scenario};${m.phase};${i + 1};${m.batchSize};${duration}`));
  return '\uFEFF' + lines.join('\n');
}
