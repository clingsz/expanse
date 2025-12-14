# ⚡ 快速参考手册

## 🎯 5分钟上手添加内容

### 添加新建筑（示例：高级熔炉）

**1. 编辑 `data/buildings.json`**
```json
"advanced-furnace": {
  "id": "advanced-furnace",
  "name": "高级熔炉",
  "category": "production",
  "slots": 0.5,
  "cost": {
    "steel-plate": 20,
    "circuit": 10
  },
  "powerConsumption": 15,
  "speed": 3.0,
  "requiresTech": null,
  "description": "超高速冶炼设备，速度 6 个/秒"
}
```

**完成！** 刷新页面即可在建造界面看到。

---

### 添加新配方（示例：碳纤维）

**1. 先添加物品 `data/items.json`**
```json
"carbon-fiber": {
  "id": "carbon-fiber",
  "name": "碳纤维",
  "category": "intermediate",
  "stackSize": 100,
  "storageWeight": 1
}
```

**2. 添加配方 `data/recipes.json`**
```json
"carbon-fiber": {
  "id": "carbon-fiber",
  "name": "碳纤维合成",
  "category": "crafting",
  "buildingTypes": ["assembler-mk2", "assembler-mk3"],
  "time": 4,
  "ingredients": {
    "coal": 5,
    "plastic": 2
  },
  "results": {
    "carbon-fiber": 1
  },
  "requiresTech": null
}
```

**完成！** 组装机 Mk2/Mk3 可以选择这个配方。

---

### 添加新资源到 UI

**1. 编辑 `index.html`** (约第37行)
```html
<div class="resource-item-compact">
    <span class="resource-name">碳纤维</span>
    <span class="resource-value" id="res-carbon-fiber">0</span>
</div>
```

**2. 编辑 `game.js`** 的 `updateResourceDisplay()` (约第361行)
```javascript
const resourceMap = {
    'iron-ore': 'iron-ore',
    'carbon-fiber': 'carbon-fiber',  // ← 新增这一行
    // ...
};
```

**完成！** UI 会显示碳纤维数量。

---

## 🔧 常用代码片段

### 给玩家添加资源（测试用）

```javascript
// 在浏览器控制台执行
gameState.resources['iron-plate'].current = 9999;
gameState.resources['copper-plate'].current = 9999;
gameState.resources['steel-plate'].current = 9999;
updateResourceDisplay();
```

### 清空所有建筑

```javascript
gameState.regions[0].buildings = [];
gameState.regions[0].slotsUsed = 0;
updateBuildingsList();
```

### 查看建筑状态

```javascript
const building = gameState.regions[0].buildings[0];
console.log('建筑ID:', building.buildingId);
console.log('是否激活:', building.active);
console.log('配方:', building.recipeId);
console.log('进度:', building.productionProgress);
```

### 手动执行 10 秒生产

```javascript
for (let i = 0; i < 100; i++) {
    produceResources(0.1);
}
updateResourceDisplay();
```

---

## 📋 JSON 格式速查

### buildings.json 模板

```json
{
  "id": "唯一ID",
  "name": "显示名称",
  "category": "mining/production/power/storage",
  "slots": 1.0,
  "cost": {
    "item-id": 数量
  },
  "powerConsumption": 10,
  "powerProduction": 20,
  "speed": 1.0,
  "allowedResources": ["iron-ore"],
  "fuelConsumption": {
    "coal": 1
  },
  "requiresTech": "tech-id 或 null",
  "description": "描述文字"
}
```

**类别说明：**
- `mining`: 采矿 → 需要 `allowedResources`
- `production`: 生产 → 使用配方系统
- `power`: 能源 → 需要 `powerProduction` 或 `fuelConsumption`

### recipes.json 模板

```json
{
  "id": "唯一ID",
  "name": "显示名称",
  "category": "smelting/crafting/chemical/military/science",
  "buildingTypes": ["建筑ID1", "建筑ID2"],
  "time": 生产时间秒数,
  "ingredients": {
    "输入物品ID": 数量
  },
  "results": {
    "输出物品ID": 数量
  },
  "requiresTech": "tech-id 或 null"
}
```

### items.json 模板

```json
{
  "id": "唯一ID",
  "name": "显示名称",
  "category": "raw/intermediate/component/energy",
  "stackSize": 100,
  "storageWeight": 1
}
```

---

## 🐛 问题排查速查

| 问题 | 可能原因 | 解决方法 |
|------|---------|----------|
| 建筑不显示在建造界面 | `requiresTech` 设置了科技 | 改为 `null` |
| 点击建造无反应 | 资源不足 | 检查 `cost` 和当前资源 |
| 配方不显示 | `buildingTypes` 不匹配 | 检查建筑ID是否在列表中 |
| 建筑不生产 | 没选配方/缺电/缺材料 | 检查建筑状态徽章 |
| 矿机产出错误 | `allowedResources` 错误 | 应该是矿石(iron-ore)而非板材 |
| UI 不更新 | 元素ID不匹配 | 检查HTML和JS中的ID |
| JSON 报错 | 格式错误 | 检查逗号、引号、最后一项不能有逗号 |

