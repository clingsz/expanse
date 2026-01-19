// ============================================================
// EXPANSE - Idle Number Game
// Version 3.0 - Widescreen Layout
// ============================================================

'use strict';

// ===== GAME DATA (loaded from data.json) =====
let GameData = {
    buildings: {},
    resources: {},
    technologies: {},
    enemies: {}
};

// ===== GAME STATE =====
let gameState = {
    resources: {},      // { "iron-ore": { current: 0, max: 500 }, ... }
    buildings: {},      // { "miner-iron": 0, "furnace-iron-plate": 0, ... }
    base: {
        hp: 1000,
        maxHp: 1000,
        energyGeneration: 10  // passive energy/sec from base
    },
    combat: {
        inBattle: false,
        playerUnits: [],  // [{ type, count, hp, maxHp, attack }, ...]
        enemyUnits: [],   // [{ type, count, hp, maxHp, attack }, ...]
        log: []
    },
    threat: {
        level: 0,
        timer: 60,
        timerMax: 60,
        minThreshold: 2
    },
    research: {
        completed: []
    },
    stats: {
        totalProduction: {},
        totalConsumption: {}
    }
};

// ===== CONSTANTS =====
const TICK_RATE = 500;
const TICK_SECONDS = TICK_RATE / 1000;

// ===== UI STATE =====
let currentTab = 'buildings';
let selectedBuilding = null;
let selectedResearch = null;
let selectedResource = null;
let selectedUnit = null;  // { type: 'player' | 'enemy', index: number }
let gameLoopInterval = null;
let lastTickTime = Date.now();

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
    console.log('Initializing Expanse...');

    await loadGameData();
    initializeGameState();
    setupEventListeners();
    renderCurrentTab();
    updateInfoPanel();
    updateStatusPanel();

    gameLoopInterval = setInterval(gameLoop, TICK_RATE);

    console.log('Expanse initialized!');
}

async function loadGameData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        GameData = data;
        console.log('Game data loaded:', Object.keys(GameData));
    } catch (error) {
        console.error('Failed to load game data:', error);
        initializeDefaultData();
    }
}

function initializeDefaultData() {
    GameData = {
        resources: {
            "iron-ore": { id: "iron-ore", name: "铁矿", category: "raw", baseStorage: 500 },
            "stone": { id: "stone", name: "石材", category: "raw", baseStorage: 500 },
            "energy": { id: "energy", name: "电力", category: "energy", baseStorage: 500 },
            "space": { id: "space", name: "空间", category: "meta", baseStorage: 10 }
        },
        buildings: {
            "miner-iron": {
                id: "miner-iron", name: "铁矿机", category: "mining",
                spaceCost: 1, buildCost: { "stone": 5 },
                consumes: { "energy": 1 }, produces: { "iron-ore": 2 },
                cycleTime: 0.5, requiresTech: null
            }
        },
        technologies: {},
        enemies: {}
    };
}

function initializeGameState() {
    for (const [id, data] of Object.entries(GameData.resources)) {
        gameState.resources[id] = {
            current: 0,
            max: data.baseStorage || 500
        };
    }

    if (gameState.resources['space']) {
        gameState.resources['space'].current = 0;
        gameState.resources['space'].max = 10;
    }

    if (gameState.resources['stone']) gameState.resources['stone'].current = 50;
    if (gameState.resources['energy']) gameState.resources['energy'].current = 100;

    for (const id of Object.keys(GameData.buildings)) {
        gameState.buildings[id] = 0;
    }

    for (const id of Object.keys(GameData.resources)) {
        gameState.stats.totalProduction[id] = 0;
        gameState.stats.totalConsumption[id] = 0;
    }

    console.log('Game state initialized');
}

// ============================================================
// GAME LOOP
// ============================================================

function gameLoop() {
    const now = Date.now();
    const dt = (now - lastTickTime) / 1000;
    lastTickTime = now;

    resetTickStats();

    // Base energy generation
    addResource('energy', gameState.base.energyGeneration * dt);
    gameState.stats.totalProduction['energy'] = (gameState.stats.totalProduction['energy'] || 0) + gameState.base.energyGeneration;

    processBuildings(dt);
    updateThreat(dt);

    if (gameState.combat.inBattle) {
        processCombat(dt);
    }

    // Only update status panel (left sidebar) - always safe
    updateStatusPanel();

    // Use incremental updates instead of full re-render
    if (currentTab === 'resources') {
        updateResourceBoxes();  // Only update values, not structure
    } else if (currentTab === 'battle') {
        updateBattleDisplay();  // Only update battle-specific values
    } else if (currentTab === 'buildings') {
        updateBuildingBoxes();  // Only update counts
    }

    // Update info panel values only (not structure)
    updateInfoPanelValues();
}

function resetTickStats() {
    for (const id of Object.keys(gameState.stats.totalProduction)) {
        gameState.stats.totalProduction[id] = 0;
        gameState.stats.totalConsumption[id] = 0;
    }
}

// ============================================================
// RESOURCE SYSTEM
// ============================================================

function getResource(id) {
    return gameState.resources[id]?.current || 0;
}

function getResourceMax(id) {
    return gameState.resources[id]?.max || 0;
}

function addResource(id, amount) {
    if (!gameState.resources[id]) return false;
    gameState.resources[id].current = Math.min(
        gameState.resources[id].current + amount,
        gameState.resources[id].max
    );
    return true;
}

function removeResource(id, amount) {
    if (!gameState.resources[id]) return false;
    if (gameState.resources[id].current < amount) return false;
    gameState.resources[id].current -= amount;
    return true;
}

function canAfford(cost) {
    for (const [id, amount] of Object.entries(cost)) {
        if (getResource(id) < amount) return false;
    }
    return true;
}

function spendResources(cost) {
    if (!canAfford(cost)) return false;
    for (const [id, amount] of Object.entries(cost)) {
        removeResource(id, amount);
    }
    return true;
}

