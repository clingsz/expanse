# 🚀 扩张前线 (Expansion Front)

> 一个受 Factorio 启发的赛博朋克主题工厂建造游戏

[![游戏状态](https://img.shields.io/badge/status-alpha%200.4-yellow)](IMPLEMENTATION_STATUS.md)
[![完成度](https://img.shields.io/badge/completion-40%25-orange)](IMPLEMENTATION_STATUS.md)
[![文档](https://img.shields.io/badge/docs-完善-green)](DEVELOPER_GUIDE.md)

---

## 🎮 快速开始

### 启动游戏

```bash
# 方法1: 直接用浏览器打开
open index.html

# 方法2: 启动本地服务器（推荐）
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

### 5分钟游戏教程

1. **建造风力发电站** - 提供电力
2. **建造矿机** - 自动连接铁矿节点，产出铁矿
3. **建造熔炉** - 点击选择"冶炼铁板"配方
4. **建造组装机** - 使用初始的5个齿轮建造第一个组装机
5. **生产科研包** - 组装机选择"基础科研包"配方
6. **研究科技** - 前往科技树界面，开始研究科技

**🎯 目标：** 建立自动化生产链，平衡电力和资源，研究科技解锁新建筑！

---

## 📚 文档导航

### 🏁 新手入门
- **[快速参考手册](QUICK_REFERENCE.md)** ⭐ 从这里开始！
  - 5分钟上手添加内容
  - 常用代码片段
  - 问题排查指南

### 👨‍💻 开发者指南
- **[开发者指南](DEVELOPER_GUIDE.md)** - 如何添加新功能
  - 添加新建筑
  - 添加新配方
  - 添加新物品/科技
  - UI 定制

- **[技术架构](ARCHITECTURE.md)** - 代码结构详解
  - 核心数据结构
  - 游戏循环机制
  - 性能优化建议

### 📊 项目状态
- **[实现状态](IMPLEMENTATION_STATUS.md)** - 完成度总览
  - 已完成功能列表
  - 待开发功能
  - 已知问题

### 📖 功能文档
- [建筑管理系统](BUILDING_MANAGEMENT.md)
- [配方生产系统](RECIPE_PRODUCTION_SYSTEM.md)
- [电力系统修复](POWER_STATUS_FIX.md)
- [建筑状态修复](BUGFIX_BUILDING_STATUS.md)
- [完整游戏设计](扩张前线_游戏设计文档.md)

---

## ✨ 当前功能

### ✅ 已实现 (40%)

- ✅ **核心游戏循环** - 100ms 稳定运行
- ✅ **资源生产系统** - 采矿、冶炼、组装
- ✅ **电力管理** - 实时平衡，三色预警
- ✅ **建筑系统** - 网格卡片，实时状态
- ✅ **配方系统** - 多输入输出，进度追踪
- ✅ **UI界面** - 赛博朋克主题，响应式设计

### ❌ 待开发 (60%)

- ❌ **科技研究** - 数据已定义，逻辑未实现
- ❌ **战斗系统** - 敌人、单位、防御
- ❌ **区域征服** - 地图扩张
- ❌ **存档系统** - 🔴 高优先级
- ❌ **仓库系统**
- ❌ **传送带系统**

---

## 🏗️ 项目结构

```
expansion/
├── 📄 index.html              # 主HTML文件
├── 🎮 game.js                 # 核心游戏逻辑 (1800行)
├── 🎨 style.css              # 赛博朋克主题样式
│
├── 📦 data/                   # 游戏数据 (JSON)
│   ├── buildings.json        # 建筑定义 ✅
│   ├── items.json            # 物品定义 ✅
│   ├── recipes.json          # 配方定义 ✅
│   ├── technologies.json     # 科技定义 ⏳
│   ├── regions.json          # 区域定义 ⏳
│   ├── enemies.json          # 敌人定义 ⏳
│   └── units.json            # 单位定义 ⏳
│
└── 📚 docs/                   # 文档
    ├── DEVELOPER_GUIDE.md     # 开发指南 ⭐
    ├── QUICK_REFERENCE.md     # 快速参考 ⭐
    ├── ARCHITECTURE.md        # 架构文档
    └── ...
```

**图例：** ✅ 完成 | ⏳ 数据完成，逻辑待实现 | ⭐ 推荐阅读

---

## 🛠️ 技术栈

- **前端：** 纯 HTML + CSS + JavaScript（无框架）
- **数据：** JSON 配置文件
- **样式：** CSS Grid + Flexbox
- **主题：** 赛博朋克风格（霓虹灯、发光效果）

**为什么不用框架？**
- 📦 零依赖，易于理解
- 🚀 快速加载
- 🎓 适合学习游戏开发

---

## 🎯 快速开发示例

### 添加新建筑（3分钟）

**编辑 `data/buildings.json`：**
```json
"super-furnace": {
  "id": "super-furnace",
  "name": "超级熔炉",
  "category": "production",
  "slots": 1,
  "cost": { "steel-plate": 30, "circuit": 15 },
  "powerConsumption": 25,
  "speed": 5.0,
  "requiresTech": null,
  "description": "超高速冶炼，速度 10 个/秒"
}
```

**完成！** 刷新页面即可建造。

### 添加新配方（5分钟）

**1. 添加物品 (`data/items.json`):**
```json
"titanium-plate": {
  "id": "titanium-plate",
  "name": "钛板",
  "category": "intermediate",
  "stackSize": 100,
  "storageWeight": 2
}
```

**2. 添加配方 (`data/recipes.json`):**
```json
"titanium-plate": {
  "id": "titanium-plate",
  "name": "冶炼钛板",
  "category": "smelting",
  "buildingTypes": ["furnace", "electric-furnace"],
  "time": 3,
  "ingredients": { "titanium-ore": 1 },
  "results": { "titanium-plate": 1 },
  "requiresTech": null
}
```

**完成！** 熔炉可以选择这个配方。

**详细教程：** 查看 [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)

---

## 🐛 问题排查

### 游戏无法启动？

1. **检查浏览器控制台**（F12）
   - 是否有红色错误？
   - 记下错误信息

2. **使用本地服务器**
   ```bash
   python3 -m http.server 8000
   ```

### 建筑不工作？

1. **点击建筑查看状态：**
   - 🔴 缺电 → 建造更多发电站
   - 🔴 缺原料 → 检查输入材料
   - 🟡 未配置 → 点击"选择配方"
   - 🟡 输出满载 → 消耗产出资源

2. **检查电力平衡：**
   - 区域信息显示：⚡ 生产/消耗/s
   - 生产 ≥ 消耗 = 🟢 正常

---

## 🎨 游戏特色

### 赛博朋克视觉风格
- 🌃 深色背景 + 霓虹配色
- ✨ 发光边框和阴影效果
- 🎯 动态主题切换（每个Tab不同颜色）
- 💫 流畅的动画和过渡

### 直观的状态系统
- 🟢 **正常** - 绿色发光
- 🟡 **警告** - 黄色慢闪
- 🔴 **错误** - 红色快闪
- ⚪ **暂停** - 灰色

### 实时反馈
- 📊 资源数量实时更新
- ⚡ 电力平衡即时反馈
- 📈 生产进度可视化
- 🔔 Toast 通知重要事件

---

## 🚀 开发路线图

### 短期目标（1-2周）

- [ ] **存档系统** 🔴
  - localStorage 保存/加载
  - 自动保存

- [ ] **科技研究** 🔴
  - 消耗科研包
  - 解锁建筑/配方

### 中期目标（1-2月）

- [ ] **战斗系统** 🟡
  - 敌人AI
  - 防御建筑

- [ ] **区域征服** 🟡
  - 地图界面
  - 区域解锁

### 长期目标（3-6月）

- [ ] **传送带系统** 🟢
- [ ] **蓝图系统** 🟢
- [ ] **多人模式** 🟢

---

## 📊 数据统计

| 项目 | 数值 |
|------|------|
| 代码行数 | ~2500 行 |
| 文档字数 | ~20000 字 |
| 建筑类型 | 15+ 种 |
| 配方数量 | 20+ 种 |
| 物品种类 | 30+ 种 |
| 科技数量 | 20+ 项 |
| 区域数量 | 20 个 |

---

## 🎉 开始游戏！

```bash
# 1. 启动游戏
python3 -m http.server 8000

# 2. 打开浏览器
open http://localhost:8000

# 3. 享受游戏！
# 建造 → 生产 → 自动化 → 扩张
```

**祝你玩得开心！** 🚀🏭⚡

---

**最后更新：** 2025-01-03
**版本：** 0.4.0-alpha
**状态：** 可玩的原型，框架完善
