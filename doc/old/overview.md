# 📚 Expansion Front - Documentation Overview
## 《扩张前线》文档总览

**Last Updated:** 2025-12-13
**Project Status:** Active Development
**GitHub:** https://github.com/clingsz/expansion

---

## 🎯 Quick Start

**New to the project?** Start here:
1. Read [Game Design](GAME_DESIGN.md) to understand the core gameplay
2. Check [Developer Manual](DEVELOPER_MANUAL.md) for development setup
3. Review [Project State](../log/state_20251213_164910.md) for current status

**Adding features?** Reference:
1. [Developer Manual](DEVELOPER_MANUAL.md) - Code structure and patterns
2. [Recipe Production System](RECIPE_PRODUCTION_SYSTEM.md) - Production mechanics
3. [Theme Colors](THEME_COLORS.md) - UI styling guide

---

## 📖 Core Design Documents

### [Game Design](GAME_DESIGN.md)
**Original:** 扩张前线_游戏设计文档.md
**Version:** 1.2 (Updated 2025-12-13)

Complete game design document covering:
- Core game loop and mechanics
- Resource management system
- Building and production chains
- Technology tree structure
- 20-region progression system (complete)
- Enemy types and boss battles

**Key Updates (2025-12-13) - MAJOR REBALANCE:**
- **Enemy HP:** 4x increase (e.g., Small Worker Bug: 50 → 200 HP)
- **Enemy Attack:** 2.5x increase (e.g., Small Worker Bug: 10 → 25 attack)
- **Enemy Counts:** 3.5x increase (e.g., Region 2: 10 → 35 bugs)
- **Boss Placement:** Every 4 regions (4, 8, 12, 16, 20) instead of 5
- **New Content:** Regions 11-20, Phase 3 & 4 enemies, 7 new technologies
- **Game is now significantly harder** - 10 drones can no longer steamroll
- See [REBALANCE_SUMMARY.md](REBALANCE_SUMMARY.md) for full details

**Previous Updates (2025-12-07):**
- Simplified military system (all military items produced in assemblers)
- Unified building slots (16 per region)
- Debug mode with accelerated research (10x speed)
- Factorio-style continuous science consumption

---

### [UI Design](UI_DESIGN.md)
**Original:** 扩张前线_界面设计文档.md
**Version:** 1.0

UI/UX design specifications:
- Tab-based navigation (Region, Build, Tech, Storage, Map)
- Screen layout and component structure
- User interaction flows
- Modal dialogs and notifications
- Responsive design considerations

**Tech Stack:**
- Pure HTML/CSS/JavaScript (no frameworks)
- Single-page application design
- Dark theme with cyberpunk aesthetics

---

### [Combat System Design](COMBAT_DESIGN.md)
**Original:** 扩张前线-战斗系统设计.md
**Version:** 2.0 (Updated 2024-12-04)

Real-time automated combat system:
- 6 drone unit types with specializations
- Enemy types and BOSS mechanics
- Target prioritization and counter-system
- Ammunition consumption and retreat mechanics
- Battle balance and DPS calculations

**Key Features:**
- Automatic intelligent targeting
- Unit type counters (2x damage bonuses)
- Real-time resource consumption
- No mid-battle control (preparation-focused)

---

## 🛠️ Technical Documentation

### [Developer Manual](DEVELOPER_MANUAL.md)
**Version:** 1.0 (Updated 2025-12-07)

**Essential reading for development:**
- Project structure and file organization
- Testing and debugging procedures
- Common issues and solutions
- Data file format specifications
- Game loop architecture
- Performance optimization guidelines

**Quick Reference:**
```
game.js:591-601    - Initial resources (DEBUG)
game.js:740-757    - Region screen update
game.js:1218-1470  - Building management modal
game.js:3640-3696  - Main game loop
game.js:3709-3734  - Production logic
```

---

### [Recipe Production System](RECIPE_PRODUCTION_SYSTEM.md)
**Status:** Implementation Guide

Detailed implementation of the production system:
- Recipe execution logic
- Building-recipe associations
- Progress tracking (0.0 to 1.0)
- Material checking and output limits
- Recipe selection UI
- Production chain examples

