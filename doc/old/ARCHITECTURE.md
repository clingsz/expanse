# 🏛️ 技术架构文档

## 核心数据结构

### gameState 对象

```javascript
const gameState = {
    currentRegionId: 1,              // 当前区域ID
    regions: [                       // 所有区域
        {
            id: 1,
            name: "新手区域",
            slotsTotal: 10,
            slotsUsed: 0,
            resourceNodes: [         // 资源节点
                {
                    type: "iron-ore",
                    amount: 1000,    // 剩余量（会衰减）
                    rate: 5          // 产出速率
                }
            ],
            buildings: [             // 建筑列表
                {
                    id: 1,                    // 唯一ID
                    buildingId: "miner-mk1",  // 建筑类型
                    active: true,             // 是否激活
                    regionId: 1,              // 所属区域
                    resourceNodeIndex: 0,     // 采矿建筑专用
                    recipeId: "iron-plate",   // 生产建筑专用
                    productionProgress: 0.47  // 生产进度 0.0-1.0
                }
            ],
            conquered: true
        }
    ],
    resources: {                     // 全局资源（所有区域共享）
        "iron-ore": {
            current: 100,
            max: 500
        },
        "power": {
            current: 0,              // 电力不存储（除非有电池）
            max: 1000
        }
    },
    power: {                         // 电力统计
        production: 10.0,            // 每秒生产
        consumption: 5.0             // 每秒消耗
    },
    time: {                          // 时间系统
        dayNightCycle: 120,          // 昼夜周期（秒）
        currentTime: 0,              // 当前时间（秒）
        isDay: true                  // 是否白天
    },
    researchedTech: [],              // 已研究科技
    currentResearch: null,           // 当前研究
    researchProgress: 0,             // 研究进度
    buildingIdCounter: 1             // 建筑ID计数器
};
```

### GameData 对象（从JSON加载）

```javascript
const GameData = {
    items: {                         // 物品定义
        "iron-ore": {
            id: "iron-ore",
            name: "铁矿",
            category: "raw",
            stackSize: 100,
            storageWeight: 1
        }
    },
    buildings: {                     // 建筑定义
        "miner-mk1": { ... }
    },
    recipes: {                       // 配方定义
        "iron-plate": { ... }
    },
    technologies: {                  // 科技定义
        "automation-1": { ... }
    },
    regionTemplates: [ ... ],        // 区域模板
    enemies: { ... },                // 敌人定义
    units: { ... }                   // 单位定义
};
```

## 游戏循环

```javascript
// 主循环 - 100ms 间隔
let lastTime = Date.now();
setInterval(() => {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;  // 转换为秒
    lastTime = now;

    gameLoop(deltaTime);  // 0.1 秒
}, 100);

function gameLoop(deltaTime) {
    updateTime(deltaTime);           // 更新昼夜时间
    produceResources(deltaTime);     // 所有建筑生产
    updateResourceDisplay();         // 刷新UI（节流处理）
}
```

## 资源生产流程

```
┌─────────────────────────────────────────────┐
│      produceResources(deltaTime)            │
└─────────────────────────────────────────────┘
              ↓
    遍历当前区域的所有建筑
              ↓
    ┌─────────────────────┐
    │ 检查建筑是否激活      │
    │ if (!active) return  │
    └─────────────────────┘
              ↓
    ┌─────────────────────────────────────┐
    │ 根据建筑类型执行不同逻辑              │
    ├─────────────────────────────────────┤
    │ mining:                             │
    │   - 从资源节点获取资源                │
    │   - 减少节点剩余量                   │
    │   - 检查输出是否满                   │
    ├─────────────────────────────────────┤
    │ production:                         │
    │   - 检查是否有配方                   │
    │   - 检查电力                        │
    │   - 累积生产进度                     │
    │   - 进度≥1.0时检查材料              │
    │   - 消耗输入，产出结果               │
    ├─────────────────────────────────────┤
    │ power:                              │
    │   - 累积发电量                       │
    │   - 消耗燃料（如果需要）             │
    └─────────────────────────────────────┘
              ↓
    ┌─────────────────────────────────────┐
    │ 计算电力平衡                         │
    │ production / deltaTime = 生产率      │
    │ consumption / deltaTime = 消耗率     │
    └─────────────────────────────────────┘
```

