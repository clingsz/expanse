// ========================================
// 扩张前线 - 游戏逻辑 v2.0
// ========================================

// ========================================
// Toast通知系统
// ========================================
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// ========================================
// Building VFX System
// ========================================
function pulseBuilding(buildingId) {
    const card = document.querySelector(`.building-card-compact[data-building-id="${buildingId}"]`);
    if (card) {
        card.classList.remove('pulse-success');
        // Force browser reflow to restart animation
        void card.offsetWidth;
        card.classList.add('pulse-success');
    }
}

// ========================================
// 自定义确认对话框
// ========================================
function showConfirm(message, onConfirm, onCancel = null) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-body">${message}</div>
                    <div class="modal-actions">
                        <button class="btn btn-confirm">确定</button>
                        <button class="btn btn-cancel">取消</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const confirmBtn = overlay.querySelector('.btn-confirm');
        const cancelBtn = overlay.querySelector('.btn-cancel');

        const cleanup = () => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 300);
        };

        confirmBtn.addEventListener('click', () => {
            cleanup();
            resolve(true);
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(false);
            if (onCancel) onCancel();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
                if (onCancel) onCancel();
            }
        });
    });
}

function showBuildingDetailModal(template) {
    const region = getCurrentRegion();
    const canBuild = checkCanBuild(template);
    const buildingCount = region.buildings.filter(b => b && b.buildingId === template.id).length;

    // 生成详细成本显示
    let costHTML = '';
    if (template.cost) {
        costHTML = Object.entries(template.cost)
            .map(([resource, amount]) => {
                const item = GameData.items[resource];
                const available = Math.floor(gameState.resources[resource].current);
                const sufficient = available >= amount;
                const className = sufficient ? 'sufficient' : 'insufficient';
                return `<div class="cost-item-detail ${className}">
                    ${item.name}: ${available}/${amount}
                </div>`;
            })
            .join('');
    }

    // 生成建筑属性显示
    let propertiesHTML = `
        <div class="building-property">槽位: ${template.slots}</div>
        <div class="building-property">当前区域已有: ${buildingCount} 个</div>
    `;

    if (template.powerConsumption) {
        propertiesHTML += `<div class="building-property">耗电: ${template.powerConsumption}/秒</div>`;
    }
    if (template.powerProduction) {
        propertiesHTML += `<div class="building-property">发电: ${template.powerProduction}/秒</div>`;
    }
    if (template.productionRate) {
        propertiesHTML += `<div class="building-property">生产速度: ${template.productionRate}/秒</div>`;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content building-detail-modal">
                <div class="modal-header">
                    <h3>${template.name}</h3>
                </div>
                <div class="modal-body">
                    <div class="building-description">${template.description}</div>
                    <div class="building-properties">
                        ${propertiesHTML}
                    </div>
                    <div class="building-costs">
                        <h4>建造成本:</h4>
                        ${costHTML}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-confirm" id="modal-build-btn" ${canBuild ? '' : 'disabled'}>
                        ${canBuild ? '建造' : getBuildErrorMessage(template)}
                    </button>
                    <button class="btn btn-cancel">取消</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const buildBtn = overlay.querySelector('#modal-build-btn');
    const cancelBtn = overlay.querySelector('.btn-cancel');

    const cleanup = () => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 300);
    };

    buildBtn.addEventListener('click', () => {
        if (canBuild) {
            buildBuilding(template.id);
            cleanup();
        }
    });

    cancelBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cleanup();
        }
    });
}

// ========================================
// 全局数据存储
const GameData = {
    items: null,
    buildings: null,
    recipes: null,
    technologies: null,
    units: null,
    enemies: null,
    regionTemplates: null,
    loaded: false
};

// 游戏状态
const gameState = {
    currentRegionId: 1,
    regions: [],

    // 全局资源（所有区域共享）
    resources: {},

    // 已研究的科技
    researchedTech: [],

    // 当前研究
    currentResearch: null,
    researchProgress: 0,

    // 电力统计
    power: {
        production: 0,
        consumption: 0
    },
    powerWarningShown: false,

    // 时间系统
    time: {
        isDay: true,
        dayDuration: 180,
        nightDuration: 120,
        timeRemaining: 180,
        totalTime: 0,
        clockTime: 480  // 游戏内时钟（分钟），从08:00am开始 (8 * 60 = 480)
    },

    // 生产统计（每秒速率）
    statistics: {
        production: {},    // 资源生产速率 /s
        consumption: {},   // 资源消耗速率 /s
        buildings: {},     // 建筑数量统计
        lastUpdateTime: 0  // 上次更新时间
    },

    // 建筑ID计数器
    buildingIdCounter: 1,

    // Grid-based battle system - removed old battle state
    // Battle is now per-region, stored in region.battle

    // Unit inventory removed - units are now resources
};

// ========================================
// 数据加载
// ========================================
async function loadGameData() {
    console.log('开始加载游戏数据...');

    try {
        const data = await fetch('data.json').then(r => r.json());

        GameData.items = data.items;
        GameData.buildings = data.buildings;
        GameData.recipes = data.recipes;
        GameData.technologies = data.technologies;
        GameData.units = data.units;
        GameData.enemies = data.enemies;
        GameData.regionTemplates = data.regions;
        GameData.loaded = true;

        console.log('游戏数据加载完成！');
        return true;
    } catch (error) {
        console.error('加载游戏数据失败:', error);
        showToast('加载游戏数据失败，请刷新页面重试', 'error', 5000);
        return false;
    }
}

// ========================================
// 仓库容量计算
// ========================================
function calculateTotalStorageCapacity() {
    let totalCapacity = 500; // 基础容量

    // 统计所有区域的仓库建筑
    gameState.regions.forEach(region => {
        region.buildings.forEach(building => {
            if (!building) return; // 跳过已删除的建筑
            const template = GameData.buildings[building.buildingId];
            if (template.storageBonus) {
                totalCapacity += template.storageBonus;
            }
        });
    });

    return totalCapacity;
}

function updateUnitStorageLimits() {
    const totalCapacity = calculateTotalStorageCapacity();

    // 为每个单位类型计算最大储存量
    Object.entries(GameData.units).forEach(([unitId, unitData]) => {
        if (gameState.resources[unitId]) {
            // 单位容量 = 总容量 / 单位重量
            const maxUnits = Math.floor(totalCapacity / unitData.storageWeight);
            gameState.resources[unitId].max = maxUnits;
        }
    });

    console.log(`[仓库] 总容量: ${totalCapacity}, 单位存储上限已更新`);
}

// ========================================
// 新手教程系统
// ========================================
const tutorialSteps = [
    {
        title: "欢迎来到扩张前线！",
        content: `这是一款工业生产与战斗结合的策略游戏。

你的目标是：
• 建立生产线，生产资源和武器
• 研究科技，解锁新建筑和配方
• 训练部队，占领新区域

让我们从基础开始！`,
        highlight: null
    },
    {
        title: "第一步：建造发电站",
        content: `电力是一切的基础！

点击底部的【建造】按钮，然后在能源建筑中建造一个【风力发电站】。

风力发电站不需要燃料，是最基础的电力来源。`,
        highlight: "build"
    },
    {
        title: "第二步：建造矿机",
        content: `现在有电力了，让我们开始采集资源。

在【建造】页面的采集建筑中，建造一个【矿机 Mk1】。

建造后会要求你选择要采集的资源节点，选择铁矿即可。`,
        highlight: "build"
    },
    {
        title: "第三步：建造熔炉",
        content: `铁矿需要冶炼成铁板才能使用。

在【建造】页面建造一个【熔炉】，然后点击熔炉选择配方【冶炼铁板】。

熔炉会自动消耗铁矿，产出铁板！`,
        highlight: "build"
    },
    {
        title: "生产链运作中",
        content: `很好！现在你有了完整的生产链：

矿机采集铁矿 → 熔炉冶炼铁板 → 铁板储存

你可以在【区域】页面查看建筑状态和资源库存。

点击建筑卡片可以查看详细信息！`,
        highlight: "region"
    },
    {
        title: "科技研究",
        content: `积累足够资源后，可以研究科技解锁新内容。

点击【科技】页面，选择一项科技开始研究。

研究需要消耗科研包，建造【研究中心】和【组装机】可以生产科研包。`,
        highlight: "tech"
    },
    {
        title: "军事与战斗",
        content: `准备好扩张了吗？

在【军事】页面可以查看你的部队和弹药。
在【地图】页面可以选择区域进行战斗。

建造【兵营】和【军工厂】来生产单位和弹药！`,
        highlight: "military"
    },
    {
        title: "教程完成！",
        content: `你已经掌握了基础玩法！

记住：
• 保持电力充足
• 建立完整的生产链
• 研究科技解锁新内容
• 训练部队占领新区域

祝你征服成功！ 🎉`,
        highlight: null
    }
];

