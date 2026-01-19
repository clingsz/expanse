# 扩张 - Expanse

> An idle/incremental resource management game with sci-fi theme, inspired by Universal Paperclips and Factorio

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web-green.svg)
![Language](https://img.shields.io/badge/language-JavaScript-yellow.svg)

---

## Overview

**扩张 (Expanse)** is a browser-based idle game where you build an automated production chain, research technologies, and defend your base against alien bugs. Built with pure HTML/CSS/JavaScript, no frameworks required.

### Key Features

- **Widescreen 3-Column Layout**: Universal Paperclips style UI
- **Production Chains**: Mining → Smelting → Crafting → Science
- **Tech Tree**: Research technologies using science packs (red, green, blue)
- **Defense System**: Build turrets and drones to fight alien bugs
- **Real-time Updates**: Watch your resources grow automatically

---

## Quick Start

### Run Locally

```bash
# Clone the repository
git clone https://github.com/clingsz/expanse.git
cd expanse

# Start HTTP server
python3 -m http.server 8000

# Open browser to http://localhost:8000
```

Or use the quick start script:
```bash
./run.sh
```

---

## Game Interface

```
┌─────────────────────────────────────────────────────────────────┐
│                         扩张 EXPANSE                             │
├────────────┬───────────────────────────────┬────────────────────┤
│ Left Panel │      Center Content           │   Right Panel      │
├────────────┼───────────────────────────────┼────────────────────┤
│            │                               │                    │
│ ⚡ 电力     │  ┌─────┐ ┌─────┐ ┌─────┐     │  Selected Item     │
│ 📦 空间     │  │Build│ │Build│ │Build│     │  Details           │
│ ⚠️ 威胁     │  │ x3  │ │ x2  │ │ x1  │     │                    │
│            │  └─────┘ └─────┘ └─────┘     │  Production:       │
│ 🪨 原料     │                               │  -1 铁矿 → +1 铁板  │
│ 🔧 材料     │  More buildings...            │                    │
│ 🧪 科技包   │                               │  Build Cost:       │
│            │                               │  石材 10           │
│ ─────────  │                               │                    │
│ 🏭 建筑    │                               │  [建造] [拆除]      │
│ 📊 资源    │                               │                    │
│ ⚔️ 战斗    │                               │                    │
│ 🔬 科研    │                               │                    │
│            │                               │                    │
└────────────┴───────────────────────────────┴────────────────────┘
```

---

## Game Systems

### Resources

| Category | Resources |
|----------|-----------|
| Raw (原料) | 铁矿, 铜矿, 煤炭, 石材 |
| Material (材料) | 铁板, 铜板, 钢材, 齿轮, 电路 |
| Science (科技包) | 红包, 绿包, 蓝包 |
| Energy (能源) | 电力 |

### Buildings

| Category | Buildings |
|----------|-----------|
| Mining (采矿) | 铁矿机, 铜矿机, 采煤机, 采石场 |
| Smelting (冶炼) | 铁锻炉, 铜锻炉, 炼钢炉 |
| Crafting (制造) | 齿轮厂, 电路厂, 红包厂, 绿包厂, 蓝包厂 |
| Power (电力) | 火电站, 太阳能 |
| Defense (防御) | 机枪塔 |
| Military (军事) | 无人机厂 |
| Infrastructure (基建) | 扩张器 |

### Technologies

| Tier | Technologies |
|------|--------------|
| Tier 1 (红包) | 自动化1, 军事1 |
| Tier 2 (红+绿) | 电子学, 炼钢术 |
| Tier 3 (红+绿+蓝) | 太阳能, 军事2 |

### Combat

- **Threat System**: Building expanders increases threat level
- **Enemy Waves**: When threat reaches threshold, bugs attack
- **Defense**: Build turrets and drone factories
- **Base HP**: Protect your base from destruction

---

## Project Structure

```
expanse/
├── index.html      # Main game entry
├── game.js         # Game logic (~1400 lines)
├── style.css       # Styling (~900 lines)
├── data.json       # Game data configuration
├── run.sh          # Quick start script
├── README.md       # This file
└── todo.md         # Development notes
```

---

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: Pure CSS3 with CSS Variables
- **Data**: JSON-based configuration
- **Server**: Python HTTP server (development)

---

## Design Philosophy

- **No Framework Dependencies**: Pure vanilla JS for simplicity
- **Dark Theme**: Sci-fi aesthetic with cyan accent colors
- **Incremental Updates**: Smooth real-time resource updates
- **Chinese UI**: Primary language is Chinese

---

## License

MIT License - feel free to use and modify.

---

## Author

**clingsz** - [@clingsz](https://github.com/clingsz)

---

*Last Updated: 2025-01-19*
