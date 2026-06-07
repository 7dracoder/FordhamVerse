// Headless two-client verification of the SpacetimeDB multiplayer round-trip.
// Run: pnpm dlx tsx scripts/mp-test.mts   (from artifacts/fordhamverse)
import { DbConnection } from "../src/module_bindings/index.ts";

const URI = process.env["STDB_URI"] || "http://127.0.0.1:3000";
const MODULE = "fordhamverse";
const ROOM = "RAMS";

type Conn = Awaited<ReturnType<typeof connect>>["conn"];

function connect(name: string): Promise<{ conn: any; id: string }> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${name} connect timeout`)), 8000);
    DbConnection.builder()
      .withUri(URI)
      .withDatabaseName(MODULE)
      .onConnect((conn: any, identity: any) => {
        clearTimeout(t);
        resolve({ conn, id: identity.toHexString() });
      })
      .onConnectError((_ctx: any, err: any) => {
        clearTimeout(t);
        reject(err);
      })
      .build();
  });
}

function subscribe(conn: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("subscribe timeout")), 8000);
    conn
      .subscriptionBuilder()
      .onApplied(() => {
        clearTimeout(t);
        resolve();
      })
      .onError((ctx: any) => {
        clearTimeout(t);
        reject(ctx.event ?? new Error("subscription error"));
      })
      .subscribe(`SELECT * FROM player WHERE room = '${ROOM}'`);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let failures = 0;
  const log = (ok: boolean, msg: string) => {
    console.log(`${ok ? "PASS" : "FAIL"}: ${msg}`);
    if (!ok) failures++;
  };

  console.log("Connecting client A (Alice)...");
  const a = await connect("A");
  console.log("  A identity:", a.id.slice(0, 12), "...");
  console.log("Connecting client B (Bob)...");
  const b = await connect("B");
  console.log("  B identity:", b.id.slice(0, 12), "...");

  // A observes the room and records events about B.
  let aSawBInsert = false;
  let aSawBMove = false;
  let aSawBDelete = false;
  a.conn.db.player.onInsert((_c: any, row: any) => {
    if (row.identity.toHexString() === b.id) aSawBInsert = true;
  });
  a.conn.db.player.onUpdate((_c: any, _old: any, row: any) => {
    if (row.identity.toHexString() === b.id && Math.abs(row.x - 5) < 0.001) {
      aSawBMove = true;
    }
  });
  a.conn.db.player.onDelete((_c: any, row: any) => {
    if (row.identity.toHexString() === b.id) aSawBDelete = true;
  });

  await subscribe(a.conn);
  await subscribe(b.conn);

  a.conn.reducers.enterGame({ room: ROOM, name: "Alice", color: "#22c55e" });
  b.conn.reducers.enterGame({ room: ROOM, name: "Bob", color: "#38bdf8" });

  await wait(1500);
  log(aSawBInsert, "A sees B join the room (enterGame → onInsert)");

  // B moves; A should receive the transform update.
  b.conn.reducers.updateTransform({ x: 5, y: 0, z: 2, rot: 1.2 });
  await wait(1500);
  log(aSawBMove, "A sees B move (updateTransform → onUpdate, x=5)");

  // B leaves; A should see the row removed.
  b.conn.reducers.leaveGame({});
  await wait(1500);
  log(aSawBDelete, "A sees B leave (leaveGame → onDelete)");

  a.conn.disconnect();
  b.conn.disconnect();

  await wait(300);
  console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
