# 扩张前线 - 开发者手册
## Expansion Front - Developer Manual

**版本:** 1.1
**更新日期:** 2025-12-13
**目的:** 为Claude Code AI助手提供开发参考

---

## 📚 文档导航

**新开发者？** 从这里开始：
1. 阅读 [overview.md](overview.md) 了解整体文档结构
2. 阅读 [GAME_DESIGN.md](GAME_DESIGN.md) 了解游戏设计
3. 阅读本文档了解代码结构和开发规范

**设计文档：**
- [GAME_DESIGN.md](GAME_DESIGN.md) - 完整游戏设计文档
- [UI_DESIGN.md](UI_DESIGN.md) - 界面设计规范
- [COMBAT_DESIGN.md](COMBAT_DESIGN.md) - 战斗系统设计 (v2.0)

**实现文档：**
- [RECIPE_PRODUCTION_SYSTEM.md](RECIPE_PRODUCTION_SYSTEM.md) - 配方生产系统
- [THEME_COLORS.md](THEME_COLORS.md) - 主题颜色系统

**项目状态：**
- [../log/state_20251213_164910.md](../log/state_20251213_164910.md) - 最新项目状态

---

## 一、项目结构

### 核心文件

```
/Users/clingsz/code/expansion/
├── index.html          # 主HTML文件 (游戏界面结构)
├── game.js             # 游戏逻辑 (~4200行，核心代码)
├── style.css           # 样式表 (赛博朋克主题)
├── test.js             # 自测脚本 (验证JSON和逻辑)
├── simulate.js         # 游戏模拟脚本 (测试游戏流程)
└── data/               # 游戏数据文件夹
    ├── items.json      # 物品定义
    ├── buildings.json  # 建筑定义
    ├── recipes.json    # 配方定义
    ├── technologies.json # 科技树定义
    ├── units.json      # 单位/无人机定义
    ├── enemies.json    # 敌人定义
    └── regions.json    # 区域定义
```

### 重要文件位置

| 文件 | 行数参考 | 关键功能 |
|-----|---------|---------|
| `game.js:591-601` | 初始资源 | DEBUG资源配置 |
| `game.js:740-757` | updateRegionScreen | 区域界面更新 |
| `game.js:825-839` | updateBuildingsList | 建筑列表(完整重建) |
| `game.js:1062-1113` | updateBuildingCardStatus | 建筑卡片(仅更新数值) |
| `game.js:1218-1470` | showBuildingManageModal | 建筑管理弹窗 |
| `game.js:1475-1527` | showRecipeSelectionModal | 配方选择弹窗 |
| `game.js:1660-1681` | updateBuildScreen | 建造界面更新 |
| `game.js:1822-1938` | updateTechScreen | 科技界面(完整重建) |
| `game.js:1807-1820` | updateTechResearchProgress | 科技进度(仅更新) |
| `game.js:2316-2385` | updateMilitaryScreen | 军事界面(完整重建) |
| `game.js:2388-2425` | updateMilitaryScreenCounts | 军事界面(仅更新数值) |
| `game.js:3640-3696` | gameLoop | 主游戏循环 |
| `game.js:3709-3734` | 生产逻辑 | 资源生产和建筑逻辑 |
| `game.js:3520-3577` | updateResearch | 科研消耗(Factorio风格) |

---

## 二、测试和调试

### 运行测试

```bash
# 自测脚本 - 验证JSON和逻辑
node test.js

# 游戏模拟 - 测试游戏流程
node simulate.js
```

### 测试脚本功能

**test.js** 检查:
- ✅ JSON语法正确性
- ✅ 建筑科技依赖存在性
- ✅ 配方材料/产物存在性
- ✅ 科技解锁项存在性
- ✅ 区域资源节点引用正确性

**simulate.js** 功能:
- 模拟游戏循环
- 提供 `build()`, `setRecipe()`, `research()`, `wait()` 函数
- 测试生产链和科研流程

### 调试技巧

#### 1. 控制台日志
```javascript
console.log(`[DEBUG] ${变量名}:`, 变量值);
```

#### 2. 查看游戏状态
```javascript
// 在浏览器控制台
console.log(gameState);
console.log(GameData);
console.log(getCurrentRegion());
```

#### 3. 强制刷新界面
```javascript
updateRegionScreen();
updateBuildScreen();
updateTechScreen();
updateMilitaryScreen();
```

---

## 三、常见问题和解决方案

### 🚨 问题1: 界面鼠标悬停时闪烁

