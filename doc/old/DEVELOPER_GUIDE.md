# 🛠️ 扩张前线 - 开发者指南

> **Developer Guide for Expansion Front**
>
> 这份文档将教你如何扩展游戏功能、添加新内容、修复问题。

---

## 📁 项目结构

```
expansion/
├── index.html              # 主HTML文件，定义UI结构
├── game.js                 # 核心游戏逻辑（2000+ 行）
├── style.css              # 样式文件（赛博朋克主题）
├── data/                  # 游戏数据（JSON格式）
│   ├── buildings.json     # 建筑定义
│   ├── items.json         # 物品/资源定义
│   ├── recipes.json       # 配方定义
│   ├── technologies.json  # 科技树定义
│   ├── regions.json       # 区域/地图定义
│   ├── enemies.json       # 敌人定义
│   └── units.json         # 单位定义
└── log/                   # 开发日志和文档
```

---

## 🏗️ 架构概览

### 核心系统

```
┌─────────────────────────────────────────┐
│           Game State (gameState)        │
│  - regions: 区域数据                     │
│  - resources: 全局资源（共享）            │
│  - power: 电力生产/消耗                  │
│  - time: 时间系统（昼夜循环）             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│          Game Loop (100ms)              │
│  1. updateTime()      - 更新时间         │
│  2. produceResources() - 生产资源        │
│  3. updateResourceDisplay() - 刷新UI     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│              UI Screens                 │
│  - region-screen   : 区域主界面          │
│  - build-screen    : 建造界面            │
│  - tech-screen     : 科技树              │
│  - storage-screen  : 仓库                │
│  - map-screen      : 地图                │
└─────────────────────────────────────────┘
```

### 数据流

```
JSON数据 → GameData对象 → gameState → UI显示
   ↑                                     ↓
   └────── 用户操作（建造/选配方等） ──────┘
```

---

## 📦 如何添加新建筑

### 步骤 1: 在 `data/buildings.json` 添加定义

```json
{
  "buildings": {
    "my-new-building": {
      "id": "my-new-building",
      "name": "我的新建筑",
      "category": "production",           // mining, production, power, storage
      "slots": 1.0,                       // 占用槽位
      "cost": {                           // 建造成本
        "iron-plate": 20,
        "copper-plate": 10,
        "gear": 5
      },
      "powerConsumption": 10,             // 耗电（每秒）
      "speed": 1.5,                       // 生产速度倍率
      "requiresTech": "automation-1",     // 需要的科技（null = 无需科技）
      "description": "这是一个新建筑的描述"
    }
  }
}
```

**建筑类别说明：**
- `mining`: 采矿建筑（需要 `allowedResources` 和 `resourceNodeIndex`）
- `production`: 生产建筑（使用配方系统）
- `power`: 能源建筑（需要 `powerProduction` 或 `fuelConsumption`）
- `storage`: 存储建筑（暂未实现）

### 步骤 2: 添加建筑图标（可选）

在 CSS 中定义建筑的图标或样式：