function showTutorial() {
    // 检查是否已完成教程
    if (localStorage.getItem('tutorialCompleted') === 'true') {
        return;
    }

    let currentStep = 0;

    function showStep(stepIndex) {
        const step = tutorialSteps[stepIndex];
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay tutorial-overlay';
        overlay.innerHTML = `
            <div class="modal-dialog tutorial-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${step.title}</h3>
                        <span class="tutorial-progress">${stepIndex + 1}/${tutorialSteps.length}</span>
                    </div>
                    <div class="modal-body tutorial-body">
                        ${step.content.split('\n').map(line => `<p>${line}</p>`).join('')}
                    </div>
                    <div class="modal-actions">
                        ${stepIndex > 0 ? '<button class="btn btn-secondary" id="tutorial-prev">← 上一步</button>' : ''}
                        ${stepIndex < tutorialSteps.length - 1
                            ? '<button class="btn btn-primary" id="tutorial-next">下一步 →</button>'
                            : '<button class="btn btn-confirm" id="tutorial-finish">开始游戏！</button>'}
                        <button class="btn btn-cancel" id="tutorial-skip">跳过教程</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 高亮对应的Tab
        if (step.highlight) {
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('tutorial-highlight');
            });

            const tabMapping = {
                'region': 0,
                'build': 1,
                'tech': 2,
                'military': 3,
                'storage': 4,
                'map': 5
            };

            const tabIndex = tabMapping[step.highlight];
            if (tabIndex !== undefined) {
                const tabs = document.querySelectorAll('.tab-button');
                if (tabs[tabIndex]) {
                    tabs[tabIndex].classList.add('tutorial-highlight');
                }
            }
        }

        // 绑定按钮事件
        const nextBtn = overlay.querySelector('#tutorial-next');
        const prevBtn = overlay.querySelector('#tutorial-prev');
        const finishBtn = overlay.querySelector('#tutorial-finish');
        const skipBtn = overlay.querySelector('#tutorial-skip');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                currentStep++;
                showStep(currentStep);
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                currentStep--;
                showStep(currentStep);
            });
        }

        if (finishBtn || skipBtn) {
            const finishTutorial = () => {
                localStorage.setItem('tutorialCompleted', 'true');
                document.body.removeChild(overlay);
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('tutorial-highlight');
                });
                showToast('教程已完成！', 'success');
            };

            if (finishBtn) finishBtn.addEventListener('click', finishTutorial);
            if (skipBtn) skipBtn.addEventListener('click', finishTutorial);
        }
    }

    showStep(0);
}

function restartTutorial() {
    localStorage.removeItem('tutorialCompleted');
    showTutorial();
}

// ========================================
// 游戏初始化
// ========================================
function initializeGame() {
    console.log('========================================');
    console.log('🎮 初始化游戏状态...');
    console.log('========================================');

    // Check if GameData is loaded
    if (!GameData.loaded) {
        console.error('❌ GameData not loaded! Cannot initialize game.');
        showToast('游戏数据未加载完成，请稍后重试', 'error', 3000);
        return false;
    }

    console.log('✓ GameData loaded successfully');
    console.log(`   Items: ${Object.keys(GameData.items).length}`);
    console.log(`   Buildings: ${Object.keys(GameData.buildings).length}`);
    console.log(`   Recipes: ${Object.keys(GameData.recipes).length}`);
    console.log(`   Technologies: ${Object.keys(GameData.technologies).length}`);

    // 初始化资源
    Object.entries(GameData.items).forEach(([id, item]) => {
        let maxAmount = 500;
        if (item.category === 'energy') maxAmount = 1000;
        else if (item.category === 'ammo') maxAmount = 2000; // 弹药有更大的上限
        else if (item.category === 'unit') {
            // 单位存储基于仓库容量，初始为0（需要建造仓库）
            maxAmount = 0;
        }

        gameState.resources[id] = {
            current: 0,
            max: maxAmount
        };
    });

    // 计算初始单位存储上限
    updateUnitStorageLimits();

    // 初始化单位为资源（受仓库容量限制）
    Object.entries(GameData.units).forEach(([id, unit]) => {
        if (!gameState.resources[id]) {
            gameState.resources[id] = {
                current: 0,
                max: 100  // 单位默认上限100，可以通过仓库扩展
            };
        }
    });

    // 初始资源 (DEBUG - 增加资源方便测试)
    gameState.resources['iron-plate'].current = 500;
    gameState.resources['copper-plate'].current = 300;
    gameState.resources['stone'].current = 200;
    gameState.resources['iron-ore'].current = 200;
    gameState.resources['copper-ore'].current = 200;
    gameState.resources['steel-plate'].current = 100;
    gameState.resources['gear'].current = 100;
    gameState.resources['circuit'].current = 50;
    gameState.resources['power'].current = 0;
    gameState.resources['coal'].current = 100;

    // 初始军事资源 (DEBUG - 方便测试战斗系统)
    gameState.resources['machinegun-drone'].current = 500;
    gameState.resources['normal-bullet'].current = 50000;

    // 初始化区域
    const region1Template = GameData.regionTemplates[0];
    gameState.regions = [{
        id: region1Template.id,
        name: region1Template.name,
        slotsTotal: region1Template.slotsTotal,
        slotsUsed: 0,
        buildingSlots: initializeBuildingSlots(region1Template), // New slot-based system
        buildings: [], // Keep for backward compatibility
        conquered: true
    }];

    // Set current region to the first region
    gameState.currentRegionId = region1Template.id;

    console.log('✓ 游戏初始化完成！');
    console.log(`   当前区域: ${region1Template.name} (ID: ${region1Template.id})`);
    console.log('========================================');
    return true;
}

// ========================================
// Battle Grid System
// ========================================
function initializeBattleGrid(region, regionTemplate) {
    // Create 4x4 grid (16 cells)
    // Cells 0-7: Enemy troops (top 2 rows)
    // Cells 8-15: Player troops (bottom 2 rows)

    const grid = [];
    for (let i = 0; i < 16; i++) {
        grid.push({
            troop: null, // {type, count, hpPerUnit, totalHP, maxHP}
            cooldown: 0,
            maxCooldown: 0,
            status: 'idle'
        });
    }

    // Initialize enemy troops in top 2 rows (cells 0-7)
    // Split large groups into multiple cells (max 10 units per cell)
    if (regionTemplate.enemies) {
        let cellIndex = 0;
        regionTemplate.enemies.forEach(enemySpawn => {
            const enemyData = GameData.enemies[enemySpawn.type];
            if (!enemyData || enemySpawn.count <= 0) return;

            // Split into groups of 10
            let remainingCount = enemySpawn.count;
            while (remainingCount > 0 && cellIndex < 8) {
                const groupSize = Math.min(10, remainingCount);

                const totalHP = enemyData.hp * groupSize;
                grid[cellIndex].troop = {
                    type: enemySpawn.type,
                    side: 'enemy',
                    count: groupSize,
                    hpPerUnit: enemyData.hp,
                    totalHP: totalHP,
                    displayHP: totalHP, // Initialize displayHP for visual sync
                    incomingDamage: 0, // Track in-flight bullets
                    attack: enemyData.attack * 0.5 // Half attack power for slower battles
                };
                grid[cellIndex].maxCooldown = 4.0; // 4 second attack interval (doubled)
                grid[cellIndex].cooldown = Math.random() * 4.0; // Random initial cooldown

                remainingCount -= groupSize;
                cellIndex++;
            }
        });
    }

    region.battle = {
        grid: grid,
        active: true,
        lastCombatTime: Date.now(),
        battleLog: []
    };
}

function ensureBattleState(region) {
    const regionTemplate = GameData.regionTemplates.find(r => r.id === region.id);
    if (!region.battle && regionTemplate && !region.conquered) {
        initializeBattleGrid(region, regionTemplate);
    }
    return region.battle;
}

// ========================================
// 界面切换系统
// ========================================
// Initialize building slots with properties (resource nodes, etc.)
function initializeBuildingSlots(template) {
    const slots = [];
    const resourceNodes = template.resourceNodes || [];

    // Create all slots (16 for region)
    for (let i = 0; i < template.slotsTotal; i++) {
        slots.push({
            slotIndex: i,
            slotProperty: null, // No property by default
            building: null
        });
    }

    // Randomly assign resource nodes to slots
    if (resourceNodes.length > 0) {
        // Get random slot indices (no duplicates)
        const availableIndices = Array.from({length: template.slotsTotal}, (_, i) => i);
        const shuffled = availableIndices.sort(() => Math.random() - 0.5);

        resourceNodes.forEach((node, index) => {
            if (index < shuffled.length) {
                const slotIndex = shuffled[index];
                slots[slotIndex].slotProperty = {
                    type: 'resource',
                    resourceType: node.type,
                    totalAmount: node.amount,
                    remainingAmount: node.amount,
                    miningRate: node.rate
                };
            }
        });
    }

    return slots;
}

function findNextUnconqueredRegion() {
    // Find first unconquered region
    for (let i = 0; i < GameData.regionTemplates.length; i++) {
        const template = GameData.regionTemplates[i];
        const region = gameState.regions.find(r => r.id === template.id);

        if (!region || !region.conquered) {
            // Return existing region or create new one
            if (!region) {
                const newRegion = {
                    id: template.id,
                    name: template.name,
                    slotsTotal: template.slotsTotal,
                    slotsUsed: 0,
                    buildingSlots: initializeBuildingSlots(template), // New slot-based system
                    buildings: [], // Keep for backward compatibility, will migrate
                    conquered: false
                };
                gameState.regions.push(newRegion);
                initializeBattleGrid(newRegion, template);
                return newRegion;
            }
            return region;
        }
    }
    return null; // All conquered
}

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });

    document.getElementById(screenName + '-screen').style.display = 'flex';

    // Update tab buttons - find the matching tab by index
    document.querySelectorAll('.tab-button').forEach((btn, index) => {
        btn.classList.remove('active');
    });

    // Map screen names to tab indices
    const tabMap = {
        'region': 0,
        'build': 1,
        'tech': 2,
        'military': 3,
        'storage': 4,
        'map': 5
    };

    const tabIndex = tabMap[screenName];
    if (tabIndex !== undefined) {
        const tabs = document.querySelectorAll('.tab-button');
        if (tabs[tabIndex]) {
            tabs[tabIndex].classList.add('active');
        }
    }

    // 更新主题颜色
    document.body.setAttribute('data-theme', screenName);

    if (screenName === 'region') {
        updateRegionScreen();
    } else if (screenName === 'build') {
        updateBuildScreen();
    } else if (screenName === 'tech') {
        updateTechScreen();
    } else if (screenName === 'storage') {
        updateStorageScreen();
    } else if (screenName === 'map') {
        updateMapScreen();
    } else if (screenName === 'military') {
        // Show next unconquered region's battle
        const nextBattleRegion = findNextUnconqueredRegion();
        if (nextBattleRegion) {
            gameState.currentRegionId = nextBattleRegion.id;
            ensureBattleState(nextBattleRegion);
            updateMilitaryBattleScreen();
        } else {
            updateMilitaryScreen(); // Fallback to idle view if all conquered
        }
    }
}

// ========================================
// 区域界面更新
// ========================================
function toggleProductionStats() {
    const section = document.getElementById('production-stats-section');
    const button = document.querySelector('.btn-toggle-stats');

    if (section.style.display === 'none') {
        section.style.display = 'block';
        button.textContent = '📊 隐藏生产统计';
        updateProductionStats();
    } else {
        section.style.display = 'none';
        button.textContent = '📊 显示生产统计';
    }
}

function showResourceNodesModal() {
    const region = getCurrentRegion();

    // 创建资源节点列表
    let nodesHTML = '';
    region.resourceNodes.forEach((node, index) => {
        const item = GameData.items[node.type];
        const isUsed = region.buildings.some(b => b.resourceNodeIndex === index);
        const usedText = isUsed ? ' (已占用)' : '';
        const usedClass = isUsed ? 'resource-node-used' : '';

        nodesHTML += `
            <div class="resource-node-card ${usedClass}">
                <div class="resource-node-name">${item.name}${usedText}</div>
                <div class="resource-node-info">
                    <div>剩余: ${node.amount.toFixed(0)}</div>
                    <div>速率: ${node.rate}/秒</div>
                    <div>预计: ${(node.amount / node.rate / 60).toFixed(1)}分钟</div>
                </div>
            </div>
        `;
    });

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog resource-nodes-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>区域资源节点</h3>
                </div>
                <div class="modal-body">
                    <div class="resource-nodes-grid">
                        ${nodesHTML}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-cancel" onclick="closeModal()">关闭</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });
}

function updateRegionScreen() {
    const region = getCurrentRegion();

    // 使用安全的DOM更新（检查元素是否存在）
    const currentRegionNameEl = document.getElementById('current-region-name');
    if (currentRegionNameEl) currentRegionNameEl.textContent = `区域 ${region.id}`;

    const regionNameEl = document.getElementById('region-name');
    if (regionNameEl) regionNameEl.textContent = region.name;

    const slotsUsedEl = document.getElementById('slots-used');
    if (slotsUsedEl) slotsUsedEl.textContent = region.slotsUsed.toFixed(1);

    const slotsTotalEl = document.getElementById('slots-total');
    if (slotsTotalEl) slotsTotalEl.textContent = region.slotsTotal;

    // 计算总资源量（兼容新旧系统）
    let totalResources = 0;
    if (region.resourceNodes && region.resourceNodes.length > 0) {
        // Old system
        totalResources = region.resourceNodes.reduce((sum, node) => sum + node.amount, 0);
    } else if (region.buildingSlots) {
        // New system: sum up resources from slots
        totalResources = region.buildingSlots.reduce((sum, slot) => {
            if (slot.slotProperty && slot.slotProperty.type === 'resource') {
                return sum + slot.slotProperty.remainingAmount;
            }
            return sum;
        }, 0);
    }
    const totalResourcesEl = document.getElementById('total-resources');
    if (totalResourcesEl) totalResourcesEl.textContent = Math.floor(totalResources);

    updateResourceDisplay();
    updateTimeDisplay();
    updateProductionStats();

    // Region tab always shows buildings now (battle moved to military tab)
    renderBuildingsGrid4x4(); // 渲染4x4建筑网格
}

function updateResourceDisplay() {
    // 资源ID映射到HTML元素ID
    const resourceMap = {
        'iron-ore': 'iron-ore',
        'copper-ore': 'copper-ore',
        'iron-plate': 'iron',
        'copper-plate': 'copper',
        'steel-plate': 'steel',
        'stone': 'stone',
        'coal': 'coal',
        'gear': 'gear',
        'circuit': 'circuit'
    };

    Object.entries(resourceMap).forEach(([resId, elementId]) => {
        const res = gameState.resources[resId];
        if (res) {
            const currentEl = document.getElementById(`res-${elementId}`);
            const maxEl = document.getElementById(`res-${elementId}-max`);

            if (currentEl) currentEl.textContent = Math.floor(res.current);
            if (maxEl) maxEl.textContent = res.max;
        }
    });

    // 电力显示（负载比例）
    const powerLoadEl = document.getElementById('power-load');
    const powerStatusItem = document.getElementById('power-status-item');

    // 计算负载比例 = 消耗/生产 × 100%
    let powerLoad = 0;
    if (gameState.power.production > 0) {
        powerLoad = Math.floor((gameState.power.consumption / gameState.power.production) * 100);
    } else if (gameState.power.consumption > 0) {
        // 没有发电但有消耗，显示超载
        powerLoad = 999;
    }

    if (powerLoadEl) {
        if (powerLoad >= 999) {
            powerLoadEl.textContent = '超载!';
        } else {
            powerLoadEl.textContent = `${powerLoad}%`;
        }
    }

    // 根据负载比例设置颜色
    if (powerStatusItem) {
        powerStatusItem.classList.remove('power-good', 'power-warning', 'power-critical');

        if (gameState.power.consumption === 0) {
            // 无消耗时显示正常
            powerStatusItem.classList.add('power-good');
        } else if (powerLoad <= 80) {
            // 绿色：负载 <= 80%（健康）
            powerStatusItem.classList.add('power-good');
        } else if (powerLoad <= 100) {
            // 黄色：负载 80%-100%（接近满载）
            powerStatusItem.classList.add('power-warning');
        } else {
            // 红色：负载 > 100%（超载缺电）
            powerStatusItem.classList.add('power-critical');
        }
    }
}

function updateTimeDisplay() {
    const time = gameState.time;

    // 将clockTime (分钟) 转换为小时，只显示小时不显示分钟
    const totalMinutes = Math.floor(time.clockTime) % 1440; // 1440分钟 = 24小时
    const hours24 = Math.floor(totalMinutes / 60);

    // 转换为12小时制
    const isPM = hours24 >= 12;
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;

    const period = isPM ? 'pm' : 'am';
    const timeStr = `${hours12}${period}`; // 只显示小时，如 "8am", "12pm"

    const gameTimeEl = document.getElementById('game-time');
    if (gameTimeEl) gameTimeEl.textContent = timeStr;

    // 保留旧的显示元素兼容性
    const timeOfDayEl = document.getElementById('time-of-day');
    if (timeOfDayEl) timeOfDayEl.textContent = time.isDay ? '白天' : '夜晚';

    const timeRemainingEl = document.getElementById('time-remaining');
    if (timeRemainingEl) {
        const mins = Math.floor(time.timeRemaining / 60);
        const secs = Math.floor(time.timeRemaining % 60);
        timeRemainingEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// 检查当前是否有太阳光照（5am-7pm）
function hasSunlight() {
    const totalMinutes = Math.floor(gameState.time.clockTime) % 1440;
    const hours24 = Math.floor(totalMinutes / 60);
    // 5am = 5小时, 7pm = 19小时
    return hours24 >= 5 && hours24 < 19;
}

function updateBuildingsList() {
    const region = getCurrentRegion();
    const container = document.getElementById('buildings-list');

    if (!region) {
        console.error('[updateBuildingsList] 无法获取当前区域！currentRegionId:', gameState.currentRegionId);
        container.innerHTML = '<div class="empty-message">错误：无法获取当前区域</div>';
        return;
    }

    const activeBuildings = region.buildings.filter(b => b !== null && b !== undefined);
    if (!region.buildings || activeBuildings.length === 0) {
        container.innerHTML = '<div class="empty-message">暂无建筑，请前往建造界面建造</div>';
        return;
    }

    container.innerHTML = '';
    region.buildings.forEach(building => {
        if (!building) return; // 跳过已删除的建筑
        const card = createBuildingCard(building);
        container.appendChild(card);
    });
}

// ========================================
// Battle Grid Rendering
// ========================================
function renderBattleGrid() {
    const region = getCurrentRegion();
    // Use military screen container for battle
    const container = document.getElementById('buildings-grid-4x4-military');

    if (!container) return;
    if (!region || !region.battle) return;

    container.innerHTML = '';
    container.classList.add('battle-grid-active');

    const battle = region.battle;

    // Render 16 grid cells (4x4)
    for (let i = 0; i < 16; i++) {
        const cell = battle.grid[i];
        const gridCell = document.createElement('div');
        gridCell.className = 'battle-grid-cell';
        gridCell.dataset.cellIndex = i;

        // Enemy cells (0-7) vs Player cells (8-15)
        if (i < 8) {
            gridCell.classList.add('enemy-cell');
        } else {
            gridCell.classList.add('player-cell');
        }

        if (cell.troop) {
            const troop = cell.troop;
            const data = troop.side === 'enemy' ? GameData.enemies[troop.type] : GameData.units[troop.type];

            // Initialize displayHP if not exists
            if (troop.displayHP === undefined) {
                troop.displayHP = troop.totalHP;
            }

            // Calculate first unit's HP for display (use displayHP for visual)
            const currentDisplayCount = Math.ceil(troop.displayHP / troop.hpPerUnit);
            const firstUnitHP = troop.displayHP - (currentDisplayCount - 1) * troop.hpPerUnit;
            const hpPercent = troop.hpPerUnit > 0 ? (firstUnitHP / troop.hpPerUnit) * 100 : 0;
            const cooldownPercent = cell.maxCooldown > 0 ? ((cell.maxCooldown - cell.cooldown) / cell.maxCooldown) * 100 : 0;

            // Calculate ammo rounds for player units
            const ammoRounds = calculateAmmoRounds(troop);
            const ammoDisplay = ammoRounds !== null ? `<div class="troop-ammo">弹药：${ammoRounds} 轮</div>` : '';

            // Get status text
            const statusMap = {
                'preparing': '准备中',
                'attacking': '攻击中',
                'no_ammo': '缺弹药',
                'idle': '待机',
                'recovering': '恢复中'
            };
            const statusText = statusMap[cell.status] || '待机';
            const statusClass = 'troop-status-' + (cell.status || 'idle');

            gridCell.innerHTML = `
                <div class="troop-info">
                    <div class="troop-name">${data.name}</div>
                    <div class="troop-count">×${currentDisplayCount}</div>
                    <div class="troop-status ${statusClass}">${statusText.replace('_', ' ')}</div>
                    <div class="troop-hp-bar">
                        <div class="troop-hp-fill" style="width: ${hpPercent}%"></div>
                    </div>
                    <div class="troop-stats">HP: ${Math.ceil(firstUnitHP)}/${troop.hpPerUnit}</div>
                    ${ammoDisplay}
                    <div class="troop-cooldown-bar">
                        <div class="troop-cooldown-fill" style="width: ${cooldownPercent}%"></div>
                    </div>
                </div>
            `;
        } else {
            gridCell.innerHTML = '<div class="empty-cell-label">' + (i < 8 ? '' : '空位') + '</div>';
        }

        container.appendChild(gridCell);
    }

    // Render battle status bars at top
    renderBattleStatus();

    // Render deployment buttons at bottom
    renderDeploymentButtons();
}

// Update battle grid values without recreating DOM (prevents blinking and destroying bullets)
function updateBattleGridValues() {
    const region = getCurrentRegion();
    const container = document.getElementById('buildings-grid-4x4-military');

    if (!container) return;
    if (!region || !region.battle) return;

    const battle = region.battle;

    // Update each cell's values
    for (let i = 0; i < 16; i++) {
        const cell = battle.grid[i];
        const gridCell = container.querySelector(`[data-cell-index="${i}"]`);
        if (!gridCell) continue;

        if (cell.troop) {
            const troop = cell.troop;

            // Initialize displayHP if not exists
            if (troop.displayHP === undefined) {
                troop.displayHP = troop.totalHP;
            }

            // Calculate first unit's HP for display (use displayHP for visual)
            const currentDisplayCount = Math.ceil(troop.displayHP / troop.hpPerUnit);
            const firstUnitHP = troop.displayHP - (currentDisplayCount - 1) * troop.hpPerUnit;
            const hpPercent = troop.hpPerUnit > 0 ? (firstUnitHP / troop.hpPerUnit) * 100 : 0;
            const cooldownPercent = cell.maxCooldown > 0 ? ((cell.maxCooldown - cell.cooldown) / cell.maxCooldown) * 100 : 0;

            // Update HP bar
            const hpFill = gridCell.querySelector('.troop-hp-fill');
            if (hpFill) hpFill.style.width = `${hpPercent}%`;

            // Update HP text
            const hpStats = gridCell.querySelector('.troop-stats');
            if (hpStats) hpStats.textContent = `HP: ${Math.ceil(firstUnitHP)}/${troop.hpPerUnit}`;

            // Update cooldown bar
            const cooldownFill = gridCell.querySelector('.troop-cooldown-fill');
            if (cooldownFill) cooldownFill.style.width = `${cooldownPercent}%`;

            // Update status
            const statusMap = {
                'preparing': '准备中',
                'attacking': '攻击中',
                'no_ammo': '缺弹药',
                'idle': '待机',
                'recovering': '恢复中'
            };
            const statusText = statusMap[cell.status] || '待机';
            const statusElement = gridCell.querySelector('.troop-status');
            if (statusElement) {
                statusElement.textContent = statusText;
                statusElement.className = 'troop-status troop-status-' + (cell.status || 'idle');
            }

            // Update troop count (use display count)
            const countElement = gridCell.querySelector('.troop-count');
            if (countElement) countElement.textContent = `×${currentDisplayCount}`;

            // Update ammo display
            const ammoRounds = calculateAmmoRounds(troop);
            const ammoElement = gridCell.querySelector('.troop-ammo');
            if (ammoRounds !== null) {
                if (ammoElement) {
                    ammoElement.textContent = `弹药：${ammoRounds} 轮`;
                } else if (troop.side === 'player') {
                    // Add ammo display if it doesn't exist
                    const troopInfo = gridCell.querySelector('.troop-info');
                    const ammoDiv = document.createElement('div');
                    ammoDiv.className = 'troop-ammo';
                    ammoDiv.textContent = `弹药：${ammoRounds} 轮`;
                    troopInfo.insertBefore(ammoDiv, troopInfo.querySelector('.troop-cooldown-bar'));
                }
            }
        } else {
            // Troop died or slot is empty - show empty label
            const hasContent = gridCell.querySelector('.troop-info, .empty-cell-label');
            if (hasContent && !gridCell.querySelector('.empty-cell-label')) {
                // Cell had troop but now empty - update it
                gridCell.innerHTML = '<div class="empty-cell-label">' + (i < 8 ? '' : '空位') + '</div>';
            }
        }
    }

    // Update battle status bar
    updateBattleStatusBar();

    // Update deployment buttons
    updateDeploymentButtonCounts();
}

// Update only the status bar values
function updateBattleStatusBar() {
    const region = getCurrentRegion();
    if (!region || !region.battle) return;

    const container = document.getElementById('battle-status-container-military');
    if (!container) return;

    const battle = region.battle;

    // Calculate totals (use displayHP for visual consistency)
    let playerHP = 0, playerMaxHP = 0, enemyHP = 0, enemyMaxHP = 0;
    battle.grid.forEach(cell => {
        if (cell.troop) {
            // Initialize displayHP if not exists
            if (cell.troop.displayHP === undefined) {
                cell.troop.displayHP = cell.troop.totalHP;
            }

            const currentDisplayCount = Math.ceil(cell.troop.displayHP / cell.troop.hpPerUnit);
            const currentMaxHP = currentDisplayCount * cell.troop.hpPerUnit;
            if (cell.troop.side === 'player') {
                playerHP += cell.troop.displayHP;
                playerMaxHP += currentMaxHP;
            } else {
                enemyHP += cell.troop.displayHP;
                enemyMaxHP += currentMaxHP;
            }
        }
    });

    const totalHP = playerHP + enemyHP;
    const playerPercent = totalHP > 0 ? (playerHP / totalHP) * 100 : 50;
    const enemyPercent = 100 - playerPercent;

    // Update bar widths
    const enemyBar = container.querySelector('.enemy-bar');
    const playerBar = container.querySelector('.player-bar');
    if (enemyBar) enemyBar.style.width = `${enemyPercent}%`;
    if (playerBar) playerBar.style.width = `${playerPercent}%`;

    // Update text
    const enemyHPText = container.querySelector('.enemy-hp');
    const playerHPText = container.querySelector('.player-hp');
    if (enemyHPText) enemyHPText.textContent = `敌军：${Math.ceil(enemyHP)}/${enemyMaxHP}`;
    if (playerHPText) playerHPText.textContent = `我方：${Math.ceil(playerHP)}/${playerMaxHP}`;
}

// Update deployment button counts
function updateDeploymentButtonCounts() {
    const deployContainer = document.getElementById('deployment-buttons-container-military');
    if (!deployContainer) return;

    const buttons = deployContainer.querySelectorAll('.deploy-drone-btn');
    buttons.forEach(btn => {
        const unitId = btn.dataset.unitId;
        if (unitId) {
            const available = gameState.resources[unitId]?.current || 0;
            const unitData = GameData.units[unitId];
            if (unitData) {
                btn.textContent = `${unitData.name} (${available})`;
            }
        }
    });
}

function renderBattleStatus() {
    const region = getCurrentRegion();
    if (!region || !region.battle) return;

    // Use military screen status container
    const container = document.getElementById('battle-status-container-military');
    if (!container) return;

    const battle = region.battle;

    // Calculate totals (use displayHP for visual consistency)
    let playerHP = 0, playerMaxHP = 0, enemyHP = 0, enemyMaxHP = 0;
    battle.grid.forEach(cell => {
        if (cell.troop) {
            // Initialize displayHP if not exists
            if (cell.troop.displayHP === undefined) {
                cell.troop.displayHP = cell.troop.totalHP;
            }

            const currentDisplayCount = Math.ceil(cell.troop.displayHP / cell.troop.hpPerUnit);
            const currentMaxHP = currentDisplayCount * cell.troop.hpPerUnit;
            if (cell.troop.side === 'player') {
                playerHP += cell.troop.displayHP;
                playerMaxHP += currentMaxHP;
            } else {
                enemyHP += cell.troop.displayHP;
                enemyMaxHP += currentMaxHP;
            }
        }
    });

    const totalHP = playerHP + enemyHP;
    const playerPercent = totalHP > 0 ? (playerHP / totalHP) * 100 : 50;
    const enemyPercent = 100 - playerPercent;

    container.innerHTML = `
        <div class="battle-header-bars">
            <div class="battle-status-bar">
                <div class="bar-section enemy-bar" style="width: ${enemyPercent}%"></div>
                <div class="bar-section player-bar" style="width: ${playerPercent}%"></div>
            </div>
            <div class="battle-status-text">
                <span class="enemy-hp">敌军：${Math.ceil(enemyHP)}/${enemyMaxHP}</span>
                <span class="player-hp">我方：${Math.ceil(playerHP)}/${playerMaxHP}</span>
            </div>
        </div>
    `;
}

function renderDeploymentButtons() {
    const region = getCurrentRegion();
    if (!region || !region.battle) return;

    // Use military screen deployment container
    const deployContainer = document.getElementById('deployment-buttons-container-military');
    if (!deployContainer) return;

    deployContainer.innerHTML = '<h3>部署无人机</h3><div class="deployment-buttons"></div>';
    const buttonsDiv = deployContainer.querySelector('.deployment-buttons');

    // Show buttons for available drones
    Object.entries(GameData.units).forEach(([unitId, unitData]) => {
        const available = gameState.resources[unitId]?.current || 0;
        if (available > 0) {
            const btn = document.createElement('button');
            btn.className = 'deploy-drone-btn';
            btn.dataset.unitId = unitId; // Store unitId for updates
            btn.textContent = `${unitData.name} (${available})`;
            btn.onclick = () => deployDrone(unitId);
            buttonsDiv.appendChild(btn);
        }
    });
}

// Deploy drone into battle
function deployDrone(unitId) {
    const region = getCurrentRegion();
    if (!region || !region.battle) return;

    const available = gameState.resources[unitId]?.current || 0;
    if (available <= 0) {
        showToast('没有可用的无人机', 'error');
        return;
    }

    // Find first empty player cell (8-15)
    const battle = region.battle;
    let emptyCell = null;
    for (let i = 8; i < 16; i++) {
        if (!battle.grid[i].troop) {
            emptyCell = i;
            break;
        }
    }

    if (emptyCell === null) {
        showToast('没有空位！所有部署位置已占满', 'warning');
        return;
    }

    const unitData = GameData.units[unitId];

    // Deploy 10 drones at a time (or all available if less than 10)
    const deployCount = Math.min(10, available);

    // Remove from inventory
    gameState.resources[unitId].current -= deployCount;

    // Add to battle grid
    const totalHP = unitData.combat.hp * deployCount;
    battle.grid[emptyCell].troop = {
        type: unitId,
        side: 'player',
        count: deployCount,
        hpPerUnit: unitData.combat.hp,
        totalHP: totalHP,
        displayHP: totalHP, // Initialize displayHP for visual sync
        incomingDamage: 0, // Track in-flight bullets
        attack: unitData.combat.damage * 0.5 // Half attack power for slower battles
    };
    battle.grid[emptyCell].maxCooldown = getAttackInterval(unitId);
    battle.grid[emptyCell].cooldown = 0; // Ready to attack

    showToast(`已部署 ${deployCount} 个${unitData.name}`, 'success');

    // Update the specific cell instead of full re-render
    updateSingleBattleCell(emptyCell);
    updateDeploymentButtonCounts(); // Update button counts
}

// Update a single battle cell's content
function updateSingleBattleCell(cellIndex) {
    const region = getCurrentRegion();
    const container = document.getElementById('buildings-grid-4x4-military');
    if (!container || !region || !region.battle) return;

    const battle = region.battle;
    const cell = battle.grid[cellIndex];
    const gridCell = container.querySelector(`[data-cell-index="${cellIndex}"]`);
    if (!gridCell) return;

    if (cell.troop) {
        const troop = cell.troop;
        const data = troop.side === 'enemy' ? GameData.enemies[troop.type] : GameData.units[troop.type];

        // Initialize displayHP if not exists
        if (troop.displayHP === undefined) {
            troop.displayHP = troop.totalHP;
        }

        // Calculate first unit's HP for display (use displayHP for visual)
        const currentDisplayCount = Math.ceil(troop.displayHP / troop.hpPerUnit);
        const firstUnitHP = troop.displayHP - (currentDisplayCount - 1) * troop.hpPerUnit;
        const hpPercent = troop.hpPerUnit > 0 ? (firstUnitHP / troop.hpPerUnit) * 100 : 0;
        const cooldownPercent = cell.maxCooldown > 0 ? ((cell.maxCooldown - cell.cooldown) / cell.maxCooldown) * 100 : 0;

        // Calculate ammo rounds for player units
        const ammoRounds = calculateAmmoRounds(troop);
        const ammoDisplay = ammoRounds !== null ? `<div class="troop-ammo">弹药：${ammoRounds} 轮</div>` : '';

        // Get status text
        const statusMap = {
            'preparing': '准备中',
            'attacking': '攻击中',
            'no_ammo': '缺弹药',
            'idle': '待机',
            'recovering': '恢复中'
        };
        const statusText = statusMap[cell.status] || '待机';
        const statusClass = 'troop-status-' + (cell.status || 'idle');

        gridCell.innerHTML = `
            <div class="troop-info">
                <div class="troop-name">${data.name}</div>
                <div class="troop-count">×${currentDisplayCount}</div>
                <div class="troop-status ${statusClass}">${statusText.replace('_', ' ')}</div>
                <div class="troop-hp-bar">
                    <div class="troop-hp-fill" style="width: ${hpPercent}%"></div>
                </div>
                <div class="troop-stats">HP: ${Math.ceil(firstUnitHP)}/${troop.hpPerUnit}</div>
                ${ammoDisplay}
                <div class="troop-cooldown-bar">
                    <div class="troop-cooldown-fill" style="width: ${cooldownPercent}%"></div>
                </div>
            </div>
        `;
    } else {
        gridCell.innerHTML = '<div class="empty-cell-label">' + (cellIndex < 8 ? '' : '空位') + '</div>';
    }
}

function getAttackInterval(unitId) {
    // Attack intervals for different drone types (quadrupled for quarter speed)
    const intervals = {
        'machinegun-drone': 6.0,
        'heavy-machinegun-drone': 8.0,
        'flamethrower-drone': 10.0,
        'laser-drone': 7.2,
        'plasma-drone': 8.8,
        'artillery-drone': 12.0
    };
    return intervals[unitId] || 8.0;
}

// ========================================
// Grid-Based Combat Logic
// ========================================
function processBattleGrid(region, deltaTime) {
    if (!region.battle || region.conquered) return;

    const battle = region.battle;
    const grid = battle.grid;

    // Check if there's any combat happening
    let hasPlayer = false, hasEnemy = false;
    grid.forEach(cell => {
        if (cell.troop) {
            if (cell.troop.side === 'player') hasPlayer = true;
            else hasEnemy = true;
        }
    });

    // Update lastCombatTime if there are both sides
    if (hasPlayer && hasEnemy) {
        battle.lastCombatTime = Date.now();
    }

    // Victory/defeat conditions
    if (!hasEnemy && hasPlayer) {
        conqueredRegion(region);
        return;
    }
    if (!hasPlayer && hasEnemy) {
        // Battle lost - do nothing, player can deploy more drones
        return;
    }

    // Update cooldowns and process attacks
    grid.forEach((cell, cellIndex) => {
        if (!cell.troop || cell.troop.count <= 0) return;

        // Determine unit status and check if it can attack
        const targetSide = cell.troop.side === 'player' ? 'enemy' : 'player';
        const hasTarget = selectBattleTarget(grid, targetSide, cellIndex) !== null;

        let canAttack = true;
        let hasAmmo = true;

        // Check ammo for player units
        if (cell.troop.side === 'player') {
            const unitData = GameData.units[cell.troop.type];
            if (unitData.combat.ammoPerTurn) {
                for (let [ammoType, amount] of Object.entries(unitData.combat.ammoPerTurn)) {
                    if ((gameState.resources[ammoType]?.current || 0) < amount * cell.troop.count) {
                        hasAmmo = false;
                        canAttack = false;
                        break;
                    }
                }
            }
        }

        // Set status
        if (!hasTarget) {
            cell.status = 'idle';
        } else if (!hasAmmo) {
            cell.status = 'no_ammo';
        } else if (cell.cooldown > cell.maxCooldown * 0.3) {
            cell.status = 'preparing';
        } else {
            cell.status = 'attacking';
        }

        // Only update cooldown if unit can attack
        if (canAttack && hasTarget) {
            cell.cooldown = Math.max(0, cell.cooldown - deltaTime);
        }

        // Attack when cooldown reaches 0
        if (cell.cooldown <= 0 && canAttack && hasTarget) {
            cell.cooldown = cell.maxCooldown; // Reset cooldown
            const targetCellIndex = selectBattleTarget(grid, targetSide, cellIndex);

            if (targetCellIndex !== null) {
                executeGridAttack(grid, cellIndex, targetCellIndex);
            }
        }
    });
}

function selectBattleTarget(grid, targetSide, attackerIndex) {
    // Find all cells with troops of the target side
    // Filter out targets that are already "doomed" by incoming damage
    const validTargets = [];
    grid.forEach((cell, index) => {
        if (cell.troop && cell.troop.side === targetSide && cell.troop.count > 0) {
            // Initialize incomingDamage if not exists
            if (cell.troop.incomingDamage === undefined) {
                cell.troop.incomingDamage = 0;
            }

            // Check if target will survive incoming damage
            const effectiveHP = cell.troop.totalHP - cell.troop.incomingDamage;
            if (effectiveHP > 0) {
                validTargets.push(index);
            }
        }
    });

    if (validTargets.length === 0) return null;

    // Prioritize targets based on position (closer cells)
    // For enemies (top): prefer leftmost
    // For players (bottom): prefer leftmost
    return validTargets[0]; // Simple: just pick first available
}

// Calculate how many rounds of ammo are available for a troop
function calculateAmmoRounds(troop) {
    if (troop.side !== 'player') return null;

    const unitData = GameData.units[troop.type];
    if (!unitData.combat.ammoPerTurn) return null; // No ammo needed

    let minRounds = Infinity;
    for (let [ammoType, amountPerUnit] of Object.entries(unitData.combat.ammoPerTurn)) {
        const available = gameState.resources[ammoType]?.current || 0;
        const neededPerRound = amountPerUnit * troop.count;
        const rounds = neededPerRound > 0 ? Math.floor(available / neededPerRound) : Infinity;
        minRounds = Math.min(minRounds, rounds);
    }

    return minRounds === Infinity ? null : minRounds;
}

function executeGridAttack(grid, attackerIndex, targetIndex) {
    const attacker = grid[attackerIndex].troop;
    const target = grid[targetIndex].troop;

    if (!attacker || !target) return;

    // Initialize displayHP and incomingDamage if not exists
    if (target.displayHP === undefined) {
        target.displayHP = target.totalHP;
    }
    if (target.incomingDamage === undefined) {
        target.incomingDamage = 0;
    }

    // CRITICAL: Check if target will survive incoming damage
    // This prevents "overkill" when multiple units attack the same frame
    const effectiveHP = target.totalHP - target.incomingDamage;
    if (effectiveHP <= 0) {
        // Target is already doomed by incoming bullets, don't waste attack
        return;
    }

    // Check ammo for player units
    if (attacker.side === 'player') {
        const unitData = GameData.units[attacker.type];
        if (unitData.combat.ammoPerTurn) {
            let hasAmmo = true;
            for (let [ammoType, amount] of Object.entries(unitData.combat.ammoPerTurn)) {
                if ((gameState.resources[ammoType]?.current || 0) < amount * attacker.count) {
                    hasAmmo = false;
                    break;
                }
            }
            if (!hasAmmo) return; // No ammo, can't attack

            // Consume ammo
            for (let [ammoType, amount] of Object.entries(unitData.combat.ammoPerTurn)) {
                gameState.resources[ammoType].current -= amount * attacker.count;
                gameState.resources[ammoType].current = Math.max(0, gameState.resources[ammoType].current);
            }
        }
    }

    // Calculate damage (HoMM style: attack × count)
    const baseDamage = attacker.attack * attacker.count;

    // Track this damage as "in-flight"
    target.incomingDamage += baseDamage;

    // Apply damage IMMEDIATELY to actual HP (prevent multiple attacks on dead targets)
    target.totalHP -= baseDamage;
    target.totalHP = Math.max(0, target.totalHP);

    // Recalculate unit count based on remaining HP
    target.count = Math.ceil(target.totalHP / target.hpPerUnit);

    // Clean up if all units dead
    if (target.count <= 0 || target.totalHP <= 0) {
        grid[targetIndex].troop = null;
        grid[targetIndex].cooldown = 0;
    }

    // Visual attack effect (will update displayHP when bullet arrives)
    createAttackEffect(attackerIndex, targetIndex, baseDamage, attacker.side);
}

// Update display HP when bullet arrives (sync display with actual HP)
function syncDisplayHP(targetIndex, damage) {
    const region = getCurrentRegion();
    if (!region || !region.battle) return;

    const grid = region.battle.grid;
    const target = grid[targetIndex].troop;

    if (!target) return; // Target already dead

    // Reduce incoming damage (bullet has landed)
    if (target.incomingDamage === undefined) {
        target.incomingDamage = 0;
    }
    target.incomingDamage -= damage;
    target.incomingDamage = Math.max(0, target.incomingDamage); // Prevent negative

    // Sync display HP with actual HP
    target.displayHP = target.totalHP;
}

function createAttackEffect(fromIndex, toIndex, damage, attackerSide) {
    const container = document.getElementById('buildings-grid-4x4-military');
    if (!container) return;

    const fromCell = container.children[fromIndex];
    const toCell = container.children[toIndex];
    if (!fromCell || !toCell) return;

    // Save target's current displayed unit count for damage number
    const region = getCurrentRegion();
    let beforeDisplayCount = 0;
    let hpPerUnit = 0;
    if (region && region.battle && region.battle.grid[toIndex].troop) {
        const target = region.battle.grid[toIndex].troop;
        if (target.displayHP !== undefined) {
            beforeDisplayCount = Math.ceil(target.displayHP / target.hpPerUnit);
            hpPerUnit = target.hpPerUnit;
        }
    }

    // Use offsetLeft/offsetTop for position relative to offsetParent
    const x1 = fromCell.offsetLeft + fromCell.offsetWidth / 2;
    const y1 = fromCell.offsetTop + fromCell.offsetHeight / 2;
    const x2 = toCell.offsetLeft + toCell.offsetWidth / 2;
    const y2 = toCell.offsetTop + toCell.offsetHeight / 2;

    // Create bullet element
    const bullet = document.createElement('div');
    bullet.className = 'battle-bullet';
    bullet.style.position = 'absolute';
    bullet.style.left = x1 + 'px';
    bullet.style.top = y1 + 'px';
    bullet.style.pointerEvents = 'none';
    // Set bullet color based on attacker side (enemy: red, player: gray)
    bullet.style.backgroundColor = attackerSide === 'enemy' ? '#ff4444' : '#888888';
    container.appendChild(bullet);

    // Animate bullet (800ms flight time)
    const dx = x2 - x1;
    const dy = y2 - y1;
    const duration = 800;
    const start = performance.now();

    function animateBullet(now) {
        const progress = Math.min(1, (now - start) / duration);
        bullet.style.left = (x1 + dx * progress) + 'px';
        bullet.style.top = (y1 + dy * progress) + 'px';

        if (progress < 1) {
            requestAnimationFrame(animateBullet);
        } else {
            bullet.remove();
            // Sync display HP with actual HP when bullet arrives
            syncDisplayHP(toIndex, damage);
            // Show damage number on target cell
            showDamageNumber(toCell, damage, toIndex, beforeDisplayCount, hpPerUnit);
        }
    }

    requestAnimationFrame(animateBullet);
}

function showDamageNumber(cell, damage, targetIndex, beforeDisplayCount, hpPerUnit) {
    const region = getCurrentRegion();

    const dmg = document.createElement('div');
    dmg.className = 'battle-damage-number';

    // Calculate units killed
    let unitsKilled = 0;
    if (region && region.battle && beforeDisplayCount > 0 && hpPerUnit > 0) {
        const target = region.battle.grid[targetIndex]?.troop;
        if (target && target.displayHP !== undefined) {
            const afterDisplayCount = Math.ceil(target.displayHP / hpPerUnit);
            unitsKilled = beforeDisplayCount - afterDisplayCount;
        } else {
            // Target is dead, all units killed
            unitsKilled = beforeDisplayCount;
        }
    }

    // Format damage text with unit kills
    if (unitsKilled > 0) {
        dmg.textContent = `-${unitsKilled}单位 (-${Math.ceil(damage)})`;
        dmg.style.color = '#ff6b6b'; // Brighter red for kills
    } else {
        dmg.textContent = `-${Math.ceil(damage)}`;
    }

    cell.appendChild(dmg);
    setTimeout(() => dmg.remove(), 1000); // Match animation duration (1s)
}

function conqueredRegion(region) {
    region.conquered = true;
    region.battle = null; // Clear battle state
    showToast(`区域 ${region.id} 已征服！现在可以在此建造。`, 'success', 3000);
    updateMapScreen(); // Update map

    // Switch to region screen to show buildings
    showScreen('region');
    updateRegionScreen();
}

// Heal bugs over time
function healBugsIfNoCombat(region) {
    if (!region.battle || region.conquered) return;

    const battle = region.battle;
    const timeSinceLastCombat = Date.now() - battle.lastCombatTime;

    // Heal after 10 seconds of no combat
    if (timeSinceLastCombat > 10000) {
        battle.grid.forEach(cell => {
            if (cell.troop && cell.troop.side === 'enemy') {
                const currentMaxHP = cell.troop.count * cell.troop.hpPerUnit;
                // Only heal and show recovering status if HP is below max
                if (cell.troop.totalHP < currentMaxHP) {
                    // Heal 1% of current max HP per second
                    const healRate = currentMaxHP * 0.01; // 1% of current max HP per second
                    cell.troop.totalHP = Math.min(currentMaxHP, cell.troop.totalHP + healRate / 60); // Per frame (60 FPS)
                    // Sync displayHP with actual HP during healing
                    cell.troop.displayHP = cell.troop.totalHP;
                    cell.status = 'recovering';
                } else {
                    // Full health, show idle
                    cell.status = 'idle';
                }
            }
        });
    }
}

// 渲染4x4建筑网格
function renderBuildingsGrid4x4() {
    const region = getCurrentRegion();
    const container = document.getElementById('buildings-grid-4x4');

    if (!container) return; // 如果容器不存在，直接返回
    if (!region) return;

    container.innerHTML = '';

    // 创建16个槽位
    for (let slotIndex = 0; slotIndex < 16; slotIndex++) {
        // 兼容新旧数据结构
        let building = null;
        let slotProperty = null;

        if (region.buildingSlots && region.buildingSlots[slotIndex]) {
            // 新系统：使用buildingSlots
            building = region.buildingSlots[slotIndex].building;
            slotProperty = region.buildingSlots[slotIndex].slotProperty;
        } else {
            // 旧系统：使用buildings数组（向后兼容）
            building = region.buildings[slotIndex];
        }

        if (building) {
            // 有建筑：使用原来的building-card-compact样式
            const card = createBuildingCard(building);
            card.style.margin = '0'; // 网格中不需要额外margin
            container.appendChild(card);
        } else {
            // 空槽位：显示加号
            const slotDiv = document.createElement('div');
            slotDiv.className = 'building-slot empty';
            slotDiv.setAttribute('data-slot-index', slotIndex);

            // 如果有槽位属性，显示资源信息
            if (slotProperty && slotProperty.type === 'resource') {
                const itemData = GameData.items[slotProperty.resourceType];
                const itemName = itemData ? itemData.name : slotProperty.resourceType;
                const remaining = Math.floor(slotProperty.remainingAmount || 0);
                const total = Math.floor(slotProperty.totalAmount || 0);
                slotDiv.innerHTML = `
                    <div class="slot-property">
                        <div class="slot-resource-name">${itemName}</div>
                        <div class="slot-resource-amount">${remaining}/${total}</div>
                    </div>
                    <div class="slot-add-btn">+</div>
                `;
            } else {
                slotDiv.innerHTML = `<div class="empty-slot-icon">+</div>`;
            }

            slotDiv.onclick = () => openBuildMenuForSlot(slotIndex);
            container.appendChild(slotDiv);
        }
    }
}

// 打开建造界面并指定槽位
let selectedSlotIndex = null;

function openBuildMenuForSlot(slotIndex) {
    selectedSlotIndex = slotIndex;
    showScreen('build');
    document.getElementById('build-screen').scrollTop = 0;
}

function updateBuildingSummary() {
    const region = getCurrentRegion();
    const container = document.getElementById('building-summary');

    if (!container) return;

    const activeBuildings = region.buildings.filter(b => b !== null && b !== undefined);
    if (activeBuildings.length === 0) {
        container.innerHTML = '<div class="stats-message">暂无建筑</div>';
        return;
    }

    // 按类别统计建筑
    const categoryCounts = {};
    const categoryNames = {
        'mining': '⛏ 采集',
        'production': '🏭 生产',
        'power': '⚡ 能源',
        'storage': '📦 仓储',
        'science': '🔬 科研',
        'military': '⚔ 军事'
    };

    region.buildings.forEach(building => {
        if (!building) return; // 跳过已删除的建筑
        const template = GameData.buildings[building.buildingId];
        const category = template.category;

        if (!categoryCounts[category]) {
            categoryCounts[category] = {
                total: 0,
                active: 0,
                paused: 0
            };
        }

        categoryCounts[category].total++;
        if (building.active) {
            categoryCounts[category].active++;
        } else {
            categoryCounts[category].paused++;
        }
    });

    // 生成统计HTML
    let html = '<div class="building-summary-grid">';

    Object.entries(categoryCounts).forEach(([category, counts]) => {
        const categoryName = categoryNames[category] || category;
        const statusText = counts.paused > 0
            ? `${counts.active}运行 / ${counts.paused}暂停`
            : `${counts.active}运行`;

        html += `
            <div class="building-summary-item">
                <div class="building-summary-category">${categoryName}</div>
                <div class="building-summary-count">${counts.total} 座</div>
                <div class="building-summary-status">${statusText}</div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function updateProductionStats() {
    const container = document.getElementById('production-stats');
    const stats = gameState.statistics;

    // 检查是否有任何生产活动
    const hasProduction = Object.keys(stats.production).length > 0 || Object.keys(stats.consumption).length > 0;

    if (!hasProduction) {
        container.innerHTML = '<div class="stats-message">暂无生产活动</div>';
        return;
    }

    // 合并所有资源
    const allResources = new Set([
        ...Object.keys(stats.production),
        ...Object.keys(stats.consumption)
    ]);

    let html = '<div class="stats-grid">';

    allResources.forEach(resId => {
        const item = GameData.items[resId];
        if (!item) return;

        const production = stats.production[resId] || 0;
        const consumption = stats.consumption[resId] || 0;
        const net = production - consumption;

        // 跳过没有变化的资源
        if (Math.abs(net) < 0.01) return;

        const isPositive = net > 0;
        const statusClass = isPositive ? 'stat-positive' : 'stat-negative';

        html += `
            <div class="stat-item ${statusClass}">
                <div class="stat-name">${item.name}</div>
                <div class="stat-values">
                    ${production > 0 ? `<span class="stat-production">+${production.toFixed(2)}/s</span>` : ''}
                    ${consumption > 0 ? `<span class="stat-consumption">-${consumption.toFixed(2)}/s</span>` : ''}
                    <span class="stat-net">${net >= 0 ? '+' : ''}${net.toFixed(2)}/s</span>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function createBuildingCard(building) {
    const div = document.createElement('div');
    div.className = 'building-card-compact';
    div.setAttribute('data-building-id', building.id);
    div.onclick = () => showBuildingManageModal(building);

    const template = GameData.buildings[building.buildingId];

    // 检查建筑状态
    const statusInfo = getBuildingStatus(building, template);

    // 获取配方或资源信息
    let taskInfo = '';
    if (template.category === 'mining') {
        const region = getCurrentRegion();
        let resourceType = null;

        // Try to find this building in buildingSlots (new system)
        if (region.buildingSlots) {
            const slotIndex = region.buildingSlots.findIndex(slot => slot.building && slot.building.id === building.id);
            if (slotIndex >= 0 && region.buildingSlots[slotIndex].slotProperty) {
                const slotProperty = region.buildingSlots[slotIndex].slotProperty;
                if (slotProperty.type === 'resource') {
                    resourceType = slotProperty.resourceType;
                }
            }
        }

        // Fallback to old system
        if (!resourceType && building.resourceNodeIndex !== undefined) {
            const node = region.resourceNodes[building.resourceNodeIndex];
            if (node) resourceType = node.type;
        }

        if (resourceType) {
            const item = GameData.items[resourceType];
            taskInfo = `<div class="building-card-compact-task">采集: ${item.name}</div>`;
        }
    } else if (template.category === 'production' && building.recipeId) {
        const recipe = GameData.recipes[building.recipeId];
        if (recipe) {
            taskInfo = `<div class="building-card-compact-task">配方: ${recipe.name}</div>`;
        }
    }

    // Progress bar for production/mining buildings and fuel-consuming power plants
    let progressBar = '';
    if (template.category === 'production' || template.category === 'mining' ||
        (template.category === 'power' && template.fuelConsumption)) {
        progressBar = `
            <div class="building-progress-bar-container">
                <div id="prog-${building.id}" class="building-progress-bar-fill"></div>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="building-card-compact-header">
            <span class="building-card-compact-name">${template.name} #${building.id}</span>
            <span class="building-status status-${statusInfo.status}">${statusInfo.text}</span>
        </div>
        ${taskInfo}
        ${progressBar}
    `;

    return div;
}

// 检查建筑是否实际在工作（用于判断是否消耗电力）
function isBuildingActuallyWorking(building, template) {
    if (!building.active) return false;

    // Power buildings always work if active (we check fuel later)
    if (template.category === 'power') return true;

    // Science buildings only work when there's active research
    if (template.category === 'science') {
        return gameState.currentResearch !== null;
    }

    // Production buildings need recipe
    if (template.category === 'production') {
        if (!building.recipeId) return false;

        const recipe = GameData.recipes[building.recipeId];
        if (recipe) {
            // Check materials
            for (let [ingredient, amount] of Object.entries(recipe.ingredients)) {
                if (gameState.resources[ingredient].current < amount) {
                    return false;
                }
            }

            // Check output not full
            for (let [result, amount] of Object.entries(recipe.results)) {
                const res = gameState.resources[result];
                if (res.current >= res.max) {
                    return false;
                }
            }
        }
    }

    // Mining buildings need resources
    if (template.category === 'mining') {
        const region = getCurrentRegion();
        let resourceType = null;
        let remainingAmount = null;

        // Try to find this building in buildingSlots (new system)
        if (region.buildingSlots) {
            const slotIndex = region.buildingSlots.findIndex(slot => slot.building && slot.building.id === building.id);
            if (slotIndex >= 0 && region.buildingSlots[slotIndex].slotProperty) {
                const slotProperty = region.buildingSlots[slotIndex].slotProperty;
                if (slotProperty.type === 'resource') {
                    resourceType = slotProperty.resourceType;
                    remainingAmount = slotProperty.remainingAmount;
                }
            }
        }

        // Fallback to old system
        if (!resourceType && building.resourceNodeIndex !== undefined) {
            const node = region.resourceNodes[building.resourceNodeIndex];
            resourceType = node.type;
            remainingAmount = node.amount;
        }

        if (!resourceType || remainingAmount <= 0) return false;

        // Check output not full
        const res = gameState.resources[resourceType];
        if (res && res.current >= res.max) {
            return false;
        }
    }

    // Check fuel for buildings that need it
    if (template.fuelConsumption) {
        for (let [fuel, rate] of Object.entries(template.fuelConsumption)) {
            if (gameState.resources[fuel].current < 1) {
                return false;
            }
        }
    }

    return true;
}

// Update building card status without recreating the entire DOM
function updateBuildingCardStatus(building) {
    const card = document.querySelector(`.building-card-compact[data-building-id="${building.id}"]`);
    if (!card) return;

    const template = GameData.buildings[building.buildingId];
    const statusInfo = getBuildingStatus(building, template);

    // Update status badge
    const statusBadge = card.querySelector('.building-status');
    if (statusBadge) {
        statusBadge.className = `building-status status-${statusInfo.status}`;
        statusBadge.textContent = statusInfo.text;
    }

    // Update task info (recipe/resource)
    const existingTaskInfo = card.querySelector('.building-card-compact-task');
    let newTaskInfo = '';

    if (template.category === 'mining') {
        const region = getCurrentRegion();
        let resourceType = null;

        // Try to find this building in buildingSlots (new system)
        if (region.buildingSlots) {
            const slotIndex = region.buildingSlots.findIndex(slot => slot.building && slot.building.id === building.id);
            if (slotIndex >= 0 && region.buildingSlots[slotIndex].slotProperty) {
                const slotProperty = region.buildingSlots[slotIndex].slotProperty;
                if (slotProperty.type === 'resource') {
                    resourceType = slotProperty.resourceType;
                }
            }
        }

        // Fallback to old system
        if (!resourceType && building.resourceNodeIndex !== undefined) {
            const node = region.resourceNodes[building.resourceNodeIndex];
            if (node) resourceType = node.type;
        }

        if (resourceType) {
            const item = GameData.items[resourceType];
            newTaskInfo = `采集: ${item.name}`;
        }
    } else if (template.category === 'production' && building.recipeId) {
        const recipe = GameData.recipes[building.recipeId];
        if (recipe) {
            newTaskInfo = `配方: ${recipe.name}`;
        }
    }

    if (newTaskInfo) {
        if (existingTaskInfo) {
            existingTaskInfo.textContent = newTaskInfo;
        } else {
            // Create task info if it doesn't exist
            const taskDiv = document.createElement('div');
            taskDiv.className = 'building-card-compact-task';
            taskDiv.textContent = newTaskInfo;
            const progressBar = card.querySelector('.building-progress-bar-container');
            if (progressBar) {
                card.insertBefore(taskDiv, progressBar);
            } else {
                card.appendChild(taskDiv);
            }
        }
    } else if (existingTaskInfo) {
        // Remove task info if no longer needed
        existingTaskInfo.remove();
    }
}

function getBuildingStatus(building, template) {
    let status = 'active';
    let text = '正常';

    if (!building.active) {
        status = 'inactive';
        text = '暂停';
        return { status, text };
    }

    // 检查电力
    const hasPower = gameState.power.production >= gameState.power.consumption;
    if (template.powerConsumption && !hasPower) {
        status = 'disabled';
        text = '缺电';
        return { status, text };
    }

    // 检查生产建筑是否配置了配方
    if (template.category === 'production') {
        if (!building.recipeId) {
            status = 'warning';
            text = '未配置';
            return { status, text };
        }

        // 检查生产建筑是否缺原料
        const recipe = GameData.recipes[building.recipeId];
        if (recipe) {
            let lacksMaterials = false;
            for (let [ingredient, amount] of Object.entries(recipe.ingredients)) {
                if (gameState.resources[ingredient].current < amount) {
                    lacksMaterials = true;
                    break;
                }
            }
            if (lacksMaterials) {
                status = 'disabled';
                text = '缺原料';
                return { status, text };
            }

            // 检查生产建筑输出是否满载
            for (let [result, amount] of Object.entries(recipe.results)) {
                const res = gameState.resources[result];
                if (res.current >= res.max) {
                    status = 'warning';
                    text = '输出满载';
                    return { status, text };
                }
            }
        }
    }

    // 检查采矿建筑资源节点
    if (template.category === 'mining') {
        const region = getCurrentRegion();
        let resourceType = null;
        let remainingAmount = null;

        // Try to find this building in buildingSlots (new system)
        if (region.buildingSlots) {
            const slotIndex = region.buildingSlots.findIndex(slot => slot.building && slot.building.id === building.id);
            if (slotIndex >= 0 && region.buildingSlots[slotIndex].slotProperty) {
                const slotProperty = region.buildingSlots[slotIndex].slotProperty;
                if (slotProperty.type === 'resource') {
                    resourceType = slotProperty.resourceType;
                    remainingAmount = slotProperty.remainingAmount;
                }
            }
        }

        // Fallback to old system
        if (!resourceType && building.resourceNodeIndex !== undefined) {
            const node = region.resourceNodes[building.resourceNodeIndex];
            resourceType = node.type;
            remainingAmount = node.amount;
        }

        if (resourceType) {
            if (remainingAmount <= 0) {
                status = 'disabled';
                text = '资源耗尽';
                return { status, text };
            }

            // 检查采矿建筑输出是否满载
            const res = gameState.resources[resourceType];
            if (res && res.current >= res.max) {
                status = 'warning';
                text = '输出满载';
                return { status, text };
            }
        }
    }

    // 检查燃料（发电站）
    if (template.fuelConsumption) {
        let lackingFuel = null;
        for (let [fuel, rate] of Object.entries(template.fuelConsumption)) {
            if (gameState.resources[fuel].current < 1) {
                lackingFuel = fuel;
                break;
            }
        }
        if (lackingFuel) {
            status = 'disabled';
            const fuelName = GameData.items[lackingFuel].name;
            text = `缺${fuelName}`;
            return { status, text };
        }
    }

    // 检查太阳能光照（5am-7pm）
    if (template.category === 'power' && template.dayOnly) {
        if (!hasSunlight()) {
            status = 'disabled';
            text = '无光照';
            return { status, text };
        }
    }

    // 检查研究建筑
    if (template.category === 'science') {
        if (!gameState.currentResearch) {
            status = 'warning';
            text = '无研究';
            return { status, text };
        }
    }

    return { status, text };
}

function showBuildingManageModal(building) {
    const template = GameData.buildings[building.buildingId];
    const region = getCurrentRegion();

    // 生成静态建筑详细信息
    let detailsHTML = `
        <div class="building-property">ID: #${building.id}</div>
        <div class="building-property">槽位: ${template.slots}</div>
        <div class="building-property">类别: ${getCategoryName(template.category)}</div>
    `;

    // 电力信息
    if (template.powerConsumption) {
        detailsHTML += `<div class="building-property">耗电: ${template.powerConsumption}/秒</div>`;
    }
    if (template.powerProduction) {
        let powerText = `${template.powerProduction}/秒`;
        if (template.id === 'wind-turbine' && template.powerProductionNight) {
            powerText = `${template.powerProduction}/秒 (白天), ${template.powerProductionNight}/秒 (夜晚)`;
        }
        detailsHTML += `<div class="building-property">发电: ${powerText}</div>`;
    }

    const hasRecipeButton = template.category === 'production' || template.category === 'military';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content building-manage-modal">
                <div class="modal-header">
                    <h3>${template.name} #${building.id}</h3>
                    <span class="building-status" id="modal-status-badge"></span>
                </div>
                <div class="modal-body">
                    <div class="building-description">${template.description}</div>
                    <div class="building-properties">
                        ${detailsHTML}
                    </div>
                    <div id="modal-resource-node"></div>
                    <div id="modal-recipe"></div>
                    <div id="modal-fuel"></div>
                </div>
                <div class="modal-actions">
                    ${hasRecipeButton ? '<button class="btn btn-confirm" id="select-recipe-btn">📋 选择配方</button>' : ''}
                    <button class="btn btn-warning" id="toggle-building-btn"></button>
                    <button class="btn btn-danger" id="demolish-building-btn">🗑 拆除</button>
                    <button class="btn btn-cancel">取消</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 更新动态内容的函数
    const updateModalContent = () => {
        const statusInfo = getBuildingStatus(building, template);
        const statusBadge = overlay.querySelector('#modal-status-badge');
        const toggleBtn = overlay.querySelector('#toggle-building-btn');
        const resourceNodeDiv = overlay.querySelector('#modal-resource-node');
        const recipeDiv = overlay.querySelector('#modal-recipe');
        const fuelDiv = overlay.querySelector('#modal-fuel');

        // 更新状态徽章
        if (statusBadge) {
            statusBadge.className = `building-status status-${statusInfo.status}`;
            statusBadge.textContent = statusInfo.text;
        }

        // 更新暂停/启动按钮
        if (toggleBtn) {
            toggleBtn.textContent = building.active ? '⏸ 暂停' : '▶ 启动';
        }

        // 更新资源节点信息
        if (template.category === 'mining') {
            let resourceType = null;
            let miningRate = null;
            let remainingAmount = null;
            let totalAmount = null;

            // Try to find this building in buildingSlots (new system)
            if (region.buildingSlots) {
                const slotIndex = region.buildingSlots.findIndex(slot => slot.building && slot.building.id === building.id);
                if (slotIndex >= 0 && region.buildingSlots[slotIndex].slotProperty) {
                    const slotProperty = region.buildingSlots[slotIndex].slotProperty;
                    if (slotProperty.type === 'resource') {
                        resourceType = slotProperty.resourceType;
                        miningRate = slotProperty.miningRate;
                        remainingAmount = slotProperty.remainingAmount;
                        totalAmount = slotProperty.totalAmount;
                    }
                }
            }

            // Fallback to old system
            if (!resourceType && building.resourceNodeIndex !== undefined) {
                const node = region.resourceNodes[building.resourceNodeIndex];
                resourceType = node.type;
                miningRate = node.rate;
                remainingAmount = node.amount;
                totalAmount = node.initialAmount || node.amount; // Old system may not have initialAmount
            }

            if (resourceType) {
                const itemName = GameData.items[resourceType].name;
                const remaining = Math.floor(remainingAmount);

                // 计算产出速率（考虑电力效率）
                const hasPower = gameState.power.production >= gameState.power.consumption;
                const powerEfficiency = hasPower ? 1.0 : (gameState.power.production / Math.max(1, gameState.power.consumption));
                const effectiveRate = miningRate * template.speed * (building.active ? powerEfficiency : 0);

                // 计算耗尽时间
                let depletionText = '';
                if (effectiveRate > 0 && remaining > 0) {
                    const secondsRemaining = remaining / effectiveRate;
                    const minutes = Math.floor(secondsRemaining / 60);
                    const hours = Math.floor(minutes / 60);
                    if (hours > 0) {
                        depletionText = `约 ${hours} 小时 ${minutes % 60} 分钟`;
                    } else {
                        depletionText = `约 ${minutes} 分钟`;
                    }
                } else if (remaining === 0) {
                    depletionText = '已耗尽';
                }

                // 效率状态
                let efficiencyHTML = '';
                if (!building.active) {
                    efficiencyHTML = '<div class="building-property-warning">⏸ 已暂停</div>';
                } else if (powerEfficiency < 1.0) {
                    efficiencyHTML = `<div class="building-property-warning">⚡ 电力不足 (${Math.floor(powerEfficiency * 100)}% 效率)</div>`;
                } else if (remaining === 0) {
                    efficiencyHTML = '<div class="building-property-warning">⚠ 资源已耗尽</div>';
                } else {
                    efficiencyHTML = '<div class="building-property-success">✓ 全速采集</div>';
                }

                resourceNodeDiv.innerHTML = `
                    <div class="building-section">
                        <h4>采集资源</h4>
                        <div class="building-property">${itemName}: 剩余 <span class="highlight">${remaining}</span>${totalAmount ? ` / ${Math.floor(totalAmount)}` : ''}</div>
                        <div class="building-property">产出速度: <span class="highlight">${effectiveRate.toFixed(2)}/秒</span></div>
                        ${depletionText ? `<div class="building-property">耗尽时间: ${depletionText}</div>` : ''}
                        ${efficiencyHTML}
                    </div>
                `;
            } else {
                resourceNodeDiv.innerHTML = '';
            }
        }

        // 更新配方信息
        if (building.recipeId) {
            const recipe = GameData.recipes[building.recipeId];
            const ingredientsText = Object.entries(recipe.ingredients)
                .map(([id, amount]) => `${GameData.items[id].name} ×${amount}`)
                .join(', ');
            const resultsText = Object.entries(recipe.results)
                .map(([id, amount]) => `${GameData.items[id].name} ×${amount}`)
                .join(', ');
            const progress = Math.floor((building.productionProgress || 0) * 100);

            // 计算生产速率
            const buildingSpeed = template.speed || 1.0;
            const hasPower = gameState.power.production >= gameState.power.consumption;
            const powerEfficiency = hasPower ? 1.0 : (gameState.power.production / Math.max(1, gameState.power.consumption));
            const effectiveSpeed = buildingSpeed * powerEfficiency;
            const cyclesPerSecond = effectiveSpeed / recipe.time;

            // 计算每秒产出
            const outputRates = Object.entries(recipe.results)
                .map(([id, amount]) => {
                    const rate = (amount * cyclesPerSecond).toFixed(2);
                    return `${GameData.items[id].name} ${rate}/秒`;
                })
                .join(', ');

            // 效率状态
            let efficiencyText = '';
            if (!building.active) {
                efficiencyText = '<div class="building-property-warning">⏸ 已暂停</div>';
            } else if (powerEfficiency < 1.0) {
                efficiencyText = `<div class="building-property-warning">⚡ 电力不足 (${Math.floor(powerEfficiency * 100)}% 效率)</div>`;
            } else {
                efficiencyText = '<div class="building-property-success">✓ 全速生产</div>';
            }

            recipeDiv.innerHTML = `
                <div class="building-section">
                    <h4>当前配方</h4>
                    <div class="building-property">${recipe.name}</div>
                    <div class="building-property">输入: ${ingredientsText}</div>
                    <div class="building-property">输出: ${resultsText}</div>
                    <div class="building-property">时间: ${recipe.time}秒 (速度 ×${buildingSpeed})</div>
                    <div class="building-property">进度: <span class="highlight">${progress}%</span></div>
                    <div class="building-property">产出率: <span class="highlight">${outputRates}</span></div>
                    ${efficiencyText}
                </div>
            `;
        } else if (template.category === 'production' || template.category === 'military') {
            recipeDiv.innerHTML = `
                <div class="building-section">
                    <h4>配方</h4>
                    <div class="building-property-warning">未选择配方</div>
                </div>
            `;
        } else {
            recipeDiv.innerHTML = '';
        }

        // 更新燃料信息
        if (template.fuelConsumption) {
            const fuelEntries = Object.entries(template.fuelConsumption);
            const fuelInfo = fuelEntries.map(([fuel, rate]) => {
                const fuelItem = GameData.items[fuel];
                const current = Math.floor(gameState.resources[fuel].current);
                return `<div class="building-property">${fuelItem.name}: ${rate}/秒 (库存: <span class="highlight">${current}</span>)</div>`;
            }).join('');
            fuelDiv.innerHTML = `
                <div class="building-section">
                    <h4>燃料消耗</h4>
                    ${fuelInfo}
                </div>
            `;
        } else {
            fuelDiv.innerHTML = '';
        }
    };

    // 初始更新
    updateModalContent();

    // 启动定时更新（每500ms）
    const updateInterval = setInterval(updateModalContent, 500);

    const toggleBtn = overlay.querySelector('#toggle-building-btn');
    const demolishBtn = overlay.querySelector('#demolish-building-btn');
    const selectRecipeBtn = overlay.querySelector('#select-recipe-btn');
    const cancelBtn = overlay.querySelector('.btn-cancel');

    const cleanup = () => {
        clearInterval(updateInterval); // 清除定时器
        overlay.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 300);
    };

    if (selectRecipeBtn) {
        selectRecipeBtn.addEventListener('click', () => {
            cleanup();
            showRecipeSelectionModal(building);
        });
    }

    toggleBtn.addEventListener('click', () => {
        toggleBuilding(building.id);
        cleanup();
        updateRegionScreen();
    });

    demolishBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm(`确定要拆除 ${template.name} #${building.id} 吗？`);
        if (confirmed) {
            removeBuilding(building.id);
            cleanup();
        }
    });

    cancelBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cleanup();
        }
    });
}

