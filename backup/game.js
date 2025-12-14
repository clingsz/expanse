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
    const buildingCount = region.buildings.filter(b => b.buildingId === template.id).length;

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
        totalTime: 0
    },

    // 建筑ID计数器
    buildingIdCounter: 1
};

// ========================================
// 数据加载
// ========================================
async function loadGameData() {
    console.log('开始加载游戏数据...');

    try {
        const [items, buildings, recipes, technologies, units, enemies, regions] = await Promise.all([
            fetch('data/items.json').then(r => r.json()),
            fetch('data/buildings.json').then(r => r.json()),
            fetch('data/recipes.json').then(r => r.json()),
            fetch('data/technologies.json').then(r => r.json()),
            fetch('data/units.json').then(r => r.json()),
            fetch('data/enemies.json').then(r => r.json()),
            fetch('data/regions.json').then(r => r.json())
        ]);

        GameData.items = items.items;
        GameData.buildings = buildings.buildings;
        GameData.recipes = recipes.recipes;
        GameData.technologies = technologies.technologies;
        GameData.units = units.units;
        GameData.enemies = enemies.enemies;
        GameData.regionTemplates = regions.regions;
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
// 游戏初始化
// ========================================
function initializeGame() {
    console.log('初始化游戏状态...');

    // 初始化资源
    Object.entries(GameData.items).forEach(([id, item]) => {
        gameState.resources[id] = {
            current: 0,
            max: item.category === 'energy' ? 1000 : 500
        };
    });

    // 初始资源
    gameState.resources['iron-plate'].current = 50;
    gameState.resources['copper-plate'].current = 30;
    gameState.resources['coal'].current = 20;
    gameState.resources['stone'].current = 20; // 用于建造熔炉
    gameState.resources['iron-ore'].current = 30; // 用于测试冶炼
    gameState.resources['copper-ore'].current = 20; // 用于测试冶炼
    gameState.resources['power'].current = 0; // 无初始电力，必须建发电站

    // 初始化区域
    const region1Template = GameData.regionTemplates[0];
    gameState.regions = [{
        id: region1Template.id,
        name: region1Template.name,
        slotsTotal: region1Template.slotsTotal,
        slotsUsed: 0,
        resourceNodes: region1Template.resourceNodes.map(node => ({...node})),
        buildings: [],
        conquered: true
    }];

    console.log('游戏初始化完成！');
}

// ========================================
// 界面切换系统
// ========================================
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });

    document.getElementById(screenName + '-screen').style.display = 'flex';

    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // 更新主题颜色
    document.body.setAttribute('data-theme', screenName);

    if (screenName === 'region') {
        updateRegionScreen();
    } else if (screenName === 'build') {
        updateBuildScreen();
    }
}

// ========================================
// 区域界面更新
// ========================================
function updateRegionScreen() {
    const region = getCurrentRegion();

    document.getElementById('current-region-name').textContent = `区域 ${region.id}`;
    document.getElementById('region-name').textContent = region.name;
    document.getElementById('slots-used').textContent = region.slotsUsed.toFixed(1);
    document.getElementById('slots-total').textContent = region.slotsTotal;

    // 资源点显示
    const resourcePointsText = region.resourceNodes
        .map(node => `${GameData.items[node.type].name} × 1`)
        .join(', ');
    document.getElementById('resource-points').textContent = resourcePointsText;

    updateResourceDisplay();
    updateTimeDisplay();
    updateBuildingsList();
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

    // 电力显示（生产/消耗）
    const powerProductionEl = document.getElementById('power-production');
    const powerConsumptionEl = document.getElementById('power-consumption');
    const powerStatusItem = document.getElementById('power-status-item');

    if (powerProductionEl) powerProductionEl.textContent = gameState.power.production.toFixed(1);
    if (powerConsumptionEl) powerConsumptionEl.textContent = gameState.power.consumption.toFixed(1);

    // 根据电力比例设置颜色
    if (powerStatusItem) {
        powerStatusItem.classList.remove('power-good', 'power-warning', 'power-critical');

        if (gameState.power.consumption === 0) {
            // 无消耗时显示正常
            powerStatusItem.classList.add('power-good');
        } else {
            const ratio = gameState.power.production / gameState.power.consumption;
            if (ratio >= 1.0) {
                // 绿色：生产 >= 消耗
                powerStatusItem.classList.add('power-good');
            } else if (ratio >= 0.8) {
                // 黄色：生产在80%-99%之间
                powerStatusItem.classList.add('power-warning');
            } else {
                // 红色：生产 < 80%
                powerStatusItem.classList.add('power-critical');
            }
        }
    }
}