```css
.building-card[data-building-id="my-new-building"] {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### 步骤 3: 测试

1. 刷新页面
2. 进入建造界面
3. 找到对应类别（生产建筑）
4. 点击建造按钮

**常见问题：**
- ❌ 建筑不显示 → 检查 `requiresTech` 是否已研究（改为 `null`）
- ❌ 无法建造 → 检查 `cost` 中的物品是否在 `items.json` 中定义
- ❌ 建筑没作用 → 生产建筑需要配方，发电建筑需要 `powerProduction`

---

## 🔧 如何添加新配方

### 步骤 1: 在 `data/recipes.json` 添加定义

```json
{
  "recipes": {
    "advanced-gear": {
      "id": "advanced-gear",
      "name": "高级齿轮",
      "category": "crafting",              // smelting, crafting, chemical, military, science
      "buildingTypes": [                   // 哪些建筑可以生产
        "assembler-mk2",
        "assembler-mk3"
      ],
      "time": 3,                           // 生产时间（秒）
      "ingredients": {                     // 输入材料
        "gear": 2,
        "steel-plate": 1
      },
      "results": {                         // 输出产品
        "advanced-gear": 1
      },
      "requiresTech": "advanced-automation"  // 需要的科技
    }
  }
}
```

**配方类别说明：**
- `smelting`: 冶炼（熔炉、电炉）
- `crafting`: 组装（组装机）
- `chemical`: 化工（化工厂）
- `military`: 军事（军工厂）
- `science`: 科研（实验室）
- `nuclear`: 核能（核处理器）

### 步骤 2: 确保输入/输出物品已定义

检查 `data/items.json` 确保所有物品存在：

```json
{
  "items": {
    "advanced-gear": {
      "id": "advanced-gear",
      "name": "高级齿轮",
      "category": "intermediate",
      "stackSize": 100,
      "storageWeight": 2
    }
  }
}
```

### 步骤 3: 测试

1. 建造对应的生产建筑（如组装机 Mk2）
2. 打开建筑详情
3. 点击"选择配方"
4. 确认新配方出现在列表中

**配方过滤逻辑：**
```javascript
// game.js 中的过滤代码
const availableRecipes = Object.values(GameData.recipes).filter(recipe => {
    return recipe.buildingTypes &&
           recipe.buildingTypes.includes(building.buildingId);
});
```

---

## 📦 如何添加新物品/资源

### 步骤 1: 在 `data/items.json` 添加定义

```json
{
  "items": {
    "titanium-ore": {
      "id": "titanium-ore",
      "name": "钛矿",
      "category": "raw",                   // raw, intermediate, component, energy
      "stackSize": 100,                    // 堆叠上限
      "storageWeight": 1                   // 存储权重
    },
    "titanium-plate": {
      "id": "titanium-plate",
      "name": "钛板",
      "category": "intermediate",
      "stackSize": 100,
      "storageWeight": 2
    }
  }
}
```

### 步骤 2: 初始化资源存储

在 `game.js` 的 `initializeGame()` 函数中，资源会自动初始化：

```javascript
// 这段代码已经存在，会自动处理新物品
Object.entries(GameData.items).forEach(([id, item]) => {
    gameState.resources[id] = {
        current: 0,
        max: item.category === 'energy' ? 1000 : 500
    };
});
```

如果需要初始资源，手动添加：

```javascript
// game.js:288 附近
gameState.resources['titanium-ore'].current = 50;
```

### 步骤 3: 添加到 UI 显示（可选）

编辑 `index.html`，在资源面板添加显示：

```html
<div class="resource-item-compact">
    <span class="resource-name">钛矿</span>
    <span class="resource-value" id="res-titanium-ore">0</span>
</div>
```

编辑 `game.js` 的 `updateResourceDisplay()` 函数：

```javascript
const resourceMap = {
    'iron-ore': 'iron-ore',
    'titanium-ore': 'titanium-ore',  // ← 新增
    // ...
};
```

---

## 🔬 如何添加新科技

### 步骤 1: 在 `data/technologies.json` 添加定义

```json
{
  "technologies": {
    "titanium-processing": {
      "id": "titanium-processing",
      "name": "钛金属加工",
      "description": "解锁钛板冶炼和高级建筑",
      "tier": 2,
      "cost": {                          // 研究成本
        "science-basic": 100,
        "science-automation": 50
      },
      "researchTime": 30,                // 研究时间（秒）
      "prerequisites": [                 // 前置科技
        "automation-1",
        "advanced-smelting"
      ],
      "unlocks": {                       // 解锁内容
        "buildings": ["titanium-furnace"],
        "recipes": ["titanium-plate"]
      }
    }
  }
}
```

### 步骤 2: 实现科技研究逻辑（待开发）

**当前状态：** 科技系统数据已定义，但研究逻辑未实现。

**需要实现的功能：**
```javascript
// TODO: 在 game.js 中实现
function startResearch(techId) {
    gameState.currentResearch = techId;
    gameState.researchProgress = 0;
}