**原因:** 在游戏循环中每秒重建整个DOM (innerHTML = '')

**症状:**
- 鼠标移动到卡片上时卡片闪烁
- 进度条每秒重置
- 界面显示不稳定

**解决方案:**
1. **分离更新函数** - 创建两个函数:
   - `updateXXXScreen()` - 完整重建DOM (仅在打开界面或解锁科技时调用)
   - `updateXXXCounts()` - 仅更新数值 (游戏循环中调用)

2. **使用data属性标记** - 用于精确定位DOM元素:
   ```javascript
   <div data-building-id="${building.id}">
   <div data-count-for="${unitId}">
   ```

3. **选择性DOM查询:**
   ```javascript
   const countElement = document.querySelector(`[data-count-for="${unitId}"]`);
   if (countElement) {
       countElement.textContent = `×${count}`;
   }
   ```

**已修复的界面:**
- ✅ 建筑列表 (updateBuildingCardStatus)
- ✅ 科技界面 (updateTechResearchProgress)
- ✅ 军事界面 (updateMilitaryScreenCounts)

### 🚨 问题2: 新生产的物品不显示

**原因:** 界面没有添加到游戏循环更新中

**解决方案:**
在 `gameLoop()` 中添加界面更新:
```javascript
// game.js:3656-3688
if (gameLoopCounter % 10 === 0) {
    // 检查界面是否可见
    const militaryScreen = document.getElementById('military-screen');
    if (militaryScreen && militaryScreen.style.display !== 'none') {
        updateMilitaryScreenCounts(); // 轻量级更新
    }
}
```

### 🚨 问题3: 未解锁的配方/建筑显示

**原因:** 过滤逻辑缺少科技检查

**解决方案:**
```javascript
// 配方过滤
const availableRecipes = Object.values(GameData.recipes).filter(recipe => {
    if (!recipe.buildingTypes.includes(building.buildingId)) return false;
    if (recipe.requiresTech && !gameState.researchedTech.includes(recipe.requiresTech)) {
        return false; // 未解锁科技
    }
    return true;
});

// 建筑过滤
if (template.requiresTech && !gameState.researchedTech.includes(template.requiresTech)) {
    return false;
}
```

### 🚨 问题4: 进度条即使缺材料/输出满也在跑

**原因:** 进度更新逻辑没有检查工作条件

**解决方案:**
```javascript
// 检查是否可以工作
let canWork = true;

// 检查电力
if (!hasPower && template.powerConsumption) {
    canWork = false;
}

// 检查材料
for (let [ingredient, amount] of Object.entries(recipe.ingredients)) {
    if (gameState.resources[ingredient].current < amount) {
        canWork = false;
        break;
    }
}

// 检查输出空间
for (let [result, amount] of Object.entries(recipe.results)) {
    if (gameState.resources[result].current >= gameState.resources[result].max) {
        canWork = false;
        break;
    }
}

if (!canWork) {
    building.productionProgress = 0;
    if (progressBar) progressBar.style.width = '0%';
    return;
}

// 可以工作才更新进度
building.productionProgress += progressPerSecond * deltaTime;
```

### 🚨 问题5: 区域切换时建筑列表显示错误

**原因:** 切换区域时DOM没有立即清空，导致旧区域的建筑卡片残留

**症状:**
- 切换到新区域时，建筑列表显示的还是旧区域的
- 建筑卡片"卡住"（无法更新）
- 建造新建筑后才刷新，但可能还是错误的区域

**解决方案:**
在所有区域切换点强制清空建筑列表容器：
```javascript
function onRegionClick(template, isConquered) {
    if (isConquered) {
        gameState.currentRegionId = template.id;

        // 强制重建区域界面
        const container = document.getElementById('buildings-list');
        if (container) container.innerHTML = '';

        showToast(`已切换到 ${template.name}`, 'success');
        showScreen('region');
    }
}

function switchToPreviousRegion() {
    // ... 设置 currentRegionId ...

    // 强制重建区域界面
    const container = document.getElementById('buildings-list');
    if (container) container.innerHTML = '';

    updateRegionScreen();
}
```

**修复位置:**
- `game.js:2305-2307` - onRegionClick (地图点击切换)
- `game.js:3269-3271` - switchToPreviousRegion (上一区域按钮)
- `game.js:3287-3289` - switchToNextRegion (下一区域按钮)

### 🚨 问题6: 科研包消耗不符合Factorio逻辑

**原因:** 科研包按整数消耗而非连续消耗