## 建筑状态检查优先级

```javascript
function getBuildingStatus(building, template) {
    // 1. 暂停 (最高优先级)
    if (!building.active)
        return 'inactive' (暂停)

    // 2. 电力不足
    if (需要电力 && !hasPower)
        return 'disabled' (缺电)

    // 3. 生产建筑特殊检查
    if (category === 'production') {
        if (!building.recipeId)
            return 'warning' (未配置)

        if (缺原料)
            return 'disabled' (缺原料)

        if (输出满)
            return 'warning' (输出满载)
    }

    // 4. 采矿建筑特殊检查
    if (resourceNodeIndex !== undefined) {
        if (node.amount <= 0)
            return 'disabled' (资源耗尽)

        if (输出满)
            return 'warning' (输出满载)
    }

    // 5. 燃料检查
    if (fuelConsumption && !hasFuel)
        return 'disabled' (缺燃料)

    // 6. 正常
    return 'active' (正常)
}
```

## 配方生产详解

```javascript
// 配方对象
const recipe = {
    id: "gear",
    time: 1,                         // 1秒完成
    ingredients: { "iron-plate": 2 },
    results: { "gear": 1 }
};

// 建筑对象
const building = {
    buildingId: "assembler-mk1",
    recipeId: "gear",
    productionProgress: 0            // 0.0 - 1.0
};

// 建筑模板
const template = {
    speed: 1.5                       // 速度倍率
};

// 每帧计算
const progressPerSecond = template.speed / recipe.time;  // 1.5 / 1 = 1.5
const progressGain = progressPerSecond * deltaTime;      // 1.5 * 0.1 = 0.15
building.productionProgress += progressGain;             // 0.15 → 0.30 → ...

// 完成时 (≥ 1.0)
if (building.productionProgress >= 1.0) {
    if (检查材料充足) {
        消耗 iron-plate × 2
        产出 gear × 1
        building.productionProgress -= 1.0;  // 保留超出部分
    }
}

// 理论产能
// 速度 1.5 的组装机生产齿轮（1秒配方）
// 实际耗时 = 1 / 1.5 = 0.67 秒
// 每分钟产出 = 60 / 0.67 = 90 齿轮
```

## 电力系统

```javascript
// 实时平衡模式（无电池）
if (!hasBattery) {
    // 电力不存储
    hasPower = (production >= consumption)

    // 建筑检查
    if (template.powerConsumption && !hasPower) {
        建筑停止工作
    }
}

// 存储模式（有电池建筑）
if (hasBattery) {
    // 电力可以存储
    gameState.resources['power'].current +=
        (production - consumption) * deltaTime;

    // 限制在最大容量内
    if (current < 0) current = 0;
    if (current > max) current = max;

    hasPower = (current > 0)
}
```

## UI 更新策略

```javascript
// 资源显示 - 每帧更新
function updateResourceDisplay() {
    Object.entries(resourceMap).forEach(([resId, elementId]) => {
        const el = document.getElementById(`res-${elementId}`);
        el.textContent = Math.floor(gameState.resources[resId].current);
    });
}

// 建筑列表 - 事件触发更新
function updateBuildingsList() {
    const container = document.getElementById('buildings-list');
    container.innerHTML = '';

    region.buildings.forEach(building => {
        const card = createBuildingCard(building);
        container.appendChild(card);
    });
}

// 模态框 - 定时更新（500ms）
function showBuildingManageModal(building) {
    const updateModalContent = () => {
        // 更新动态内容
    };

    const interval = setInterval(updateModalContent, 500);

    // 清理
    const cleanup = () => {
        clearInterval(interval);
    };
}
```

## 事件系统

```javascript
// Toast 通知
function showToast(message, type = 'info', duration = 3000) {
    // type: 'success', 'warning', 'error', 'info'
}

// 确认对话框
async function showConfirm(message) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        // ... 创建确认框UI
        confirmBtn.onclick = () => resolve(true);
        cancelBtn.onclick = () => resolve(false);
    });
}
```