function updateResearch(deltaTime) {
    if (!gameState.currentResearch) return;

    const tech = GameData.technologies[gameState.currentResearch];
    // 消耗科研包
    // 增加进度
    // 完成时解锁建筑/配方
}
```

---

## 🗺️ 如何添加新区域

### 步骤 1: 在 `data/regions.json` 添加定义

```json
{
  "regions": [
    {
      "id": 11,
      "name": "钛矿高地",
      "phase": 3,
      "slotsTotal": 25,
      "resourceNodes": [
        { "type": "iron-ore", "amount": 5000, "rate": 5 },
        { "type": "titanium-ore", "amount": 3000, "rate": 3 }
      ],
      "enemies": [
        { "type": "elite-bug", "count": 20 }
      ],
      "conquered": false,
      "description": "蕴含稀有钛矿的高地"
    }
  ]
}
```

### 步骤 2: 添加区域解锁逻辑（待开发）

**当前状态：** 只有区域1可用，其他区域需要战斗系统解锁。

---

## 🎨 UI 主题定制

### 修改主题颜色

编辑 `style.css` 顶部的 CSS 变量：

```css
:root {
    --bg-color: #0a0e1a;              /* 背景色 */
    --panel-bg: #151925;              /* 面板背景 */
    --primary-color: #00f3ff;         /* 主色调（青色）*/
    --secondary-color: #8b5cf6;       /* 次要色（紫色）*/
    --text-color: #e0e0e0;            /* 文字颜色 */
    --success-color: #00ff88;         /* 成功/正常（绿色）*/
    --warning-color: #ffdd00;         /* 警告（黄色）*/
    --danger-color: #ff3366;          /* 危险/错误（红色）*/
}
```

### 为不同 Tab 设置颜色

在 `game.js` 中的 `showScreen()` 函数：

```javascript
function showScreen(screenName) {
    // ...
    const themes = {
        'region': 'region',     // 青色
        'build': 'build',       // 橙色
        'tech': 'tech',         // 紫色
        'storage': 'storage',   // 绿色
        'map': 'map'            // 黄色
    };
    document.body.setAttribute('data-theme', themes[screenName]);
}
```

对应的 CSS：

```css
body[data-theme="region"] { --primary-color: #00f3ff; }
body[data-theme="build"] { --primary-color: #ff9500; }
body[data-theme="tech"] { --primary-color: #b967ff; }
```

---

## 🔧 核心函数说明

### `game.js` 关键函数

#### 1. 游戏循环
```javascript
function gameLoop(deltaTime) {
    updateTime(deltaTime);           // 更新昼夜时间
    produceResources(deltaTime);     // 所有建筑生产资源
    updateResourceDisplay();         // 刷新UI显示
}
```

**调用频率：** 100ms (10 FPS)
**deltaTime：** 单位是秒（0.1）

#### 2. 资源生产核心

```javascript
function produceResources(deltaTime) {
    const region = getCurrentRegion();

    region.buildings.forEach(building => {
        if (!building.active) return;

        const template = GameData.buildings[building.buildingId];

        // 采矿建筑
        if (template.category === 'mining') {
            const node = region.resourceNodes[building.resourceNodeIndex];
            const amount = node.rate * template.speed * deltaTime;
            gameState.resources[node.type].current += amount;
            node.amount -= amount;  // 资源衰减
        }

        // 生产建筑（配方系统）
        if (template.category === 'production' && building.recipeId) {
            // 检查电力、原料
            // 累积生产进度
            // 完成时消耗输入、产出结果
        }

        // 发电建筑
        if (template.powerProduction) {
            totalPowerProduction += template.powerProduction * deltaTime;
        }
    });

    // 电力平衡计算
    gameState.power.production = totalPowerProduction / deltaTime;
    gameState.power.consumption = totalPowerConsumption / deltaTime;
}
```

#### 3. 建筑状态检查

```javascript
function getBuildingStatus(building, template) {
    // 优先级检查（从高到低）
    if (!building.active) return { status: 'inactive', text: '暂停' };
    if (缺电) return { status: 'disabled', text: '缺电' };
    if (未配置) return { status: 'warning', text: '未配置' };
    if (缺原料) return { status: 'disabled', text: '缺原料' };
    if (输出满) return { status: 'warning', text: '输出满载' };
    if (资源耗尽) return { status: 'disabled', text: '资源耗尽' };
    return { status: 'active', text: '正常' };
}
```

**状态类型：**
- `active`: 正常工作（绿色发光）
- `inactive`: 手动暂停（灰色）
- `warning`: 警告状态（黄色慢闪）
- `disabled`: 无法工作（红色快闪）

#### 4. 建筑建造

```javascript
function buildBuilding(buildingId) {
    const template = GameData.buildings[buildingId];
    const region = getCurrentRegion();

    // 1. 检查槽位
    if (region.slotsUsed + template.slots > region.slotsTotal) {
        showToast('槽位不足！', 'error');
        return;
    }

    // 2. 检查资源
    for (let [resource, amount] of Object.entries(template.cost)) {
        if (gameState.resources[resource].current < amount) {
            showToast('资源不足！', 'error');
            return;
        }
    }

    // 3. 消耗资源
    for (let [resource, amount] of Object.entries(template.cost)) {
        gameState.resources[resource].current -= amount;
    }

    // 4. 创建建筑对象
    const building = {
        id: gameState.buildingIdCounter++,
        buildingId: buildingId,
        active: true,
        regionId: region.id
    };

    // 5. 采矿建筑需要选择资源节点
    if (template.category === 'mining') {
        building.resourceNodeIndex = selectResourceNode(template);
    }

    region.buildings.push(building);
    region.slotsUsed += template.slots;
}
```

---

## 🐛 常见问题排查

### 1. 建筑不生产资源

**检查清单：**
- [ ] 建筑是否激活（`building.active === true`）
- [ ] 是否有电力（`gameState.power.production >= consumption`）
- [ ] 生产建筑是否选择了配方（`building.recipeId`）
- [ ] 是否有足够的输入材料
- [ ] 输出存储是否已满（`current >= max`）
- [ ] 采矿建筑的资源节点是否耗尽（`node.amount > 0`）

**调试方法：**
```javascript
// 在浏览器控制台输入
console.log(gameState.regions[0].buildings);
console.log(gameState.resources);
console.log(gameState.power);
```

### 2. 配方不显示

**检查清单：**
- [ ] `recipe.buildingTypes` 是否包含建筑ID
- [ ] 配方是否需要科技（`requiresTech`）
- [ ] JSON 格式是否正确（逗号、引号）

### 3. UI 不更新

**可能原因：**
- 元素ID不匹配（检查 `index.html` 和 `game.js` 中的ID）
- 资源映射缺失（检查 `updateResourceDisplay()` 中的 `resourceMap`）

### 4. 电力系统问题

**电力计算公式：**
```javascript
// 实时平衡（无电池）
hasPower = (production >= consumption)

// 有电池时可以存储
if (hasBattery) {
    gameState.resources['power'].current += (production - consumption) * deltaTime;
}
```

---

## 📝 代码规范建议

### 1. 命名约定

```javascript
// 建筑ID: kebab-case
"miner-mk1", "assembler-mk2", "wind-turbine"

// 物品ID: kebab-case
"iron-ore", "iron-plate", "advanced-circuit"

// 函数名: camelCase
function buildBuilding() {}
function updateResourceDisplay() {}

// 常量: UPPER_SNAKE_CASE
const GAME_LOOP_INTERVAL = 100;
```

### 2. 注释规范

```javascript
// ========================================
// 大模块注释
// ========================================

// 功能说明
function importantFunction() {
    // 步骤注释
    const result = doSomething();

    return result; // 返回值说明
}
```

### 3. JSON 格式

```json
{
  "key": "value",
  "number": 123,
  "array": [1, 2, 3],
  "object": {
    "nested": "value"
  }
}
```

**注意：** JSON 不支持注释，最后一项不能有逗号！

---

## 🚀 下一步开发建议

### 优先级 1: 必须实现（核心玩法）

1. **科技研究系统**
   - 消耗科研包
   - 进度条显示
   - 解锁建筑/配方
   - 文件：`game.js` + `tech-screen` UI

2. **存档系统**
   - `localStorage` 保存游戏状态
   - 自动保存（每30秒）
   - 手动保存/加载按钮
   - 文件：`game.js`

3. **区域征服系统**
   - 战斗逻辑（待设计）
   - 解锁新区域
   - 文件：`game.js` + `map-screen` UI

### 优先级 2: 重要功能（提升体验）

4. **生产统计面板**
   - 显示每种资源的生产/消耗速率
   - 瓶颈分析
   - 文件：新增 `stats-screen`

5. **建筑升级系统**
   - 矿机 Mk1 → Mk2 → Mk3
   - 保留位置和配方
   - 文件：`game.js`

6. **传送带系统**（大工程）
   - 物品运输
   - 自动化物流
   - 需要重新设计架构

### 优先级 3: 锦上添花

7. **音效/音乐**
8. **动画效果**（建筑工作动画）
9. **多语言支持**

---

## 📚 学习资源

### 参考游戏
- **Factorio**: 生产链、自动化设计灵感
- **Shapez.io**: 简洁的UI和传送带系统
- **Satisfactory**: 3D 工厂建造

### 技术文档
- [MDN JavaScript](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)
- [CSS Flexbox/Grid](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [JSON 格式规范](https://www.json.org/json-zh.html)

---

## 🎯 快速参考

### 添加内容检查清单

**新建筑：**
- [ ] `data/buildings.json` - 添加定义
- [ ] `data/items.json` - 确保成本物品存在
- [ ] `index.html` - 添加到对应分类容器（可选）
- [ ] 测试建造功能

**新配方：**
- [ ] `data/recipes.json` - 添加定义
- [ ] `data/items.json` - 确保输入/输出物品存在
- [ ] 确认 `buildingTypes` 正确
- [ ] 测试配方选择

**新物品：**
- [ ] `data/items.json` - 添加定义
- [ ] `index.html` - 添加显示元素（可选）
- [ ] `game.js` - 添加到 `resourceMap`（如需显示）

**新科技：**
- [ ] `data/technologies.json` - 添加定义
- [ ] 确保 `cost` 中的科研包存在
- [ ] 实现研究逻辑（TODO）

---

## 💡 提示和技巧

### 1. 快速测试

在浏览器控制台直接修改游戏状态：

```javascript
// 添加资源
gameState.resources['iron-plate'].current = 9999;

// 解锁所有科技（TODO）
gameState.researchedTech = Object.keys(GameData.technologies);

// 清空建筑
gameState.regions[0].buildings = [];
gameState.regions[0].slotsUsed = 0;

// 刷新界面
updateRegionScreen();
```

### 2. 调试生产问题

```javascript
// 查看建筑详情
const building = gameState.regions[0].buildings[0];
console.log(building);
console.log(getBuildingStatus(building, GameData.buildings[building.buildingId]));

// 查看配方
console.log(GameData.recipes[building.recipeId]);

// 手动执行一次生产
produceResources(0.1);
```

### 3. 性能优化

```javascript
// 避免在游戏循环中频繁操作 DOM
// ❌ 不好
function gameLoop() {
    document.getElementById('res-iron').textContent = gameState.resources['iron-plate'].current;
}

// ✅ 好 - 缓存元素引用
const ironEl = document.getElementById('res-iron');
function gameLoop() {
    ironEl.textContent = gameState.resources['iron-plate'].current;
}
```

---

## 📧 联系和反馈

如果遇到问题或有建议，请：
1. 检查控制台错误信息
2. 参考本文档排查
3. 查看游戏设计文档 `扩张前线_游戏设计文档.md`
4. 查看具体功能的实现文档（BUILDING_MANAGEMENT.md、RECIPE_PRODUCTION_SYSTEM.md 等）

---

**祝开发愉快！🚀**

最后更新：2025-01-03