function getSpaceUsed() {
    let used = 0;
    for (const [id, count] of Object.entries(gameState.buildings)) {
        const building = GameData.buildings[id];
        if (building) {
            used += (building.spaceCost || 0) * count;
        }
    }
    return used;
}

function getSpaceMax() {
    return gameState.resources['space']?.max || 10;
}

function getSpaceAvailable() {
    return getSpaceMax() - getSpaceUsed();
}

function getProductionRate(resourceId) {
    return gameState.stats.totalProduction[resourceId] || 0;
}

function getConsumptionRate(resourceId) {
    return gameState.stats.totalConsumption[resourceId] || 0;
}

function getNetRate(resourceId) {
    return getProductionRate(resourceId) - getConsumptionRate(resourceId);
}

// ============================================================
// BUILDING SYSTEM
// ============================================================

function getBuildingCount(id) {
    return gameState.buildings[id] || 0;
}

function canBuildBuilding(id) {
    const building = GameData.buildings[id];
    if (!building) return { can: false, reason: '未知建筑' };

    if (building.requiresTech && !gameState.research.completed.includes(building.requiresTech)) {
        return { can: false, reason: '需要科技' };
    }

    if (building.spaceCost > 0 && getSpaceAvailable() < building.spaceCost) {
        return { can: false, reason: '空间不足' };
    }

    if (!canAfford(building.buildCost)) {
        return { can: false, reason: '资源不足' };
    }

    return { can: true, reason: '' };
}

function buildBuilding(id) {
    const check = canBuildBuilding(id);
    if (!check.can) {
        showToast(check.reason, 'error');
        return false;
    }

    const building = GameData.buildings[id];
    spendResources(building.buildCost);
    gameState.buildings[id] = (gameState.buildings[id] || 0) + 1;

    if (building.special === 'expander') {
        gameState.resources['space'].max += building.expandAmount || 5;
        gameState.threat.level += building.threatIncrease || 1;
    }

    showToast(`已建造 ${building.name}！`, 'success');
    renderCurrentTab();
    updateInfoPanel();
    return true;
}

function removeBuilding(id) {
    const count = getBuildingCount(id);
    if (count <= 0) {
        showToast('没有建筑可拆除', 'error');
        return false;
    }

    const building = GameData.buildings[id];
    if (!building) return false;

    gameState.buildings[id] = count - 1;

    if (building.special === 'expander') {
        gameState.resources['space'].max -= building.expandAmount || 5;
        gameState.threat.level = Math.max(0, gameState.threat.level - (building.threatIncrease || 1));
    }

    for (const [resourceId, amount] of Object.entries(building.buildCost || {})) {
        addResource(resourceId, Math.floor(amount * 0.5));
    }

    showToast(`已拆除 ${building.name} (返还50%)`, 'info');
    renderCurrentTab();
    updateInfoPanel();
    return true;
}

function processBuildings(dt) {
    for (const [id, count] of Object.entries(gameState.buildings)) {
        if (count <= 0) continue;

        const building = GameData.buildings[id];
        if (!building) continue;
        if (!building.produces || Object.keys(building.produces).length === 0) continue;

        const cycleTime = building.cycleTime || 0.5;
        const cyclesPerSecond = 1 / cycleTime;
        const productionMultiplier = dt * cyclesPerSecond * count;

        let canProduce = true;
        const consumeAmounts = {};

        for (const [resourceId, amount] of Object.entries(building.consumes || {})) {
            const needed = amount * productionMultiplier;
            consumeAmounts[resourceId] = needed;
            if (getResource(resourceId) < needed) {
                canProduce = false;
            }
        }

        for (const [resourceId, amount] of Object.entries(building.produces)) {
            if (getResource(resourceId) >= getResourceMax(resourceId)) {
                canProduce = false;
            }
        }

        if (!canProduce) continue;

        for (const [resourceId, amount] of Object.entries(consumeAmounts)) {
            removeResource(resourceId, amount);
            gameState.stats.totalConsumption[resourceId] = (gameState.stats.totalConsumption[resourceId] || 0) + (amount / dt);
        }

        for (const [resourceId, amount] of Object.entries(building.produces)) {
            const produced = amount * productionMultiplier;
            addResource(resourceId, produced);
            gameState.stats.totalProduction[resourceId] = (gameState.stats.totalProduction[resourceId] || 0) + (produced / dt);
        }
    }
}

// ============================================================
// THREAT & COMBAT SYSTEM
// ============================================================

function updateThreat(dt) {
    if (gameState.threat.level < gameState.threat.minThreshold) {
        return;
    }

    gameState.threat.timer -= dt;

    if (gameState.threat.timer <= 0) {
        spawnEnemyWave();
        gameState.threat.timerMax = Math.max(30, 60 - gameState.threat.level * 5);
        gameState.threat.timer = gameState.threat.timerMax;
    }
}

function spawnEnemyWave() {
    const waveStrength = gameState.threat.level * 10;
    const bugCount = Math.floor(waveStrength / 5);

    gameState.combat.enemyUnits = [{
        type: 'basic-bug',
        name: '小虫',
        count: bugCount,
        hp: 50 * bugCount,
        maxHp: 50 * bugCount,
        attack: 10 * bugCount
    }];

    gameState.combat.inBattle = true;
    gameState.combat.log = [`第${gameState.threat.level}波来袭！${bugCount}只虫子进攻！`];

    showToast(`敌人来袭！`, 'warning');
}

function processCombat(dt) {
    if (!gameState.combat.inBattle) return;

    const playerAttack = getPlayerAttackPower();
    const enemyAttack = getEnemyAttackPower();

    const playerDamage = playerAttack * dt;
    const enemyDamage = enemyAttack * dt;

    if (gameState.combat.enemyUnits.length > 0) {
        const target = gameState.combat.enemyUnits[0];
        target.hp -= playerDamage;

        if (target.hp <= 0) {
            gameState.combat.log.push(`消灭了 ${target.name}！`);
            gameState.combat.enemyUnits.shift();
        }
    }

    applyDamageToPlayer(enemyDamage);

    if (gameState.combat.enemyUnits.length === 0) {
        gameState.combat.inBattle = false;
        gameState.combat.log.push('胜利！敌人已被击退！');
        showToast('战斗胜利！', 'success');
    }

    if (gameState.base.hp <= 0) {
        gameOver();
    }
}

