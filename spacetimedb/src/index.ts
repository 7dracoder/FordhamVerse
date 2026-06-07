import { schema, table, t } from 'spacetimedb/server';

/**
 * FordhamVerse Live multiplayer presence.
 *
 * A single `player` table holds one row per connected client (keyed by their
 * SpacetimeDB identity). Clients in the same `room` code see each other move in
 * real time. Rows are removed on disconnect so presence stays accurate.
 */
const player = table(
  { name: 'player', public: true },
  {
    identity: t.identity().primaryKey(),
    room: t.string().index('btree'),
    name: t.string(),
    color: t.string(),
    x: t.f32(),
    y: t.f32(),
    z: t.f32(),
    rot: t.f32(),
    online: t.bool(),
  }
);

const spacetimedb = schema({ player });
export default spacetimedb;

export const onConnect = spacetimedb.clientConnected((ctx) => {
  const existing = ctx.db.player.identity.find(ctx.sender);
  if (existing) ctx.db.player.identity.update({ ...existing, online: true });
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  if (ctx.db.player.identity.find(ctx.sender)) {
    ctx.db.player.identity.delete(ctx.sender);
  }
});

/** Join (or re-join) a room. Spawns the caller at the campus south entrance. */
export const enterGame = spacetimedb.reducer(
  { room: t.string(), name: t.string(), color: t.string() },
  (ctx, { room, name, color }) => {
    const trimmedName = name.slice(0, 32);
    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) {
      ctx.db.player.identity.update({
        ...existing,
        room,
        name: trimmedName,
        color,
        online: true,
      });
    } else {
      ctx.db.player.insert({
        identity: ctx.sender,
        room,
        name: trimmedName,
        color,
        x: 0,
        y: 0,
        z: 14,
        rot: Math.PI,
        online: true,
      });
    }
  }
);

/** Stream the caller's avatar transform to everyone else in the room. */
export const updateTransform = spacetimedb.reducer(
  { x: t.f32(), y: t.f32(), z: t.f32(), rot: t.f32() },
  (ctx, { x, y, z, rot }) => {
    const existing = ctx.db.player.identity.find(ctx.sender);
    if (!existing) return;
    ctx.db.player.identity.update({ ...existing, x, y, z, rot });
  }
);

/** Explicit leave (also handled automatically on disconnect). */
export const leaveGame = spacetimedb.reducer((ctx) => {
  if (ctx.db.player.identity.find(ctx.sender)) {
    ctx.db.player.identity.delete(ctx.sender);
  }
});
