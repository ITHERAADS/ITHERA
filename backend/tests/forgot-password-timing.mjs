import process from 'node:process';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, ...rest] = arg.split('=');
    return [k.replace(/^--/, ''), rest.join('=')];
  }),
);

const baseUrl = args.url || process.env.TIMING_URL || 'http://localhost:3001/api/auth/forgot-password';
const existingEmail = args.existing || process.env.TIMING_EXISTING_EMAIL || 'demian0106@gmail.com';
const missingEmail = args.missing || process.env.TIMING_MISSING_EMAIL || `noexiste_${Date.now()}@example.com`;
const samples = Number(args.samples || process.env.TIMING_SAMPLES || 20);
const warmup = Number(args.warmup || process.env.TIMING_WARMUP || 3);
const delayMs = Number(args.delay || process.env.TIMING_DELAY_MS || 120);

if (!Number.isFinite(samples) || samples <= 0) {
  console.error('`samples` debe ser mayor a 0');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function oneRequest(email) {
  const started = performance.now();
  let status = 0;
  let bodyText = '';
  let ok = false;
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    status = response.status;
    bodyText = await response.text();
    ok = response.ok;
  } catch (err) {
    bodyText = err instanceof Error ? err.message : String(err);
  }
  const elapsedMs = performance.now() - started;
  return { elapsedMs, status, ok, bodyText };
}

function summarize(label, rows) {
  const times = rows.map((r) => r.elapsedMs).sort((a, b) => a - b);
  const pick = (p) => times[Math.min(times.length - 1, Math.max(0, Math.ceil((p / 100) * times.length) - 1))];
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const statuses = rows.reduce((acc, row) => {
    const key = String(row.status || 'ERR');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return {
    label,
    n: rows.length,
    avg,
    p50: pick(50),
    p95: pick(95),
    min: times[0],
    max: times[times.length - 1],
    statuses,
  };
}

function fmt(summary) {
  const s = summary;
  return `${s.label}\n  n=${s.n}\n  avg=${s.avg.toFixed(1)} ms\n  p50=${s.p50.toFixed(1)} ms\n  p95=${s.p95.toFixed(1)} ms\n  min=${s.min.toFixed(1)} ms\n  max=${s.max.toFixed(1)} ms\n  status=${JSON.stringify(s.statuses)}`;
}

(async () => {
  console.log(`Endpoint: ${baseUrl}`);
  console.log(`Existing email: ${existingEmail}`);
  console.log(`Missing email: ${missingEmail}`);
  console.log(`Warmup: ${warmup}, Samples: ${samples}, Delay: ${delayMs}ms`);

  for (let i = 0; i < warmup; i += 1) {
    await oneRequest(existingEmail);
    await oneRequest(missingEmail);
    await sleep(delayMs);
  }

  const existingRows = [];
  const missingRows = [];

  for (let i = 0; i < samples; i += 1) {
    existingRows.push(await oneRequest(existingEmail));
    await sleep(delayMs);
    missingRows.push(await oneRequest(missingEmail));
    await sleep(delayMs);
  }

  const existingSummary = summarize('EXISTING', existingRows);
  const missingSummary = summarize('MISSING', missingRows);

  const avgDelta = Math.abs(existingSummary.avg - missingSummary.avg);
  const p95Delta = Math.abs(existingSummary.p95 - missingSummary.p95);

  console.log('\n=== Timing Summary ===');
  console.log(fmt(existingSummary));
  console.log(fmt(missingSummary));
  console.log(`\nDelta abs(avg) = ${avgDelta.toFixed(1)} ms`);
  console.log(`Delta abs(p95) = ${p95Delta.toFixed(1)} ms`);

  const anyConnectionErrors = [...existingRows, ...missingRows].some((r) => r.status === 0);
  if (anyConnectionErrors) {
    console.log('\nWarning: hubo errores de conexión o respuesta no HTTP.');
  }
})();