**解决方案 (Factorio风格):**
```javascript
// 计算本tick需要的科研包
const tickProgress = (1 / tech.researchTime) * deltaTime * totalResearchSpeed;
let limitingFactor = 1.0;

for (let [scienceId, totalAmount] of Object.entries(tech.cost)) {
    const requiredThisTick = (totalAmount / tech.researchTime) * deltaTime * totalResearchSpeed;
    const available = gameState.resources[scienceId].current;

    if (available < requiredThisTick) {
        if (available <= 0.001) {
            canResearch = false;
            break;
        }
        limitingFactor = Math.min(limitingFactor, available / requiredThisTick);
    }
}

// 按比例消耗
gameState.researchProgress += tickProgress * limitingFactor;
for (let [scienceId, totalAmount] of Object.entries(tech.cost)) {
    const consumeRate = (totalAmount / tech.researchTime) * deltaTime * totalResearchSpeed * limitingFactor;
    gameState.resources[scienceId].current -= consumeRate;
}
```

---

## 四、开发新功能指南

### 添加新物品

1. **定义物品** (data/items.json):
```json
"new-item": {
    "id": "new-item",
    "name": "新物品",
    "category": "component",
    "stackSize": 100,
    "storageWeight": 1
}
```

2. **初始化资源** (game.js:591-601):
```javascript
gameState.resources['new-item'].current = 0;
```

3. **添加配方** (data/recipes.json):
```json
"new-item-recipe": {
    "id": "new-item-recipe",
    "name": "制造新物品",
    "category": "crafting",
    "buildingTypes": ["assembler-mk1"],
    "time": 5,
    "ingredients": {
        "iron-plate": 2,
        "copper-plate": 1
    },
    "results": {
        "new-item": 1
    },
    "requiresTech": null
}
```

### 添加新建筑

1. **定义建筑** (data/buildings.json):
```json
"new-building": {
    "id": "new-building",
    "name": "新建筑",
    "category": "production",
    "slots": 1,
    "cost": {
        "iron-plate": 10,
        "gear": 5
    },
    "powerConsumption": 10,
    "speed": 1.0,
    "requiresTech": null,
    "description": "描述"
}
```

2. **更新界面** - 建筑会自动出现在对应category

### 添加新科技

1. **定义科技** (data/technologies.json):
```json
"new-tech": {
    "id": "new-tech",
    "name": "新科技",
    "category": "automation",
    "cost": {
        "science-basic": 100
    },
    "researchTime": 50,
    "prerequisites": [],
    "unlocks": {
        "buildings": ["new-building"],
        "recipes": ["new-recipe"]
    },
    "description": "解锁新内容"
}
```

2. **关联到配方/建筑** - 在对应项中设置 `requiresTech: "new-tech"`

---

## 五、数据文件结构

### items.json
```json
{
  "items": {
    "item-id": {
      "id": "item-id",
      "name": "显示名称",
      "category": "ore|plate|component|fluid|ammo|unit|science",
      "stackSize": 100,
      "storageWeight": 1
    }
  }
}
```

### buildings.json
```json
{
  "buildings": {
    "building-id": {
      "id": "building-id",
      "name": "建筑名称",
      "category": "mining|production|power|science|storage",
      "slots": 1,
      "cost": { "item-id": amount },
      "powerConsumption": 10,  // 可选
      "powerProduction": 20,   // 可选
      "speed": 1.0,            // 可选
      "researchSpeed": 1.0,    // 科研建筑
      "storageBonus": 500,     // 仓库建筑
      "requiresTech": "tech-id",
      "description": "描述"
    }
  }
}
```

### recipes.json
```json
{
  "recipes": {
    "recipe-id": {
      "id": "recipe-id",
      "name": "配方名称",
      "category": "smelting|crafting|chemical|military|nuclear|science",
      "buildingTypes": ["building-id"],
      "time": 5,
      "ingredients": { "item-id": amount },
      "results": { "item-id": amount },
      "requiresTech": "tech-id"
    }
  }
}
```

### technologies.json
```json
{
  "technologies": {
    "tech-id": {
      "id": "tech-id",
      "name": "科技名称",
      "category": "automation|mining|production|power|chemical|nuclear|military|infrastructure",
      "cost": { "science-pack-id": amount },
      "researchTime": 50,
      "prerequisites": ["prerequisite-tech-id"],
      "unlocks": {
        "buildings": ["building-id"],
        "recipes": ["recipe-id"]
      },
      "description": "描述"
    }
  }
}
```

