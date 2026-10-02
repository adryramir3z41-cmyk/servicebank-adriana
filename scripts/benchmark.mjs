import { writeFile, mkdir } from 'node:fs/promises';
import { runBenchmark, reportCSV } from '../lib/benchmark.ts';
import os from 'node:os';
const report = await runBenchmark(`Node ${process.version}; ${os.platform()} ${os.release()}; ${os.cpus()[0]?.model}`, console.log);
await mkdir('docs/resultados', { recursive: true });
await writeFile('docs/resultados/benchmark-node.json', JSON.stringify(report, null, 2));
await writeFile('docs/resultados/benchmark-node.csv', reportCSV(report));
console.log('Mediciones guardadas en docs/resultados. No equivalen a tiempos del navegador.');
