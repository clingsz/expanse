# First Revision - Clarification Questions

**Date:** 2026-01-18
**Status:** ANSWERED - Incorporated into Plan

---

Please answer the following questions to help finalize the revision plan:

---

## Question 1: Space/Land Naming

You mentioned "slots" should be renamed to something like "space" or "land."

**Options:**
- A) **Space** - "You have 15/20 Space"
- B) **Land** - "You have 15/20 Land"
- C) **Territory** - "You have 15/20 Territory"
- D) **Capacity** - "You have 15/20 Capacity"
- E) Other (please specify)

**Your choice:** ___
Space
---

## Question 2: Combat Trigger Mechanism

You mentioned enemies attack based on threat level. How should this work?

**Options:**
- A) **Time-based:** Fixed interval (e.g., every 60 seconds), intensity scales with threat
- B) **Accumulating:** Threat builds up over time, triggers attack when threshold reached
- C) **Random:** Random attacks with probability based on threat level
- D) **Milestone:** Attacks trigger when you build certain things or reach thresholds

**Your choice:** ___
A time based. Enemy only appears when timer is up, and only when threat level is larger than a certain threshold  -- to protect early game.
---

## Question 3: Defeat Condition

What happens when the base health reaches zero?

**Options:**
- A) **Game Over:** Reset everything, start fresh
- B) **Setback:** Lose some buildings/resources, continue playing
- C) **Prestige:** Reset with permanent bonuses (classic idle game mechanic)
- D) **Damage Only:** Lose production capacity until repaired, never fully "lose"

**Your choice:** ___
game over
Let's treat in the battle tab, player's building/unit will be in an order list. Base will be the last one in the list, units will be front, defend buildings will be in the middle. Hence, when eney is attacking, the units in the front of the list will take damage first, and damage pass on as first units dead. This is same for the enemy units (and buildings in future, for first version let's just keep it simple).
---

## Question 4: Research System

Should the research/technology system change significantly?

**Options:**
- A) **Keep similar:** Research consumes science packs, unlocks buildings/upgrades
- B) **Simplify:** Research is automatic over time, just choose what to research
- C) **Milestone-based:** Technologies unlock when you reach certain resource/building counts
- D) **Remove:** No research, all buildings available from start (unlocked by having prerequisites)

**Your choice:** ___A

---

## Question 5: Victory/End Game

What is the end goal of the game now?

**Options:**
- A) **Endless:** No end, just keep growing (pure idle)
- B) **Boss defeats:** Defeat X major threats to "win"
- C) **Resource milestone:** Reach a massive resource goal (e.g., 1 trillion iron)
- D) **Prestige loop:** Multiple resets with increasing difficulty and rewards
- E) **Build ultimate structure:** Build a final mega-building that requires everything

**Your choice:** ___
A
---

## Additional Comments

If you have any other thoughts, preferences, or constraints, please add them here:

```
Energy Blackout: Since Energy is now a stored resource (Charge), what happens if it hits 0? Does the factory shut down completely (waiting for solar/wind recharge), or do you have a manual "Emergency Crank" to click?

Answer: energy is a resource. So when other buildings are working, they need to consume (1 energy, 2 iron ore) and produce 1 iron plate...like this. If there's not enough resource, then cannot make produce, and don't count the consumption.
```

---

*Once these are answered, I'll update the revision plan and we can begin implementation.*