function getPlayerAttackPower() {
    let power = 0;
    for (const unit of gameState.combat.playerUnits) {
        if (unit.hp > 0) {
            power += unit.attack * unit.count;
        }
    }
    return power;
}

function getEnemyAttackPower() {
    let power = 0;
    for (const unit of gameState.combat.enemyUnits) {
        if (unit.hp > 0) {
            power += unit.attack;
        }
    }
    return power;
}

function applyDamageToPlayer(damage) {
    let remainingDamage = damage;

    for (const unit of gameState.combat.playerUnits) {
        if (remainingDamage <= 0) break;
        if (unit.hp <= 0) continue;

        const absorbed = Math.min(unit.hp, remainingDamage);
        unit.hp -= absorbed;
        remainingDamage -= absorbed;

        if (unit.hp <= 0) {
            gameState.combat.log.push(`失去了 ${unit.name}！`);
        }
    }

    if (remainingDamage > 0) {
        gameState.base.hp -= remainingDamage;
    }
}

function gameOver() {
    clearInterval(gameLoopInterval);
    gameState.combat.log.push('基地被摧毁！游戏结束！');
    showToast('游戏结束 - 基地被摧毁！', 'error');

    const modal = document.getElementById('game-over-modal');
    if (modal) modal.style.display = 'flex';
}

function restartGame() {
    location.reload();
}

// ============================================================
// RESEARCH SYSTEM
// ============================================================

function unlockResearch(id) {
    const tech = GameData.technologies[id];
    if (!tech) return false;

    if (gameState.research.completed.includes(id)) {
        showToast('该科技已研究完成', 'info');
        return false;
    }

    for (const prereq of (tech.prerequisites || [])) {
        if (!gameState.research.completed.includes(prereq)) {
            showToast('需要先完成前置研究', 'error');
            return false;
        }
    }

    if (!canAfford(tech.cost || {})) {
        showToast('科研包不足', 'error');
        return false;
    }

    spendResources(tech.cost || {});
    gameState.research.completed.push(id);
    showToast(`研究完成: ${tech.name}！`, 'success');
    renderCurrentTab();
    updateInfoPanel();
    return true;
}

// ============================================================
// UI SYSTEM
// ============================================================

function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    currentTab = tab;

    // Reset selection when switching tabs
    if (tab === 'buildings') {
        selectedResource = null;
        selectedUnit = null;
        if (!selectedBuilding && Object.keys(GameData.buildings).length > 0) {
            selectedBuilding = Object.keys(GameData.buildings)[0];
        }
    } else if (tab === 'resources') {
        selectedBuilding = null;
        selectedUnit = null;
        if (!selectedResource && Object.keys(GameData.resources).length > 0) {
            selectedResource = Object.keys(GameData.resources)[0];
        }
    } else if (tab === 'battle') {
        selectedBuilding = null;
        selectedResource = null;
    } else if (tab === 'research') {
        selectedBuilding = null;
        selectedResource = null;
        selectedUnit = null;
        if (!selectedResearch && Object.keys(GameData.technologies).length > 0) {
            selectedResearch = Object.keys(GameData.technologies)[0];
        }
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    renderCurrentTab();
    updateInfoPanel();
}

function renderCurrentTab() {
    switch (currentTab) {
        case 'buildings':
            renderBuildingsTab();
            break;
        case 'resources':
            renderResourcesTab();
            break;
        case 'battle':
            renderBattleTab();
            break;
        case 'research':
            renderResearchTab();
            break;
    }
}

function updateStatusPanel() {
    const energyEl = document.getElementById('status-energy');
    const spaceEl = document.getElementById('status-space');
    const threatEl = document.getElementById('status-threat');

    if (energyEl) {
        const energy = Math.floor(getResource('energy'));
        const energyMax = getResourceMax('energy');
        energyEl.textContent = `${energy}/${energyMax}`;
    }

    if (spaceEl) {
        spaceEl.textContent = `${getSpaceUsed()}/${getSpaceMax()}`;
    }

    if (threatEl) {
        const threat = gameState.threat.level;
        const timer = Math.ceil(gameState.threat.timer);
        if (threat >= gameState.threat.minThreshold) {
            threatEl.textContent = `Lv.${threat} (${timer}s)`;
            threatEl.classList.add('warning');
        } else {
            threatEl.textContent = `Lv.${threat} (安全)`;
            threatEl.classList.remove('warning');
        }
    }

    // Update resource summaries (totals)
    updateResourceTotal('status-raw-total', 'raw');
    updateResourceTotal('status-material-total', 'material');
    updateResourceTotal('status-science-total', 'science');
}

function updateResourceTotal(elementId, category) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let total = 0;
    for (const [id, res] of Object.entries(GameData.resources)) {
        if (res.category === category) {
            total += Math.floor(getResource(id));
        }
    }
    el.textContent = total;
}

function updateInfoPanel() {
    const panel = document.getElementById('info-panel');
    if (!panel) return;

    let html = '';

    switch (currentTab) {
        case 'buildings':
            html = renderBuildingInfoPanel();
            break;
        case 'resources':
            html = renderResourceInfoPanel();
            break;
        case 'battle':
            html = renderBattleInfoPanel();
            break;
        case 'research':
            html = renderResearchInfoPanel();
            break;
    }

    panel.innerHTML = html || '<div class="info-placeholder">点击左侧项目查看详情</div>';
}