---

## 🎮 游戏机制速查

### 电力系统

```
生产 ≥ 消耗  → 🟢 正常
生产 80-99%  → 🟡 警告（黄色闪烁）
生产 < 80%   → 🔴 危急（红色快闪）
```

**无电池：** 电力不存储，必须实时平衡
**有电池：** 可以存储多余电力

### 建筑状态

| 状态 | 颜色 | 含义 |
|------|------|------|
| 正常 | 🟢 绿色 | 正常工作 |
| 暂停 | ⚪ 灰色 | 手动暂停 |
| 未配置 | 🟡 黄色 | 生产建筑未选配方 |
| 输出满载 | 🟡 黄色 | 资源存储已满 |
| 缺电 | 🔴 红色 | 电力不足 |
| 缺原料 | 🔴 红色 | 生产材料不足 |
| 资源耗尽 | 🔴 红色 | 矿脉挖完 |

### 生产计算

```
实际生产速度 = 建筑速度 × (1 / 配方时间)

例如：
- 熔炉速度 1.0，冶炼铁板（1秒配方）
  → 1.0 / 1 = 1 个/秒

- 电炉速度 2.0，冶炼钢板（5秒配方）
  → 2.0 / 5 = 0.4 个/秒 = 24 个/分钟
```

---

## 📁 关键文件位置

```
添加新建筑     → data/buildings.json
添加新配方     → data/recipes.json
添加新物品     → data/items.json
添加新科技     → data/technologies.json
修改UI布局     → index.html
修改游戏逻辑   → game.js
修改样式       → style.css
```

---

## 🚀 启动测试流程

1. **用浏览器打开 `index.html`**
2. **打开开发者工具（F12）**
3. **检查控制台是否有错误**
4. **测试基础功能：**
   - [ ] 建造风力发电站
   - [ ] 建造矿机（连接铁矿节点）
   - [ ] 观察铁矿产出
   - [ ] 建造熔炉
   - [ ] 选择"冶炼铁板"配方
   - [ ] 观察铁板产出
   - [ ] 检查电力平衡显示

---

## 💡 常用开发技巧

### 快速重载数据（无需刷新）

```javascript
// 控制台执行
async function reloadData() {
    await loadGameData();
    initializeGame();
    updateRegionScreen();
    console.log('数据已重载！');
}
reloadData();
```

### 查看所有配方

```javascript
Object.values(GameData.recipes).forEach(r => {
    console.log(`${r.name} - ${r.time}秒 - ${r.buildingTypes.join(', ')}`);
});
```

### 测试配方生产

```javascript
// 创建测试建筑
const testBuilding = {
    id: 999,
    buildingId: 'furnace',
    active: true,
    recipeId: 'iron-plate',
    productionProgress: 0,
    regionId: 1
};

// 添加材料
gameState.resources['iron-ore'].current = 100;

// 执行10秒生产
for (let i = 0; i < 100; i++) {
    // 模拟配方逻辑（需要在 produceResources 中测试）
}
```

---

## 📊 性能优化检查清单

- [ ] 游戏循环耗时 < 100ms
- [ ] 建筑数量 < 100 时流畅运行
- [ ] UI 更新不阻塞游戏循环
- [ ] 没有内存泄漏（定时器正确清除）
- [ ] 模态框关闭后 `clearInterval`

**测量性能：**
```javascript
console.time('gameLoop');
gameLoop(0.1);
console.timeEnd('gameLoop');
```

---

## 🎯 开发优先级建议

### 现在就能做的：
1. ✅ 添加更多建筑（复制粘贴JSON）
2. ✅ 添加更多配方（复制粘贴JSON）
3. ✅ 调整平衡性（修改数值）
4. ✅ 修改UI文字和样式

### 需要编写代码的：
1. 🔧 科技研究系统（中等难度）
2. 🔧 存档/读档系统（简单）
3. 🔧 区域征服系统（复杂）
4. 🔧 战斗系统（复杂）
5. 🔧 传送带系统（非常复杂）

---

## 📞 快速帮助

**控制台报错看不懂？**
1. 复制错误信息
2. 检查行号（game.js:123）
3. 查看是否是 JSON 格式错误
4. 检查是否有拼写错误

**建筑不工作？**
1. 点击建筑查看状态徽章
2. 检查是否缺电（红色"缺电"）
3. 检查是否有材料（红色"缺原料"）
4. 检查是否选择配方（黄色"未配置"）

**数据改了没效果？**
1. 确保 JSON 格式正确（最后一项无逗号）
2. 刷新页面（Ctrl+F5 强制刷新）
3. 检查浏览器控制台错误

---

**最后更新：** 2025-01-03
**版本：** 1.0.0