function updateTimeDisplay() {
    const time = gameState.time;
    const minutes = Math.floor(time.timeRemaining / 60);
    const seconds = Math.floor(time.timeRemaining % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    document.getElementById('time-of-day').textContent = time.isDay ? '白天' : '夜晚';
    document.getElementById('time-remaining').textContent = timeStr;
}

function updateBuildingsList() {
    const region = getCurrentRegion();
    const container = document.getElementById('buildings-list');

    if (region.buildings.length === 0) {
        container.innerHTML = '<div class="empty-message">暂无建筑，请前往建造界面建造</div>';
        return;
    }

    container.innerHTML = '';
    region.buildings.forEach(building => {
        const card = createBuildingCard(building);
        container.appendChild(card);
    });
}

function createBuildingCard(building) {
    const div = document.createElement('div');
    div.className = 'building-card-compact';
    div.onclick = () => showBuildingManageModal(building);

    const template = GameData.buildings[building.buildingId];

    // 检查建筑状态
    const statusInfo = getBuildingStatus(building, template);

    div.innerHTML = `
        <div class="building-card-compact-header">
            <span class="building-card-compact-name">${template.name}</span>
            <span class="building-status status-${statusInfo.status}">${statusInfo.text}</span>
        </div>
        <div class="building-card-compact-id">#${building.id}</div>
    `;

    return div;
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
    if (building.resourceNodeIndex !== undefined) {
        const node = getCurrentRegion().resourceNodes[building.resourceNodeIndex];

        if (node.amount <= 0) {
            status = 'disabled';
            text = '资源耗尽';
            return { status, text };
        }

        // 检查采矿建筑输出是否满载
        const res = gameState.resources[node.type];
        if (res && res.current >= res.max) {
            status = 'warning';
            text = '输出满载';
            return { status, text };
        }
    }

    // 检查燃料（发电站）
    if (template.fuelConsumption) {
        let hasFuel = true;
        for (let [fuel, rate] of Object.entries(template.fuelConsumption)) {
            if (gameState.resources[fuel].current < 1) {
                hasFuel = false;
                break;
            }
        }
        if (!hasFuel) {
            status = 'disabled';
            text = '缺燃料';
            return { status, text };
        }
    }

    return { status, text };
}

function showBuildingManageModal(building) {
    const template = GameData.buildings[building.buildingId];
    const statusInfo = getBuildingStatus(building, template);
    const region = getCurrentRegion();

    // 生成建筑详细信息
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

    // 资源节点信息
    let resourceNodeHTML = '';
    if (building.resourceNodeIndex !== undefined) {
        const node = region.resourceNodes[building.resourceNodeIndex];
        const itemName = GameData.items[node.type].name;
        const remaining = Math.floor(node.amount);
        resourceNodeHTML = `
            <div class="building-section">
                <h4>采集资源</h4>
                <div class="building-property">${itemName}: 剩余 ${remaining}</div>
                <div class="building-property">产出速度: ${node.rate * template.speed}/秒</div>
            </div>
        `;
    }

    // 配方信息
    let recipeHTML = '';
    let hasRecipeButton = false;
    if (building.recipeId) {
        const recipe = GameData.recipes[building.recipeId];
        const ingredientsText = Object.entries(recipe.ingredients)
            .map(([id, amount]) => `${GameData.items[id].name} ×${amount}`)
            .join(', ');
        const resultsText = Object.entries(recipe.results)
            .map(([id, amount]) => `${GameData.items[id].name} ×${amount}`)
            .join(', ');

        recipeHTML = `
            <div class="building-section">
                <h4>当前配方</h4>
                <div class="building-property">${recipe.name}</div>
                <div class="building-property">输入: ${ingredientsText}</div>
                <div class="building-property">输出: ${resultsText}</div>
                <div class="building-property">时间: ${recipe.time}秒</div>
                <div class="building-property">进度: ${Math.floor((building.productionProgress || 0) * 100)}%</div>
            </div>
        `;
        hasRecipeButton = true;
    } else if (template.category === 'production') {
        recipeHTML = `
            <div class="building-section">
                <h4>配方</h4>
                <div class="building-property-warning">未选择配方</div>
            </div>
        `;
        hasRecipeButton = true;
    }

    // 燃料信息
    let fuelHTML = '';
    if (template.fuelConsumption) {
        const fuelEntries = Object.entries(template.fuelConsumption);
        const fuelInfo = fuelEntries.map(([fuel, rate]) => {
            const fuelItem = GameData.items[fuel];
            const current = Math.floor(gameState.resources[fuel].current);
            return `<div class="building-property">${fuelItem.name}: ${rate}/秒 (库存: ${current})</div>`;
        }).join('');
        fuelHTML = `
            <div class="building-section">
                <h4>燃料消耗</h4>
                ${fuelInfo}
            </div>
        `;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content building-manage-modal">
                <div class="modal-header">
                    <h3>${template.name} #${building.id}</h3>
                    <span class="building-status status-${statusInfo.status}">${statusInfo.text}</span>
                </div>
                <div class="modal-body">
                    <div class="building-description">${template.description}</div>
                    <div class="building-properties">
                        ${detailsHTML}
                    </div>
                    ${resourceNodeHTML}
                    ${recipeHTML}
                    ${fuelHTML}
                </div>
                <div class="modal-actions">
                    ${hasRecipeButton ? '<button class="btn btn-confirm" id="select-recipe-btn">📋 选择配方</button>' : ''}
                    <button class="btn btn-warning" id="toggle-building-btn">
                        ${building.active ? '⏸ 暂停' : '▶ 启动'}
                    </button>
                    <button class="btn btn-danger" id="demolish-building-btn">🗑 拆除</button>
                    <button class="btn btn-cancel">取消</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const toggleBtn = overlay.querySelector('#toggle-building-btn');
    const demolishBtn = overlay.querySelector('#demolish-building-btn');
    const selectRecipeBtn = overlay.querySelector('#select-recipe-btn');
    const cancelBtn = overlay.querySelector('.btn-cancel');

    const cleanup = () => {
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

function showRecipeSelectionModal(building) {
    const template = GameData.buildings[building.buildingId];

    // Filter recipes that this building can produce
    const availableRecipes = Object.values(GameData.recipes).filter(recipe => {
        // Check if this building type can make this recipe
        if (!recipe.buildingTypes || !recipe.buildingTypes.includes(building.buildingId)) {
            return false;
        }

        // Check tech requirements (TODO: implement tech system, for now allow all)
        // if (recipe.requiresTech && !gameState.unlockedTechs.includes(recipe.requiresTech)) {
        //     return false;
        // }

        return true;
    });

    if (availableRecipes.length === 0) {
        showToast('该建筑没有可用的配方', 'warning');
        return;
    }

    // Create recipe cards HTML
    const recipesHTML = availableRecipes.map(recipe => {
        const ingredientsText = Object.entries(recipe.ingredients)
            .map(([id, amount]) => `${GameData.items[id].name} ×${amount}`)
            .join(' + ');
        const resultsText = Object.entries(recipe.results)
            .map(([id, amount]) => `${GameData.items[id].name} ×${amount}`)
            .join(' + ');

        const isSelected = building.recipeId === recipe.id;

        return `
            <div class="recipe-card ${isSelected ? 'selected' : ''}" data-recipe-id="${recipe.id}">
                <div class="recipe-card-header">
                    <h4>${recipe.name}</h4>
                    ${isSelected ? '<span class="recipe-selected-badge">当前配方</span>' : ''}
                </div>
                <div class="recipe-card-body">
                    <div class="recipe-ingredients">
                        <span class="recipe-label">输入:</span> ${ingredientsText}
                    </div>
                    <div class="recipe-arrow">→</div>
                    <div class="recipe-results">
                        <span class="recipe-label">输出:</span> ${resultsText}
                    </div>
                    <div class="recipe-time">
                        <span class="recipe-label">时间:</span> ${recipe.time}秒
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content recipe-selection-modal">
                <div class="modal-header">
                    <h3>选择配方 - ${template.name} #${building.id}</h3>
                </div>
                <div class="modal-body">
                    <div class="recipes-grid">
                        ${recipesHTML}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-cancel">取消</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('.btn-cancel');
    const recipeCards = overlay.querySelectorAll('.recipe-card');

    const cleanup = () => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 300);
    };

    // Add click handlers to recipe cards
    recipeCards.forEach(card => {
        card.addEventListener('click', () => {
            const recipeId = card.dataset.recipeId;
            building.recipeId = recipeId;
            building.productionProgress = 0; // Reset progress when changing recipe

            showToast(`已选择配方: ${GameData.recipes[recipeId].name}`, 'success');
            cleanup();

            // Reopen building manage modal to show the new recipe
            setTimeout(() => {
                showBuildingManageModal(building);
            }, 300);
        });
    });

    cancelBtn.addEventListener('click', () => {
        cleanup();
        // Reopen building manage modal
        setTimeout(() => {
            showBuildingManageModal(building);
        }, 300);
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cleanup();
            setTimeout(() => {
                showBuildingManageModal(building);
            }, 300);
        }
    });
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
    const region = getCurrentRegion();

    document.getElementById('build-region-name').textContent = `区域 ${region.id}`;
    document.getElementById('build-current-region').textContent = `区域 ${region.id}`;
    document.getElementById('build-slots-remaining').textContent = (region.slotsTotal - region.slotsUsed).toFixed(1);
    document.getElementById('build-slots-total').textContent = region.slotsTotal;

    renderBuildingCategory('mining-buildings', 'mining');
    renderBuildingCategory('production-buildings', 'production');
    renderBuildingCategory('power-buildings', 'power');
}

function renderBuildingCategory(containerId, category) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const buildings = Object.values(GameData.buildings)
        .filter(template => {
            // 过滤分类
            if (template.category !== category) return false;

            // 过滤未解锁的科技
            if (template.requiresTech && !gameState.researchedTech.includes(template.requiresTech)) {
                return false;
            }

            return true;
        });

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
// 建筑操作
// ========================================
function buildBuilding(buildingId) {
    const template = GameData.buildings[buildingId];
    const region = getCurrentRegion();

    if (!checkCanBuild(template)) {
        showToast('无法建造！', 'error');
        return;
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

    // 如果是采矿建筑，需要选择资源节点
    if (template.category === 'mining') {
        const nodeIndex = selectResourceNode(template);
        if (nodeIndex === -1) {
            showToast('没有可用的资源节点！', 'warning');
            // 返还资源
            if (template.cost) {
                for (let [resource, amount] of Object.entries(template.cost)) {
                    gameState.resources[resource].current += amount;
                }
            }
            return;
        }
        building.resourceNodeIndex = nodeIndex;
    }

    region.buildings.push(building);
    region.slotsUsed += template.slots;

    // 调试日志
    if (template.category === 'mining') {
        const node = region.resourceNodes[building.resourceNodeIndex];
        console.log(`[建造] ${template.name} 已建造`);
        console.log(`  - 连接资源节点 [${building.resourceNodeIndex}]: ${GameData.items[node.type].name}`);
        console.log(`  - 节点剩余: ${node.amount}`);
        console.log(`  - 生产速率: ${node.rate} × ${template.speed} = ${node.rate * template.speed}/秒`);
    }

    // 更新界面
    updateBuildScreen();
    updateBuildingsList(); // 更新建筑列表
    showToast(`成功建造 ${template.name}！`, 'success');
}

function selectResourceNode(buildingTemplate) {
    const region = getCurrentRegion();

    // 找到第一个未被使用且符合建筑要求的资源节点
    for (let i = 0; i < region.resourceNodes.length; i++) {
        const node = region.resourceNodes[i];

        // 检查节点是否已被占用
        const isUsed = region.buildings.some(b => b.resourceNodeIndex === i);
        if (isUsed) continue;

        // 检查建筑是否支持这种资源
        if (buildingTemplate.allowedResources &&
            buildingTemplate.allowedResources.includes(node.type)) {
            return i;
        }
    }

    return -1;
}

function toggleBuilding(buildingId) {
    const region = getCurrentRegion();
    const building = region.buildings.find(b => b.id === buildingId);

    if (building) {
        building.active = !building.active;
        updateBuildingsList();
    }
}

async function removeBuilding(buildingId) {
    const confirmed = await showConfirm('确定要拆除这个建筑吗？');
    if (!confirmed) {
        return;
    }

    const region = getCurrentRegion();
    const buildingIndex = region.buildings.findIndex(b => b.id === buildingId);

    if (buildingIndex !== -1) {
        const building = region.buildings[buildingIndex];
        const template = GameData.buildings[building.buildingId];

        // 返还资源
        if (template.cost) {
            for (let [resource, amount] of Object.entries(template.cost)) {
                gameState.resources[resource].current += amount;
            }
        }

        // 移除建筑
        region.buildings.splice(buildingIndex, 1);
        region.slotsUsed -= template.slots;

        updateBuildingsList();
        showToast('建筑已拆除，资源已返还！', 'info');
    }
}

// ========================================
// 游戏循环
// ========================================
let gameLoopCounter = 0;
function gameLoop(deltaTime) {
    updateTime(deltaTime);
    produceResources(deltaTime);
    updateResourceDisplay();
    updateTimeDisplay();

    // 每 10 秒打印一次调试信息
    gameLoopCounter++;
    if (gameLoopCounter % 100 === 0) {
        const region = getCurrentRegion();
        console.log(`[游戏循环] 运行中... 铁板: ${gameState.resources['iron-plate'].current.toFixed(2)}, 电力: ${gameState.resources['power'].current.toFixed(2)}, 建筑数: ${region.buildings.length}`);
    }
}

function updateTime(deltaTime) {
    const time = gameState.time;
    time.totalTime += deltaTime;
    time.timeRemaining -= deltaTime;

    if (time.timeRemaining <= 0) {
        time.isDay = !time.isDay;
        time.timeRemaining = time.isDay ? time.dayDuration : time.nightDuration;
    }
}

function produceResources(deltaTime) {
    const region = getCurrentRegion();

    // 计算总电力
    let totalPowerProduction = 0;
    let totalPowerConsumption = 0;

    // 先计算电力生产
    region.buildings.forEach(building => {
        if (!building.active) return;

        const template = GameData.buildings[building.buildingId];

        if (template.category === 'power') {
            let production = template.powerProduction || 0;

            // 太阳能只在白天发电
            if (template.dayOnly && !gameState.time.isDay) {
                production = 0;
            }

            // 风力发电：白天和夜晚不同功率
            if (template.id === 'wind-turbine' && template.powerProductionNight) {
                production = gameState.time.isDay ? template.powerProduction : template.powerProductionNight;
            }

            // 检查燃料消耗
            if (template.fuelConsumption) {
                let canRun = true;
                for (let [fuel, rate] of Object.entries(template.fuelConsumption)) {
                    const needed = rate * deltaTime;
                    if (gameState.resources[fuel].current < needed) {
                        canRun = false;
                        break;
                    }
                }

                if (canRun) {
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

    // 计算电力消耗
    region.buildings.forEach(building => {
        if (!building.active) return;

        const template = GameData.buildings[building.buildingId];

        if (template.powerConsumption) {
            totalPowerConsumption += template.powerConsumption * deltaTime;
        }
    });

    // 电力系统：计算生产/消耗平衡（每秒）
    const powerProductionRate = totalPowerProduction / deltaTime; // 转回每秒
    const powerConsumptionRate = totalPowerConsumption / deltaTime;

    // 保存到gameState供UI显示
    gameState.power.production = powerProductionRate;
    gameState.power.consumption = powerConsumptionRate;

    // 检查是否有电池建筑（用于储能）
    const batteryCount = region.buildings.filter(b =>
        b.active && GameData.buildings[b.buildingId].category === 'storage' &&
        GameData.buildings[b.buildingId].id === 'battery'
    ).length;

    const hasBattery = batteryCount > 0;

    // 判断电力是否充足
    let hasPower = false;

    if (hasBattery) {
        // 有电池：可以储能，使用旧逻辑
        gameState.resources['power'].current += totalPowerProduction - totalPowerConsumption;
        gameState.resources['power'].current = Math.max(0, Math.min(
            gameState.resources['power'].current,
            gameState.resources['power'].max
        ));
        hasPower = gameState.resources['power'].current > 0;
    } else {
        // 无电池：实时生产消耗平衡
        hasPower = powerProductionRate >= powerConsumptionRate;

        // 显示实时功率（不储存，只显示当前平衡）
        gameState.resources['power'].current = Math.max(0, powerProductionRate - powerConsumptionRate);

        // 如果电力不足，记录警告和显示Toast
        if (!hasPower && totalPowerConsumption > 0) {
            if (gameLoopCounter % 50 === 0) {
                console.warn(`⚡ 电力不足！需要: ${powerConsumptionRate.toFixed(1)}/秒, 生产: ${powerProductionRate.toFixed(1)}/秒`);
            }
            // 第一次电力不足时显示警告Toast
            if (!gameState.powerWarningShown && gameLoopCounter > 10) {
                showToast(`⚡ 电力不足！需要 ${powerConsumptionRate.toFixed(1)}/秒，但只生产 ${powerProductionRate.toFixed(1)}/秒`, 'warning');
                gameState.powerWarningShown = true;
            }
        } else {
            // 电力恢复时重置警告标志
            if (gameState.powerWarningShown) {
                gameState.powerWarningShown = false;
            }
        }
    }

    // 生产资源
    region.buildings.forEach(building => {
        if (!building.active) return;

        const template = GameData.buildings[building.buildingId];

        // 采矿建筑
        if (template.category === 'mining' && building.resourceNodeIndex !== undefined) {
            if (!hasPower && template.powerConsumption) {
                if (gameLoopCounter === 1) console.log(`[矿机] 电力不足，停止工作`);
                return;
            }

            const node = region.resourceNodes[building.resourceNodeIndex];
            if (node.amount <= 0) {
                if (gameLoopCounter === 1) console.log(`[矿机] 资源节点已耗尽`);
                return;
            }

            const produceAmount = node.rate * template.speed * deltaTime;
            const actualAmount = Math.min(produceAmount, node.amount);

            if (gameLoopCounter === 1) {
                console.log(`[矿机] 开始生产 - 资源类型: ${node.type}, 速率: ${node.rate}, 速度: ${template.speed}, 每tick产出: ${produceAmount}`);
            }

            node.amount -= actualAmount;
            gameState.resources[node.type].current += actualAmount;
            gameState.resources[node.type].current = Math.min(
                gameState.resources[node.type].current,
                gameState.resources[node.type].max
            );
        }

        // 生产建筑（熔炉、组装机等）
        if (template.category === 'production' && building.recipeId) {
            if (!hasPower && template.powerConsumption) {
                return; // 电力不足，停止生产
            }

            const recipe = GameData.recipes[building.recipeId];
            if (!recipe) return;

            // 初始化生产进度
            if (building.productionProgress === undefined) {
                building.productionProgress = 0;
            }

            // 计算生产速度（建筑速度 × 配方时间）
            const productionSpeed = template.speed || 1.0;
            const recipeTime = recipe.time;
            const progressPerSecond = productionSpeed / recipeTime;

            // 累积生产进度
            building.productionProgress += progressPerSecond * deltaTime;

            // 检查是否完成一个生产周期
            if (building.productionProgress >= 1.0) {
                // 检查输入资源是否充足
                let canProduce = true;
                for (let [ingredient, amount] of Object.entries(recipe.ingredients)) {
                    if (gameState.resources[ingredient].current < amount) {
                        canProduce = false;
                        break;
                    }
                }

                if (canProduce) {
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

                    // 重置进度
                    building.productionProgress -= 1.0;

                    if (gameLoopCounter % 10 === 0) {
                        console.log(`[生产] ${template.name} 完成配方: ${recipe.name}`);
                    }
                } else {
                    // 资源不足，暂停进度
                    building.productionProgress = 0;
                }
            }
        }
    });
}

// ========================================
// 工具函数
// ========================================
function getCurrentRegion() {
    return gameState.regions.find(r => r.id === gameState.currentRegionId);
}

// ========================================
// 启动游戏
// ========================================
let lastTime = Date.now();

async function startGame() {
    console.log('========================================');
    console.log('🎮 启动游戏...');
    console.log('========================================');

    // 加载数据
    const loaded = await loadGameData();
    if (!loaded) {
        console.error('❌ 数据加载失败，游戏无法启动');
        return;
    }
    console.log('✓ 数据加载成功');

    // 初始化游戏
    initializeGame();
    console.log('✓ 游戏初始化完成');
    console.log(`  初始铁板: ${gameState.resources['iron-plate'].current}`);
    console.log(`  初始电力: ${gameState.resources['power'].current}`);

    // 更新界面
    updateRegionScreen();
    console.log('✓ 界面更新完成');

    // 设置初始主题颜色
    document.body.setAttribute('data-theme', 'region');

    // 启动游戏循环
    setInterval(() => {
        const now = Date.now();
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        gameLoop(deltaTime);
    }, 100);

    console.log('✓ 游戏循环已启动 (100ms/tick)');
    console.log('========================================');
    console.log('💡 现在可以建造矿机了！');
    console.log('   打开浏览器控制台查看生产日志');
    console.log('========================================');
}

// 页面加载完成后启动游戏
window.addEventListener('load', startGame);
