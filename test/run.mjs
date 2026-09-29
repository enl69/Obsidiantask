import { createRequire } from "module";
const require = createRequire(import.meta.url);
const assert = require("assert");
const M = require("./entry.bundle.cjs");

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((e) => {
      failed++;
      console.log(`  ✗ ${name}`);
      console.log(`      ${String(e.message).split("\n")[0]}`);
    });
}

(async () => {
  console.log("\n=== UNIT: skeleton ===");
  await test("onload mendaftarkan command open-panel", async () => {
    M.registeredCommands.length = 0;
    const plugin = new M.ObsidiantaskPlugin();
    await plugin.onload();
    assert.ok(
      M.registeredCommands.some((c) => c.id === "open-panel"),
      "command open-panel harus terdaftar"
    );
  });

  await test("onload idempotent (dipanggil ulang tidak error)", async () => {
    M.registeredCommands.length = 0;
    const plugin = new M.ObsidiantaskPlugin();
    await plugin.onload();
    await plugin.onload();
    assert.equal(
      M.registeredCommands.filter((c) => c.id === "open-panel").length,
      2
    );
  });

  await test("onunload tidak throw", async () => {
    const plugin = new M.ObsidiantaskPlugin();
    await plugin.onload();
    plugin.onunload();
  });

  console.log(`\n=== HASIL: ${passed} lulus, ${failed} gagal ===`);
  process.exit(failed > 0 ? 1 : 0);
})();