// 临时存储正在选择配方的建筑
let tempRecipeBuilding = null;

function showRecipeSelectionModal(building) {
    const template = GameData.buildings[building.buildingId];
    tempRecipeBuilding = building;

    // Filter recipes that this building can produce
    const availableRecipes = Object.values(GameData.recipes).filter(recipe => {
        // Check if this building type can make this recipe
        if (!recipe.buildingTypes || !recipe.buildingTypes.includes(building.buildingId)) {
            return false;
        }

        // Check tech requirements - only show unlocked recipes
        if (recipe.requiresTech && !gameState.researchedTech.includes(recipe.requiresTech)) {
            return false;
        }

        return true;
    });

    if (availableRecipes.length === 0) {
        showToast('该建筑没有可用的配方', 'warning');
        tempRecipeBuilding = null;
        return;
    }

    // Create small recipe grid cards
    const recipesHTML = availableRecipes.map(recipe => {
        const isSelected = building.recipeId === recipe.id;
        return `
            <div class="recipe-grid-card ${isSelected ? 'current-recipe' : ''}" onclick="showRecipeDetailModal('${recipe.id}')">
                <div class="recipe-grid-name">${recipe.name}</div>
                ${isSelected ? '<div class="recipe-grid-badge">当前</div>' : ''}
            </div>
        `;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog recipe-selection-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>选择配方 - ${template.name} #${building.id}</h3>
                </div>
                <div class="modal-body">
                    <p>选择要生产的配方：</p>
                    <div class="recipe-grid">
                        ${recipesHTML}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-cancel" onclick="cancelRecipeSelection()">取消</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cancelRecipeSelection();
        }
    });
}