// ===== BUILDINGS TAB =====
function renderBuildingsTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;

    if (!selectedBuilding && Object.keys(GameData.buildings).length > 0) {
        selectedBuilding = Object.keys(GameData.buildings)[0];
    }

    const categories = {};
    for (const [id, building] of Object.entries(GameData.buildings)) {
        const cat = building.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ id, ...building });
    }

    let html = '<div class="content-grid">';
    const categoryOrder = ['mining', 'smelting', 'crafting', 'power', 'military', 'defense', 'infrastructure'];

    for (const category of categoryOrder) {
        const buildings = categories[category];
        if (!buildings) continue;

        html += `<div class="content-category">
            <div class="category-label">${formatCategory(category)}</div>
            <div class="boxes-container">`;

        for (const building of buildings) {
            const count = getBuildingCount(building.id);
            const isSelected = selectedBuilding === building.id;
            const isLocked = building.requiresTech && !gameState.research.completed.includes(building.requiresTech);

            // Get main product info
            let productInfo = '';
            if (building.produces && Object.keys(building.produces).length > 0) {
                const [productId] = Object.keys(building.produces);
                const productRes = GameData.resources[productId];
                const productAmount = Math.floor(getResource(productId));
                productInfo = `${productRes?.name || productId} ${productAmount}`;
            } else if (building.special === 'expander') {
                productInfo = `+${building.expandAmount || 5} 空间`;
            }

            html += `
                <div class="game-box building-box ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}"
                     onclick="selectBuilding('${building.id}')">
                    <div class="box-line1">
                        <span class="box-name">${building.name}</span>
                        <span class="box-count">x${count}</span>
                    </div>
                    <div class="box-line2">${productInfo}</div>
                </div>`;
        }

        html += '</div></div>';
    }
    html += '</div>';

    container.innerHTML = html;
}

function renderBuildingInfoPanel() {
    if (!selectedBuilding) return '';

    const building = GameData.buildings[selectedBuilding];
    if (!building) return '';

    const count = getBuildingCount(selectedBuilding);
    const check = canBuildBuilding(selectedBuilding);
    const isLocked = building.requiresTech && !gameState.research.completed.includes(building.requiresTech);

    // Production info
    let productionHtml = '';
    if (building.consumes && Object.keys(building.consumes).length > 0) {
        const cons = Object.entries(building.consumes)
            .map(([id, amt]) => `<span class="cons">-${amt} ${GameData.resources[id]?.name || id}</span>`)
            .join(' ');
        productionHtml += cons;
    }
    if (building.produces && Object.keys(building.produces).length > 0) {
        const prod = Object.entries(building.produces)
            .map(([id, amt]) => `<span class="prod">+${amt} ${GameData.resources[id]?.name || id}</span>`)
            .join(' ');
        productionHtml += (productionHtml ? ' → ' : '') + prod;
    }
    if (building.special === 'expander') {
        productionHtml = `<span class="special">+${building.expandAmount || 5} 空间, +${building.threatIncrease || 1} 威胁</span>`;
    }
    if (!productionHtml) productionHtml = '<span style="color: var(--text-dim)">无生产</span>';

    // Cost info
    const costItems = Object.entries(building.buildCost || {});
    let costHtml = '';
    if (costItems.length === 0) {
        costHtml = '免费';
    } else {
        costHtml = costItems.map(([id, amount]) => {
            const has = Math.floor(getResource(id));
            const ok = has >= amount;
            const name = GameData.resources[id]?.name || id;
            return `<div class="cost-line ${ok ? 'cost-ok' : 'cost-need'}">${name} - 需要: ${amount}, 现有: ${has}</div>`;
        }).join('');
    }

    let lockMsg = '';
    if (isLocked) {
        const tech = GameData.technologies[building.requiresTech];
        lockMsg = `<div class="info-locked">需要科技: ${tech?.name || building.requiresTech}</div>`;
    }

    // Resource details section - consumed resources
    let consumedHtml = '';
    if (building.consumes && Object.keys(building.consumes).length > 0) {
        consumedHtml = '<div class="info-section"><div class="info-section-title">消耗资源状态</div>';
        for (const [id, amt] of Object.entries(building.consumes)) {
            const res = GameData.resources[id];
            if (!res) continue;
            const current = Math.floor(getResource(id));
            const max = getResourceMax(id);
            const percent = max > 0 ? (current / max) * 100 : 0;
            const perSecond = (amt / (building.cycleTime || 1)) * count;
            consumedHtml += `
                <div class="resource-detail">
                    <div class="resource-detail-header">
                        <span class="resource-detail-name">${res.name}</span>
                        <span class="resource-detail-rate cons">-${perSecond.toFixed(1)}/s</span>
                    </div>
                    <div class="resource-detail-bar">
                        <div class="bar-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="resource-detail-values">${current} / ${max}</div>
                </div>`;
        }
        consumedHtml += '</div>';
    }

    // Resource details section - produced resources
    let producedHtml = '';
    if (building.produces && Object.keys(building.produces).length > 0) {
        producedHtml = '<div class="info-section"><div class="info-section-title">产出资源状态</div>';
        for (const [id, amt] of Object.entries(building.produces)) {
            const res = GameData.resources[id];
            if (!res) continue;
            const current = Math.floor(getResource(id));
            const max = getResourceMax(id);
            const percent = max > 0 ? (current / max) * 100 : 0;
            const perSecond = (amt / (building.cycleTime || 1)) * count;
            producedHtml += `
                <div class="resource-detail">
                    <div class="resource-detail-header">
                        <span class="resource-detail-name">${res.name}</span>
                        <span class="resource-detail-rate prod">+${perSecond.toFixed(1)}/s</span>
                    </div>
                    <div class="resource-detail-bar">
                        <div class="bar-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="resource-detail-values">${current} / ${max}</div>
                </div>`;
        }
        producedHtml += '</div>';
    }

    return `
        <div class="info-header">
            <span class="info-name">${building.name}</span>
            <span class="info-count">x${count}</span>
        </div>
        <div class="info-section">
            <div class="info-section-title">生产</div>
            <div class="info-production">${productionHtml}</div>
        </div>
        ${building.spaceCost > 0 ? `<div style="color: var(--text-dim); font-size: 0.8rem; margin-bottom: 8px;">占用空间: ${building.spaceCost}</div>` : ''}
        <div class="info-section">
            <div class="info-section-title">建造成本</div>
            <div class="info-cost">${costHtml}</div>
        </div>
        ${lockMsg}
        <div class="info-actions">
            <button class="btn btn-build" onclick="buildBuilding('${selectedBuilding}')" ${check.can ? '' : 'disabled'}>建造 +1</button>
            <button class="btn btn-remove" onclick="removeBuilding('${selectedBuilding}')" ${count > 0 ? '' : 'disabled'}>拆除 -1</button>
        </div>
        <div class="info-divider"></div>
        ${consumedHtml}
        ${producedHtml}`;
}

