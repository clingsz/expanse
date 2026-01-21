# Expanse Development Checkpoint

**Date**: 2026-01-19

## Current State

The game is a working idle/incremental resource management game with:
- Widescreen 3-column layout (Universal Paperclips style)
- Full production chain: Mining → Smelting → Crafting → Science
- Tech tree with 3 tiers of science packs
- Combat system with threat waves

## Recently Completed: Battle System Overhaul

### New Features Implemented

1. **Player Units System**
   - Base: 20 attack/s, 1000 HP (always active)
   - Turrets: 5 attack/s each, 100 HP each (built via military-1 tech)
   - Drones: 10 attack/s each, 50 HP each (produced by drone factory)

2. **Damage Priority**
   - Enemy damage hits: Drones → Turrets → Base

3. **Repair System**
   - New resource: `repair-pack` (修复包)
   - New tech: `repair-tech` (维修学) - tier 2, requires automation-1
   - New building: `assembler-repair-pack` (修复包厂)
   - Turret repair: 3 repair packs
   - Drone repair: 1 repair pack
   - Repair only available outside combat

4. **Battle UI**
   - Status bar during combat (blue vs red HP ratio)
   - Unit boxes with HP bars
   - Damaged units pulse red
   - Info panel shows repair buttons when units damaged

5. **Space System** (earlier update)
   - Initial space: 100
   - Expander: +50 space
   - Space costs by category: Mining 5, Smelting 3, Crafting 4, Science 5, Power 5/2, Defense 2, Military 4

### Files Modified

| File | Changes |
|------|---------|
| `data.json` | +drone resource, +repair-pack resource, +repair-tech, +assembler-repair-pack, modified factory-drone-gun |
| `game.js` | Combat state tracking, new damage/attack logic, repair functions, battle tab rendering, HP helpers |
| `style.css` | Battle status bar, unit HP bars, damage pulse animation, repair button styles |

### Key Code Locations

- **Combat state**: `game.js:25-32` (gameState.combat with turretsOperational/turretsDamaged)
- **Attack power calc**: `game.js:468-481` (getPlayerAttackPower)
- **Damage application**: `game.js:493-537` (applyDamageToPlayer)
- **Repair functions**: `game.js:604-659` (repairTurret, repairDrone)
- **HP helpers**: `game.js:554-600` (getPlayerTotalHP, getPlayerMaxHP, etc.)
- **Battle tab render**: `game.js:1141-1258` (renderBattleTab with status bar)
- **Battle info panel**: `game.js:1260-1381` (renderBattleInfoPanel with repair buttons)
- **Battle CSS**: `style.css:644-745` (status bar, HP bars, damage animation, repair button)

## Game Data Structure

### Resources
- Raw: iron-ore, copper-ore, coal, stone
- Material: iron-plate, copper-plate, steel, gear, circuit, repair-pack
- Energy: energy
- Science: science-red, science-green, science-blue
- Military: drone
- Meta: space

### Technologies (by tier)
- Tier 1: automation-1, military-1
- Tier 2: basic-electronics, steel-smelting, repair-tech
- Tier 3: solar-energy, military-2

### Enemies
- basic-bug (50 HP, 10 attack)
- medium-bug (120 HP, 25 attack) - defined but not spawned yet
- big-bug (300 HP, 50 attack) - defined but not spawned yet

## Known Issues / TODO

- Medium and big bugs are defined but only basic-bug spawns currently
- Wave spawning could be enhanced to include varied enemy types at higher threat levels
- No save/load system yet

## How to Run

```bash
cd /Users/clingsz/code/expanse
python3 -m http.server 8000
# Open http://localhost:8000
```

## Testing the Battle System

1. Build expanders to increase threat level to 2+
2. Research military-1, build turrets
3. Research automation-1 → repair-tech, build repair pack factory
4. Wait for enemy wave to spawn
5. Watch the battle status bar during combat
6. After combat, click damaged units to see repair buttons