function showRecipeDetailModal(recipeId) {
    const recipe = GameData.recipes[recipeId];
    const building = tempRecipeBuilding;

    if (!recipe || !building) return;

    // Build ingredients text
    const ingredientsHTML = Object.entries(recipe.ingredients)
        .map(([id, amount]) => `<div class="detail-item">${GameData.items[id].name} ×${amount}</div>`)
        .join('');

    // Build results text
    const resultsHTML = Object.entries(recipe.results)
        .map(([id, amount]) => `<div class="detail-item">${GameData.items[id].name} ×${amount}</div>`)
        .join('');

    // Close the selection modal first
    closeModal();

    // Show detail modal
    setTimeout(() => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-dialog recipe-detail-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${recipe.name}</h3>
                    </div>
                    <div class="modal-body">
                        <div class="recipe-detail-section">
                            <div class="recipe-detail-label">输入材料:</div>
                            <div class="recipe-detail-list">
                                ${ingredientsHTML}
                            </div>
                        </div>
                        <div class="recipe-detail-arrow">↓</div>
                        <div class="recipe-detail-section">
                            <div class="recipe-detail-label">输出产物:</div>
                            <div class="recipe-detail-list">
                                ${resultsHTML}
                            </div>
                        </div>
                        <div class="recipe-detail-time">
                            <span class="recipe-detail-label">生产时间:</span> ${recipe.time} 秒
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-confirm" onclick="confirmRecipeSelection('${recipeId}')">确认选择</button>
                        <button class="btn btn-cancel" onclick="backToRecipeSelection()">返回</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                backToRecipeSelection();
            }
        });
    }, 300);
}

function confirmRecipeSelection(recipeId) {
    const building = tempRecipeBuilding;
    if (!building) return;

    building.recipeId = recipeId;
    building.productionProgress = 0; // Reset progress when changing recipe

    showToast(`已选择配方: ${GameData.recipes[recipeId].name}`, 'success');

    tempRecipeBuilding = null;
    closeModal();

    // Update just this building card's status
    updateBuildingCardStatus(building);
}

function cancelRecipeSelection() {
    const building = tempRecipeBuilding;
    tempRecipeBuilding = null;
    closeModal();

    // Reopen building manage modal
    if (building) {
        setTimeout(() => {
            showBuildingManageModal(building);
        }, 300);
    }
}

function backToRecipeSelection() {
    const building = tempRecipeBuilding;
    closeModal();

    // Reopen recipe selection modal
    setTimeout(() => {
        showRecipeSelectionModal(building);
    }, 300);
}

function getCategoryName(category) {
    const names = {
        'mining': '采集',
        'production': '生产',
        'power': '能源',
        'storage': '存储',
        'research': '研究',
        'military': '军事'
    };
    return names[category] || category;
}

// ========================================
// 建造界面更新
// ========================================
function updateBuildScreen() {
    console.log('📋 updateBuildScreen called');

    const region = getCurrentRegion();
    if (!region) {
        console.error('❌ No current region!');
        return;
    }

    console.log(`   Current region: ${region.id}, slots: ${region.slotsUsed}/${region.slotsTotal}`);

    const buildRegionNameEl = document.getElementById('build-region-name');
    if (buildRegionNameEl) buildRegionNameEl.textContent = `区域 ${region.id}`;

    const buildSlotsRemainingEl = document.getElementById('build-slots-remaining');
    if (buildSlotsRemainingEl) buildSlotsRemainingEl.textContent = (region.slotsTotal - region.slotsUsed).toFixed(1);

    const buildSlotsTotalEl = document.getElementById('build-slots-total');
    if (buildSlotsTotalEl) buildSlotsTotalEl.textContent = region.slotsTotal;

    console.log('   Rendering building categories...');
    renderBuildingCategory('mining-buildings', 'mining');
    renderBuildingCategory('production-buildings', 'production');
    renderBuildingCategory('power-buildings', 'power');
    renderBuildingCategory('science-buildings', 'science');
    renderBuildingCategory('storage-buildings', 'storage');
    console.log('   ✓ Build screen updated');
}

