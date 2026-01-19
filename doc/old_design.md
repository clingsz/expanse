# Expansion Front - Old Design Summary

**Summary Date:** 2025-01-18
**Original Project:** expansion (forked from clingsz/expansion)
**Game Type:** Text-based Strategy / Automation / Roguelike Progression
**Platform:** Web (HTML/JavaScript)

---

## Overview

"Expansion Front" (扩张前线) is a simplified Factorio-style game focused on **production chain optimization**, **technology research**, **resource management**, and **region progression**. Players build automated factories, produce drones and ammunition, and conquer bug-infested regions one by one.

---

## Core Game Loop

```
Gather Resources → Build Factories → Produce Materials → Research Tech →
Manufacture Drones → Conquer New Regions → Gain More Slots & Resources → Repeat
```

**Main Objective:** Conquer 20 regions, defeat 5 bosses, complete the game.

---

## Key Systems

### 1. Region System
- **20 total regions** across 4 phases
- **Boss battles** every 4 regions (regions 4, 8, 12, 16, 20)
- Linear progression - cannot skip regions
- Each region has 10-20 building slots and various resource nodes

### 2. Building System
- **Building Categories:**
  - Mining (Miners Mk1/2/3, Oil Pump, Uranium Miner)
  - Production (Furnace, Electric Furnace, Assemblers Mk1/2/3, Chemical Plant, Nuclear Processor)
  - Power (Coal Power, Wind, Solar, Oil Power, Nuclear Reactor, Fusion Reactor)
  - Infrastructure (Warehouse, Battery, Research Center)
- Slot-based placement (buildings occupy 0.5-3 slots)
- Military items produced in standard assemblers (no dedicated military buildings)

### 3. Production/Recipe System
- Recipe-based production with progress tracking (0.0 to 1.0)
- Categories: smelting, crafting, chemical, science, nuclear, military
- Buildings have speed multipliers affecting production rate
- Automatic material checking and output capacity limits

### 4. Technology Tree
- **34 technologies** across multiple branches:
  - Automation (Assemblers, Mining efficiency)
  - Military (Weapons, Drones, Laser, Nuclear)
  - Industrial (Smelting, Chemical, Nuclear power)
  - Infrastructure (Storage, Energy efficiency)
- Research consumes science packs continuously (Factorio-style)
- Unlocks buildings, recipes, and upgrades

### 5. Combat System
- **Real-time automated combat** - no player control during battle
- **6 drone types** with specializations:
  - Machine Gun Drone (general purpose)
  - Heavy Machine Gun Drone (anti-armor)
  - Flamethrower Drone (anti-swarm, AOE)
  - Laser Drone (anti-shield)
  - Plasma Drone (penetrating)
  - Artillery Drone (anti-boss)
- Counter system with 2x damage bonuses
- Ammunition and power consumption during battles
- Retreat mechanic available

### 6. Enemy Types
- **32 enemy types** across 4 phases:
  - Phase 1: Small Worker Bug, Medium Warrior Bug, Armored Beetle
  - Phase 2: Fast Hunter, Energy Shield Bug, Heavy Tank, Elite King
  - Phase 3: Irradiated Worker, Toxic Beetle, Mutant Swarm, Radiation Hunter, Heavy Mutant Tank, Mutant Queen
  - Phase 4: Crystal Guardian, Energy Being, Quantum Bug, Phase Shifter, Fusion Elite
- **5 Bosses:**
  - Region 4: Armored Colossus (12,000 HP)
  - Region 8: Energy Core Bug (20,000 HP)
  - Region 12: Nest Mother (32,000 HP)
  - Region 16: Quantum Overlord (50,000 HP, 3 phases)
  - Region 20: Ultimate Swarm Lord (60,000 HP, 3 phases)

### 7. Power System
- Day/night cycle (5 minutes total: 3 min day, 2 min night)
- Solar power varies with time of day
- Priority-based power distribution when insufficient
- Combat consumes large amounts of power for laser/plasma drones

---

## Game Phases

### Phase 1: Basic Industry (Regions 1-4)
- Resources: Iron, Copper, Coal
- Focus: Automation basics, basic weapons
- Boss: Armored Colossus (requires armor-piercing ammo)

### Phase 2: Chemical Era (Regions 5-8)
- New resources: Oil
- Products: Plastic, Battery, Explosives
- Focus: Laser weapons, advanced assembly
- Boss: Energy Core Bug (requires laser weapons)

### Phase 3: Nuclear Era (Regions 9-14)
- New resources: Uranium
- Products: Nuclear fuel, Plasma charges
- New enemies: Radiation-based mutants
- Boss: Nest Mother (sustained battle, mass spawning)

### Phase 4: Ultimate Era (Regions 15-20)
- New resources: Quantum materials
- Products: Antimatter, Nanomaterials, Fusion cells
- New buildings: Fusion Reactor (1000 power), Quantum Research Lab (5x speed)
- Bosses: Quantum Overlord, Ultimate Swarm Lord (3-phase battles)

---

## Balance (as of 2025-12-13)

**Combat Difficulty:**
- Enemy HP: 4x base (Small Bug: 200 HP)
- Enemy Attack: 2.5x base (Small Bug: 25 damage)
- Enemy Counts: 3.5x per region (Region 2: 35 bugs)

**Army Requirements:**
- Early game: 20-30 drones
- Mid game: 40-50 drones
- Late game: 60-80 drones
- End game: 100 drones (max capacity)

**Estimated Playtime:** 4-5 hours for full completion

---

## Technical Implementation

### File Structure
```
index.html      - Main UI
game.js         - Core logic (~4200 lines)
style.css       - Cyberpunk dark theme
data.json       - Consolidated game data
```

### UI Design
- Single-page application with tab navigation
- 5 main tabs: Region, Build, Tech, Storage, Map
- Cyberpunk aesthetic with neon color themes per tab
- Modal dialogs for building management and recipe selection

### Key Code Locations
- Initial resources: game.js:591-601
- Region screen: game.js:740-757
- Building management: game.js:1218-1470
- Main game loop: game.js:3640-3696
- Production logic: game.js:3709-3734

---

## Design Principles

1. **Simplified but not Simple** - Remove map/logistics complexity, keep production depth
2. **Strategy over Action** - Focus on planning and optimization
3. **Progressive Complexity** - Easy start, deep late-game
4. **Clear Progression** - Each region is a milestone

---

## Original Documentation Files

The following files were consolidated into this summary:
- `GAME_DESIGN.md` - Complete game design document
- `UI_DESIGN.md` - Interface design specifications
- `COMBAT_DESIGN.md` - Combat system mechanics
- `DEVELOPER_MANUAL.md` - Technical development guide
- `RECIPE_PRODUCTION_SYSTEM.md` - Production system implementation
- `REBALANCE_SUMMARY.md` - 2025-12-13 balance changes
- `CONTENT_EXTENSION_PLAN.md` - Content expansion roadmap
- `THEME_COLORS.md` - UI theme color system
- `overview.md` - Documentation navigation

All original files are archived in `doc/old/` for reference.

---

*Last Updated: 2025-01-18*
