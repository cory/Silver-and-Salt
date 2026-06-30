const base = process.argv[2];
if (!base) throw new Error("Usage: tsx scripts/smoke.ts <base-url>");

async function check(path: string, expect = 200) {
  const url = new URL(path, base).toString();
  const res = await fetch(url);
  return { path, status: res.status, ok: res.status === expect };
}

const results = await Promise.all([
  check("/"),
  check("/join.html"),
  check("/members"),
  check("/profile"),
  check("/admin"),
  check("/api/health"),
  check("/api/config/public"),
]);
const ok = results.every((r) => r.ok);
console.log(JSON.stringify({ ok, base, results, checkedAt: new Date().toISOString() }, null, 2));
if (!ok) process.exit(1);