function selectBuilding(id) {
    selectedBuilding = id;
    renderBuildingsTab();
    updateInfoPanel();
}

// ===== RESOURCES TAB =====
function renderResourcesTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;

    if (!selectedResource && Object.keys(GameData.resources).length > 0) {
        selectedResource = Object.keys(GameData.resources)[0];
    }

    const categories = {};
    for (const [id, data] of Object.entries(GameData.resources)) {
        const cat = data.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ id, ...data });
    }

    let html = '<div class="content-grid">';
    const categoryOrder = ['raw', 'material', 'energy', 'science', 'meta'];

    for (const category of categoryOrder) {
        const resources = categories[category];
        if (!resources) continue;

        html += `<div class="content-category">
            <div class="category-label">${formatCategory(category)}</div>
            <div class="boxes-container">`;

        for (const res of resources) {
            const current = Math.floor(getResource(res.id));
            const isSelected = selectedResource === res.id;
            const net = getNetRate(res.id);
            let rateClass = 'neutral';
            if (net > 0.1) rateClass = 'positive';
            else if (net < -0.1) rateClass = 'negative';

            html += `
                <div class="game-box resource-box ${isSelected ? 'selected' : ''}"
                     onclick="selectResource('${res.id}')">
                    <div class="box-name">${res.name}</div>
                    <div class="box-amount">${current}</div>
                    <div class="box-rate ${rateClass}">${net >= 0 ? '+' : ''}${net.toFixed(1)}/s</div>
                </div>`;
        }

        html += '</div></div>';
    }
    html += '</div>';

    container.innerHTML = html;
}

function renderResourceInfoPanel() {
    if (!selectedResource) return '';

    const res = GameData.resources[selectedResource];
    if (!res) return '';

    const current = Math.floor(getResource(selectedResource));
    const max = getResourceMax(selectedResource);
    const production = getProductionRate(selectedResource);
    const consumption = getConsumptionRate(selectedResource);
    const net = production - consumption;
    const percent = max > 0 ? (current / max) * 100 : 0;

    // Special for space
    if (selectedResource === 'space') {
        const used = getSpaceUsed();
        return `
            <div class="info-header">
                <span class="info-name">${res.name}</span>
            </div>
            <div class="info-section">
                <div class="info-section-title">使用情况</div>
                <div style="font-size: 1.2rem; color: var(--primary-color); margin: 8px 0;">${used} / ${max}</div>
                <div style="color: var(--text-dim); font-size: 0.85rem;">剩余: ${max - used} 空间</div>
            </div>
            <div style="color: var(--text-dim); font-size: 0.8rem; margin-top: 12px;">
                建造扩张器可增加空间
            </div>`;
    }

    return `
        <div class="info-header">
            <span class="info-name">${res.name}</span>
            <span class="info-status">${formatCategory(res.category)}</span>
        </div>
        <div class="info-section">
            <div class="info-section-title">存储</div>
            <div style="font-size: 1.2rem; color: var(--primary-color); margin: 8px 0;">${current} / ${max}</div>
            <div class="resource-bar-mini">
                <div class="bar-fill" style="width: ${percent}%"></div>
            </div>
        </div>
        <div class="info-section">
            <div class="info-section-title">生产速率</div>
            <div class="resource-rates">
                <div class="rate-line">
                    <span class="rate-label">生产:</span>
                    <span class="rate-value positive">+${production.toFixed(1)}/s</span>
                </div>
                <div class="rate-line">
                    <span class="rate-label">消耗:</span>
                    <span class="rate-value negative">-${consumption.toFixed(1)}/s</span>
                </div>
                <div class="rate-line" style="border-top: 1px solid var(--border-color); padding-top: 4px; margin-top: 4px;">
                    <span class="rate-label">净增:</span>
                    <span class="rate-value ${net >= 0 ? 'positive' : 'negative'}">${net >= 0 ? '+' : ''}${net.toFixed(1)}/s</span>
                </div>
            </div>
        </div>`;
}

function selectResource(id) {
    selectedResource = id;
    renderResourcesTab();
    updateInfoPanel();
}