---

## 六、游戏循环架构

### 主循环 (100ms/tick, deltaTime=0.1s)

```javascript
function gameLoop(deltaTime) {
    // 1. 战斗逻辑
    processBattle(deltaTime);

    // 2. 时间系统
    updateTime(deltaTime);

    // 3. 资源生产
    produceResources(deltaTime);

    // 4. 科研进度
    updateResearch(deltaTime);

    // 5. 实时显示更新 (每tick)
    updateResourceDisplay();
    updateTimeDisplay();

    // 6. 界面更新 (每秒，gameLoopCounter % 10 === 0)
    if (gameLoopCounter % 10 === 0) {
        // 区域界面
        updateBuildingCardStatus(building); // 轻量级

        // 科技界面
        updateTechResearchProgress(); // 仅进度条

        // 军事界面
        updateMilitaryScreenCounts(); // 仅数值
    }

    gameLoopCounter++;
}
```

### 生产逻辑流程

```
每个建筑tick:
1. 检查active状态
2. 检查电力供应
3. 根据category执行:
   - mining: 采集资源节点 → 增加资源
   - production:
     a. 检查材料
     b. 检查输出空间
     c. 更新进度
     d. 完成时消耗材料、产出结果、触发脉冲动画
   - science:
     a. 检查是否有科研任务
     b. 消耗科研包
     c. 增加科研进度
   - power: 计算电力生产
```

---

## 七、最新设计决策 (2025-12-07)

### 军事系统
- ❌ **删除了**: 兵营、军工厂、重型军工厂、指挥中心
- ✅ **改为**: 所有军事物品在组装机中生产
- ✅ **基础无人机容量**: 100 (无需控制塔)
- ✅ **子弹和无人机**: 都在 assembler-mk1/mk2/mk3 中制造

### 建筑槽位
- **所有区域**: 16个槽位 (从10改为16)

### 科研系统
- **科研速度**: 10x加速 (research-lab: 10.0, advanced: 20.0)
- **科研时间**: 所有tech时间/10 (DEBUG模式)
- **消耗逻辑**: Factorio风格连续分数消耗

### 初始资源 (DEBUG)
```javascript
iron-plate: 500
copper-plate: 300
stone: 200
iron-ore: 200
copper-ore: 200
steel-plate: 100
gear: 100
circuit: 50
coal: 100
```

### 界面更新策略
- **完整重建**: 仅在打开界面或解锁科技时
- **轻量级更新**: 游戏循环中仅更新数值和进度条
- **使用data属性**: 精确定位DOM元素避免重复查询

---

## 八、开发检查清单

### 添加新功能前
- [ ] 阅读相关现有代码
- [ ] 确认数据结构
- [ ] 检查是否有类似功能可以参考

### 开发过程中
- [ ] 使用console.log调试
- [ ] 检查JSON语法 (运行test.js)
- [ ] 测试游戏流程 (运行simulate.js)
- [ ] 确保界面更新逻辑正确

### 完成后
- [ ] 运行 `node test.js` 确保无错误
- [ ] 运行 `node simulate.js` 确认功能正常
- [ ] 检查控制台无报错
- [ ] 测试界面无闪烁
- [ ] 更新此文档如有新模式

---

## 九、性能优化原则

### DO ✅
- 使用 `querySelector` 配合 data 属性精确定位
- 分离完整重建和轻量级更新
- 在游戏循环中只更新必要的内容
- 使用 `gameLoopCounter % N` 控制更新频率

### DON'T ❌
- 不要在游戏循环中使用 `innerHTML = ''`
- 不要每帧重建整个DOM
- 不要在循环中进行昂贵的DOM查询
- 不要忘记检查元素存在性 (`if (element)`)

---

## 十、故障排除

### 界面不更新
1. 检查游戏循环是否调用了更新函数
2. 确认界面可见性检查 (`style.display !== 'none'`)
3. 查看控制台是否有JavaScript错误

### JSON加载失败
1. 运行 `node test.js` 检查语法
2. 检查最后一个对象是否有多余逗号
3. 确认所有引用的ID存在

### 建筑不工作
1. 检查电力是否充足
2. 确认材料是否充足
3. 查看输出空间是否已满
4. 检查配方是否正确设置

### 科技无法研究
1. 确认前置科技已研究
2. 检查科研包是否充足
3. 确认有研究中心且active

---

**保持简单、保持高效、避免重复问题！**

*Last Updated: 2025-12-07*