function renderBuildingCategory(containerId, category) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Container not found: ${containerId}`);
        return;
    }
    container.innerHTML = '';

    if (!GameData.buildings) {
        console.error('❌ GameData.buildings is not loaded!');
        container.innerHTML = '<div class="empty-message">数据加载中...</div>';
        return;
    }

    console.log(`🔍 Rendering category: ${category}`);
    console.log(`   Total buildings in GameData: ${Object.keys(GameData.buildings).length}`);

    const buildings = Object.values(GameData.buildings)
        .filter(template => {
            // 过滤分类
            if (template.category !== category) return false;

            // 过滤未解锁的科技
            if (template.requiresTech && !gameState.researchedTech.includes(template.requiresTech)) {
                console.log(`   ❌ ${template.name} locked by tech: ${template.requiresTech}`);
                return false;
            }

            console.log(`   ✓ ${template.name} available`);
            return true;
        });

    console.log(`   Found ${buildings.length} buildings for ${category}`);

    // 如果该分类没有可显示的建筑，显示提示
    if (buildings.length === 0) {
        container.innerHTML = '<div class="empty-message">暂无可建造的建筑</div>';
        return;
    }

    buildings.forEach(template => {
        const card = createBuildCard(template);
        container.appendChild(card);
    });
}

function createBuildCard(template) {
    const div = document.createElement('div');
    div.className = 'build-card';
    div.onclick = () => showBuildingDetailModal(template);

    const canBuild = checkCanBuild(template);

    // 生成简化成本显示（仅显示数量）
    let costHTML = '';
    if (template.cost) {
        costHTML = Object.entries(template.cost)
            .map(([resource, amount]) => {
                const item = GameData.items[resource];
                const available = Math.floor(gameState.resources[resource].current);
                const sufficient = available >= amount;
                const className = sufficient ? 'sufficient' : 'insufficient';
                return `<span class="cost-item ${className}">${item.name} ×${amount}</span>`;
            })
            .join(' ');
    }

    div.innerHTML = `
        <div class="build-card-title">${template.name}</div>
        <div class="build-card-cost-compact">${costHTML}</div>
    `;

    return div;
}

function checkCanBuild(template) {
    const region = getCurrentRegion();

    if (region.slotsUsed + template.slots > region.slotsTotal) {
        return false;
    }

    if (template.requiresTech && !gameState.researchedTech.includes(template.requiresTech)) {
        return false;
    }

    if (template.cost) {
        for (let [resource, amount] of Object.entries(template.cost)) {
            if (gameState.resources[resource].current < amount) {
                return false;
            }
        }
    }

    return true;
}

function getBuildErrorMessage(template) {
    const region = getCurrentRegion();

    if (region.slotsUsed + template.slots > region.slotsTotal) {
        return '槽位不足';
    }

    if (template.requiresTech && !gameState.researchedTech.includes(template.requiresTech)) {
        return '科技未解锁';
    }

    if (template.cost) {
        for (let [resource, amount] of Object.entries(template.cost)) {
            if (gameState.resources[resource].current < amount) {
                const item = GameData.items[resource];
                return `缺少${item.name}`;
            }
        }
    }

    return '无法建造';
}

// ========================================
// 科技树界面更新
// ========================================
// 只更新研究进度条，不重建DOM
function updateTechResearchProgress() {
    if (!gameState.currentResearch) return;

    const progressPercent = (gameState.researchProgress * 100).toFixed(1);
    const progressBar = document.querySelector('.research-progress-fill');
    const progressText = document.querySelector('.research-progress-text');

    if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
    }
    if (progressText) {
        progressText.textContent = `${progressPercent}%`;
    }
}

// 只更新科技界面的科研包数量，不重建DOM（游戏循环中调用）
function updateTechScreenCounts() {
    const sciencePacks = ['science-basic', 'science-automation', 'science-chemical', 'science-military', 'science-production', 'science-utility', 'science-nuclear'];

    sciencePacks.forEach(scienceId => {
        const count = Math.floor(gameState.resources[scienceId]?.current || 0);
        const countEl = document.querySelector(`[data-science-count-for="${scienceId}"]`);
        if (countEl) {
            countEl.textContent = count;
        }
    });
}

function updateTechScreen() {
    const container = document.getElementById('tech-tree-container');
    if (!container) return;

    container.innerHTML = '';

    // 计算总研究速度（全局所有区域）
    let totalResearchSpeed = 0;
    gameState.regions.forEach(region => {
        region.buildings.forEach(building => {
            if (!building) return; // 跳过已删除的建筑
            const template = GameData.buildings[building.buildingId];
            if (template.category === 'science' && template.researchSpeed && building.active) {
                totalResearchSpeed += template.researchSpeed;
            }
        });
    });

    // 显示科研包库存和研究速度（仅显示已解锁的科研包）
    const sciencePacks = ['science-basic', 'science-automation', 'science-chemical', 'science-military', 'science-production', 'science-utility', 'science-nuclear'];
    let sciencePacksHTML = '';
    sciencePacks.forEach(scienceId => {
        const item = GameData.items[scienceId];
        if (!item) return;

        // 检查该科研包的配方是否已解锁
        const recipe = GameData.recipes[scienceId];
        if (recipe && recipe.requiresTech && !gameState.researchedTech.includes(recipe.requiresTech)) {
            return; // 配方未解锁，跳过显示
        }

        const count = Math.floor(gameState.resources[scienceId]?.current || 0);
        sciencePacksHTML += `
            <div class="science-pack-item">
                <div class="science-pack-name">${item.name}</div>
                <div class="science-pack-count" data-science-count-for="${scienceId}">${count}</div>
            </div>
        `;
    });

    const scienceInfoDiv = document.createElement('div');
    scienceInfoDiv.className = 'science-info-panel';
    scienceInfoDiv.innerHTML = `
        <div class="science-info-header">
            <div class="science-info-title">
                <span>🔬 研究速度: ${totalResearchSpeed.toFixed(1)}x</span>
            </div>
        </div>
        <div class="science-packs-grid">
            ${sciencePacksHTML}
        </div>
    `;
    container.appendChild(scienceInfoDiv);

    // 显示当前研究状态
    if (gameState.currentResearch) {
        const tech = GameData.technologies[gameState.currentResearch];
        const progressPercent = (gameState.researchProgress * 100).toFixed(1);

        // 检查是否缺少科研包
        let lackingResources = [];
        for (let [scienceId, amount] of Object.entries(tech.cost)) {
            if (gameState.resources[scienceId].current < 1) {
                const item = GameData.items[scienceId];
                lackingResources.push(item.name);
            }
        }

        let statusHTML = '';
        if (lackingResources.length > 0) {
            statusHTML = `<div class="research-warning">⚠️ 缺少科研包: ${lackingResources.join(', ')}</div>`;
        } else if (totalResearchSpeed === 0) {
            statusHTML = `<div class="research-warning">⚠️ 需要建造研究中心</div>`;
        }

        const speedDisplay = totalResearchSpeed > 0 ? `<div class="research-speed">🔬 研究速度: ${totalResearchSpeed.toFixed(1)}x</div>` : '';

        const statusDiv = document.createElement('div');
        statusDiv.className = 'current-research';
        statusDiv.innerHTML = `
            <h3>当前研究</h3>
            <div class="research-info">
                <div class="research-name">${tech.name}</div>
                <div class="research-progress-bar">
                    <div class="research-progress-fill" style="width: ${progressPercent}%"></div>
                    <span class="research-progress-text">${progressPercent}%</span>
                </div>
                ${speedDisplay}
                ${statusHTML}
            </div>
        `;
        container.appendChild(statusDiv);
    }

    // 分类科技（可研究、已锁定、已完成）
    const available = [];
    const locked = [];
    const researched = [];

    Object.values(GameData.technologies).forEach(tech => {
        const isResearched = isTechResearched(tech.id);
        const isAvailable = isTechAvailable(tech.id);
        const isCurrent = gameState.currentResearch === tech.id;

        if (isResearched) {
            researched.push(tech);
        } else if (isCurrent || isAvailable) {
            available.push(tech);
        } else {
            locked.push(tech);
        }
    });

    // 创建科技网格
    const gridDiv = document.createElement('div');
    gridDiv.className = 'tech-grid';

    // 按顺序添加：可研究(黄) -> 已锁定(红) -> 已完成(绿)
    [...available, ...locked, ...researched].forEach(tech => {
        const card = createTechCardCompact(tech);
        gridDiv.appendChild(card);
    });

    container.appendChild(gridDiv);
}

function createTechCardCompact(tech) {
    const div = document.createElement('div');

    const isResearched = isTechResearched(tech.id);
    const isAvailable = isTechAvailable(tech.id);
    const isCurrent = gameState.currentResearch === tech.id;

    let statusClass = 'locked';
    let statusText = '已锁定';
    if (isResearched) {
        statusClass = 'researched';
        statusText = '已完成';
    } else if (isCurrent) {
        statusClass = 'researching';
        statusText = '研究中';
    } else if (isAvailable) {
        statusClass = 'available';
        statusText = '可研究';
    }

    div.className = `tech-card-compact ${statusClass}`;

    div.innerHTML = `
        <div class="tech-card-compact-name">${tech.name}</div>
        <div class="tech-card-compact-status">${statusText}</div>
    `;

    // 点击打开详情模态框
    div.onclick = () => showTechDetailModal(tech);

    return div;
}

function showTechDetailModal(tech) {
    const isResearched = isTechResearched(tech.id);
    const isAvailable = isTechAvailable(tech.id);
    const isCurrent = gameState.currentResearch === tech.id;

    // 成本显示
    const costHTML = Object.entries(tech.cost || {})
        .map(([id, amount]) => `${GameData.items[id].name} ×${amount}`)
        .join(', ');

    // 前置科技显示
    let prereqHTML = '';
    if (tech.prerequisites && tech.prerequisites.length > 0) {
        const prereqNames = tech.prerequisites
            .map(id => GameData.technologies[id]?.name || id)
            .join(', ');
        prereqHTML = `
            <div class="tech-prerequisites">
                <strong>前置科技:</strong>
                <div>${prereqNames}</div>
            </div>
        `;
    }

    // 解锁内容显示
    let unlocksHTML = '';
    if (tech.unlocks) {
        const unlocksList = [];
        if (tech.unlocks.buildings) {
            unlocksList.push(...tech.unlocks.buildings.map(id => '🏭 ' + GameData.buildings[id]?.name || id));
        }
        if (tech.unlocks.recipes) {
            unlocksList.push(...tech.unlocks.recipes.map(id => '⚙️ ' + GameData.recipes[id]?.name || id));
        }
        if (unlocksList.length > 0) {
            unlocksHTML = `
                <div class="tech-unlocks">
                    <strong>解锁内容:</strong>
                    <div>${unlocksList.join(', ')}</div>
                </div>
            `;
        }
    }

    // 状态显示
    let statusBadge = '';
    if (isResearched) {
        statusBadge = '<span class="tech-status-badge researched">已完成</span>';
    } else if (isCurrent) {
        statusBadge = '<span class="tech-status-badge researching">研究中</span>';
    } else if (isAvailable) {
        statusBadge = '<span class="tech-status-badge available">可研究</span>';
    } else {
        statusBadge = '<span class="tech-status-badge locked">已锁定</span>';
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog tech-detail-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${tech.name} ${statusBadge}</h3>
                </div>
                <div class="modal-body">
                    <p class="tech-description">${tech.description}</p>

                    ${prereqHTML}

                    <div class="tech-cost"><strong>研究成本:</strong> ${costHTML}</div>
                    <div class="tech-time"><strong>研究时间:</strong> ${tech.researchTime}秒</div>

                    ${unlocksHTML}
                </div>
                <div class="modal-actions">
                    ${!isResearched && !isCurrent && isAvailable ? '<button class="btn btn-confirm" onclick="startResearch(\'' + tech.id + '\'); closeModal()">开始研究</button>' : ''}
                    <button class="btn btn-cancel" onclick="closeModal()">关闭</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 点击overlay关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });
}

function closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 300);
    }
}

// ========================================
// 仓库界面更新
// ========================================
function updateStorageCapacity() {
    const totalCapacity = calculateTotalStorageCapacity();

    // 更新普通资源的最大容量（不包括电力和单位）
    Object.entries(gameState.resources).forEach(([id, data]) => {
        const item = GameData.items[id];
        if (id !== 'power' && (!item || item.category !== 'unit')) {
            data.max = totalCapacity;
        }
    });

    // 更新单位存储限制（基于仓库容量和单位重量）
    updateUnitStorageLimits();

    console.log(`[仓库] 存储容量已更新: ${totalCapacity}`);
}

function updateStorageScreen() {
    const region = getCurrentRegion();

    // 统计仓库数量和容量
    let warehouseCount = 0;
    let bonusCapacity = 0;

    region.buildings.forEach(building => {
        if (!building) return; // 跳过已删除的建筑
        const template = GameData.buildings[building.buildingId];
        if (template.category === 'storage' && template.storageBonus) {
            warehouseCount++;
            bonusCapacity += template.storageBonus;
        }
    });

    const baseCapacity = 500;
    const totalCapacity = baseCapacity + bonusCapacity;

    // 更新仓库统计
    const warehouseCountEl = document.getElementById('warehouse-count');
    if (warehouseCountEl) warehouseCountEl.textContent = warehouseCount;

    const baseCapacityEl = document.getElementById('base-capacity');
    if (baseCapacityEl) baseCapacityEl.textContent = baseCapacity;

    const bonusCapacityEl = document.getElementById('bonus-capacity');
    if (bonusCapacityEl) bonusCapacityEl.textContent = bonusCapacity;

    const totalCapacityEl = document.getElementById('total-capacity');
    if (totalCapacityEl) totalCapacityEl.textContent = totalCapacity;

    // 更新资源列表
    const container = document.getElementById('storage-resources-list');
    container.innerHTML = '';

    // 按类别分组资源
    const resourcesByCategory = {};
    Object.entries(gameState.resources).forEach(([id, data]) => {
        const item = GameData.items[id];
        if (!item) return;

        const category = item.category || 'other';
        if (!resourcesByCategory[category]) {
            resourcesByCategory[category] = [];
        }
        resourcesByCategory[category].push({ id, item, data });
    });

    // 渲染每个类别
    const categoryNames = {
        'raw': '原材料',
        'intermediate': '中间产品',
        'advanced': '高级产品',
        'military': '军事物资',
        'science': '科研包',
        'energy': '能源',
        'other': '其他'
    };

    Object.entries(resourcesByCategory).forEach(([category, resources]) => {
        if (resources.length === 0) return;

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'storage-category';

        const categoryHeader = document.createElement('h3');
        categoryHeader.className = 'storage-category-header';
        categoryHeader.textContent = categoryNames[category] || category;
        categoryDiv.appendChild(categoryHeader);

        const resourcesGrid = document.createElement('div');
        resourcesGrid.className = 'storage-resources-grid';

        resources.forEach(({ id, item, data }) => {
            const percentage = (data.current / data.max * 100).toFixed(1);
            const isNearFull = percentage >= 90;
            const isFull = percentage >= 100;

            const resourceDiv = document.createElement('div');
            resourceDiv.className = `storage-resource-item ${isFull ? 'full' : isNearFull ? 'near-full' : ''}`;
            resourceDiv.setAttribute('data-resource-id', id);
            resourceDiv.innerHTML = `
                <div class="storage-resource-header">
                    <span class="storage-resource-name">${item.name}</span>
                    <span class="storage-resource-percentage" data-percentage-for="${id}">${percentage}%</span>
                </div>
                <div class="storage-resource-bar">
                    <div class="storage-resource-fill" data-fill-for="${id}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <div class="storage-resource-values">
                    <span data-current-for="${id}">${Math.floor(data.current)}</span>
                    <span>/</span>
                    <span data-max-for="${id}">${data.max}</span>
                </div>
            `;

            resourcesGrid.appendChild(resourceDiv);
        });

        categoryDiv.appendChild(resourcesGrid);
        container.appendChild(categoryDiv);
    });
}

// 只更新仓库界面的数值，不重建DOM（游戏循环中调用）
function updateStorageScreenCounts() {
    Object.entries(gameState.resources).forEach(([id, data]) => {
        const percentage = (data.current / data.max * 100).toFixed(1);

        // 更新百分比
        const percentageEl = document.querySelector(`[data-percentage-for="${id}"]`);
        if (percentageEl) percentageEl.textContent = `${percentage}%`;

        // 更新进度条
        const fillEl = document.querySelector(`[data-fill-for="${id}"]`);
        if (fillEl) fillEl.style.width = `${Math.min(percentage, 100)}%`;

        // 更新当前值
        const currentEl = document.querySelector(`[data-current-for="${id}"]`);
        if (currentEl) currentEl.textContent = Math.floor(data.current);

        // 更新最大值
        const maxEl = document.querySelector(`[data-max-for="${id}"]`);
        if (maxEl) maxEl.textContent = data.max;

        // 更新样式（满/接近满）
        const resourceDiv = document.querySelector(`[data-resource-id="${id}"]`);
        if (resourceDiv) {
            resourceDiv.classList.remove('full', 'near-full');
            if (percentage >= 100) {
                resourceDiv.classList.add('full');
            } else if (percentage >= 90) {
                resourceDiv.classList.add('near-full');
            }
        }
    });
}

// ========================================
// 地图界面
// ========================================
function updateMapScreen() {
    const container = document.getElementById('regions-grid');
    if (!container) return;

    container.innerHTML = '';

    // 统计已占领区域数量
    const conqueredCount = gameState.regions.filter(r => r.conquered).length;
    const conqueredCountEl = document.getElementById('conquered-count');
    if (conqueredCountEl) conqueredCountEl.textContent = conqueredCount;

    // 渲染16个槽位（4x4网格）
    for (let i = 0; i < 16; i++) {
        const regionTemplate = GameData.regionTemplates[i];

        if (regionTemplate) {
            // 有区域数据：显示区域卡片
            const regionState = gameState.regions.find(r => r.id === regionTemplate.id);
            const card = createRegionCard(regionTemplate, regionState);
            container.appendChild(card);
        } else {
            // 空槽位：显示占位符
            const emptySlot = document.createElement('div');
            emptySlot.className = 'region-card empty-slot';
            emptySlot.innerHTML = '<div class="empty-slot-text">未开放</div>';
            container.appendChild(emptySlot);
        }
    }
}

function createRegionCard(template, state) {
    const div = document.createElement('div');
    div.className = 'region-card';

    // 确定区域状态
    const isConquered = state && state.conquered;
    const isAvailable = isRegionAvailable(template);
    const isLocked = !isConquered && !isAvailable;

    // Boss判断：只有区域4, 8, 12, 16是boss
    const isBoss = (template.id === 4 || template.id === 8 || template.id === 12 || template.id === 16);

    // 添加状态样式
    if (isConquered) {
        div.classList.add('conquered');
    } else if (isLocked) {
        div.classList.add('locked');
    }

    // 只有未占领的boss才显示boss样式
    if (isBoss && !isConquered) {
        div.classList.add('boss');
    }

    // 点击事件
    if (!isLocked) {
        div.onclick = () => onRegionClick(template, isConquered);
    }

    // 构建资源列表（简化）
    let resourcesList = [];
    if (template.resourceNodes && template.resourceNodes.length > 0) {
        template.resourceNodes.forEach(node => {
            const item = GameData.items[node.type];
            if (item) {
                resourcesList.push(item.name.substring(0, 2));
            }
        });
    }

    // 构建敌人数量
    let enemyCount = 0;
    if (template.enemies && template.enemies.length > 0) {
        enemyCount = template.enemies.reduce((sum, e) => sum + e.count, 0);
    }

    // 状态图标
    let statusIcon = '';
    if (isConquered) {
        statusIcon = '✓';
    } else if (isAvailable) {
        statusIcon = '⚔';
    } else {
        statusIcon = '🔒';
    }

    div.innerHTML = `
        <div class="region-card-name">${template.name} ${statusIcon}</div>
        <div class="region-card-resources-compact">${resourcesList.join(', ') || '无'}</div>
        ${!isConquered && enemyCount > 0 ? `<div class="region-card-enemies-compact">敌 ×${enemyCount}</div>` : ''}
    `;

    return div;
}

function isRegionAvailable(template) {
    // 区域ID为1是起始区域，总是可用
    if (template.id === 1) {
        return true;
    }

    // 检查上一个区域是否已占领（简单的顺序解锁）
    const previousRegionId = template.id - 1;
    const previousRegion = gameState.regions.find(r => r.id === previousRegionId);

    if (previousRegion && previousRegion.conquered) {
        return true;
    }

    return false;
}

function onRegionClick(template, isConquered) {
    // Check if region exists in gameState
    let region = gameState.regions.find(r => r.id === template.id);

    if (!region) {
        // Create new region from template
        region = {
            id: template.id,
            name: template.name,
            slotsTotal: template.slotsTotal,
            slotsUsed: 0,
            resourceNodes: template.resourceNodes.map(node => ({...node})),
            buildings: [],
            conquered: false
        };
        gameState.regions.push(region);

        // Initialize battle grid
        initializeBattleGrid(region, template);
    }

    // Switch to this region
    gameState.currentRegionId = template.id;

    // Force rebuild region interface
    const container = document.getElementById('buildings-list');
    if (container) container.innerHTML = '';

    // If region not conquered, show battle in military tab
    // Otherwise show buildings in region tab
    if (!region.conquered) {
        ensureBattleState(region);
        showToast(`战斗：${template.name}`, 'success');
        showScreen('military');
        updateMilitaryBattleScreen();
    } else {
        showToast(`查看区域：${template.name}`, 'success');
        showScreen('region');
        updateRegionScreen();
    }
}

// ========================================
// 军事界面
// ========================================
// Show battle screen in military tab
function updateMilitaryBattleScreen() {
    const region = getCurrentRegion();
    if (!region || !region.battle) return;

    // Switch to battle view
    document.getElementById('military-idle-view').style.display = 'none';
    document.getElementById('military-prep-view').style.display = 'none';
    document.getElementById('military-battle-view').style.display = 'block';

    // Update region name
    const nameDisplay = document.getElementById('battle-region-name-display');
    if (nameDisplay) nameDisplay.textContent = region.name;

    // Render battle grid
    renderBattleGrid();
}

// 完整重建军事界面（打开界面或解锁新科技时调用）
function updateMilitaryScreen() {
    // 切换到空闲视图
    document.getElementById('military-idle-view').style.display = 'block';
    document.getElementById('military-prep-view').style.display = 'none';
    document.getElementById('military-battle-view').style.display = 'none';

    // 渲染部队列表（仅显示已解锁的）
    const unitsListDiv = document.getElementById('military-units-list');
    unitsListDiv.innerHTML = '';

    let hasUnits = false;
    Object.entries(GameData.units).forEach(([unitId, unitData]) => {
        // 检查recipe是否解锁
        const recipe = Object.values(GameData.recipes).find(r => r.results && r.results[unitId]);
        if (recipe && recipe.requiresTech && !gameState.researchedTech.includes(recipe.requiresTech)) {
            return; // 未解锁，不显示
        }

        hasUnits = true;
        const count = Math.floor(gameState.resources[unitId]?.current || 0);

        const card = document.createElement('div');
        card.className = 'military-unit-card';
        card.setAttribute('data-unit-id', unitId);
        card.innerHTML = `
            <div class="military-unit-name">${unitData.name}</div>
            <div class="military-unit-count" data-count-for="${unitId}">×${count}</div>
            <div class="military-unit-stats">HP:${unitData.combat.hp} ATK:${unitData.combat.damage}</div>
        `;
        unitsListDiv.appendChild(card);
    });

    if (!hasUnits) {
        unitsListDiv.innerHTML = '<div class="empty-message">暂无已解锁部队</div>';
    }

    // 渲染弹药库存（仅显示已解锁的）
    const ammoListDiv = document.getElementById('military-ammo-list');
    ammoListDiv.innerHTML = '';

    const ammoTypes = ['normal-bullet', 'piercing-bullet', 'explosive-bullet', 'laser-charge'];
    let hasAmmo = false;
    ammoTypes.forEach(ammoId => {
        // 检查recipe是否解锁
        const recipe = Object.values(GameData.recipes).find(r => r.results && r.results[ammoId]);
        if (recipe && recipe.requiresTech && !gameState.researchedTech.includes(recipe.requiresTech)) {
            return; // 未解锁，不显示
        }

        hasAmmo = true;
        const ammoItem = GameData.items[ammoId];
        const card = document.createElement('div');
        card.className = 'military-ammo-card';
        card.setAttribute('data-ammo-id', ammoId);
        const current = Math.floor(gameState.resources[ammoId]?.current || 0);
        const max = gameState.resources[ammoId]?.max || 0;
        card.innerHTML = `
            <div class="military-ammo-name">${ammoItem ? ammoItem.name : ammoId}</div>
            <div class="military-ammo-count" data-count-for="${ammoId}">${current}/${max}</div>
        `;
        ammoListDiv.appendChild(card);
    });

    if (!hasAmmo) {
        ammoListDiv.innerHTML = '<div class="empty-message">暂无已解锁弹药</div>';
    }

    // 更新数值
    updateMilitaryScreenCounts();
}

// 只更新数值，不重建DOM（游戏循环中调用）
function updateMilitaryScreenCounts() {
    // 计算总战力和无人机容量
    let totalBattlePower = 0;
    let droneCount = 0;
    let droneCapacity = 100; // 基础无人机容量

    // 更新部队数量
    Object.entries(GameData.units).forEach(([unitId, unitData]) => {
        const count = Math.floor(gameState.resources[unitId]?.current || 0);
        droneCount += count;
        totalBattlePower += count * unitData.combat.damage;

        const countElement = document.querySelector(`[data-count-for="${unitId}"]`);
        if (countElement) {
            countElement.textContent = `×${count}`;
        }
    });

    // 更新战力显示
    const battlePowerEl = document.getElementById('total-battle-power');
    const droneCurrentEl = document.getElementById('drone-current');
    const droneCapacityEl = document.getElementById('drone-capacity');

    if (battlePowerEl) battlePowerEl.textContent = Math.floor(totalBattlePower);
    if (droneCurrentEl) droneCurrentEl.textContent = droneCount;
    if (droneCapacityEl) droneCapacityEl.textContent = droneCapacity;

    // 更新弹药数量
    const ammoTypes = ['normal-bullet', 'piercing-bullet', 'explosive-bullet', 'laser-charge'];
    ammoTypes.forEach(ammoId => {
        const countElement = document.querySelector(`[data-count-for="${ammoId}"]`);
        if (countElement && gameState.resources[ammoId]) {
            const current = Math.floor(gameState.resources[ammoId].current);
            const max = gameState.resources[ammoId].max;
            countElement.textContent = `${current}/${max}`;
        }
    });
}

// ========================================
// 战斗准备界面 (OLD SYSTEM - DISABLED)
// ========================================
function showBattlePrepScreen(regionTemplate) {
    // Old battle prep disabled - battles are now in-region
    return;
    // 初始化战斗状态
    gameState.battle.targetRegion = regionTemplate;
    gameState.battle.selectedUnits = {};
    gameState.battle.active = false;

    // 显示准备界面
    document.getElementById('battle-region-name').textContent = regionTemplate.name;

    // 切换到军事界面
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    document.getElementById('military-screen').style.display = 'flex';

    // 更新tab激活状态
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-button')[3].classList.add('active'); // 军事是第4个按钮

    // 切换到准备视图
    document.getElementById('military-idle-view').style.display = 'none';
    document.getElementById('military-prep-view').style.display = 'block';
    document.getElementById('military-battle-view').style.display = 'none';

    updateBattlePrepScreen();
}

function updateBattlePrepScreen() {
    const regionTemplate = gameState.battle.targetRegion;
    if (!regionTemplate) return;

    // 计算敌方总战力
    let enemyTotalHP = 0;
    let enemyTotalAttack = 0;
    let enemyTotalCount = 0;

    // 渲染敌方信息（简洁版）
    const enemyFormationDiv = document.getElementById('enemy-formation');
    enemyFormationDiv.innerHTML = '';

    if (regionTemplate.enemies && regionTemplate.enemies.length > 0) {
        regionTemplate.enemies.forEach(enemy => {
            const enemyData = GameData.enemies[enemy.type];
            if (enemyData) {
                enemyTotalHP += enemyData.hp * enemy.count;
                enemyTotalAttack += enemyData.attack * enemy.count;
                enemyTotalCount += enemy.count;

                const div = document.createElement('div');
                div.className = 'enemy-unit-summary';
                div.innerHTML = `
                    <div class="enemy-unit-name">${enemyData.name} ×${enemy.count}</div>
                    <div class="enemy-unit-stats">HP: ${enemyData.hp} | 攻击: ${enemyData.attack}</div>
                `;
                enemyFormationDiv.appendChild(div);
            }
        });

        // 添加敌方总战力显示
        const enemyPowerDiv = document.createElement('div');
        enemyPowerDiv.className = 'enemy-unit-summary';
        enemyPowerDiv.style.marginTop = '10px';
        enemyPowerDiv.style.borderColor = 'rgba(255, 50, 50, 0.8)';
        enemyPowerDiv.style.fontWeight = 'bold';
        const enemyPower = Math.ceil(enemyTotalHP * 0.5 + enemyTotalAttack * 2);
        enemyPowerDiv.innerHTML = `
            <div class="enemy-unit-name">敌方总战力</div>
            <div class="enemy-unit-stats">总HP: ${enemyTotalHP} | 总攻击: ${enemyTotalAttack} | 战力值: ${enemyPower}</div>
        `;
        enemyFormationDiv.appendChild(enemyPowerDiv);
    }

    // 计算我方总战力
    let playerTotalHP = 0;
    let playerTotalAttack = 0;
    let playerTotalCount = 0;

    // 渲染我方已选择的单位
    const playerFormationDiv = document.getElementById('player-formation');
    playerFormationDiv.innerHTML = '';

    let totalSelected = 0;
    Object.entries(gameState.battle.selectedUnits).forEach(([unitId, count]) => {
        if (count > 0) {
            const unitData = GameData.units[unitId];
            if (unitData) {
                playerTotalHP += unitData.combat.hp * count;
                playerTotalAttack += unitData.combat.damage * count;
                playerTotalCount += count;

                const div = document.createElement('div');
                div.className = 'selected-unit-summary';
                div.innerHTML = `
                    <div class="selected-unit-name">${unitData.name} ×${count}</div>
                    <div class="selected-unit-stats">HP: ${unitData.combat.hp} | 攻击: ${unitData.combat.damage}</div>
                `;
                playerFormationDiv.appendChild(div);
                totalSelected += count;
            }
        }
    });

    if (totalSelected === 0) {
        playerFormationDiv.innerHTML = '<div class="empty-message">请选择单位参战</div>';
    } else {
        // 添加我方总战力显示
        const playerPowerDiv = document.createElement('div');
        playerPowerDiv.className = 'selected-unit-summary';
        playerPowerDiv.style.marginTop = '10px';
        playerPowerDiv.style.borderColor = 'var(--primary-color)';
        playerPowerDiv.style.fontWeight = 'bold';
        const playerPower = Math.ceil(playerTotalHP * 0.5 + playerTotalAttack * 2);
        playerPowerDiv.innerHTML = `
            <div class="selected-unit-name">我方总战力</div>
            <div class="selected-unit-stats">总HP: ${playerTotalHP} | 总攻击: ${playerTotalAttack} | 战力值: ${playerPower}</div>
        `;
        playerFormationDiv.appendChild(playerPowerDiv);
    }

    // 渲染单位选择器
    renderUnitSelectors();
}

function renderUnitSelectors() {
    const container = document.getElementById('available-units');
    container.innerHTML = '';

    Object.entries(GameData.units).forEach(([unitId, unitData]) => {
        const availableCount = Math.floor(gameState.resources[unitId]?.current || 0);
        if (availableCount === 0) return; // 没有这个单位就不显示

        const selectedCount = gameState.battle.selectedUnits[unitId] || 0;
        const remainingCount = availableCount - selectedCount;

        const card = document.createElement('div');
        card.className = 'unit-selector-card';

        let ammoHTML = '';
        if (unitData.combat.ammoPerTurn) {
            const ammoEntries = Object.entries(unitData.combat.ammoPerTurn);
            ammoHTML = '<div class="unit-ammo-info">';
            ammoEntries.forEach(([ammoType, amount]) => {
                const ammoItem = GameData.items[ammoType];
                if (ammoItem) {
                    ammoHTML += `${ammoItem.name} ${amount}/次 `;
                }
            });
            ammoHTML += '</div>';
        }

        // 计算攻击间隔
        const attackInterval = getAttackInterval(unitId);

        card.innerHTML = `
            <div class="unit-selector-header">
                <div class="unit-selector-name">${unitData.name}</div>
                <div class="unit-selector-available">库存: ${availableCount}</div>
            </div>
            <div class="unit-selector-stats">
                <div>HP: ${unitData.combat.hp}</div>
                <div>攻击: ${unitData.combat.damage}</div>
                <div>间隔: ${attackInterval}秒</div>
            </div>
            ${ammoHTML}
            <div class="unit-selector-controls">
                <button class="unit-selector-btn" onclick="adjustUnitSelection('${unitId}', -10)" ${remainingCount === availableCount ? 'disabled' : ''}>-10</button>
                <button class="unit-selector-btn" onclick="adjustUnitSelection('${unitId}', -1)" ${remainingCount === availableCount ? 'disabled' : ''}>-1</button>
                <span class="unit-selector-count">${selectedCount}</span>
                <button class="unit-selector-btn" onclick="adjustUnitSelection('${unitId}', 1)" ${remainingCount === 0 ? 'disabled' : ''}>+1</button>
                <button class="unit-selector-btn" onclick="adjustUnitSelection('${unitId}', 10)" ${remainingCount === 0 ? 'disabled' : ''}>+10</button>
            </div>
        `;

        container.appendChild(card);
    });
}

function getAttackInterval(unitId) {
    const intervals = {
        'machinegun-drone': 1,
        'heavy-machinegun-drone': 2,
        'flamethrower-drone': 2.5,
        'laser-drone': 1.5,
        'plasma-drone': 2,
        'artillery-drone': 5
    };
    return intervals[unitId] || 2;
}

function adjustUnitSelection(unitId, delta) {
    const currentCount = gameState.battle.selectedUnits[unitId] || 0;
    const availableCount = Math.floor(gameState.resources[unitId]?.current || 0);

    let newCount = currentCount + delta;
    newCount = Math.max(0, Math.min(newCount, availableCount));

    gameState.battle.selectedUnits[unitId] = newCount;
    updateBattlePrepScreen();
}

function closeBattlePrep() {
    gameState.battle.targetRegion = null;
    gameState.battle.selectedUnits = {};
    // 返回军事界面的空闲视图
    document.getElementById('military-idle-view').style.display = 'block';
    document.getElementById('military-prep-view').style.display = 'none';
    document.getElementById('military-battle-view').style.display = 'none';
    updateMilitaryScreen();
}

function startBattle() {
    // 验证至少有一个单位
    const totalUnits = Object.values(gameState.battle.selectedUnits).reduce((sum, count) => sum + count, 0);
    if (totalUnits === 0) {
        showToast('请至少选择一个单位！', 'error');
        return;
    }

    // 初始化我方单位
    gameState.battle.playerUnits = {};
    Object.entries(gameState.battle.selectedUnits).forEach(([unitId, count]) => {
        if (count > 0) {
            const unitData = GameData.units[unitId];
            if (unitData) {
                gameState.battle.playerUnits[unitId] = {
                    count: count,
                    units: []
                };
                for (let i = 0; i < count; i++) {
                    gameState.battle.playerUnits[unitId].units.push({
                        hp: unitData.combat.hp,
                        maxHp: unitData.combat.hp,
                        attackTimer: 0
                    });
                }
            }
        }
    });

    // 初始化敌方单位
    gameState.battle.enemyUnits = [];
    const regionTemplate = gameState.battle.targetRegion;
    if (regionTemplate.enemies) {
        regionTemplate.enemies.forEach(enemy => {
            const enemyData = GameData.enemies[enemy.type];
            if (enemyData) {
                for (let i = 0; i < enemy.count; i++) {
                    gameState.battle.enemyUnits.push({
                        enemyId: enemy.type,
                        hp: enemyData.hp,
                        maxHp: enemyData.hp,
                        attackTimer: 0
                    });
                }
            }
        });
    }

    // 开始战斗
    gameState.battle.active = true;
    gameState.battle.battleLog = [];
    gameState.battle.retreating = false;
    gameState.battle.retreatProgress = 0;
    gameState.battle.battleTime = 0;

    // 切换到战斗视图
    document.getElementById('military-idle-view').style.display = 'none';
    document.getElementById('military-prep-view').style.display = 'none';
    document.getElementById('military-battle-view').style.display = 'block';
    document.getElementById('battle-screen-region-name').textContent = regionTemplate.name;

    updateBattleScreen();
    addBattleLog('战斗开始！');
}

// ========================================
// 战斗界面 (OLD SYSTEM - DISABLED)
// ========================================
function updateBattleScreen() {
    // Old battle system disabled
    return;

    // 计算统计数据
    let totalPlayerHP = 0, maxPlayerHP = 0, totalPlayerCount = 0;
    Object.entries(gameState.battle.playerUnits).forEach(([unitId, data]) => {
        const aliveCount = data.units.filter(u => u.hp > 0).length;
        totalPlayerCount += aliveCount;
        data.units.forEach(u => {
            totalPlayerHP += u.hp;
            maxPlayerHP += u.maxHp;
        });
    });

    let totalEnemyHP = 0, maxEnemyHP = 0, totalEnemyCount = 0;
    gameState.battle.enemyUnits.forEach(u => {
        if (u.hp > 0) {
            totalEnemyCount++;
            totalEnemyHP += u.hp;
        }
        maxEnemyHP += u.maxHp;
    });

    // 更新血量对比条
    const totalHP = totalPlayerHP + totalEnemyHP;
    const playerHPPercent = totalHP > 0 ? (totalPlayerHP / totalHP * 100) : 50;
    document.getElementById('battle-player-hp-bar').style.width = playerHPPercent + '%';
    document.getElementById('battle-player-hp-text').textContent = `${Math.ceil(totalPlayerHP)}/${Math.ceil(maxPlayerHP)}`;
    document.getElementById('battle-enemy-hp-text').textContent = `${Math.ceil(totalEnemyHP)}/${Math.ceil(maxEnemyHP)}`;

    // 渲染我方编队（简化为单行）
    const playerFormationDiv = document.getElementById('battle-player-formation');
    playerFormationDiv.innerHTML = '';

    Object.entries(gameState.battle.playerUnits).forEach(([unitId, data]) => {
        const unitData = GameData.units[unitId];
        const aliveCount = data.units.filter(u => u.hp > 0).length;
        const totalHP = data.units.reduce((sum, u) => sum + u.hp, 0);
        const maxHP = data.units.reduce((sum, u) => sum + u.maxHp, 0);

        // 检查是否有弹药
        let hasAmmo = true;
        if (unitData.combat.ammoPerTurn) {
            for (let [ammoType, amount] of Object.entries(unitData.combat.ammoPerTurn)) {
                if ((gameState.resources[ammoType]?.current || 0) < amount) {
                    hasAmmo = false;
                    break;
                }
            }
        }

        const div = document.createElement('div');
        div.className = 'battle-unit-row' + (hasAmmo ? '' : ' no-ammo');

        const hpBarWidth = maxHP > 0 ? (totalHP / maxHP * 100) : 0;
        const hpBar = '▓'.repeat(Math.ceil(hpBarWidth / 20)) + '░'.repeat(5 - Math.ceil(hpBarWidth / 20));

        div.innerHTML = `
            <div class="battle-unit-name">${unitData.name}×${aliveCount}</div>
            <div class="battle-unit-hp-bar">
                <div class="battle-unit-hp-fill" style="width: ${hpBarWidth}%"></div>
            </div>
        `;
        playerFormationDiv.appendChild(div);
    });

    // 渲染敌方编队
    const enemyFormationDiv = document.getElementById('battle-enemy-formation');
    enemyFormationDiv.innerHTML = '';

    const enemyGroups = {};
    gameState.battle.enemyUnits.forEach(enemy => {
        if (!enemyGroups[enemy.enemyId]) {
            enemyGroups[enemy.enemyId] = [];
        }
        enemyGroups[enemy.enemyId].push(enemy);
    });

    Object.entries(enemyGroups).forEach(([enemyId, enemies]) => {
        const enemyData = GameData.enemies[enemyId];
        const aliveCount = enemies.filter(e => e.hp > 0).length;
        const totalHP = enemies.reduce((sum, e) => sum + e.hp, 0);
        const maxHP = enemies.reduce((sum, e) => sum + e.maxHp, 0);

        const div = document.createElement('div');
        div.className = 'battle-unit-row enemy';

        const hpBarWidth = maxHP > 0 ? (totalHP / maxHP * 100) : 0;

        div.innerHTML = `
            <div class="battle-unit-name">${enemyData.name}×${aliveCount}</div>
            <div class="battle-unit-hp-bar">
                <div class="battle-unit-hp-fill" style="width: ${hpBarWidth}%"></div>
            </div>
        `;
        enemyFormationDiv.appendChild(div);
    });

    // 计算DPS
    let playerDPS = 0;
    Object.entries(gameState.battle.playerUnits).forEach(([unitId, data]) => {
        const unitData = GameData.units[unitId];
        const aliveCount = data.units.filter(u => u.hp > 0).length;
        const attackInterval = getAttackInterval(unitId);
        playerDPS += (unitData.combat.damage * aliveCount) / attackInterval;
    });

    let enemyDPS = 0;
    gameState.battle.enemyUnits.forEach(enemy => {
        if (enemy.hp > 0) {
            const enemyData = GameData.enemies[enemy.enemyId];
            enemyDPS += enemyData.attack / 2; // 敌人攻击间隔2秒
        }
    });

    document.getElementById('battle-player-dps').textContent = Math.ceil(playerDPS);
    document.getElementById('battle-enemy-dps').textContent = Math.ceil(enemyDPS);

    // 弹药消耗统计
    const ammoConsumption = {};
    Object.entries(gameState.battle.playerUnits).forEach(([unitId, data]) => {
        const unitData = GameData.units[unitId];
        const aliveCount = data.units.filter(u => u.hp > 0).length;
        if (unitData.combat.ammoPerTurn) {
            const attackInterval = getAttackInterval(unitId);
            Object.entries(unitData.combat.ammoPerTurn).forEach(([ammoType, amount]) => {
                if (!ammoConsumption[ammoType]) {
                    ammoConsumption[ammoType] = 0;
                }
                ammoConsumption[ammoType] += (amount * aliveCount) / attackInterval;
            });
        }
    });

    const ammoInfoDiv = document.getElementById('battle-ammo-info');
    ammoInfoDiv.innerHTML = '';

    Object.entries(ammoConsumption).forEach(([ammoType, ratePerSec]) => {
        const ammoItem = GameData.items[ammoType];
        const current = gameState.resources[ammoType]?.current || 0;
        const max = gameState.resources[ammoType]?.max || 500;
        const remaining = ratePerSec > 0 ? Math.floor(current / ratePerSec) : 999;
        const percent = (current / max * 100);

        let fillClass = '';
        if (percent < 20) fillClass = 'critical';
        else if (percent < 40) fillClass = 'warning';

        const div = document.createElement('div');
        div.className = 'battle-ammo-item';
        div.innerHTML = `
            <div class="battle-ammo-name">${ammoItem ? ammoItem.name : ammoType}：</div>
            <div class="battle-ammo-rate">-${Math.ceil(ratePerSec)}/秒</div>
            <div class="battle-ammo-bar">
                <div class="battle-ammo-fill ${fillClass}" style="width: ${percent}%"></div>
            </div>
            <div class="battle-ammo-count">${Math.floor(current)}/${max}</div>
            <div class="battle-ammo-remaining">${percent < 40 ? '⚠️ ' : ''}(剩余 ${remaining} 秒)</div>
        `;
        ammoInfoDiv.appendChild(div);
    });

    // 战斗时间
    const battleTimeStr = String(Math.floor(gameState.battle.battleTime / 60)).padStart(2, '0') + ':' + String(Math.floor(gameState.battle.battleTime % 60)).padStart(2, '0');
    document.getElementById('battle-time-display').textContent = battleTimeStr;
}

// ========================================
// 实时战斗逻辑 (OLD SYSTEM - DISABLED)
// ========================================
function processBattle(deltaTime) {
    // Old battle system disabled - now using grid-based battles
    return;

    gameState.battle.battleTime += deltaTime;

    // 计算存活单位
    let totalPlayerCount = 0;
    Object.values(gameState.battle.playerUnits).forEach(data => {
        totalPlayerCount += data.units.filter(u => u.hp > 0).length;
    });

    const aliveEnemyUnits = gameState.battle.enemyUnits.filter(e => e.hp > 0).length;

    if (totalPlayerCount === 0) {
        endBattle(false);
        return;
    }

    if (aliveEnemyUnits === 0) {
        endBattle(true);
        return;
    }

    // 玩家单位攻击
    Object.entries(gameState.battle.playerUnits).forEach(([unitId, data]) => {
        const unitData = GameData.units[unitId];
        const attackInterval = getAttackInterval(unitId);

        data.units.forEach((unit, idx) => {
            if (unit.hp <= 0) return;

            unit.attackTimer += deltaTime;
            if (unit.attackTimer >= attackInterval) {
                unit.attackTimer = 0;

                // 检查弹药
                if (unitData.combat.ammoPerTurn) {
                    let hasAmmo = true;
                    for (let [ammoType, amount] of Object.entries(unitData.combat.ammoPerTurn)) {
                        if ((gameState.resources[ammoType]?.current || 0) < amount) {
                            hasAmmo = false;
                            break;
                        }
                    }
                    if (!hasAmmo) return;

                    // 消耗弹药
                    for (let [ammoType, amount] of Object.entries(unitData.combat.ammoPerTurn)) {
                        gameState.resources[ammoType].current -= amount;
                    }
                }

                // AOE 攻击（喷火无人机攻击3个目标）
                if (unitData.combat.aoe) {
                    const aoeTargets = selectAOETargets(unitId, gameState.battle.enemyUnits, unitData.combat.aoe);
                    aoeTargets.forEach(target => {
                        const damage = calculateDamage(unitData, GameData.enemies[target.enemyId]);
                        target.hp -= damage;
                        if (target.hp <= 0) {
                            target.hp = 0;
                            addBattleLog(`${unitData.name} 击杀了 ${GameData.enemies[target.enemyId].name}！`);
                        }
                    });
                } else {
                    // 单体攻击
                    const target = selectTarget(unitId, gameState.battle.enemyUnits);
                    if (!target) return;

                    const damage = calculateDamage(unitData, GameData.enemies[target.enemyId]);
                    target.hp -= damage;

                    if (target.hp <= 0) {
                        target.hp = 0;
                        addBattleLog(`${unitData.name} 击杀了 ${GameData.enemies[target.enemyId].name}！`);
                    }
                }
            }
        });
    });

    // 敌人攻击（攻击第一个存活的玩家单位）
    const firstPlayerUnit = getFirstAlivePlayerUnit();
    if (firstPlayerUnit) {
        gameState.battle.enemyUnits.forEach((enemy, idx) => {
            if (enemy.hp <= 0) return;

            const enemyData = GameData.enemies[enemy.enemyId];
            const attackInterval = 2;

            enemy.attackTimer += deltaTime;
            if (enemy.attackTimer >= attackInterval) {
                enemy.attackTimer = 0;

                const damage = enemyData.attack * 0.1;
                firstPlayerUnit.unit.hp -= damage;

                if (firstPlayerUnit.unit.hp <= 0) {
                    firstPlayerUnit.unit.hp = 0;
                    addBattleLog(`${enemyData.name} 击毁了 ${GameData.units[firstPlayerUnit.unitId].name}！`);
                }
            }
        });
    }
}

function selectTarget(unitId, enemies) {
    const aliveEnemies = enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) return null;

    // 简化版目标选择：选择血量最低的
    return aliveEnemies.reduce((lowest, e) => e.hp < lowest.hp ? e : lowest);
}

function selectAOETargets(unitId, enemies, maxTargets) {
    const aliveEnemies = enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) return [];

    // AOE攻击：选择最多 maxTargets 个目标（优先选择血量低的）
    return aliveEnemies
        .sort((a, b) => a.hp - b.hp)
        .slice(0, maxTargets);
}

function getFirstAlivePlayerUnit() {
    for (let [unitId, data] of Object.entries(gameState.battle.playerUnits)) {
        const aliveUnit = data.units.find(u => u.hp > 0);
        if (aliveUnit) {
            return { unitId, unit: aliveUnit };
        }
    }
    return null;
}

function calculateDamage(attacker, defender) {
    let damage = attacker.combat.damage;

    // 克制关系 (根据设计文档)
    if (attacker.id === 'heavy-machinegun-drone' && defender.type === 'armored') {
        damage *= 2.0; // 重机枪对装甲 ×2
    } else if (attacker.id === 'flamethrower-drone' && defender.type === 'swarm') {
        damage *= 1.5; // 喷火对群体 ×1.5
    } else if (attacker.id === 'laser-drone' && defender.type === 'shielded') {
        damage *= 2.0; // 激光对护盾 ×2
    } else if (attacker.id === 'artillery-drone' && defender.type === 'boss') {
        damage *= 1.5; // 炮台对BOSS ×1.5
    }

    // 装甲减伤
    if (defender.armor) {
        damage *= (100 - defender.armor) / 100;
    }

    return damage;
}

function triggerAttackAnimation(side, slotIndex) {
    // 添加攻击动画class
    const formationId = side === 'player' ? 'battle-player-formation' : 'battle-enemy-formation';
    const formation = document.getElementById(formationId);
    if (!formation) return;

    const slots = formation.querySelectorAll('.formation-slot');
    if (slots[slotIndex]) {
        slots[slotIndex].classList.add('attacking');
        setTimeout(() => {
            slots[slotIndex].classList.remove('attacking');
        }, 500);
    }
}

function addBattleLog(message) {
    if (!gameState.battle.battleLog) {
        gameState.battle.battleLog = [];
    }
    gameState.battle.battleLog.push(message);

    // 限制日志数量
    if (gameState.battle.battleLog.length > 50) {
        gameState.battle.battleLog.shift();
    }
}

function calculateBattleRewards(regionTemplate) {
    const rewards = {
        resources: {},
        bonusSlots: 0,
        unlockResources: []
    };

    // 基础奖励：根据敌人数量和类型
    if (regionTemplate.enemies && regionTemplate.enemies.length > 0) {
        let totalEnemyValue = 0;
        regionTemplate.enemies.forEach(enemyGroup => {
            const enemyData = GameData.enemies[enemyGroup.type];
            if (enemyData) {
                // 根据敌人HP和攻击力计算价值
                const enemyValue = (enemyData.hp + enemyData.attack * 5) * enemyGroup.count;
                totalEnemyValue += enemyValue;
            }
        });

        // 基础资源奖励：铁板和铜板
        const baseReward = Math.floor(totalEnemyValue / 10);
        rewards.resources['iron-plate'] = Math.floor(baseReward * 0.6);
        rewards.resources['copper-plate'] = Math.floor(baseReward * 0.4);

        // BOSS战额外奖励
        if (regionTemplate.isBoss) {
            rewards.resources['steel-plate'] = Math.floor(baseReward * 0.3);
            rewards.resources['circuit'] = Math.floor(baseReward * 0.2);
            rewards.resources['science-basic'] = 10;
        }
    }

    // 区域特殊奖励
    if (regionTemplate.rewards) {
        if (regionTemplate.rewards.bonusSlots) {
            rewards.bonusSlots = regionTemplate.rewards.bonusSlots;
        }
        if (regionTemplate.rewards.unlockResources) {
            rewards.unlockResources = regionTemplate.rewards.unlockResources;
        }
        if (regionTemplate.rewards.resources) {
            Object.entries(regionTemplate.rewards.resources).forEach(([id, amount]) => {
                rewards.resources[id] = (rewards.resources[id] || 0) + amount;
            });
        }
    }

    return rewards;
}

function retreatFromBattle() {
    showToast('撤退成功！', 'warning');
    addBattleLog('指挥官下达撤退命令！');
    endBattle(false, true); // 立即撤退
}

function endBattle(victory, retreated = false) {
    // Old battle system disabled
    return;

    let title = '';
    let message = '';

    if (retreated) {
        title = '撤退成功';
        message = '成功撤离战场！所有单位恢复满血。';
        addBattleLog('成功撤离战场！');

        // 所有单位恢复满血（不影响库存数量，只是恢复战斗中的单位）
        // 注意：撤退后单位不会损失，但也不会保存战损
    } else if (victory) {
        title = '战斗胜利！';
        addBattleLog('战斗胜利！');

        // 占领区域
        const regionTemplate = gameState.battle.targetRegion;
        const existingRegion = gameState.regions.find(r => r.id === regionTemplate.id);

        // 计算战斗奖励
        const rewards = calculateBattleRewards(regionTemplate);

        if (!existingRegion) {
            gameState.regions.push({
                id: regionTemplate.id,
                name: regionTemplate.name,
                slotsTotal: regionTemplate.slotsTotal + rewards.bonusSlots,
                slotsUsed: 0,
                resourceNodes: regionTemplate.resourceNodes.map(node => ({...node})),
                buildings: [],
                conquered: true
            });
        } else {
            existingRegion.conquered = true;
            existingRegion.slotsTotal += rewards.bonusSlots;
        }

        // 发放奖励
        Object.entries(rewards.resources).forEach(([resourceId, amount]) => {
            if (gameState.resources[resourceId]) {
                gameState.resources[resourceId].current += amount;
                gameState.resources[resourceId].current = Math.min(
                    gameState.resources[resourceId].current,
                    gameState.resources[resourceId].max
                );
            }
        });

        // 构建奖励消息
        let rewardMessages = [];
        if (Object.keys(rewards.resources).length > 0) {
            const resourceList = Object.entries(rewards.resources)
                .map(([id, amount]) => `${GameData.items[id]?.name || id} +${amount}`)
                .join(', ');
            rewardMessages.push(`资源奖励: ${resourceList}`);
        }
        if (rewards.bonusSlots > 0) {
            rewardMessages.push(`额外槽位: +${rewards.bonusSlots}`);
        }
        if (rewards.unlockResources.length > 0) {
            rewardMessages.push(`解锁资源: ${rewards.unlockResources.join(', ')}`);
        }

        message = `成功占领 ${gameState.battle.targetRegion.name}！\n\n${rewardMessages.join('\n')}`;

        // 所有存活单位恢复满血
        // 注意：胜利后单位不会损失，战损的单位也保留在库存中
    } else {
        title = '战斗失败';
        message = '全军覆没...敌人恢复满血。';
        addBattleLog('战斗失败...');

        // 失败后：
        // 1. 敌人恢复到原始状态（满血+完整数量）- 战斗中被击杀的敌人会复活
        // 2. 玩家单位保持库存不变（战斗不影响实际库存，只是模拟战斗）
    }

    // 显示战斗结果模态框
    showBattleResultModal(title, message, victory, retreated);
}

function showBattleResultModal(title, message, victory, retreated) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const titleColor = victory ? 'color: #00ff64;' : retreated ? 'color: var(--secondary-color);' : 'color: #ff5555;';

    overlay.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 style="${titleColor}">${title}</h3>
                </div>
                <div class="modal-body">
                    <p style="font-size: 1.1rem; margin-bottom: 15px;">${message}</p>
                    <div style="font-size: 0.9rem; color: var(--text-dim);">
                        <div>战斗日志:</div>
                        <div style="max-height: 200px; overflow-y: auto; margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.3);">
                            ${gameState.battle.battleLog.slice(-10).map(log => `<div style="margin: 4px 0;">${log}</div>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-confirm" onclick="closeBattleResult()">返回地图</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