// ===== BATTLE TAB =====
function renderBattleTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;

    let html = '<div class="battle-layout">';

    // Player units section
    html += `<div class="battle-section">
        <div class="battle-section-title friendly">我方单位</div>
        <div class="boxes-container">`;

    if (gameState.combat.playerUnits.length === 0) {
        html += '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 8px;">暂无战斗单位</div>';
    } else {
        gameState.combat.playerUnits.forEach((unit, i) => {
            const isSelected = selectedUnit?.type === 'player' && selectedUnit?.index === i;
            html += `
                <div class="game-box unit-box friendly ${isSelected ? 'selected' : ''}"
                     onclick="selectUnit('player', ${i})">
                    <div class="box-name">${unit.name}</div>
                    <div class="box-value">x${unit.count}</div>
                </div>`;
        });
    }

    html += '</div></div>';

    // Enemy units section
    html += `<div class="battle-section">
        <div class="battle-section-title enemy">敌方单位</div>
        <div class="boxes-container">`;

    if (!gameState.combat.inBattle || gameState.combat.enemyUnits.length === 0) {
        html += '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 8px;">暂无敌人</div>';
    } else {
        gameState.combat.enemyUnits.forEach((unit, i) => {
            const isSelected = selectedUnit?.type === 'enemy' && selectedUnit?.index === i;
            html += `
                <div class="game-box unit-box enemy ${isSelected ? 'selected' : ''}"
                     onclick="selectUnit('enemy', ${i})">
                    <div class="box-name">${unit.name}</div>
                    <div class="box-value">x${unit.count}</div>
                </div>`;
        });
    }

    html += '</div></div></div>';

    // Combat log
    html += `<div class="combat-log">
        <div class="combat-log-title">战斗日志</div>
        <div class="log-entries">
            ${gameState.combat.log.slice(-5).map(entry => `<div class="log-entry">${entry}</div>`).join('')}
        </div>
    </div>`;

    container.innerHTML = html;
}

function renderBattleInfoPanel() {
    // Show base health and threat info
    const threat = gameState.threat.level;
    const timer = Math.ceil(gameState.threat.timer);
    const baseHp = Math.floor(gameState.base.hp);
    const baseMaxHp = gameState.base.maxHp;
    const basePercent = (baseHp / baseMaxHp) * 100;

    let unitInfo = '';
    if (selectedUnit) {
        const units = selectedUnit.type === 'player' ? gameState.combat.playerUnits : gameState.combat.enemyUnits;
        const unit = units[selectedUnit.index];
        if (unit) {
            const hpPercent = (unit.hp / unit.maxHp) * 100;
            unitInfo = `
                <div class="info-section">
                    <div class="info-section-title">选中单位</div>
                    <div style="font-size: 1rem; color: var(--primary-color); margin-bottom: 8px;">${unit.name}</div>
                    <div style="font-size: 0.85rem; margin-bottom: 4px;">数量: ${unit.count}</div>
                    <div style="font-size: 0.85rem; margin-bottom: 4px;">攻击力: ${unit.attack}</div>
                    <div style="font-size: 0.85rem; margin-bottom: 4px;">生命值: ${Math.floor(unit.hp)}/${unit.maxHp}</div>
                    <div class="health-bar-container">
                        <div class="health-bar" style="width: ${hpPercent}%"></div>
                    </div>
                </div>`;
        }
    }

    return `
        <div class="info-header">
            <span class="info-name">战斗状态</span>
            <span class="info-status">${gameState.combat.inBattle ? '战斗中' : '安全'}</span>
        </div>
        <div class="info-section">
            <div class="info-section-title">基地生命</div>
            <div style="font-size: 1.1rem; color: var(--danger-color); margin: 4px 0;">${baseHp} / ${baseMaxHp}</div>
            <div class="health-bar-container">
                <div class="health-bar" style="width: ${basePercent}%"></div>
            </div>
        </div>
        <div class="info-section">
            <div class="info-section-title">威胁等级</div>
            <div style="font-size: 1rem; color: var(--warning-color); margin: 4px 0;">Lv.${threat}</div>
            ${threat >= gameState.threat.minThreshold
                ? `<div style="color: var(--text-dim); font-size: 0.85rem;">下波攻击: ${timer}秒</div>`
                : `<div style="color: var(--success-color); font-size: 0.85rem;">安全 (低于阈值${gameState.threat.minThreshold})</div>`
            }
        </div>
        ${unitInfo}`;
}

function selectUnit(type, index) {
    selectedUnit = { type, index };
    renderBattleTab();
    updateInfoPanel();
}

// ===== RESEARCH TAB =====
function renderResearchTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;

    if (!selectedResearch && Object.keys(GameData.technologies).length > 0) {
        selectedResearch = Object.keys(GameData.technologies)[0];
    }

    const tiers = { 1: [], 2: [], 3: [] };
    for (const [id, tech] of Object.entries(GameData.technologies)) {
        const tier = tech.tier || 1;
        if (!tiers[tier]) tiers[tier] = [];
        tiers[tier].push({ id, ...tech });
    }

    const tierNames = { 1: '红包科技 (1级)', 2: '绿包科技 (2级)', 3: '蓝包科技 (3级)' };
    const tierColors = { 1: 'tier-red', 2: 'tier-green', 3: 'tier-blue' };

    let html = '<div class="content-grid">';

    for (const tier of [1, 2, 3]) {
        const techs = tiers[tier];
        if (!techs || techs.length === 0) continue;

        html += `<div class="content-category">
            <div class="category-label ${tierColors[tier]}">${tierNames[tier]}</div>
            <div class="boxes-container">`;

        for (const tech of techs) {
            const isCompleted = gameState.research.completed.includes(tech.id);
            const isSelected = selectedResearch === tech.id;
            const prereqsMet = (tech.prerequisites || []).every(p => gameState.research.completed.includes(p));
            const isLocked = !prereqsMet && !isCompleted;

            let statusIcon = '';
            if (isCompleted) statusIcon = '✓';
            else if (isLocked) statusIcon = '🔒';

            html += `
                <div class="game-box research-box ${tierColors[tier]} ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}"
                     onclick="selectResearch('${tech.id}')">
                    <div class="box-name">${tech.name}</div>
                    <div class="box-icon">${statusIcon}</div>
                </div>`;
        }

        html += '</div></div>';
    }
    html += '</div>';

    container.innerHTML = html;
}