## 性能考虑

### 每帧性能预算（100ms）

```
理想分配：
- updateTime:            < 1ms
- produceResources:      < 50ms   (遍历所有建筑)
- updateResourceDisplay: < 10ms   (更新UI)
- 其他:                  < 39ms
总计:                    100ms
```

### 优化建议

1. **避免频繁 DOM 操作**
```javascript
// ❌ 不好
buildings.forEach(b => {
    const card = document.createElement('div');
    card.innerHTML = `...`;
    container.appendChild(card);  // 每次触发重排
});

// ✅ 好
const fragment = document.createDocumentFragment();
buildings.forEach(b => {
    const card = document.createElement('div');
    fragment.appendChild(card);
});
container.appendChild(fragment);  // 只触发一次重排
```

2. **缓存DOM元素**
```javascript
// ✅ 在外部缓存
const ironEl = document.getElementById('res-iron');
function updateResources() {
    ironEl.textContent = value;  // 快速
}
```

3. **批量更新**
```javascript
// 使用 requestAnimationFrame
let needsUpdate = false;
function scheduleUpdate() {
    if (!needsUpdate) {
        needsUpdate = true;
        requestAnimationFrame(() => {
            updateUI();
            needsUpdate = false;
        });
    }
}
```

## 数据持久化（TODO）

```javascript
// 保存游戏
function saveGame() {
    const saveData = {
        version: "1.0.0",
        timestamp: Date.now(),
        gameState: {
            regions: gameState.regions,
            resources: gameState.resources,
            power: gameState.power,
            time: gameState.time,
            researchedTech: gameState.researchedTech,
            buildingIdCounter: gameState.buildingIdCounter
        }
    };

    localStorage.setItem('expansion_save', JSON.stringify(saveData));
}

// 加载游戏
function loadGame() {
    const data = localStorage.getItem('expansion_save');
    if (!data) return false;

    const saveData = JSON.parse(data);

    // 版本检查
    if (saveData.version !== "1.0.0") {
        console.warn('存档版本不匹配');
        return false;
    }

    // 恢复状态
    Object.assign(gameState, saveData.gameState);
    return true;
}

// 自动保存
setInterval(saveGame, 30000);  // 每30秒
```

## 文件依赖关系

```
index.html
    ↓ (加载)
game.js
    ↓ (加载)
data/*.json → GameData对象
    ↓ (初始化)
gameState对象
    ↓ (游戏循环)
UI更新
```

## 关键函数调用链

```
页面加载
    → loadGameData()
        → fetch(items.json, buildings.json, ...)
        → GameData = { items, buildings, recipes, ... }
    → initializeGame()
        → 创建 gameState
        → 初始化资源
        → 创建初始区域
    → startGameLoop()
        → setInterval(gameLoop, 100)

用户点击建造
    → buildBuilding(buildingId)
        → 检查槽位
        → 检查资源
        → 消耗资源
        → 创建建筑对象
        → selectResourceNode() (如果是采矿)
        → 更新UI

用户点击建筑卡片
    → showBuildingManageModal(building)
        → 创建模态框
        → updateModalContent() (定时更新)
        → 用户点击"选择配方"
            → showRecipeSelectionModal(building)
                → 过滤配方
                → 显示配方卡片
                → 用户点击配方
                    → building.recipeId = recipeId
                    → 关闭模态框
```

## 调试技巧

### 浏览器控制台常用命令

```javascript
// 查看游戏状态
gameState

// 查看所有建筑
gameState.regions[0].buildings

// 添加资源
gameState.resources['iron-plate'].current = 9999

// 强制刷新UI
updateRegionScreen()

// 查看建筑模板
GameData.buildings['miner-mk1']

// 查看配方
GameData.recipes['gear']

// 手动触发生产
produceResources(1.0)  // 生产1秒
```

### 性能分析

```javascript
// 测量函数执行时间
console.time('produceResources');
produceResources(0.1);
console.timeEnd('produceResources');

// 查看内存使用
console.memory  // (需要启用精确内存信息)
```

---

最后更新：2025-01-03
