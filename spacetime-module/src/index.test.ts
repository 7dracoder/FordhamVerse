import { describe, expect, it } from "vitest";

import { FordhamVerseModule } from "./core.js";

describe("FordhamVerseModule", () => {
  it("creates rooms, joins players, and updates pose", () => {
    const db = new FordhamVerseModule(() => 1_000);
    const room = db.create_room("Ram Lab");
    const player = db.join_room(room.code, "Maya");
    const updated = db.update_player_pose(player.id, { x: 2, y: 0, z: 4 }, 1.2);

    expect(updated.position).toEqual({ x: 2, y: 0, z: 4 });
    expect(db.sub_players(room.id)).toHaveLength(1);
  });

  it("upserts RSVP and derives learning stats", () => {
    const db = new FordhamVerseModule(() => 2_000);
    const room = db.create_room("Fordham");
    const player = db.join_room(room.code, "Alex");
    const event = db.create_event(
      room.id,
      player.id,
      "Study Sprint",
      "Algorithms at Keating",
      "building-keating",
      ["cs", "study"],
    );
    db.rsvp_event(event.id, player.id, "interested");
    db.rsvp_event(event.id, player.id, "going");
    db.launch_portal(player.id, "portal-systems-debugging");

    expect(db.sub_events(room.id).rsvps).toHaveLength(1);
    expect(db.sub_events(room.id).rsvps[0]?.status).toBe("going");
    expect(db.sub_learning_stats(room.id).find((item) => item.buildingId === "building-keating")?.activeQuestCount).toBe(1);
  });
});