function closeBattleResult() {
    // 清理战斗状态
    gameState.battle.targetRegion = null;
    gameState.battle.playerUnits = {};
    gameState.battle.enemyUnits = [];
    gameState.battle.selectedUnits = {};
    gameState.battle.battleLog = [];
    gameState.battle.retreating = false;
    gameState.battle.retreatProgress = 0;
    gameState.battle.battleTime = 0;

    // 关闭模态框
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }

    // 返回军事界面的空闲视图
    document.getElementById('military-idle-view').style.display = 'block';
    document.getElementById('military-prep-view').style.display = 'none';
    document.getElementById('military-battle-view').style.display = 'none';
    updateMilitaryScreen();
}

// ========================================
// 区域导航
// ========================================
function switchToPreviousRegion() {
    const conqueredRegions = gameState.regions.filter(r => r.conquered).sort((a, b) => a.id - b.id);
    if (conqueredRegions.length === 0) return;

    const currentIndex = conqueredRegions.findIndex(r => r.id === gameState.currentRegionId);
    if (currentIndex === -1) return;

    const previousIndex = (currentIndex - 1 + conqueredRegions.length) % conqueredRegions.length;
    gameState.currentRegionId = conqueredRegions[previousIndex].id;

    // 强制重建区域界面
    const container = document.getElementById('buildings-list');
    if (container) container.innerHTML = '';

    showToast(`切换到 ${conqueredRegions[previousIndex].name}`, 'success');
    showScreen('region'); // 切换到区域界面
}

