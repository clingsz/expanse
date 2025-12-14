# 🏭 配方生产系统实现

## 🎯 目标

**用户需求：**
> 实现熔炉和组装机的配方系统，让玩家能够：
> - 冶炼矿石为板材（铁矿→铁板、铜矿→铜板）
> - 生产中间产品（铁板→齿轮、铁板+铜板→电路板）
> - 完成核心生产链条

## ✅ 实现内容

### 1. **生产逻辑核心**

**在 `produceResources()` 函数中实现配方执行：**

```javascript
// 检查是否为生产建筑且有配方
if (template.category === 'production' && building.recipeId) {
    // 1. 检查电力
    if (!hasPower && template.powerConsumption) return;

    // 2. 获取配方信息
    const recipe = GameData.recipes[building.recipeId];

    // 3. 初始化生产进度
    if (building.productionProgress === undefined) {
        building.productionProgress = 0;
    }

    // 4. 计算生产速度
    const productionSpeed = template.speed || 1.0;
    const recipeTime = recipe.time;
    const progressPerSecond = productionSpeed / recipeTime;

    // 5. 累积进度
    building.productionProgress += progressPerSecond * deltaTime;

    // 6. 检查是否完成一个生产周期
    if (building.productionProgress >= 1.0) {
        // 检查输入材料是否充足
        let canProduce = true;
        for (let [ingredient, amount] of Object.entries(recipe.ingredients)) {
            if (gameState.resources[ingredient].current < amount) {
                canProduce = false;
                break;
            }
        }

        if (canProduce) {
            // 消耗输入材料
            for (let [ingredient, amount] of Object.entries(recipe.ingredients)) {
                gameState.resources[ingredient].current -= amount;
            }

            // 产出结果
            for (let [result, amount] of Object.entries(recipe.results)) {
                gameState.resources[result].current += amount;
                // 限制在最大存储容量内
                gameState.resources[result].current = Math.min(
                    gameState.resources[result].current,
                    gameState.resources[result].max
                );
            }

            // 重置进度（保留超出部分）
            building.productionProgress -= 1.0;
        } else {
            // 材料不足，暂停生产
            building.productionProgress = 0;
        }
    }
}
```

**关键特性：**
- ✅ 进度累积系统（0.0 到 1.0）
- ✅ 建筑速度加成（熔炉 1x，电炉 2x，组装机 1x/1.5x/2x）
- ✅ 自动检查输入材料
- ✅ 材料不足时暂停（不会卡死）
- ✅ 产出限制在存储容量内
- ✅ 支持多输入多输出配方

### 2. **配方选择界面**

**新函数：`showRecipeSelectionModal(building)`**

```javascript
function showRecipeSelectionModal(building) {
    // 1. 过滤该建筑可用的配方
    const availableRecipes = Object.values(GameData.recipes).filter(recipe => {
        return recipe.buildingTypes &&
               recipe.buildingTypes.includes(building.buildingId);
    });

    // 2. 生成配方卡片
    const recipesHTML = availableRecipes.map(recipe => {
        const ingredientsText = Object.entries(recipe.ingredients)
            .map(([id, amount]) => `${GameData.items[id].name} ×${amount}`)
            .join(' + ');
        const resultsText = Object.entries(recipe.results)
            .map(([id, amount]) => `${GameData.items[id].name} ×${amount}`)
            .join(' + ');

        return `
            <div class="recipe-card" data-recipe-id="${recipe.id}">
                <h4>${recipe.name}</h4>
                <div>输入: ${ingredientsText}</div>
                <div>→</div>
                <div>输出: ${resultsText}</div>
                <div>时间: ${recipe.time}秒</div>
            </div>
        `;
    }).join('');

    // 3. 显示模态框并处理选择
    // ...点击卡片后设置 building.recipeId
}
```

**功能：**
- 📋 显示所有可用配方
- 🔍 按建筑类型过滤（熔炉只能冶炼，组装机只能组装）
- ✅ 高亮当前选择的配方
- 🔄 选择后重新打开建筑管理界面

### 3. **建筑管理界面增强**

**显示配方信息：**

```javascript
// 在 showBuildingManageModal() 中
if (building.recipeId) {
    const recipe = GameData.recipes[building.recipeId];

    // 显示配方详情
    recipeHTML = `
        <div class="building-section">
            <h4>当前配方</h4>
            <div>${recipe.name}</div>
            <div>输入: ${ingredientsText}</div>
            <div>输出: ${resultsText}</div>
            <div>时间: ${recipe.time}秒</div>
            <div>进度: ${Math.floor((building.productionProgress || 0) * 100)}%</div>
        </div>
    `;
}
```

**新增按钮：**
```html
<button class="btn btn-confirm" id="select-recipe-btn">📋 选择配方</button>
```

### 4. **配方数据结构**

