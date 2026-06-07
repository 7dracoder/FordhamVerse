# Frontend Subscriptions

Generated bindings can subscribe with SQL:

```ts
connection.subscriptionBuilder().subscribe([
  `SELECT * FROM rooms WHERE id = '${roomId}'`,
  `SELECT * FROM players WHERE room_id = '${roomId}'`,
  `SELECT * FROM events WHERE room_id = '${roomId}'`,
  "SELECT * FROM event_rsvps",
  "SELECT * FROM buildings",
  "SELECT * FROM learning_portals",
  `SELECT * FROM player_quests WHERE player_id = '${playerId}'`,
  `SELECT * FROM learning_stats WHERE room_id = '${roomId}'`
]);
```

Generate TypeScript client bindings:

```bash
npm run generate:client -w spacetime-module
```