function switchToNextRegion() {
    const conqueredRegions = gameState.regions.filter(r => r.conquered).sort((a, b) => a.id - b.id);
    if (conqueredRegions.length === 0) return;

    const currentIndex = conqueredRegions.findIndex(r => r.id === gameState.currentRegionId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % conqueredRegions.length;
    gameState.currentRegionId = conqueredRegions[nextIndex].id;

    // 强制重建区域界面
    const container = document.getElementById('buildings-list');
    if (container) container.innerHTML = '';

    showToast(`切换到 ${conqueredRegions[nextIndex].name}`, 'success');
    showScreen('region'); // 切换到区域界面
}

// ========================================
// 建筑操作
// ========================================
function buildBuilding(buildingId) {
    const template = GameData.buildings[buildingId];
    const region = getCurrentRegion();

    if (!checkCanBuild(template)) {
        showToast('无法建造！', 'error');
        return;
    }

    // 检查槽位是否为空（兼容新旧系统）
    if (selectedSlotIndex !== null) {
        if (region.buildingSlots && region.buildingSlots[selectedSlotIndex]) {
            // 新系统：检查buildingSlots
            if (region.buildingSlots[selectedSlotIndex].building) {
                showToast('该槽位已有建筑！', 'error');
                return;
            }
        } else if (region.buildings[selectedSlotIndex]) {
            // 旧系统：检查buildings数组
            showToast('该槽位已有建筑！', 'error');
            return;
        }
    }

    // 消耗资源
    if (template.cost) {
        for (let [resource, amount] of Object.entries(template.cost)) {
            gameState.resources[resource].current -= amount;
        }
    }

    // 创建建筑
    const building = {
        id: gameState.buildingIdCounter++,
        buildingId: buildingId,
        active: true,
        regionId: region.id
    };

    // 如果是采矿建筑，处理资源分配
    if (template.category === 'mining') {
        // 新系统：如果槽位有资源属性，自动使用该资源
        if (selectedSlotIndex !== null && region.buildingSlots && region.buildingSlots[selectedSlotIndex]) {
            const slotProperty = region.buildingSlots[selectedSlotIndex].slotProperty;
            if (slotProperty && slotProperty.type === 'resource') {
                // 自动使用槽位的资源
                building.resourceType = slotProperty.resourceType;
                building.miningRate = template.rate;
            } else {
                showToast('该槽位没有资源！矿机只能建在资源槽上', 'error');
                // 退还资源
                if (template.cost) {
                    for (let [resource, amount] of Object.entries(template.cost)) {
                        gameState.resources[resource].current += amount;
                    }
                }
                return;
            }
        } else {
            // 旧系统：显示资源选择界面
            showResourceSelectionModal(building, template);
            return; // 等待玩家选择
        }
    }

    // 将建筑放到指定槽位或数组末尾
    if (selectedSlotIndex !== null) {
        // 新系统：同时更新buildingSlots和buildings
        if (region.buildingSlots && region.buildingSlots[selectedSlotIndex]) {
            region.buildingSlots[selectedSlotIndex].building = building;
        }
        region.buildings[selectedSlotIndex] = building;
    } else {
        region.buildings.push(building);
    }

    region.slotsUsed += template.slots;

    // 如果是仓库建筑，更新存储容量
    if (template.category === 'storage' && template.storageBonus) {
        updateStorageCapacity();
    }

    // 调试日志
    console.log(`[建造] ${template.name} 已建造在槽位 ${selectedSlotIndex !== null ? selectedSlotIndex : '末尾'}`);

    // 更新界面
    updateBuildScreen();
    renderBuildingsGrid4x4(); // 更新4x4网格
    showToast(`成功建造 ${template.name}！`, 'success');

    // 建造完成后返回区域界面
    if (selectedSlotIndex !== null) {
        selectedSlotIndex = null;
        showScreen('region');
    }
}

// 临时存储正在放置的矿机
let tempMinerBuilding = null;

function showResourceSelectionModal(building, template) {
    const region = getCurrentRegion();

    // 临时存储建筑信息
    tempMinerBuilding = building;

    // 获取所有可用的资源节点（只要还有剩余资源就可以选择）
    const availableNodes = [];
    region.resourceNodes.forEach((node, index) => {
        // 检查节点是否还有剩余资源
        if (node.amount <= 0) return;

        // 检查建筑是否支持这种资源
        if (template.allowedResources && template.allowedResources.includes(node.type)) {
            availableNodes.push({ node, index });
        }
    });

    if (availableNodes.length === 0) {
        showToast('没有可用的资源节点！', 'warning');
        // 返还资源
        if (template.cost) {
            for (let [resource, amount] of Object.entries(template.cost)) {
                gameState.resources[resource].current += amount;
            }
        }
        tempMinerBuilding = null;
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    let cardsHTML = '';
    availableNodes.forEach(({ node, index }) => {
        const item = GameData.items[node.type];
        cardsHTML += `
            <div class="resource-select-card" onclick="selectMinerResource(${index})">
                <div class="resource-select-name">${item.name}</div>
                <div class="resource-select-info">
                    <div>剩余: ${node.amount.toFixed(0)}</div>
                    <div>速率: ${node.rate}/秒</div>
                    <div>预计: ${(node.amount / node.rate / 60).toFixed(1)}分钟</div>
                </div>
            </div>
        `;
    });

    overlay.innerHTML = `
        <div class="modal-dialog resource-selection-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>选择采矿资源 - ${template.name}</h3>
                </div>
                <div class="modal-body">
                    <p>选择要采集的资源节点：</p>
                    <div class="resource-select-grid">
                        ${cardsHTML}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-cancel" onclick="cancelMinerPlacement()">取消</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 点击overlay关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cancelMinerPlacement();
        }
    });
}

function selectMinerResource(nodeIndex) {
    if (!tempMinerBuilding) return;

    const region = getCurrentRegion();
    const building = tempMinerBuilding;
    building.resourceNodeIndex = nodeIndex;

    const template = GameData.buildings[building.buildingId];

    // 将建筑放到指定槽位或数组末尾
    if (selectedSlotIndex !== null) {
        region.buildings[selectedSlotIndex] = building;
    } else {
        region.buildings.push(building);
    }

    region.slotsUsed += template.slots;

    const node = region.resourceNodes[nodeIndex];
    console.log(`[建造] ${template.name} 已建造在槽位 ${selectedSlotIndex !== null ? selectedSlotIndex : '末尾'}`);
    console.log(`  - 连接资源节点 [${nodeIndex}]: ${GameData.items[node.type].name}`);
    console.log(`  - 节点剩余: ${node.amount}`);
    console.log(`  - 生产速率: ${node.rate} × ${template.speed} = ${node.rate * template.speed}/秒`);

    updateBuildScreen();
    renderBuildingsGrid4x4(); // 更新4x4网格
    showToast(`成功建造 ${template.name}，采集 ${GameData.items[node.type].name}！`, 'success');

    tempMinerBuilding = null;

    // 建造完成后返回区域界面
    if (selectedSlotIndex !== null) {
        selectedSlotIndex = null;
        showScreen('region');
    }
    closeModal();
}

function cancelMinerPlacement() {
    if (!tempMinerBuilding) {
        closeModal();
        return;
    }

    // 返还资源
    const template = GameData.buildings[tempMinerBuilding.buildingId];
    if (template.cost) {
        for (let [resource, amount] of Object.entries(template.cost)) {
            gameState.resources[resource].current += amount;
        }
    }

    tempMinerBuilding = null;
    showToast('取消建造，资源已返还', 'info');
    closeModal();
}

function toggleBuilding(buildingId) {
    const region = getCurrentRegion();
    const building = region.buildings.find(b => b && b.id === buildingId);

    if (building) {
        building.active = !building.active;
        updateBuildingCardStatus(building);
        showToast(building.active ? '建筑已启用' : '建筑已暂停', 'info');
    }
}

async function removeBuilding(buildingId) {
    const confirmed = await showConfirm('确定要拆除这个建筑吗？');
    if (!confirmed) {
        return;
    }

    const region = getCurrentRegion();
    const buildingIndex = region.buildings.findIndex(b => b && b.id === buildingId);

    if (buildingIndex !== -1) {
        const building = region.buildings[buildingIndex];
        const template = GameData.buildings[building.buildingId];

        // 返还资源
        if (template.cost) {
            for (let [resource, amount] of Object.entries(template.cost)) {
                gameState.resources[resource].current += amount;
            }
        }

        // 将该槽位设置为null（保持槽位索引不变）
        region.buildings[buildingIndex] = null;
        region.slotsUsed -= template.slots;

        // 如果是仓库建筑，更新存储容量
        if (template.category === 'storage' && template.storageBonus) {
            updateStorageCapacity();
        }

        renderBuildingsGrid4x4(); // 重新渲染网格
        showToast('建筑已拆除，资源已返还！', 'info');
    }
}

// ========================================
// 科技研究系统
// ========================================
function startResearch(techId) {
    const tech = GameData.technologies[techId];
    if (!tech) {
        showToast('科技不存在！', 'error');
        return false;
    }

    // 检查是否已研究
    if (gameState.researchedTech.includes(techId)) {
        showToast('该科技已研究完成！', 'warning');
        return false;
    }

    // 检查前置科技
    if (tech.prerequisites && tech.prerequisites.length > 0) {
        for (let prereq of tech.prerequisites) {
            if (!gameState.researchedTech.includes(prereq)) {
                const prereqTech = GameData.technologies[prereq];
                showToast(`需要先研究: ${prereqTech.name}`, 'warning');
                return false;
            }
        }
    }

    // 设置当前研究
    gameState.currentResearch = techId;
    gameState.researchProgress = 0;
    showToast(`开始研究: ${tech.name}`, 'info');
    console.log(`✓ 开始研究: ${tech.name}`);
    updateTechScreen();
    return true;
}

function updateResearch(deltaTime) {
    if (!gameState.currentResearch) return;

    const tech = GameData.technologies[gameState.currentResearch];
    if (!tech) {
        gameState.currentResearch = null;
        return;
    }

    // 计算总研究速度（全局所有区域）
    let totalResearchSpeed = 0;
    gameState.regions.forEach(region => {
        region.buildings.forEach(building => {
            if (!building) return; // 跳过已删除的建筑
            const template = GameData.buildings[building.buildingId];
            if (template.category === 'science' && template.researchSpeed && building.active) {
                totalResearchSpeed += template.researchSpeed;
            }
        });
    });

    // 没有研究中心，无法研究
    if (totalResearchSpeed === 0) {
        return;
    }

    // Factorio-style consumption: check if we have enough for this tick
    const progressPerSecond = 1 / tech.researchTime;
    const tickProgress = progressPerSecond * deltaTime * totalResearchSpeed;

    // Calculate required science packs for this tick
    let canResearch = true;
    let limitingFactor = 1.0; // How much of the tick we can complete (0.0 to 1.0)

    for (let [scienceId, totalAmount] of Object.entries(tech.cost)) {
        const requiredThisTick = (totalAmount / tech.researchTime) * deltaTime * totalResearchSpeed;
        const available = gameState.resources[scienceId].current;

        if (available < requiredThisTick) {
            // Not enough for full tick - calculate what fraction we can do
            if (available <= 0.001) {
                // Effectively zero, can't research at all
                canResearch = false;
                break;
            }
            const fraction = available / requiredThisTick;
            limitingFactor = Math.min(limitingFactor, fraction);
        }
    }

    if (!canResearch) {
        // No science packs available, pause research
        return;
    }

    // Apply progress and consume science packs (scaled by limiting factor)
    gameState.researchProgress += tickProgress * limitingFactor;

    // Consume science packs proportionally
    for (let [scienceId, totalAmount] of Object.entries(tech.cost)) {
        const consumeRate = (totalAmount / tech.researchTime) * deltaTime * totalResearchSpeed * limitingFactor;
        gameState.resources[scienceId].current -= consumeRate;
        gameState.resources[scienceId].current = Math.max(0, gameState.resources[scienceId].current);
    }

    // 研究完成
    if (gameState.researchProgress >= 1.0) {
        completeResearch();
    }
}

function completeResearch() {
    const techId = gameState.currentResearch;
    const tech = GameData.technologies[techId];

    // 添加到已研究列表
    gameState.researchedTech.push(techId);

    // 重置研究状态
    gameState.currentResearch = null;
    gameState.researchProgress = 0;

    showToast(`✓ 研究完成: ${tech.name}`, 'success', 5000);
    console.log(`✓ 研究完成: ${tech.name}`);

    // 显示解锁内容
    if (tech.unlocks) {
        if (tech.unlocks.buildings && tech.unlocks.buildings.length > 0) {
            console.log(`  解锁建筑: ${tech.unlocks.buildings.join(', ')}`);
        }
        if (tech.unlocks.recipes && tech.unlocks.recipes.length > 0) {
            console.log(`  解锁配方: ${tech.unlocks.recipes.join(', ')}`);
        }
    }

    updateTechScreen();
    updateBuildScreen(); // 刷新建造界面（显示新解锁的建筑）
}

function isTechAvailable(techId) {
    const tech = GameData.technologies[techId];
    if (!tech) return false;

    // 已研究
    if (gameState.researchedTech.includes(techId)) return false;

    // 检查前置科技
    if (tech.prerequisites && tech.prerequisites.length > 0) {
        for (let prereq of tech.prerequisites) {
            if (!gameState.researchedTech.includes(prereq)) {
                return false;
            }
        }
    }

    return true;
}

function isTechResearched(techId) {
    return gameState.researchedTech.includes(techId);
}

// ========================================
// 游戏循环
// ========================================
let gameLoopCounter = 0;
function gameLoop(deltaTime) {
    // Grid-based battle logic for current region (only if game is initialized)
    if (gameState.regions && gameState.regions.length > 0) {
        const currentRegion = getCurrentRegion();
        if (currentRegion && !currentRegion.conquered) {
            processBattleGrid(currentRegion, deltaTime);
            healBugsIfNoCombat(currentRegion);

            // Update battle display if battle view is visible in military screen
            const battleView = document.getElementById('military-battle-view');
            if (battleView && battleView.style.display !== 'none' && gameLoopCounter % 2 === 0) {
                updateBattleGridValues(); // Use update instead of full render to prevent blinking
            }
        }
    }

    updateTime(deltaTime);
    produceResources(deltaTime);
    updateResearch(deltaTime);
    updateResourceDisplay();
    updateTimeDisplay();

    // 每秒更新一次统计和界面（每10个tick）
    if (gameLoopCounter % 10 === 0) {
        updateStatistics();

        // 更新生产统计（如果展开）
        const regionScreen = document.getElementById('region-screen');
        if (regionScreen && regionScreen.style.display !== 'none') {
            // 更新所有建筑卡片的状态和配方（不重建DOM）
            const region = getCurrentRegion();
            region.buildings.forEach(building => {
                if (!building) return; // 跳过已删除的建筑
                updateBuildingCardStatus(building);
            });

            // 如果生产统计是展开的，更新它
            const statsSection = document.getElementById('production-stats-section');
            if (statsSection && statsSection.style.display !== 'none') {
                updateProductionStats();
            }
        }

        // 更新科技界面（只更新数值，不重建DOM）
        const techScreen = document.getElementById('tech-screen');
        if (techScreen && techScreen.style.display !== 'none') {
            // 更新科研包数量
            updateTechScreenCounts();
            // 如果有正在研究的科技，更新研究进度
            if (gameState.currentResearch) {
                updateTechResearchProgress();
            }
        }

        // 更新军事界面（只更新数值，不重建DOM）
        const militaryScreen = document.getElementById('military-screen');
        if (militaryScreen && militaryScreen.style.display !== 'none') {
            updateMilitaryScreenCounts();
        }

        // 更新仓库界面（只更新数值，不重建DOM）
        const storageScreen = document.getElementById('storage-screen');
        if (storageScreen && storageScreen.style.display !== 'none') {
            updateStorageScreenCounts();
        }

        // 地图界面不需要每秒更新，只在打开时更新一次

        // Old battle screen disabled - now using grid-based battles
        // const battleScreen = document.getElementById('battle-screen');
        // if (battleScreen && battleScreen.style.display !== 'none') {
        //     updateBattleScreen();
        // }
    }

    // 每 10 秒打印一次调试信息
    gameLoopCounter++;
    if (gameLoopCounter % 100 === 0) {
        const region = getCurrentRegion();
        const buildingCount = region.buildings.filter(b => b !== null && b !== undefined).length;
        console.log(`[游戏循环] 运行中... 铁板: ${gameState.resources['iron-plate'].current.toFixed(2)}, 电力: ${gameState.resources['power'].current.toFixed(2)}, 建筑数: ${buildingCount}`);
    }
}

function updateTime(deltaTime) {
    const time = gameState.time;
    time.totalTime += deltaTime;
    time.timeRemaining -= deltaTime;

    // 游戏时钟：每秒增加10分钟
    time.clockTime += deltaTime * 10; // deltaTime是实际秒数，乘以10得到游戏内分钟
    if (time.clockTime >= 1440) {
        time.clockTime -= 1440; // 重置到新的一天（1440分钟 = 24小时）
    }

    if (time.timeRemaining <= 0) {
        time.isDay = !time.isDay;
        time.timeRemaining = time.isDay ? time.dayDuration : time.nightDuration;
    }
}

function produceResources(deltaTime) {
    // 计算总电力（遍历所有区域的建筑，因为电力是全局共享的）
    let totalPowerProduction = 0;
    let totalPowerConsumption = 0;

    // 先计算电力生产（所有区域）
    gameState.regions.forEach(r => {
        r.buildings.forEach(building => {
            if (!building) return; // 跳过已删除的建筑
            if (!building.active) return;

            const template = GameData.buildings[building.buildingId];

            if (template.category === 'power') {
                let production = template.powerProduction || 0;

                // 太阳能只在有光照时发电（5am-7pm）
                if (template.dayOnly && !hasSunlight()) {
                    production = 0;
                }

                // 风力发电：白天和夜晚不同功率
                if (template.id === 'wind-turbine' && template.powerProductionNight) {
                    production = gameState.time.isDay ? template.powerProduction : template.powerProductionNight;
                }

                // 检查燃料消耗
                if (template.fuelConsumption) {
                    // 初始化燃料进度
                    if (building.fuelProgress === undefined) {
                        building.fuelProgress = 0;
                    }

                    const progressBar = document.getElementById(`prog-${building.id}`);

                    let canRun = true;
                    for (let [fuel, rate] of Object.entries(template.fuelConsumption)) {
                        const needed = rate * deltaTime;
                        if (gameState.resources[fuel].current < needed) {
                            canRun = false;
                            break;
                        }
                    }

                    if (!canRun) {
                        // 不能工作：进度条置零
                        if (progressBar) progressBar.style.width = '0%';
                        building.fuelProgress = 0;
                    } else {
                        // 可以工作：更新进度
                        // 燃料消耗周期为1秒
                        const fuelCycleTime = 1.0;
                        const progressPerSecond = 1.0 / fuelCycleTime;

                        building.fuelProgress += progressPerSecond * deltaTime;

                        // 更新进度条
                        const progressWidth = `${Math.min(100, building.fuelProgress * 100)}%`;
                        if (progressBar) progressBar.style.width = progressWidth;

                        // 检查是否完成一个周期
                        if (building.fuelProgress >= 1.0) {
                            building.fuelProgress -= 1.0;
                        }

                        // 消耗燃料并生产电力
                        for (let [fuel, rate] of Object.entries(template.fuelConsumption)) {
                            gameState.resources[fuel].current -= rate * deltaTime;
                        }
                        totalPowerProduction += production * deltaTime;
                    }
                } else {
                    totalPowerProduction += production * deltaTime;
                }
            }
        });
    });

    // 计算电力消耗（所有区域，只有实际在工作的建筑才消耗电力）
    gameState.regions.forEach(r => {
        r.buildings.forEach(building => {
            if (!building) return; // 跳过已删除的建筑
            const template = GameData.buildings[building.buildingId];

            if (template.powerConsumption && isBuildingActuallyWorking(building, template)) {
                totalPowerConsumption += template.powerConsumption * deltaTime;
            }
        });
    });

    // 电力系统：计算生产/消耗平衡（每秒）
    const powerProductionRate = totalPowerProduction / deltaTime; // 转回每秒
    const powerConsumptionRate = totalPowerConsumption / deltaTime;

    // 保存到gameState供UI显示
    gameState.power.production = powerProductionRate;
    gameState.power.consumption = powerConsumptionRate;

    // 检查是否有电池建筑（用于储能）（遍历所有区域）
    let batteryCount = 0;
    gameState.regions.forEach(r => {
        batteryCount += r.buildings.filter(b =>
            b && b.active && GameData.buildings[b.buildingId].category === 'storage' &&
            GameData.buildings[b.buildingId].id === 'battery'
        ).length;
    });

    const hasBattery = batteryCount > 0;

    // 计算电力效率（根据供电比例）
    let powerEfficiency = 1.0;
    let powerSupplyRatio = powerConsumptionRate > 0 ? (powerProductionRate / powerConsumptionRate) : 1.0;

    if (powerSupplyRatio < 0.5) {
        // <50%: 完全停止
        powerEfficiency = 0.0;
    } else if (powerSupplyRatio < 0.75) {
        // 50-75%: 10%效率
        powerEfficiency = 0.1;
    } else if (powerSupplyRatio < 1.0) {
        // 75-100%: 50%效率
        powerEfficiency = 0.5;
    } else {
        // >=100%: 100%效率
        powerEfficiency = 1.0;
    }

    // 判断电力是否充足
    let hasPower = powerEfficiency > 0;

    if (hasBattery) {
        // 有电池：可以储能，使用旧逻辑
        gameState.resources['power'].current += totalPowerProduction - totalPowerConsumption;
        gameState.resources['power'].current = Math.max(0, Math.min(
            gameState.resources['power'].current,
            gameState.resources['power'].max
        ));
        hasPower = gameState.resources['power'].current > 0;
        powerEfficiency = hasPower ? 1.0 : 0.0; // 有电池时，要么满效率要么停止
    } else {
        // 无电池：实时生产消耗平衡
        // 显示实时功率（不储存，只显示当前平衡）
        gameState.resources['power'].current = Math.max(0, powerProductionRate - powerConsumptionRate);

        // 如果电力不足，记录警告和显示Toast
        if (powerEfficiency < 1.0 && totalPowerConsumption > 0) {
            if (gameLoopCounter % 50 === 0) {
                console.warn(`⚡ 电力供应 ${(powerSupplyRatio * 100).toFixed(1)}%！效率降至 ${(powerEfficiency * 100).toFixed(0)}%`);
            }
            // 显示警告Toast
            if (!gameState.powerWarningShown && gameLoopCounter > 10) {
                if (powerEfficiency === 0) {
                    showToast(`⚡ 电力严重不足！所有生产停止`, 'danger');
                } else {
                    showToast(`⚡ 电力不足！生产效率降至 ${(powerEfficiency * 100).toFixed(0)}%`, 'warning');
                }
                gameState.powerWarningShown = true;
            }
        } else {
            // 电力恢复时重置警告标志
            if (gameState.powerWarningShown) {
                gameState.powerWarningShown = false;
            }
        }
    }

    // 生产资源（遍历所有区域的建筑，因为资源是全局共享的）
    gameState.regions.forEach(region => {
        region.buildings.forEach(building => {
            if (!building) return; // 跳过已删除的建筑
            if (!building.active) return;

            const template = GameData.buildings[building.buildingId];

            // 采矿建筑
            if (template.category === 'mining') {
                // Try to find this building in buildingSlots (new system)
                let slotProperty = null;
                let resourceType = null;
                let miningRate = null;
                let remainingAmount = null;

                if (region.buildingSlots) {
                    const slotIndex = region.buildingSlots.findIndex(slot => slot.building && slot.building.id === building.id);
                    if (slotIndex >= 0 && region.buildingSlots[slotIndex].slotProperty) {
                        slotProperty = region.buildingSlots[slotIndex].slotProperty;
                        if (slotProperty.type === 'resource') {
                            resourceType = slotProperty.resourceType;
                            miningRate = slotProperty.miningRate;
                            remainingAmount = slotProperty.remainingAmount;
                        }
                    }
                }

                // Fallback to old system if slot property not found
                if (!slotProperty && building.resourceNodeIndex !== undefined) {
                    const node = region.resourceNodes[building.resourceNodeIndex];
                    resourceType = node.type;
                    miningRate = node.rate;
                    remainingAmount = node.amount;
                }

                // Skip if no resource found
                if (!resourceType) return;

            // Initialize mining progress
            if (building.miningProgress === undefined) {
                building.miningProgress = 0;
            }

            const progressBar = document.getElementById(`prog-${building.id}`);
            const slotProgressBar = document.getElementById(`slot-prog-${building.id}`);

            // 检查是否可以工作（电力、资源、输出空间）
            let canWork = true;

            // 检查电力
            if (!hasPower && template.powerConsumption) {
                canWork = false;
            }

            // 检查资源节点是否耗尽
            if (remainingAmount <= 0) {
                canWork = false;
            }

            // 检查输出空间是否满载
            const res = gameState.resources[resourceType];
            if (res && res.current >= res.max) {
                canWork = false;
            }

            if (!canWork) {
                // 不能工作：进度条置零，不更新进度
                if (progressBar) progressBar.style.width = '0%';
                if (slotProgressBar) slotProgressBar.style.width = '0%';
                building.miningProgress = 0;
                return;
            }

            // 可以工作：更新进度
            const miningCycleTime = 1.0;
            const efficiencyMultiplier = template.powerConsumption ? powerEfficiency : 1.0;
            const progressPerSecond = (1.0 / miningCycleTime) * efficiencyMultiplier;

            // Update mining progress
            building.miningProgress += progressPerSecond * deltaTime;

            // Update progress bars (both old and new UI)
            const progressWidth = `${Math.min(100, building.miningProgress * 100)}%`;
            if (progressBar) progressBar.style.width = progressWidth;
            if (slotProgressBar) slotProgressBar.style.width = progressWidth;

            // Check if mining cycle complete
            if (building.miningProgress >= 1.0) {
                // Produce one cycle's worth of resources (1 second worth)
                const produceAmount = miningRate * template.speed;
                const actualAmount = Math.min(produceAmount, remainingAmount);

                // Deduct from the appropriate source
                if (slotProperty) {
                    // New system: deduct from slot's remainingAmount
                    slotProperty.remainingAmount -= actualAmount;
                } else if (building.resourceNodeIndex !== undefined) {
                    // Old system: deduct from region's resourceNodes
                    region.resourceNodes[building.resourceNodeIndex].amount -= actualAmount;
                }

                gameState.resources[resourceType].current += actualAmount;
                gameState.resources[resourceType].current = Math.min(
                    gameState.resources[resourceType].current,
                    gameState.resources[resourceType].max
                );

                // Reset progress (subtract 1.0 to keep overflow)
                building.miningProgress -= 1.0;

                // VFX: Pulse the building card (disabled to reduce visual clutter)
                // pulseBuilding(building.id);
            }
        }

        // 生产建筑（熔炉、组装机、兵营、军工厂等）
        if ((template.category === 'production' || template.category === 'military') && building.recipeId) {
            const recipe = GameData.recipes[building.recipeId];
            if (!recipe) return;

            // 初始化生产进度
            if (building.productionProgress === undefined) {
                building.productionProgress = 0;
            }

            const progressBar = document.getElementById(`prog-${building.id}`);
            const slotProgressBar = document.getElementById(`slot-prog-${building.id}`);

            // 检查是否可以生产（电力、材料、输出空间）
            let canWork = true;

            // 检查电力
            if (!hasPower && template.powerConsumption) {
                canWork = false;
            }

            // 检查输入资源是否充足
            if (canWork) {
                for (let [ingredient, amount] of Object.entries(recipe.ingredients)) {
                    if (gameState.resources[ingredient].current < amount) {
                        canWork = false;
                        break;
                    }
                }
            }

            // 检查输出空间是否足够
            if (canWork) {
                for (let [result, amount] of Object.entries(recipe.results)) {
                    const res = gameState.resources[result];
                    if (res.current >= res.max) {
                        canWork = false;
                        break;
                    }
                }
            }

            if (!canWork) {
                // 不能工作：进度条置零，不更新进度
                if (progressBar) progressBar.style.width = '0%';
                if (slotProgressBar) slotProgressBar.style.width = '0%';
                building.productionProgress = 0;
                return;
            }

            // 可以工作：更新进度
            const productionSpeed = template.speed || 1.0;
            const recipeTime = recipe.time;
            const efficiencyMultiplier = template.powerConsumption ? powerEfficiency : 1.0;
            const progressPerSecond = (productionSpeed / recipeTime) * efficiencyMultiplier;

            // 累积生产进度
            building.productionProgress += progressPerSecond * deltaTime;

            // Update progress bars (both old and new UI)
            const progressWidth = `${Math.min(100, building.productionProgress * 100)}%`;
            if (progressBar) progressBar.style.width = progressWidth;
            if (slotProgressBar) slotProgressBar.style.width = progressWidth;

            // 检查是否完成一个生产周期
            if (building.productionProgress >= 1.0) {
                // 消耗输入资源
                for (let [ingredient, amount] of Object.entries(recipe.ingredients)) {
                    gameState.resources[ingredient].current -= amount;
                }

                // 产出结果资源
                for (let [result, amount] of Object.entries(recipe.results)) {
                    gameState.resources[result].current += amount;
                    gameState.resources[result].current = Math.min(
                        gameState.resources[result].current,
                        gameState.resources[result].max
                    );
                }

                // 重置进度（减去1.0保留溢出）
                building.productionProgress -= 1.0;

                // VFX: Pulse the building card (disabled to reduce visual clutter)
                // pulseBuilding(building.id);

                if (gameLoopCounter % 10 === 0) {
                    console.log(`[生产] ${template.name} 完成配方: ${recipe.name}`);
                }
            }
        }
        });
    });
}

// ========================================
// 生产统计更新
// ========================================
function updateStatistics() {
    const stats = gameState.statistics;

    // 重置统计数据
    stats.production = {};
    stats.consumption = {};
    stats.buildings = {};

    // 计算是否有足够电力
    const hasPower = gameState.power.production >= gameState.power.consumption;

    // 统计所有区域的建筑（资源、电力、仓储都是全局共享）
    gameState.regions.forEach(region => {
        // 统计建筑数量
        region.buildings.forEach(building => {
            if (!building) return; // 跳过已删除的建筑
            const template = GameData.buildings[building.buildingId];
            if (!stats.buildings[building.buildingId]) {
                stats.buildings[building.buildingId] = {
                    count: 0,
                    active: 0,
                    name: template.name
                };
            }
            stats.buildings[building.buildingId].count++;
            if (building.active) {
                stats.buildings[building.buildingId].active++;
            }
        });

        // 统计采矿建筑产出
        region.buildings.forEach(building => {
            if (!building) return; // 跳过已删除的建筑
            if (!building.active) return;

            const template = GameData.buildings[building.buildingId];

            if (template.category === 'mining') {
                if (!hasPower && template.powerConsumption) return;

                // Try to find this building in buildingSlots (new system)
                let resourceType = null;
                let miningRate = null;
                let remainingAmount = null;

                if (region.buildingSlots) {
                    const slotIndex = region.buildingSlots.findIndex(slot => slot.building && slot.building.id === building.id);
                    if (slotIndex >= 0 && region.buildingSlots[slotIndex].slotProperty) {
                        const slotProperty = region.buildingSlots[slotIndex].slotProperty;
                        if (slotProperty.type === 'resource') {
                            resourceType = slotProperty.resourceType;
                            miningRate = slotProperty.miningRate;
                            remainingAmount = slotProperty.remainingAmount;
                        }
                    }
                }

                // Fallback to old system if slot property not found
                if (!resourceType && building.resourceNodeIndex !== undefined) {
                    const node = region.resourceNodes[building.resourceNodeIndex];
                    resourceType = node.type;
                    miningRate = node.rate;
                    remainingAmount = node.amount;
                }

                if (!resourceType || remainingAmount <= 0) return;

                const produceRate = miningRate * template.speed;
                if (!stats.production[resourceType]) stats.production[resourceType] = 0;
                stats.production[resourceType] += produceRate;
            }
        });

        // 统计生产建筑的产出和消耗
        region.buildings.forEach(building => {
            if (!building) return; // 跳过已删除的建筑
            if (!building.active) return;

            const template = GameData.buildings[building.buildingId];
            if (!hasPower && template.powerConsumption) return;

            if (template.category === 'production' && building.recipeId) {
                const recipe = GameData.recipes[building.recipeId];
                if (!recipe) return;

                const productionSpeed = template.speed || 1.0;
                const cyclesPerSecond = productionSpeed / recipe.time;

                // 统计消耗
                for (let [ingredient, amount] of Object.entries(recipe.ingredients)) {
                    const consumeRate = amount * cyclesPerSecond;
                    if (!stats.consumption[ingredient]) stats.consumption[ingredient] = 0;
                    stats.consumption[ingredient] += consumeRate;
                }

                // 统计产出
                for (let [result, amount] of Object.entries(recipe.results)) {
                    const produceRate = amount * cyclesPerSecond;
                    if (!stats.production[result]) stats.production[result] = 0;
                    stats.production[result] += produceRate;
                }
            }
        });

        // 统计燃料消耗（发电站）
        region.buildings.forEach(building => {
            if (!building) return; // 跳过已删除的建筑
            if (!building.active) return;

            const template = GameData.buildings[building.buildingId];

            if (template.category === 'power' && template.fuelConsumption) {
                for (let [fuel, rate] of Object.entries(template.fuelConsumption)) {
                    if (!stats.consumption[fuel]) stats.consumption[fuel] = 0;
                    stats.consumption[fuel] += rate;
                }
            }
        });
    });

    stats.lastUpdateTime = Date.now();
}

// ========================================
// 工具函数
// ========================================
function getCurrentRegion() {
    return gameState.regions.find(r => r.id === gameState.currentRegionId);
}

// ========================================
// 主菜单系统
// ========================================

// 存储当前操作模式
let slotSelectMode = null; // 'new-game' | 'save-game'

// 开始新游戏 - 先选择槽位
function startNewGame() {
    slotSelectMode = 'new-game';
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('slot-select-menu').style.display = 'block';
    document.getElementById('slot-select-title').textContent = '选择存档槽位 - 新游戏';
    refreshSlotSelectMenu();
}

// 实际开始新游戏
function confirmNewGame(slotId) {
    console.log(`🎮 开始新游戏 - 槽位 ${slotId}`);

    // 初始化游戏状态
    const initialized = initializeGame();
    if (!initialized) {
        console.error('❌ Game initialization failed!');
        return;
    }

    // 保存到选定槽位
    saveToSlot(slotId);

    // 隐藏所有菜单
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('load-menu').style.display = 'none';
    document.getElementById('slot-select-menu').style.display = 'none';

    // 显示游戏界面
    document.getElementById('app').style.display = 'flex';

    // 切换到区域界面
    showScreen('region');

    // 更新所有界面
    updateRegionScreen();
    updateBuildScreen();
    updateTechScreen();
    updateStorageScreen();
    updateMapScreen();
    updateMilitaryScreen();

    showToast('欢迎来到扩张前线！', 'success', 3000);
}

// 显示读取存档菜单
function showLoadMenu() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('load-menu').style.display = 'block';
    refreshSaveSlots();
}

// 返回主菜单
function backToMainMenu() {
    document.getElementById('load-menu').style.display = 'none';
    const inGameMenu = document.getElementById('in-game-menu');
    if (inGameMenu) {
        inGameMenu.style.display = 'none';
    }
    document.getElementById('app').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
}

// 刷新存档槽位显示
function refreshSaveSlots() {
    const container = document.getElementById('save-slots-list');
    container.innerHTML = '';

    for (let slotId = 1; slotId <= 3; slotId++) {
        const saveInfo = getSaveSlotInfo(slotId);
        const slotDiv = document.createElement('div');
        slotDiv.className = 'save-slot';

        if (saveInfo) {
            const date = new Date(saveInfo.timestamp);
            const dateStr = date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            slotDiv.innerHTML = `
                <div class="save-slot-header">
                    <div class="save-slot-title">槽位 ${slotId}</div>
                    <div class="save-slot-date">${dateStr}</div>
                </div>
                <div class="save-slot-info">
                    <div>区域: ${saveInfo.metadata.regionName}</div>
                    <div>建筑: ${saveInfo.metadata.buildingCount} 座</div>
                    <div>科技: ${saveInfo.metadata.researchCount} 项</div>
                    <div>资源: ${Math.floor(saveInfo.metadata.totalResources)}</div>
                </div>
                <div class="save-slot-actions">
                    <button class="btn btn-primary" onclick="loadFromSlot(${slotId})">加载</button>
                    <button class="btn btn-danger" onclick="deleteSlot(${slotId})">删除</button>
                </div>
            `;
        } else {
            slotDiv.innerHTML = `
                <div class="save-slot-header">
                    <div class="save-slot-title">槽位 ${slotId}</div>
                </div>
                <div class="save-slot-empty">空槽位</div>
            `;
            slotDiv.style.opacity = '0.5';
        }

        container.appendChild(slotDiv);
    }
}

// 显示设置菜单（占位符）
function showSettings() {
    showToast('设置功能即将推出', 'info', 2000);
}

// 显示游戏内菜单
function showInGameMenu() {
    const menuDiv = document.getElementById('in-game-menu');
    if (!menuDiv) {
        // 创建游戏内菜单
        createInGameMenu();
    }

    document.getElementById('in-game-menu').style.display = 'flex';
}

// 隐藏游戏内菜单
function hideInGameMenu() {
    document.getElementById('in-game-menu').style.display = 'none';
}

// 创建游戏内菜单
function createInGameMenu() {
    const menuDiv = document.createElement('div');
    menuDiv.id = 'in-game-menu';
    menuDiv.className = 'main-menu';
    menuDiv.style.display = 'none';

    menuDiv.innerHTML = `
        <div class="main-menu-content">
            <h1 class="main-menu-title">游戏菜单</h1>

            <div class="main-menu-buttons">
                <button class="menu-btn menu-btn-primary" onclick="hideInGameMenu()">
                    <span class="menu-btn-icon">▶</span>
                    <span class="menu-btn-text">继续游戏</span>
                </button>

                <button class="menu-btn menu-btn-secondary" onclick="showInGameSaveMenu()">
                    <span class="menu-btn-icon">💾</span>
                    <span class="menu-btn-text">保存游戏</span>
                </button>

                <button class="menu-btn menu-btn-secondary" onclick="showInGameLoadMenu()">
                    <span class="menu-btn-icon">📂</span>
                    <span class="menu-btn-text">读取存档</span>
                </button>

                <button class="menu-btn menu-btn-tertiary" onclick="showSettings()">
                    <span class="menu-btn-icon">⚙️</span>
                    <span class="menu-btn-text">设置</span>
                </button>

                <button class="menu-btn menu-btn-danger" onclick="returnToMainMenu()">
                    <span class="menu-btn-icon">🚪</span>
                    <span class="menu-btn-text">返回主菜单</span>
                </button>
            </div>

            <div class="main-menu-footer">
                <p>按 ESC 关闭菜单</p>
            </div>
        </div>
    `;

    document.body.appendChild(menuDiv);
}

// 游戏内保存菜单
function showInGameSaveMenu() {
    slotSelectMode = 'save-game';
    hideInGameMenu();
    document.getElementById('slot-select-menu').style.display = 'block';
    document.getElementById('slot-select-title').textContent = '选择存档槽位 - 保存游戏';
    refreshSlotSelectMenu();
}

// 刷新槽位选择菜单
function refreshSlotSelectMenu() {
    const container = document.getElementById('slot-select-list');
    container.innerHTML = '';

    for (let slotId = 1; slotId <= 3; slotId++) {
        const saveInfo = getSaveSlotInfo(slotId);
        const slotDiv = document.createElement('div');
        slotDiv.className = 'save-slot';

        if (saveInfo) {
            const date = new Date(saveInfo.timestamp);
            const dateStr = date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            slotDiv.innerHTML = `
                <div class="save-slot-header">
                    <div class="save-slot-title">槽位 ${slotId}</div>
                    <div class="save-slot-date">${dateStr}</div>
                </div>
                <div class="save-slot-info">
                    <div>区域: ${saveInfo.metadata.regionName}</div>
                    <div>建筑: ${saveInfo.metadata.buildingCount} 座</div>
                    <div>科技: ${saveInfo.metadata.researchCount} 项</div>
                    <div>资源: ${Math.floor(saveInfo.metadata.totalResources)}</div>
                </div>
            `;

            if (slotSelectMode === 'save-game') {
                slotDiv.innerHTML += `
                    <div class="save-slot-actions">
                        <button class="btn btn-primary" onclick="confirmSaveToSlot(${slotId})">覆盖保存</button>
                    </div>
                `;
            } else if (slotSelectMode === 'new-game') {
                slotDiv.innerHTML += `
                    <div class="save-slot-actions">
                        <button class="btn btn-danger" onclick="confirmOverwriteNewGame(${slotId})">覆盖开始</button>
                    </div>
                `;
            }
        } else {
            slotDiv.innerHTML = `
                <div class="save-slot-header">
                    <div class="save-slot-title">槽位 ${slotId}</div>
                </div>
                <div class="save-slot-empty">空槽位</div>
            `;

            if (slotSelectMode === 'save-game') {
                slotDiv.innerHTML += `
                    <div class="save-slot-actions">
                        <button class="btn btn-primary" onclick="confirmSaveToSlot(${slotId})">保存</button>
                    </div>
                `;
            } else if (slotSelectMode === 'new-game') {
                slotDiv.innerHTML += `
                    <div class="save-slot-actions">
                        <button class="btn btn-primary" onclick="confirmNewGame(${slotId})">开始</button>
                    </div>
                `;
            }
        }

        container.appendChild(slotDiv);
    }
}

// 确认保存到槽位
function confirmSaveToSlot(slotId) {
    saveToSlot(slotId);
    document.getElementById('slot-select-menu').style.display = 'none';
}

// 确认覆盖并开始新游戏
function confirmOverwriteNewGame(slotId) {
    if (confirm(`槽位 ${slotId} 已有存档，是否覆盖？`)) {
        confirmNewGame(slotId);
    }
}

// 取消槽位选择
function cancelSlotSelect() {
    document.getElementById('slot-select-menu').style.display = 'none';

    if (slotSelectMode === 'new-game') {
        document.getElementById('main-menu').style.display = 'block';
    } else if (slotSelectMode === 'save-game') {
        showInGameMenu();
    }

    slotSelectMode = null;
}

// 游戏内读取菜单
function showInGameLoadMenu() {
    hideInGameMenu();
    showLoadMenu();
}

// 返回主菜单（从游戏中）
function returnToMainMenu() {
    if (confirm('确定要返回主菜单吗？请先保存游戏！')) {
        hideInGameMenu();
        document.getElementById('app').style.display = 'none';
        document.getElementById('main-menu').style.display = 'block';

        // 停止自动保存
        stopAutoSave();
    }
}

// ESC键监听
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const inGameMenu = document.getElementById('in-game-menu');
        const appVisible = document.getElementById('app').style.display !== 'none';

        if (appVisible) {
            if (inGameMenu && inGameMenu.style.display === 'flex') {
                hideInGameMenu();
            } else {
                showInGameMenu();
            }
        }
    }
});

// ========================================
// 启动游戏
// ========================================
let lastTime = Date.now();
let gameLoopStarted = false;
let isTabVisible = true;

// 使用 Page Visibility API 检测tab是否可见
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Tab不可见，暂停游戏
        isTabVisible = false;
        console.log('⏸ Tab不可见，游戏已暂停');
    } else {
        // Tab可见，恢复游戏
        isTabVisible = true;
        // 重置lastTime，避免deltaTime过大
        lastTime = Date.now();
        console.log('▶ Tab可见，游戏已恢复');
    }
});

async function startGame() {
    console.log('========================================');
    console.log('🎮 加载游戏数据...');
    console.log('========================================');

    // 加载数据
    const loaded = await loadGameData();
    if (!loaded) {
        console.error('❌ 数据加载失败，游戏无法启动');
        return;
    }
    console.log('✓ 数据加载成功');

    // 显示主菜单（不自动启动游戏）
    console.log('✓ 主菜单已准备就绪');

    // 启动游戏循环（但游戏状态还未初始化）
    if (!gameLoopStarted) {
        gameLoopStarted = true;

        setInterval(() => {
            // 只有在游戏界面显示且tab可见时才运行游戏循环
            if (document.getElementById('app').style.display !== 'none' && isTabVisible) {
                const now = Date.now();
                let deltaTime = (now - lastTime) / 1000;

                // 限制deltaTime最大值，防止tab切换回来时时间过大导致突然爆发
                // 最大允许0.5秒的deltaTime，超过则说明有问题（比如浏览器降频）
                if (deltaTime > 0.5) {
                    console.warn(`⚠️ deltaTime过大 (${deltaTime.toFixed(2)}s)，已限制为0.5s`);
                    deltaTime = 0.5;
                }

                lastTime = now;
                gameLoop(deltaTime);
            }
        }, 100);

        console.log('✓ 游戏循环已启动 (100ms/tick)');
        console.log('✓ Tab可见性检测已启用');
    }

    // 启动自动保存
    startAutoSave();

    console.log('========================================');
    console.log('💡 欢迎来到扩张前线！');
    console.log('   游戏会每10分钟自动保存到槽位1');
    console.log('========================================');
}

// ========================================
// 存档系统（3个存档槽位）
// ========================================
const SAVE_VERSION = '1.0.0';

// 获取存档槽位的key
function getSaveKey(slotId) {
    return `expansion_front_save_${slotId}`;
}

// 保存到指定槽位
function saveToSlot(slotId) {
    try {
        const region = getCurrentRegion();
        const saveData = {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            metadata: {
                regionName: region.name,
                regionId: gameState.currentRegionId,
                totalResources: Object.values(gameState.resources).reduce((sum, res) => sum + res.current, 0),
                buildingCount: region.buildings.filter(b => b !== null && b !== undefined).length,
                researchCount: gameState.researchedTech.length
            },
            gameState: {
                currentRegionId: gameState.currentRegionId,
                regions: gameState.regions,
                resources: gameState.resources,
                power: gameState.power,
                time: gameState.time,
                researchedTech: gameState.researchedTech,
                currentResearch: gameState.currentResearch,
                researchProgress: gameState.researchProgress,
                buildingIdCounter: gameState.buildingIdCounter
            }
        };

        localStorage.setItem(getSaveKey(slotId), JSON.stringify(saveData));
        showToast(`已保存到槽位 ${slotId}`, 'success');
        console.log(`✓ 游戏已保存到槽位 ${slotId}`);

        // 刷新存档列表显示
        if (document.getElementById('save-slots-list').style.display !== 'none') {
            refreshSaveSlots();
        }

        return true;
    } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败！', 'error');
        return false;
    }
}

// 快速保存到槽位1（用于自动保存）
function saveGame() {
    return saveToSlot(1);
}

// 从指定槽位加载
function loadFromSlot(slotId) {
    try {
        const data = localStorage.getItem(getSaveKey(slotId));
        if (!data) {
            showToast(`槽位 ${slotId} 无存档`, 'warning');
            return false;
        }

        const saveData = JSON.parse(data);

        // 版本检查
        if (saveData.version !== SAVE_VERSION) {
            console.warn('⚠ 存档版本不匹配:', saveData.version, '当前版本:', SAVE_VERSION);
            showToast('存档版本不匹配，无法加载', 'warning', 4000);
            return false;
        }

        // 恢复游戏状态
        gameState.currentRegionId = saveData.gameState.currentRegionId;
        gameState.regions = saveData.gameState.regions;
        gameState.resources = saveData.gameState.resources;
        gameState.power = saveData.gameState.power;
        gameState.time = saveData.gameState.time;
        gameState.researchedTech = saveData.gameState.researchedTech || [];
        gameState.currentResearch = saveData.gameState.currentResearch || null;
        gameState.researchProgress = saveData.gameState.researchProgress || 0;
        gameState.buildingIdCounter = saveData.gameState.buildingIdCounter;

        const saveDate = new Date(saveData.timestamp);
        showToast(`存档已加载 (${saveDate.toLocaleString()})`, 'success', 4000);
        console.log(`✓ 存档已从槽位 ${slotId} 加载`);

        // 隐藏所有菜单
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('load-menu').style.display = 'none';
        document.getElementById('slot-select-menu').style.display = 'none';

        // 显示游戏界面
        document.getElementById('app').style.display = 'flex';

        // 切换到区域界面
        showScreen('region');

        // 更新所有界面
        updateRegionScreen();
        updateBuildScreen();
        updateTechScreen();
        updateStorageScreen();
        updateMapScreen();
        updateMilitaryScreen();

        return true;
    } catch (error) {
        console.error('加载失败:', error);
        showToast('加载失败！', 'error');
        return false;
    }
}

// 删除指定槽位存档
function deleteSlot(slotId) {
    if (confirm(`确定要删除槽位 ${slotId} 的存档吗？此操作无法撤销！`)) {
        localStorage.removeItem(getSaveKey(slotId));
        showToast(`槽位 ${slotId} 已删除`, 'info');
        console.log(`✓ 槽位 ${slotId} 已删除`);
        refreshSaveSlots();
    }
}

// 获取存档槽位信息
function getSaveSlotInfo(slotId) {
    try {
        const data = localStorage.getItem(getSaveKey(slotId));
        if (!data) return null;

        const saveData = JSON.parse(data);
        return {
            slotId,
            timestamp: saveData.timestamp,
            metadata: saveData.metadata,
            version: saveData.version
        };
    } catch (error) {
        console.error(`读取槽位 ${slotId} 失败:`, error);
        return null;
    }
}

// 自动保存（每10分钟）
let autoSaveInterval = null;
function startAutoSave() {
    if (autoSaveInterval) return;

    autoSaveInterval = setInterval(() => {
        saveGame();
    }, 600000); // 10分钟 = 600,000毫秒

    console.log('✓ 自动保存已启动 (10分钟/次)');
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

// 页面加载完成后启动游戏
window.addEventListener('load', startGame);

// 页面关闭前自动保存
window.addEventListener('beforeunload', () => {
    saveGame();
});
