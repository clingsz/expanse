# 扩张前线 - Expansion Front

> A sci-fi themed resource management and tactical combat game built with pure HTML/CSS/JavaScript

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web-green.svg)
![Language](https://img.shields.io/badge/language-JavaScript-yellow.svg)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Game Mechanics](#game-mechanics)
- [Project Structure](#project-structure)
- [Development](#development)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## 🎮 Overview

**扩张前线 (Expansion Front)** is a browser-based strategy game that combines resource management, technology research, and tactical combat. Players expand across regions, build production chains, research technologies, and defend against alien bug threats.

### Key Highlights

- 🌌 **Sci-fi Theme**: Futuristic UI with dark mode and cyan/purple color scheme
- 🏭 **Complex Production**: 26 recipes, 23 buildings, 35 items
- 🔬 **Tech Tree**: 27 technologies to unlock new capabilities
- ⚔️ **Tactical Combat**: Turn-based battles with 6 unit types vs 14 enemy types
- 🗺️ **Region Expansion**: 10 regions with progressive difficulty and boss battles
- 💾 **Save/Load System**: Multiple save slots with auto-save
- 🌐 **Localization**: Chinese UI with English subtitles

---

## ✨ Features

### Resource Management
- **Mining System**: Extract iron, copper, coal, stone, oil, and uranium
- **Production Chains**: Process raw materials into components and advanced items
- **Power Generation**: Wind, solar, coal, oil, and nuclear power plants
- **Storage Management**: Expandable warehouses and power batteries

### Technology Research
- **Progressive Unlocking**: Research technologies to unlock new buildings and recipes
- **Science Packs**: 4 types of science packs (basic, automation, chemical, nuclear)
- **Research Centers**: Basic and advanced labs with different speeds

### Combat System
- **Turn-based Tactics**: Strategic unit deployment and combat
- **Unit Types**: Machine gun, heavy machine gun, flamethrower, laser, plasma, artillery drones
- **Enemy Variety**: 14 enemy types including workers, warriors, beetles, and multi-phase bosses
- **Damage Types**: Physical, piercing, explosive, laser with resistances and weaknesses
- **Ammo System**: Different units require different ammunition

### Building System
- **Categories**: Mining, production, power, storage, science
- **Slot Management**: Limited building slots per region
- **Power Management**: Balance power production and consumption
- **Tech Requirements**: Buildings unlock through technology research

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.x** (for local HTTP server)
- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)

### Running the Game

#### Option 1: Quick Start Script

```bash
./run.sh
```

The script will:
1. Start a local HTTP server on port 8000
2. Automatically open the game in your browser
3. Navigate to http://localhost:8000

#### Option 2: Manual Start

```bash
# Start HTTP server
python3 -m http.server 8000

# Open browser to
http://localhost:8000
```

### First Time Playing

1. Click **新游戏 (New Game)** on the main menu
2. Start in Region 1 with basic resources
3. Build miners to extract resources
4. Research technologies to unlock new capabilities
5. Expand to new regions by defeating enemies

---

## 🎯 Game Mechanics

### Starting the Game

**Region 1** is your starting zone with:
- Iron ore deposits (10,000 units)
- Copper ore deposits (10,000 units)
- Stone deposits (5,000 units)
- 16 building slots
- No enemies (tutorial zone)

### Basic Gameplay Loop

1. **Extract Resources**
   - Build miners on resource nodes
   - Generate power for miners
   - Collect iron, copper, and stone

2. **Process Materials**
   - Build furnaces to smelt ore into plates
   - Build assemblers to craft components
   - Create gears, circuits, and other parts

3. **Research Technology**
   - Build research lab
   - Produce science packs
   - Unlock new buildings and recipes

4. **Expand Territory**
   - Build military units (drones)
   - Attack neighboring regions
   - Defeat enemies to unlock new resources

5. **Advanced Production**
   - Unlock coal power (Region 2)
   - Unlock oil processing (Region 4 - BOSS)
   - Unlock nuclear tech (Region 8 - BOSS)

### Resource Progression

```
Tier 1: Iron, Copper, Stone
    ↓
Tier 2: Coal (Region 2)
    ↓
Tier 3: Crude Oil (Region 4 - BOSS)
    ↓
Tier 4: Uranium (Region 8 - BOSS)
```

### Technology Paths

**Automation Path**: Unlock faster assemblers and production
**Mining Path**: Unlock faster miners and better extraction
**Power Path**: Unlock better power generation
**Military Path**: Unlock stronger units and better weapons
**Chemical Path**: Unlock oil processing and plastics
**Nuclear Path**: Unlock uranium processing and nuclear power

### Combat Tips

- **Armored enemies**: Use piercing bullets (穿甲弹)
- **Swarm enemies**: Use flamethrower drones (AOE damage)
- **Shielded enemies**: Use laser weapons
- **Boss battles**: Bring artillery drones and high-tier weapons

---

## 📁 Project Structure

```
expansion/
├── index.html              # Main game entry point
├── game.js                 # Core game logic (176K)
├── style.css               # Styling and UI theme (73K)
├── data.json               # Game data (50K)
│   ├── items (35)          # Resources, components, ammo
│   ├── buildings (23)      # All building types
│   ├── recipes (26)        # Production recipes
│   ├── technologies (27)   # Tech tree
│   ├── units (6)           # Player units
│   ├── enemies (14)        # Enemy types
│   └── regions (10)        # Map regions
├── run.sh                  # Quick start script
├── todo.md                 # Development TODO list
├── tests/                  # Test files
│   ├── simulate.js         # Game simulation
│   ├── test_mining.js      # Mining system tests
│   ├── test.js             # General tests
│   └── validate_data.js    # Data validation
├── backup/                 # Backup files
├── doc/                    # Documentation
│   ├── overview.md         # Documentation catalog
│   ├── GAME_DESIGN.md      # Game design document
│   ├── UI_DESIGN.md        # UI/UX design
│   ├── COMBAT_DESIGN.md    # Combat system
│   ├── DEVELOPER_MANUAL.md # Technical guide
│   ├── RECIPE_PRODUCTION_SYSTEM.md
│   ├── THEME_COLORS.md
│   └── old/                # Archived docs
└── log/                    # Session logs and state files
    └── state_*.md          # Agent state snapshots
```

---

## 🛠️ Development

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: Pure CSS3 with custom properties
- **Data**: JSON-based configuration
- **Server**: Python HTTP server (development)
- **Version Control**: Git + GitHub

### Code Architecture

**game.js** contains:
- `GameData`: Global data store
- `GameState`: Current game state
- `loadGameData()`: Load data.json
- Resource management functions
- Building management functions
- Combat system
- UI rendering
- Save/Load system

**data.json** structure:
```json
{
  "items": { "item-id": { /* item config */ } },
  "buildings": { "building-id": { /* building config */ } },
  "recipes": { "recipe-id": { /* recipe config */ } },
  "technologies": { "tech-id": { /* tech config */ } },
  "units": { "unit-id": { /* unit config */ } },
  "enemies": { "enemy-id": { /* enemy config */ } },
  "regions": [ { /* region config */ } ]
}
```

### Testing

```bash
# Validate game data
node tests/validate_data.js

# Run game simulation
node tests/simulate.js

# Run mining system tests
node tests/test_mining.js
```

### Adding New Content

#### Add a New Item
1. Edit `data.json` → `items` section
2. Define: id, name, category, stackSize, storageWeight

#### Add a New Building
1. Edit `data.json` → `buildings` section
2. Define: id, name, category, cost, power, requiresTech

#### Add a New Recipe
1. Edit `data.json` → `recipes` section
2. Define: id, name, buildingTypes, ingredients, results, time

#### Add a New Technology
1. Edit `data.json` → `technologies` section
2. Define: id, name, cost, researchTime, prerequisites, unlocks

---

## 📚 Documentation

**Start here:** [Documentation Overview](doc/overview.md)

Detailed documentation is available in the `doc/` folder:

### Core Design
- **[GAME_DESIGN.md](doc/GAME_DESIGN.md)**: Complete game design document
- **[UI_DESIGN.md](doc/UI_DESIGN.md)**: UI/UX design specifications
- **[COMBAT_DESIGN.md](doc/COMBAT_DESIGN.md)**: Combat system design (v2.0)

### Technical Guides
- **[DEVELOPER_MANUAL.md](doc/DEVELOPER_MANUAL.md)**: Developer guide and reference
- **[RECIPE_PRODUCTION_SYSTEM.md](doc/RECIPE_PRODUCTION_SYSTEM.md)**: Production mechanics
- **[THEME_COLORS.md](doc/THEME_COLORS.md)**: UI color scheme and theme system

### Project State
- **[Latest State](log/state_20251213_164910.md)**: Current project status and session history

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: Open an issue with details about the bug
2. **Suggest Features**: Share your ideas in the issues
3. **Submit Pull Requests**: Fork, make changes, and submit PR
4. **Improve Documentation**: Help make docs clearer and more complete

### Development Workflow

```bash
# Clone the repository
git clone https://github.com/clingsz/expansion.git
cd expansion

# Make your changes
# Test your changes
./run.sh

# Commit and push
git add .
git commit -m "Your meaningful commit message"
git push origin main
```

---

## 📊 Game Statistics

- **Total Items**: 35
- **Total Buildings**: 23
- **Total Recipes**: 26
- **Total Technologies**: 27
- **Total Units**: 6
- **Total Enemies**: 14
- **Total Regions**: 10
- **Code Size**: ~176KB (game.js)
- **Total Project Size**: ~24,000+ lines

---

## 🎨 Design Philosophy

- **No Framework Dependencies**: Pure vanilla JavaScript for maximum compatibility
- **Dark Theme First**: Sci-fi aesthetic with high contrast
- **Performance**: Optimized for smooth gameplay
- **Localization Ready**: Chinese primary, English secondary
- **Progressive Complexity**: Start simple, unlock advanced mechanics

---

## 🔮 Roadmap

- [ ] Additional regions (11-20)
- [ ] More enemy types and bosses
- [ ] Advanced technologies (quantum, antimatter)
- [ ] Multiplayer support
- [ ] Mobile optimization
- [ ] Sound effects and music
- [ ] Achievement system
- [ ] Leaderboards

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**clingsz**
- GitHub: [@clingsz](https://github.com/clingsz)

---

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.com/claude-code)
- Inspired by Factorio, Satisfactory, and other automation games
- Chinese sci-fi aesthetics

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/clingsz/expansion/issues)
- **Discussions**: [GitHub Discussions](https://github.com/clingsz/expansion/discussions)

---

**Happy Expanding!** 🚀

*Last Updated: 2025-12-13*