function renderResearchInfoPanel() {
    if (!selectedResearch) return '';

    const tech = GameData.technologies[selectedResearch];
    if (!tech) return '';

    const isCompleted = gameState.research.completed.includes(selectedResearch);
    const prereqsMet = (tech.prerequisites || []).every(p => gameState.research.completed.includes(p));
    const canAffordTech = canAfford(tech.cost || {});
    const canUnlock = !isCompleted && prereqsMet && canAffordTech;

    // Cost info
    const costItems = Object.entries(tech.cost || {});
    let costHtml = '';
    if (costItems.length === 0) {
        costHtml = '免费';
    } else {
        costHtml = costItems.map(([id, amount]) => {
            const has = Math.floor(getResource(id));
            const ok = has >= amount;
            const name = GameData.resources[id]?.name || id;
            return `<div class="cost-line ${ok ? 'cost-ok' : 'cost-need'}">${name} - 需要: ${amount}, 现有: ${has}</div>`;
        }).join('');
    }

    // Prerequisites
    let prereqHtml = '';
    if (tech.prerequisites && tech.prerequisites.length > 0) {
        prereqHtml = '<div class="info-prereqs"><span class="prereq-label">前置: </span>';
        prereqHtml += tech.prerequisites.map(p => {
            const prereqTech = GameData.technologies[p];
            const completed = gameState.research.completed.includes(p);
            return `<span class="prereq-item ${completed ? 'completed' : 'missing'}">${prereqTech?.name || p}</span>`;
        }).join(' ');
        prereqHtml += '</div>';
    }

    // Unlocks
    let unlocksHtml = '';
    if (tech.unlocks && tech.unlocks.length > 0) {
        unlocksHtml = '<div class="info-unlocks"><span class="unlock-label">解锁: </span>';
        unlocksHtml += tech.unlocks.map(b => {
            const building = GameData.buildings[b];
            return `<span class="unlock-item">${building?.name || b}</span>`;
        }).join(' ');
        unlocksHtml += '</div>';
    }

    const tierNames = { 1: '红包1级', 2: '绿包2级', 3: '蓝包3级' };

    return `
        <div class="info-header">
            <span class="info-name">${tech.name}</span>
            <span class="info-status">${isCompleted ? '已完成' : (prereqsMet ? '可研究' : '未解锁')}</span>
        </div>
        <div class="info-description">${tech.description || ''}</div>
        <div class="info-tier">等级: ${tierNames[tech.tier] || '未知'}</div>
        ${prereqHtml}
        ${unlocksHtml}
        <div class="info-section">
            <div class="info-section-title">科研包消耗</div>
            <div class="info-cost">${costHtml}</div>
        </div>
        <div class="info-actions">
            <button class="btn btn-research" onclick="unlockResearch('${selectedResearch}')" ${canUnlock ? '' : 'disabled'}>
                ${isCompleted ? '已完成' : '研究'}
            </button>
        </div>`;
}

function selectResearch(id) {
    selectedResearch = id;
    renderResearchTab();
    updateInfoPanel();
}

// ===== UTILITY FUNCTIONS =====

function formatCategory(cat) {
    const names = {
        'mining': '采矿',
        'smelting': '冶炼',
        'crafting': '制造',
        'power': '电力',
        'infrastructure': '基建',
        'military': '军事',
        'defense': '防御',
        'raw': '原料',
        'material': '材料',
        'energy': '能源',
        'science': '科技',
        'meta': '其他'
    };
    return names[cat] || cat;
}

// ===== INCREMENTAL UPDATE FUNCTIONS =====
// These update only values, not DOM structure, to prevent button click issues

function updateBuildingBoxes() {
    // Update building counts and product amounts without rebuilding DOM
    for (const [id, building] of Object.entries(GameData.buildings)) {
        const box = document.querySelector(`.building-box[onclick="selectBuilding('${id}')"]`);
        if (box) {
            // Update count
            const countEl = box.querySelector('.box-count');
            if (countEl) {
                countEl.textContent = `x${getBuildingCount(id)}`;
            }

            // Update product amount
            const line2El = box.querySelector('.box-line2');
            if (line2El && building.produces && Object.keys(building.produces).length > 0) {
                const [productId] = Object.keys(building.produces);
                const productRes = GameData.resources[productId];
                const productAmount = Math.floor(getResource(productId));
                line2El.textContent = `${productRes?.name || productId} ${productAmount}`;
            }
        }
    }
}

function updateResourceBoxes() {
    // Update resource values without rebuilding DOM
    for (const id of Object.keys(GameData.resources)) {
        const box = document.querySelector(`.resource-box[onclick="selectResource('${id}')"]`);
        if (box) {
            const amountEl = box.querySelector('.box-amount');
            const rateEl = box.querySelector('.box-rate');

            if (amountEl) {
                amountEl.textContent = Math.floor(getResource(id));
            }
            if (rateEl) {
                const net = getNetRate(id);
                rateEl.textContent = `${net >= 0 ? '+' : ''}${net.toFixed(1)}/s`;
                rateEl.className = 'box-rate ' + (net > 0.1 ? 'positive' : (net < -0.1 ? 'negative' : 'neutral'));
            }
        }
    }
}

function updateBattleDisplay() {
    // Update combat log
    const logContainer = document.querySelector('.log-entries');
    if (logContainer) {
        logContainer.innerHTML = gameState.combat.log.slice(-5)
            .map(entry => `<div class="log-entry">${entry}</div>`).join('');
    }

    // Update enemy unit HP if in battle
    if (gameState.combat.inBattle) {
        gameState.combat.enemyUnits.forEach((unit, i) => {
            const box = document.querySelector(`.unit-box.enemy[onclick="selectUnit('enemy', ${i})"]`);
            if (box) {
                const valueEl = box.querySelector('.box-value');
                if (valueEl) {
                    valueEl.textContent = `x${unit.count}`;
                }
            }
        });
    }
}