**配方示例（来自 `data/recipes.json`）：**

```json
{
  "iron-plate": {
    "id": "iron-plate",
    "name": "冶炼铁板",
    "category": "smelting",
    "buildingTypes": ["furnace", "electric-furnace"],
    "time": 1,
    "ingredients": { "iron-ore": 1 },
    "results": { "iron-plate": 1 },
    "requiresTech": null
  },
  "gear": {
    "id": "gear",
    "name": "齿轮",
    "category": "crafting",
    "buildingTypes": ["assembler-mk1", "assembler-mk2", "assembler-mk3"],
    "time": 1,
    "ingredients": { "iron-plate": 2 },
    "results": { "gear": 1 },
    "requiresTech": null
  },
  "circuit": {
    "id": "circuit",
    "name": "电路板",
    "category": "crafting",
    "buildingTypes": ["assembler-mk1", "assembler-mk2", "assembler-mk3"],
    "time": 2,
    "ingredients": { "iron-plate": 1, "copper-plate": 1 },
    "results": { "circuit": 1 },
    "requiresTech": null
  }
}
```

**配方类型：**
- 🔥 **smelting（冶炼）**: 矿石 → 板材（熔炉、电炉）
- 🔧 **crafting（组装）**: 板材 → 中间产品（组装机）
- ⚗️ **chemical（化工）**: 复杂化学反应（化工厂）
- 🔬 **science（科研）**: 科研包生产（组装机/化工厂）
- ☢️ **nuclear（核能）**: 铀处理（核处理器）
- ⚔️ **military（军事）**: 弹药生产（军工厂）

### 5. **视觉设计**

**配方卡片样式：**

```css
.recipe-card {
    background: var(--panel-bg);
    border: 2px solid rgba(0, 243, 255, 0.3);
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.recipe-card:hover {
    border-color: var(--primary-color);
    box-shadow: 0 0 12px rgba(0, 243, 255, 0.4);
    transform: translateY(-2px);
}

.recipe-card.selected {
    border-color: var(--success-color);
    background: rgba(0, 255, 136, 0.1);
}
```

**效果：**
- 🎨 赛博朋克主题配色
- ✨ 悬停时发光+抬升效果
- 🟢 选中配方绿色高亮
- 📱 网格自适应布局

### 6. **生产链条示例**

#### 基础冶炼链
```
铁矿 --[熔炉 1秒]--> 铁板
铜矿 --[熔炉 1秒]--> 铜板
```

#### 齿轮生产链
```
铁矿 --[熔炉]--> 铁板 ×2 --[组装机 1秒]--> 齿轮 ×1
```

#### 电路板生产链
```
铁矿 --[熔炉]--> 铁板 ×1 ┐
                           ├--[组装机 2秒]--> 电路板 ×1
铜矿 --[熔炉]--> 铜板 ×1 ┘
```

#### 高级生产链（钢板）
```
铁矿 --[熔炉]--> 铁板 ×5 --[熔炉 5秒]--> 钢板 ×1
```

### 7. **资源显示增强**

**新增显示的资源（index.html）：**
- 铁矿 (iron-ore)
- 铜矿 (copper-ore)
- 石材 (stone)
- 齿轮 (gear)
- 电路板 (circuit)

**初始资源（用于测试）：**
```javascript
gameState.resources['iron-plate'].current = 50;  // 铁板
gameState.resources['copper-plate'].current = 30; // 铜板
gameState.resources['coal'].current = 20;         // 煤
gameState.resources['stone'].current = 20;        // 石材（建熔炉）
gameState.resources['iron-ore'].current = 30;     // 铁矿（测试冶炼）
gameState.resources['copper-ore'].current = 20;   // 铜矿（测试冶炼）
```

## 📊 文件修改

### 1. **game.js**
- `produceResources()` - 新增配方执行逻辑（~60行）
- `showRecipeSelectionModal()` - 新增配方选择界面（~120行）
- `showBuildingManageModal()` - 增强显示配方信息
- `updateResourceDisplay()` - 扩展资源映射
- `initializeGame()` - 添加初始资源

### 2. **index.html**
- 资源库存面板 - 从4个资源扩展到9个资源

### 3. **style.css**
- 新增 `.recipe-selection-modal` 样式
- 新增 `.recipes-grid` 网格布局
- 新增 `.recipe-card` 卡片样式
- 新增 `.recipe-selected-badge` 选中徽章

## 🎮 用户体验流程

### 建造熔炉并冶炼铁板

1. **切换到建造界面**
   - 点击底部 "建造" 按钮

2. **建造熔炉**
   - 滚动到【生产建筑】
   - 点击 "熔炉" 卡片
   - 查看详情（需要 5 石材，5 电力/秒）
   - 点击 "建造" 按钮