**Production Flow:**
```
Mining → Smelting → Crafting → Military/Science
```

---

### [Theme Colors](THEME_COLORS.md)
**Status:** Implementation Guide

Multi-color neon theme system:
- 🔵 Region (Cyan): `#00f3ff`
- 🟠 Build (Orange): `#ff9500`
- 🟣 Tech (Purple): `#b967ff`
- 🟢 Storage (Green): `#00ff88`
- 🟡 Map (Yellow): `#ffdd00`

Dynamic theme switching with smooth transitions (0.5s).

---

## 📊 Data Structure Reference

### Game Data Files (data.json)
All game data consolidated into single file:

| Data Type | Count | Description | Change (2025-12-13) |
|-----------|-------|-------------|---------------------|
| **Items** | 41 | Raw materials, components, ammo, science packs | +6 (Phase 3/4 items) |
| **Buildings** | 25 | Miners, furnaces, assemblers, power plants | +2 (Fusion reactor, Quantum lab) |
| **Recipes** | 32 | Smelting, crafting, chemical, military, nuclear | +6 (Phase 3/4 recipes) |
| **Technologies** | 34 | Research tree with prerequisites | +7 (Advanced techs) |
| **Units** | 6 | Drone types with different weapons | - |
| **Enemies** | 32 | Bug types, beetles, bosses | +18 (Phase 3/4 enemies) |
| **Regions** | 20 | Zones with resources and enemies | +10 (Regions 11-20) |

**Data Format:** JSON
**Location:** `/data.json` (consolidated from 7 separate files)
**Latest Changes:** [REBALANCE_SUMMARY.md](REBALANCE_SUMMARY.md)

---

## 🏗️ Project Structure

```
expansion/
├── index.html              # Main game UI
├── game.js                 # Core game logic (176K, ~4200 lines)
├── style.css               # Cyberpunk dark theme (73K)
├── data.json               # Consolidated game data (50K)
├── run.sh                  # Quick start script
│
├── doc/                    # Documentation (you are here)
│   ├── overview.md         # This file - documentation catalog
│   ├── GAME_DESIGN.md      # Core game design
│   ├── UI_DESIGN.md        # Interface design
│   ├── COMBAT_DESIGN.md    # Combat system
│   ├── DEVELOPER_MANUAL.md # Technical guide
│   ├── REBALANCE_SUMMARY.md # 2025-12-13 major balance changes
│   ├── CONTENT_EXTENSION_PLAN.md # Content expansion roadmap
│   ├── RECIPE_PRODUCTION_SYSTEM.md
│   ├── THEME_COLORS.md
│   └── old/                # Archived/outdated docs
│
├── tests/                  # Test scripts
│   ├── validate_data.js
│   ├── simulate.js
│   └── test_mining.js
│
├── backup/                 # File backups
└── log/                    # Session logs and state files
    └── state_20251213_164910.md  # Latest project state
```

---

## 🎮 Current Implementation Status

### ✅ Completed Systems
- [x] Resource management and storage
- [x] Building system with categories
- [x] Recipe production chains
- [x] Technology research tree (34 technologies)
- [x] Power generation and consumption
- [x] Day/night cycle
- [x] Multi-tab UI with theme colors
- [x] Save/Load system
- [x] Combat system with automated battles
- [x] Region progression system (20 regions complete)
- [x] **All 5 BOSS encounters** (regions 4, 8, 12, 16, 20)
- [x] **Phase 3 & 4 content** (nuclear and fusion era)
- [x] **Major balance pass** (2025-12-13)

### 🚧 In Progress
- [ ] Fine-tuning combat balance
- [ ] Playtesting late-game content
- [ ] UI polish and quality of life improvements

### 📝 Planned Features
- [ ] Endless mode (post-game)
- [ ] Achievement system
- [ ] Statistics and analytics
- [ ] Mobile responsive design

---

## 🔧 Development Workflow

### Running the Game
```bash
./run.sh
# Or manually:
python3 -m http.server 8000
# Open http://localhost:8000
```

### Testing
```bash
node tests/validate_data.js    # Validate JSON structure
node tests/simulate.js         # Simulate game flow
```