function updateInfoPanelValues() {
    // Only update dynamic values in the info panel, not the structure
    const panel = document.getElementById('info-panel');
    if (!panel) return;

    // Update cost lines (check if resources changed)
    const costLines = panel.querySelectorAll('.cost-line');
    costLines.forEach(line => {
        // Parse the cost line text and update "现有" value
        const text = line.textContent;
        const match = text.match(/^(.+) - 需要: (\d+), 现有: \d+$/);
        if (match) {
            const resourceName = match[1];
            const needed = parseInt(match[2]);
            // Find resource ID by name
            for (const [id, res] of Object.entries(GameData.resources)) {
                if (res.name === resourceName) {
                    const has = Math.floor(getResource(id));
                    const ok = has >= needed;
                    line.textContent = `${resourceName} - 需要: ${needed}, 现有: ${has}`;
                    line.className = `cost-line ${ok ? 'cost-ok' : 'cost-need'}`;
                    break;
                }
            }
        }
    });

    // Update building tab button states
    if (currentTab === 'buildings' && selectedBuilding) {
        const check = canBuildBuilding(selectedBuilding);
        const count = getBuildingCount(selectedBuilding);
        const building = GameData.buildings[selectedBuilding];

        const buildBtn = panel.querySelector('.btn-build');
        const removeBtn = panel.querySelector('.btn-remove');

        if (buildBtn) {
            buildBtn.disabled = !check.can;
        }
        if (removeBtn) {
            removeBtn.disabled = count <= 0;
        }

        // Update count display
        const countEl = panel.querySelector('.info-count');
        if (countEl) {
            countEl.textContent = `x${count}`;
        }

        // Update resource detail bars and values
        const resourceDetails = panel.querySelectorAll('.resource-detail');
        resourceDetails.forEach(detail => {
            const nameEl = detail.querySelector('.resource-detail-name');
            const valuesEl = detail.querySelector('.resource-detail-values');
            const barFill = detail.querySelector('.bar-fill');
            const rateEl = detail.querySelector('.resource-detail-rate');

            if (nameEl && valuesEl) {
                const resName = nameEl.textContent;
                // Find resource by name
                for (const [id, res] of Object.entries(GameData.resources)) {
                    if (res.name === resName) {
                        const current = Math.floor(getResource(id));
                        const max = getResourceMax(id);
                        const percent = max > 0 ? (current / max) * 100 : 0;

                        valuesEl.textContent = `${current} / ${max}`;
                        if (barFill) barFill.style.width = `${percent}%`;

                        // Update rate based on current building count
                        if (rateEl && building) {
                            const isConsumed = building.consumes && building.consumes[id];
                            const isProduced = building.produces && building.produces[id];
                            const amt = isConsumed ? building.consumes[id] : (isProduced ? building.produces[id] : 0);
                            const perSecond = (amt / (building.cycleTime || 1)) * count;
                            if (isConsumed) {
                                rateEl.textContent = `-${perSecond.toFixed(1)}/s`;
                            } else if (isProduced) {
                                rateEl.textContent = `+${perSecond.toFixed(1)}/s`;
                            }
                        }
                        break;
                    }
                }
            }
        });
    }

    // Update research tab button states
    if (currentTab === 'research' && selectedResearch) {
        const tech = GameData.technologies[selectedResearch];
        if (tech) {
            const isCompleted = gameState.research.completed.includes(selectedResearch);
            const prereqsMet = (tech.prerequisites || []).every(p => gameState.research.completed.includes(p));
            const canAffordTech = canAfford(tech.cost || {});
            const canUnlock = !isCompleted && prereqsMet && canAffordTech;

            const researchBtn = panel.querySelector('.btn-research');
            if (researchBtn) {
                researchBtn.disabled = !canUnlock;
            }
        }
    }

    // Update resource info panel specific values
    if (currentTab === 'resources' && selectedResource) {
        const current = Math.floor(getResource(selectedResource));
        const max = getResourceMax(selectedResource);
        const production = getProductionRate(selectedResource);
        const consumption = getConsumptionRate(selectedResource);
        const net = production - consumption;
        const percent = max > 0 ? (current / max) * 100 : 0;

        // Update storage value
        const storageValue = panel.querySelector('.info-section div[style*="font-size: 1.2rem"]');
        if (storageValue && selectedResource !== 'space') {
            storageValue.textContent = `${current} / ${max}`;
        }

        // Update bar fill
        const barFill = panel.querySelector('.bar-fill');
        if (barFill) {
            barFill.style.width = `${percent}%`;
        }

        // Update rate values
        const rateValues = panel.querySelectorAll('.rate-value');
        if (rateValues.length >= 3) {
            rateValues[0].textContent = `+${production.toFixed(1)}/s`;
            rateValues[1].textContent = `-${consumption.toFixed(1)}/s`;
            rateValues[2].textContent = `${net >= 0 ? '+' : ''}${net.toFixed(1)}/s`;
            rateValues[2].className = `rate-value ${net >= 0 ? 'positive' : 'negative'}`;
        }

        // Special for space
        if (selectedResource === 'space') {
            const used = getSpaceUsed();
            const spaceValue = panel.querySelector('.info-section div[style*="font-size: 1.2rem"]');
            if (spaceValue) {
                spaceValue.textContent = `${used} / ${max}`;
            }
        }
    }

    // Update battle info panel
    if (currentTab === 'battle') {
        const baseHp = Math.floor(gameState.base.hp);
        const baseMaxHp = gameState.base.maxHp;
        const basePercent = (baseHp / baseMaxHp) * 100;
        const threat = gameState.threat.level;
        const timer = Math.ceil(gameState.threat.timer);

        // Update base HP
        const hpValue = panel.querySelector('.info-section div[style*="color: var(--danger-color)"]');
        if (hpValue) {
            hpValue.textContent = `${baseHp} / ${baseMaxHp}`;
        }

        // Update health bar
        const healthBar = panel.querySelector('.health-bar');
        if (healthBar) {
            healthBar.style.width = `${basePercent}%`;
        }

        // Update threat timer
        const timerDiv = panel.querySelector('.info-section div[style*="font-size: 0.85rem"]');
        if (timerDiv && threat >= gameState.threat.minThreshold) {
            timerDiv.textContent = `下波攻击: ${timer}秒`;
        }
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// START GAME
// ============================================================

window.addEventListener('DOMContentLoaded', init);