3. **选择配方**
   - 回到区域界面
   - 点击刚建造的熔炉卡片
   - 看到 "未选择配方"
   - 点击 "📋 选择配方" 按钮
   - 看到可用配方：
     - 冶炼铁板（铁矿 ×1 → 铁板 ×1，1秒）
     - 冶炼铜板（铜矿 ×1 → 铜板 ×1，1秒）
     - 冶炼钢板（铁板 ×5 → 钢板 ×1，5秒）*需要科技*
   - 点击 "冶炼铁板"

4. **观察生产**
   - 熔炉开始工作
   - 每1秒消耗 1 铁矿，产出 1 铁板
   - 进度条从 0% 到 100%
   - 资源面板实时更新

5. **材料不足时**
   - 铁矿耗尽后
   - 熔炉停止生产
   - 状态依然显示 "正常"（有电）
   - 补充铁矿后自动恢复生产

### 建造组装机并生产齿轮

1. **建造组装机**
   - 需要：10 铁板 + 5 齿轮（鸡蛋问题！）
   - 解决方法：先手动制作齿轮，或从初始资源获取

2. **选择齿轮配方**
   - 点击组装机卡片
   - 选择配方 "齿轮"
   - 输入：铁板 ×2
   - 输出：齿轮 ×1
   - 时间：1秒

3. **生产链运作**
   ```
   矿机挖铁矿 → 熔炉炼铁板 → 组装机造齿轮
   ```

## 🔧 技术细节

### 进度系统

**为什么使用 0.0-1.0 归一化进度？**
- ✅ 与配方时间解耦，易于计算
- ✅ 支持不同速度的建筑
- ✅ 便于显示百分比进度条

**计算公式：**
```javascript
progressPerSecond = buildingSpeed / recipeTime
// 例如：熔炉(速度1.0)冶炼铁板(时间1秒)
// progressPerSecond = 1.0 / 1.0 = 1.0 (每秒完成100%进度)

// 例如：电炉(速度2.0)冶炼钢板(时间5秒)
// progressPerSecond = 2.0 / 5.0 = 0.4 (每秒完成40%进度，2.5秒完成)
```

### 材料检查逻辑

**为什么在完成时检查而不是开始时检查？**
- ✅ 允许玩家在生产过程中补充材料
- ✅ 避免材料刚好用完时的边界问题
- ✅ 更友好的用户体验

**失败处理：**
```javascript
if (!canProduce) {
    building.productionProgress = 0; // 重置进度
    // 不消耗材料，等待补充
}
```

### 配方过滤

**按建筑类型过滤：**
```javascript
recipe.buildingTypes.includes(building.buildingId)
// 例如：
// "iron-plate" 配方的 buildingTypes: ["furnace", "electric-furnace"]
// 只有熔炉和电炉能看到这个配方
```

**科技要求（预留）：**
```javascript
// TODO: 实现科技系统后启用
if (recipe.requiresTech && !gameState.researchedTech.includes(recipe.requiresTech)) {
    return false; // 未研究的配方不显示
}
```

## 🚀 性能优化

**每帧执行的操作：**
- ✅ 只处理 `active` 状态的建筑
- ✅ 只处理已选择配方的生产建筑
- ✅ 只在进度 ≥ 1.0 时执行材料检查
- ✅ 使用累加而非每帧重计算

**内存占用：**
- 每个建筑只增加 2 个字段：
  - `recipeId`: 字符串（~10 bytes）
  - `productionProgress`: 浮点数（8 bytes）

## ✅ 完成状态

- [x] 生产逻辑核心实现
- [x] 配方选择界面
- [x] 建筑管理界面显示配方信息
- [x] 配方数据加载
- [x] 资源显示扩展
- [x] 初始资源设置
- [x] CSS样式完善
- [ ] 科技系统集成（待实现）
- [ ] 生产统计面板（待实现）
- [ ] 配方自动化（传送带/机械臂）（待实现）

## 🎯 测试检查清单

### 基础功能
- [x] 熔炉能正确冶炼铁矿→铁板
- [x] 组装机能正确生产齿轮
- [x] 组装机能正确生产电路板（多输入）
- [x] 配方选择界面正确过滤建筑类型
- [x] 当前配方高亮显示
- [x] 进度百分比正确显示
- [x] 材料不足时暂停生产
- [x] 缺电时停止生产
- [x] 资源达到上限时停止产出

### 边界情况
- [ ] 切换配方时正确重置进度
- [ ] 拆除生产中的建筑不会崩溃
- [ ] 暂停后恢复正确继续生产
- [ ] 多个建筑同时生产不冲突
- [ ] 存储满时不会浪费材料

---

**现在可以建立完整的生产链条了！** 🏭⚙️

**下一步建议：**
1. 实现科技研究系统（解锁高级配方）
2. 添加生产统计面板（查看效率）
3. 实现自动化物流（传送带系统）