### Making Changes

**Adding Items/Buildings/Recipes:**
1. Edit `data.json`
2. Run `node tests/validate_data.js`
3. Test in browser

**Modifying Game Logic:**
1. Edit `game.js`
2. Check console for errors
3. Test affected systems

**Updating UI:**
1. Edit `index.html` (structure)
2. Edit `style.css` (styling)
3. Verify theme colors work correctly

---

## 📋 Design Decisions Log

### December 13, 2025
**MAJOR REBALANCE - Combat Difficulty Overhaul:**
- **Enemy HP multiplied by 4x** (e.g., Small Bug: 50 → 200 HP)
- **Enemy Attack multiplied by 2.5x** (e.g., Small Bug: 10 → 25 attack)
- **Enemy Counts multiplied by 3.5x** (e.g., Region 2: 10 → 35 bugs)
- **Boss Cadence changed** from every 5 regions to every 4 regions (4, 8, 12, 16, 20)
- **New Content Added:**
  - Regions 11-20 (10 new regions)
  - 18 new enemy types (Phase 3 & 4)
  - 7 new technologies (fusion, quantum, antimatter)
  - 6 new items (plasma charge, fusion cell, quantum circuit, etc.)
  - 2 new buildings (fusion reactor, quantum research lab)
  - 6 new recipes
- **Rationale:** Original balance allowed 10 drones to clear all content. Players reported game was too easy. New balance requires:
  - 20-30 drones for early game
  - 40-50 drones for mid game
  - 60-80 drones for late game
  - 100 drones for end game bosses
  - Proper production chains and resource stockpiling
- **Files Modified:** data.json (completely rebalanced)
- **Validation:** All cross-references validated, backward compatible
- **Documentation:** [REBALANCE_SUMMARY.md](REBALANCE_SUMMARY.md)

### December 7, 2025
**Military System Simplification:**
- Removed dedicated military buildings (Barracks, War Factory, Control Tower)
- All military items now produced in standard assemblers
- Base drone capacity: 100 (no building required)
- **Rationale:** Reduce complexity, streamline production chains

**Building Slots:**
- Increased from 10 to 16 slots per region
- **Rationale:** Allow more diverse building layouts

**Research System:**
- 10x speed multiplier for testing
- Factorio-style fractional science consumption
- **Rationale:** Faster iteration during development

### December 2, 2025
**Data Consolidation:**
- Merged 7 JSON files into single `data.json`
- **Rationale:** Faster loading, easier maintenance, fewer HTTP requests

---

## 🐛 Known Issues & Solutions

See [Developer Manual](DEVELOPER_MANUAL.md) Section III for detailed solutions to:
- Interface flickering on hover
- Newly produced items not displaying
- Progress bars running when blocked
- Region switching display bugs
- Science pack consumption logic

---

## 📚 Additional Resources

### External References
- **Factorio Wiki:** Game design inspiration
- **Canvas API Docs:** For future graphics enhancements

### Internal Logs
- **Latest State:** `log/state_20251213_164910.md`
- **Bug Fixes:** `log/BUGFIX3.md`
- **Next Steps:** `log/NEXT_STEPS.md`

### Archived Documentation
See `doc/old/` for:
- Previous architecture designs
- Outdated implementation guides
- Deprecated bug fix logs
- Historical TODO lists

**Note:** Archived docs may contain outdated information.

---

## 🤝 Contributing

**For AI Assistants (Claude Code):**
1. Always read the latest `log/state_*.md` first
2. Reference this overview for document structure
3. Update relevant design docs when making changes
4. Add session notes to `log/` folder
5. Run tests before committing

**Design Principles:**
- Keep It Simple (KISS)
- Avoid over-engineering
- Factorio-inspired production chains
- Text-based UI with clear information hierarchy
- No manual micromanagement

---

## 📞 Contact & Support

**Project Owner:** clingsz
**Repository:** https://github.com/clingsz/expansion
**Documentation Issues:** Create GitHub issue with `docs` label

---

**Happy Building! 🏭🚀**

*This overview is automatically updated when documentation structure changes.*
