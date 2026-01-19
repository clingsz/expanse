// ============================================================
// EXPANSE - Idle Number Game
// Version 2.0 - Complete Rewrite
// ============================================================

'use strict';

// ===== GAME DATA (loaded from data.json, initialized here as fallback) =====
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
        timer: 60,        // seconds until next wave
        timerMax: 60,
        minThreshold: 2   // no attacks below this threat level
    },
    research: {
        current: null,
        progress: 0,
        completed: []
    },
    stats: {
        totalProduction: {},
        totalConsumption: {}
    }
};

// ===== CONSTANTS =====
const TICK_RATE = 500;  // ms between game ticks (0.5 seconds)
const TICK_SECONDS = TICK_RATE / 1000;

// ===== UI STATE =====
let currentTab = 'buildings';
let selectedBuilding = null;  // Currently selected building in Buildings tab
let selectedResearch = null;  // Currently selected research in Research tab
let gameLoopInterval = null;
let lastTickTime = Date.now();

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
    console.log('Initializing Expanse...');

    // Load game data
    await loadGameData();

    // Initialize game state from data
    initializeGameState();

    // Set up UI
    setupEventListeners();
    renderCurrentTab();
    updateHeader();

    // Start game loop
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
        // Use default data structure
        initializeDefaultData();
    }
}

function initializeDefaultData() {
    // Fallback minimal data if data.json fails to load
    GameData = {
        resources: {
            "iron-ore": { id: "iron-ore", name: "Iron Ore", category: "raw", baseStorage: 500 },
            "copper-ore": { id: "copper-ore", name: "Copper Ore", category: "raw", baseStorage: 500 },
            "coal": { id: "coal", name: "Coal", category: "raw", baseStorage: 500 },
            "stone": { id: "stone", name: "Stone", category: "raw", baseStorage: 500 },
            "iron-plate": { id: "iron-plate", name: "Iron Plate", category: "material", baseStorage: 200 },
            "copper-plate": { id: "copper-plate", name: "Copper Plate", category: "material", baseStorage: 200 },
            "energy": { id: "energy", name: "Energy", category: "energy", baseStorage: 500 },
            "space": { id: "space", name: "Space", category: "meta", baseStorage: 10 }
        },
        buildings: {
            "miner-iron": {
                id: "miner-iron", name: "Iron Miner", category: "mining",
                spaceCost: 1, buildCost: { "stone": 5 },
                consumes: { "energy": 1 }, produces: { "iron-ore": 2 },
                cycleTime: 0.5, requiresTech: null
            },
            "miner-copper": {
                id: "miner-copper", name: "Copper Miner", category: "mining",
                spaceCost: 1, buildCost: { "stone": 5 },
                consumes: { "energy": 1 }, produces: { "copper-ore": 2 },
                cycleTime: 0.5, requiresTech: null
            },
            "miner-coal": {
                id: "miner-coal", name: "Coal Miner", category: "mining",
                spaceCost: 1, buildCost: { "stone": 5 },
                consumes: { "energy": 1 }, produces: { "coal": 2 },
                cycleTime: 0.5, requiresTech: null
            },
            "furnace-iron-plate": {
                id: "furnace-iron-plate", name: "Iron Smelter", category: "smelting",
                spaceCost: 1, buildCost: { "stone": 10 },
                consumes: { "iron-ore": 1, "energy": 2 }, produces: { "iron-plate": 1 },
                cycleTime: 0.5, requiresTech: null
            },
            "furnace-copper-plate": {
                id: "furnace-copper-plate", name: "Copper Smelter", category: "smelting",
                spaceCost: 1, buildCost: { "stone": 10 },
                consumes: { "copper-ore": 1, "energy": 2 }, produces: { "copper-plate": 1 },
                cycleTime: 0.5, requiresTech: null
            },
            "generator-coal": {
                id: "generator-coal", name: "Coal Generator", category: "power",
                spaceCost: 1, buildCost: { "stone": 10, "iron-plate": 5 },
                consumes: { "coal": 1 }, produces: { "energy": 20 },
                cycleTime: 0.5, requiresTech: null
            },
            "expander": {
                id: "expander", name: "Space Expander", category: "infrastructure",
                spaceCost: 0, buildCost: { "iron-plate": 20, "copper-plate": 10 },
                consumes: {}, produces: {},
                cycleTime: 0, requiresTech: null,
                special: "expander", expandAmount: 5, threatIncrease: 1
            }
        },
        technologies: {},
        enemies: {
            "basic-bug": { id: "basic-bug", name: "Basic Bug", hp: 50, attack: 10 }
        }
    };
}

function initializeGameState() {
    // Initialize resources
    for (const [id, data] of Object.entries(GameData.resources)) {
        gameState.resources[id] = {
            current: 0,
            max: data.baseStorage || 500
        };
    }

    // Special handling for space - starts with some available
    if (gameState.resources['space']) {
        gameState.resources['space'].current = 0;  // 0 used
        gameState.resources['space'].max = 10;     // 10 available
    }

    // Give starting resources
    if (gameState.resources['stone']) gameState.resources['stone'].current = 50;
    if (gameState.resources['energy']) gameState.resources['energy'].current = 100;

    // Initialize buildings (all start at 0)
    for (const id of Object.keys(GameData.buildings)) {
        gameState.buildings[id] = 0;
    }

    // Initialize production stats
    for (const id of Object.keys(GameData.resources)) {
        gameState.stats.totalProduction[id] = 0;
        gameState.stats.totalConsumption[id] = 0;
    }

    console.log('Game state initialized:', gameState);
}

// ============================================================
// GAME LOOP
// ============================================================

function gameLoop() {
    const now = Date.now();
    const dt = (now - lastTickTime) / 1000;  // delta time in seconds
    lastTickTime = now;

    // Reset per-tick stats
    resetTickStats();

    // 1. Base energy generation
    addResource('energy', gameState.base.energyGeneration * dt);
    gameState.stats.totalProduction['energy'] = (gameState.stats.totalProduction['energy'] || 0) + gameState.base.energyGeneration;

    // 2. Process all buildings
    processBuildings(dt);

    // 3. Update threat timer
    updateThreat(dt);

    // 4. Process combat if in battle
    if (gameState.combat.inBattle) {
        processCombat(dt);
    }

    // 5. Update research
    updateResearch(dt);

    // 6. Update UI
    updateHeader();
    if (currentTab === 'resources') {
        renderResourcesTab();
    } else if (currentTab === 'battle') {
        renderBattleTab();
    }
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

// ============================================================
// BUILDING SYSTEM
// ============================================================

function getBuildingCount(id) {
    return gameState.buildings[id] || 0;
}

function canBuildBuilding(id) {
    const building = GameData.buildings[id];
    if (!building) return { can: false, reason: 'Unknown building' };

    // Check tech requirement
    if (building.requiresTech && !gameState.research.completed.includes(building.requiresTech)) {
        return { can: false, reason: 'Technology not researched' };
    }

    // Check space
    if (building.spaceCost > 0 && getSpaceAvailable() < building.spaceCost) {
        return { can: false, reason: 'Not enough space' };
    }

    // Check cost
    if (!canAfford(building.buildCost)) {
        return { can: false, reason: 'Not enough resources' };
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

    // Spend resources
    spendResources(building.buildCost);

    // Add building
    gameState.buildings[id] = (gameState.buildings[id] || 0) + 1;

    // Handle special buildings
    if (building.special === 'expander') {
        gameState.resources['space'].max += building.expandAmount || 5;
        gameState.threat.level += building.threatIncrease || 1;
    }

    showToast(`已建造 ${building.name}！`, 'success');
    renderCurrentTab();
    return true;
}

function processBuildings(dt) {
    for (const [id, count] of Object.entries(gameState.buildings)) {
        if (count <= 0) continue;

        const building = GameData.buildings[id];
        if (!building) continue;

        // Skip buildings with no production
        if (!building.produces || Object.keys(building.produces).length === 0) continue;

        // Calculate production per tick
        const cycleTime = building.cycleTime || 0.5;
        const cyclesPerSecond = 1 / cycleTime;
        const productionMultiplier = dt * cyclesPerSecond * count;

        // Check if we can afford the consumption
        let canProduce = true;
        const consumeAmounts = {};

        for (const [resourceId, amount] of Object.entries(building.consumes || {})) {
            const needed = amount * productionMultiplier;
            consumeAmounts[resourceId] = needed;
            if (getResource(resourceId) < needed) {
                canProduce = false;
            }
        }

        // Check if output has space
        for (const [resourceId, amount] of Object.entries(building.produces)) {
            if (getResource(resourceId) >= getResourceMax(resourceId)) {
                canProduce = false;
            }
        }

        if (!canProduce) continue;

        // Consume resources
        for (const [resourceId, amount] of Object.entries(consumeAmounts)) {
            removeResource(resourceId, amount);
            gameState.stats.totalConsumption[resourceId] = (gameState.stats.totalConsumption[resourceId] || 0) + (amount / dt);
        }

        // Produce resources
        for (const [resourceId, amount] of Object.entries(building.produces)) {
            const produced = amount * productionMultiplier;
            addResource(resourceId, produced);
            gameState.stats.totalProduction[resourceId] = (gameState.stats.totalProduction[resourceId] || 0) + (produced / dt);
        }
    }
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
// THREAT & COMBAT SYSTEM
// ============================================================

function updateThreat(dt) {
    // Only count down if threat is above threshold
    if (gameState.threat.level < gameState.threat.minThreshold) {
        return;
    }

    // Count down timer
    gameState.threat.timer -= dt;

    // Spawn wave when timer reaches 0
    if (gameState.threat.timer <= 0) {
        spawnEnemyWave();
        // Reset timer (faster with higher threat)
        gameState.threat.timerMax = Math.max(30, 60 - gameState.threat.level * 5);
        gameState.threat.timer = gameState.threat.timerMax;
    }
}

function spawnEnemyWave() {
    // Calculate wave strength based on threat level
    const waveStrength = gameState.threat.level * 10;

    // For now, spawn basic bugs
    const bugCount = Math.floor(waveStrength / 5);

    gameState.combat.enemyUnits = [{
        type: 'basic-bug',
        name: 'Basic Bug',
        count: bugCount,
        hp: 50 * bugCount,
        maxHp: 50 * bugCount,
        attack: 10 * bugCount
    }];

    gameState.combat.inBattle = true;
    gameState.combat.log = [`Wave ${gameState.threat.level} incoming! ${bugCount} bugs attacking!`];

    showToast(`敌人来袭！`, 'warning');
}

function processCombat(dt) {
    if (!gameState.combat.inBattle) return;

    // Get player attack power (from drones/turrets)
    const playerAttack = getPlayerAttackPower();

    // Get enemy attack power
    const enemyAttack = getEnemyAttackPower();

    // Damage calculation (per second)
    const playerDamage = playerAttack * dt;
    const enemyDamage = enemyAttack * dt;

    // Player attacks enemy front
    if (gameState.combat.enemyUnits.length > 0) {
        const target = gameState.combat.enemyUnits[0];
        target.hp -= playerDamage;

        if (target.hp <= 0) {
            gameState.combat.log.push(`Defeated ${target.name}!`);
            gameState.combat.enemyUnits.shift();
        }
    }

    // Enemy attacks player front (units → defense → base)
    applyDamageToPlayer(enemyDamage);

    // Check victory/defeat
    if (gameState.combat.enemyUnits.length === 0) {
        // Victory!
        gameState.combat.inBattle = false;
        gameState.combat.log.push('Victory! Wave defeated!');
        showToast('战斗胜利！', 'success');
    }

    if (gameState.base.hp <= 0) {
        // Game Over
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

    // First, damage player units (front to back)
    for (const unit of gameState.combat.playerUnits) {
        if (remainingDamage <= 0) break;
        if (unit.hp <= 0) continue;

        const absorbed = Math.min(unit.hp, remainingDamage);
        unit.hp -= absorbed;
        remainingDamage -= absorbed;

        if (unit.hp <= 0) {
            gameState.combat.log.push(`Lost ${unit.name}!`);
        }
    }

    // Then damage base
    if (remainingDamage > 0) {
        gameState.base.hp -= remainingDamage;
    }
}

function gameOver() {
    clearInterval(gameLoopInterval);
    gameState.combat.log.push('BASE DESTROYED! GAME OVER!');
    showToast('游戏结束 - 基地被摧毁！', 'error');

    // Show game over modal
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.style.display = 'flex';
}

function restartGame() {
    location.reload();
}

// ============================================================
// RESEARCH SYSTEM
// ============================================================

function updateResearch(dt) {
    // Research is now instant via unlockResearch - no progress tracking needed
}

// ============================================================
// UI SYSTEM
// ============================================================

function setupEventListeners() {
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    currentTab = tab;

    // Update tab button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    renderCurrentTab();
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

function updateHeader() {
    // Update key resources in header
    const energyEl = document.getElementById('header-energy');
    const spaceEl = document.getElementById('header-space');
    const threatEl = document.getElementById('header-threat');

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
            threatEl.textContent = `Lv.${threat} (${timer}秒)`;
            threatEl.classList.add('warning');
        } else {
            threatEl.textContent = `Lv.${threat} (安全)`;
            threatEl.classList.remove('warning');
        }
    }
}

// ===== BUILDINGS TAB =====
function renderBuildingsTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;

    // Auto-select first building if none selected
    if (!selectedBuilding && Object.keys(GameData.buildings).length > 0) {
        selectedBuilding = Object.keys(GameData.buildings)[0];
    }

    // Group buildings by category
    const categories = {};
    for (const [id, building] of Object.entries(GameData.buildings)) {
        const cat = building.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ id, ...building });
    }

    // Build info panel HTML
    const infoPanelHtml = renderBuildingInfoPanel();

    // Build compact grid HTML
    let gridHtml = '<div class="building-grid-compact">';
    const categoryOrder = ['mining', 'smelting', 'crafting', 'power', 'military', 'defense', 'infrastructure'];

    for (const category of categoryOrder) {
        const buildings = categories[category];
        if (!buildings) continue;

        gridHtml += `<div class="building-category-compact">
            <div class="category-label">${formatCategory(category)}</div>
            <div class="building-boxes">`;

        for (const building of buildings) {
            const count = getBuildingCount(building.id);
            const isSelected = selectedBuilding === building.id;
            const isLocked = building.requiresTech && !gameState.research.completed.includes(building.requiresTech);

            gridHtml += `
                <div class="building-box ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}"
                     onclick="selectBuilding('${building.id}')">
                    <span class="box-name">${building.name}</span>
                    <span class="box-count">x${count}</span>
                </div>`;
        }

        gridHtml += '</div></div>';
    }
    gridHtml += '</div>';

    container.innerHTML = infoPanelHtml + gridHtml;
}

function renderBuildingInfoPanel() {
    if (!selectedBuilding) {
        return `<div class="building-info-panel">
            <div class="info-placeholder">选择一个建筑</div>
        </div>`;
    }

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
        productionHtml = `<span class="special">+${building.expandAmount || 5} Space, +${building.threatIncrease || 1} Threat</span>`;
    }
    if (!productionHtml) productionHtml = '<span class="no-prod">无生产</span>';

    // Cost info - simple format: 需要: xxx, 现有: xxx
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

    // Lock message
    let lockMsg = '';
    if (isLocked) {
        const tech = GameData.technologies[building.requiresTech];
        lockMsg = `<div class="info-locked">需要: ${tech?.name || building.requiresTech}</div>`;
    }

    return `
        <div class="building-info-panel">
            <div class="info-header">
                <span class="info-name">${building.name}</span>
                <span class="info-count">已有: ${count}</span>
            </div>
            <div class="info-production">${productionHtml}</div>
            ${building.spaceCost > 0 ? `<div class="info-space">占用空间: ${building.spaceCost}</div>` : ''}
            <div class="info-cost">${costHtml}</div>
            ${lockMsg}
            <div class="info-actions">
                <button class="btn btn-build" onclick="buildBuilding('${selectedBuilding}')"
                        ${check.can ? '' : 'disabled'}>建造 +1</button>
                <button class="btn btn-remove" onclick="removeBuilding('${selectedBuilding}')"
                        ${count > 0 ? '' : 'disabled'}>拆除 -1</button>
            </div>
        </div>`;
}

function selectBuilding(id) {
    selectedBuilding = id;
    renderBuildingsTab();
}

function removeBuilding(id) {
    const count = getBuildingCount(id);
    if (count <= 0) {
        showToast('没有建筑可拆除', 'error');
        return false;
    }

    const building = GameData.buildings[id];
    if (!building) return false;

    // Remove building
    gameState.buildings[id] = count - 1;

    // Handle expander removal (reduce space and threat)
    if (building.special === 'expander') {
        gameState.resources['space'].max -= building.expandAmount || 5;
        gameState.threat.level = Math.max(0, gameState.threat.level - (building.threatIncrease || 1));
    }

    // Refund 50% of build cost
    for (const [resourceId, amount] of Object.entries(building.buildCost || {})) {
        addResource(resourceId, Math.floor(amount * 0.5));
    }

    showToast(`已拆除 ${building.name} (返还50%)`, 'info');
    renderBuildingsTab();
    return true;
}

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

function formatCost(cost) {
    if (!cost || Object.keys(cost).length === 0) return '免费';
    return Object.entries(cost)
        .map(([id, amount]) => {
            const has = getResource(id);
            const color = has >= amount ? 'var(--color-positive)' : 'var(--color-negative)';
            const name = GameData.resources[id]?.name || id;
            return `<span style="color:${color}">${name}: ${Math.floor(has)}/${amount}</span>`;
        })
        .join(', ');
}

function formatProduction(building) {
    const parts = [];

    if (building.consumes && Object.keys(building.consumes).length > 0) {
        const cons = Object.entries(building.consumes)
            .map(([id, amt]) => `-${amt} ${GameData.resources[id]?.name || id}`)
            .join(', ');
        parts.push(`<span class="consumption">${cons}</span>`);
    }

    if (building.produces && Object.keys(building.produces).length > 0) {
        const prod = Object.entries(building.produces)
            .map(([id, amt]) => `+${amt} ${GameData.resources[id]?.name || id}`)
            .join(', ');
        parts.push(`<span class="production">${prod}</span>`);
    }

    if (building.special === 'expander') {
        parts.push(`<span class="special">+${building.expandAmount || 5} Space, +${building.threatIncrease || 1} Threat</span>`);
    }

    return parts.join(' → ') || 'No production';
}

// ===== RESOURCES TAB =====
function renderResourcesTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;

    let html = '<div class="resources-list">';

    // Group by category
    const categories = {};
    for (const [id, data] of Object.entries(GameData.resources)) {
        const cat = data.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ id, ...data });
    }

    // Define category order
    const categoryOrder = ['raw', 'material', 'energy', 'science', 'military', 'meta'];

    for (const category of categoryOrder) {
        const resources = categories[category];
        if (!resources) continue;

        html += `<div class="resource-category">
            <h3 class="category-title">${formatCategory(category)}</h3>`;

        for (const res of resources) {
            const current = Math.floor(getResource(res.id));
            const max = getResourceMax(res.id);
            const production = getProductionRate(res.id);
            const consumption = getConsumptionRate(res.id);
            const net = production - consumption;

            // Color coding for net rate
            let netClass = 'neutral';
            if (net > 0.1) netClass = 'positive';
            else if (net < -0.1) netClass = 'negative';

            // Special display for space
            if (res.id === 'space') {
                const used = getSpaceUsed();
                html += `
                    <div class="resource-row">
                        <span class="resource-name">${res.name}</span>
                        <span class="resource-amount">${used} / ${max} used</span>
                        <span class="resource-rate"></span>
                    </div>`;
            } else {
                const percent = max > 0 ? (current / max) * 100 : 0;
                html += `
                    <div class="resource-row">
                        <span class="resource-name">${res.name}</span>
                        <div class="resource-bar-container">
                            <div class="resource-bar" style="width: ${percent}%"></div>
                            <span class="resource-bar-text">${current} / ${max}</span>
                        </div>
                        <span class="resource-rate ${netClass}">
                            (+${production.toFixed(1)} -${consumption.toFixed(1)} = ${net >= 0 ? '+' : ''}${net.toFixed(1)}/s)
                        </span>
                    </div>`;
            }
        }

        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}

// ===== BATTLE TAB =====
function renderBattleTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;

    const threat = gameState.threat.level;
    const timer = Math.ceil(gameState.threat.timer);
    const baseHp = Math.floor(gameState.base.hp);
    const baseMaxHp = gameState.base.maxHp;
    const basePercent = (baseHp / baseMaxHp) * 100;

    let html = `
        <div class="battle-panel">
            <div class="threat-display">
                <h3>威胁等级: ${threat}</h3>
                ${threat >= gameState.threat.minThreshold
                    ? `<div class="threat-timer">下波攻击: ${timer}秒</div>`
                    : `<div class="threat-safe">安全 (低于阈值 ${gameState.threat.minThreshold})</div>`
                }
            </div>

            <div class="base-health">
                <h3>基地生命</h3>
                <div class="health-bar-container">
                    <div class="health-bar" style="width: ${basePercent}%"></div>
                    <span class="health-text">${baseHp} / ${baseMaxHp}</span>
                </div>
            </div>

            <div class="forces-display">
                <div class="player-forces">
                    <h4>我方单位</h4>
                    ${renderPlayerUnits()}
                </div>

                <div class="enemy-forces">
                    <h4>敌方单位</h4>
                    ${renderEnemyUnits()}
                </div>
            </div>

            <div class="combat-log">
                <h4>战斗日志</h4>
                <div class="log-entries">
                    ${gameState.combat.log.slice(-5).map(entry => `<div class="log-entry">${entry}</div>`).join('')}
                </div>
            </div>
        </div>`;

    container.innerHTML = html;
}

function renderPlayerUnits() {
    if (gameState.combat.playerUnits.length === 0) {
        return '<div class="no-units">暂无战斗单位（建造无人机厂）</div>';
    }

    return gameState.combat.playerUnits.map((unit, i) => `
        <div class="unit-row">
            <span class="unit-order">${i + 1}.</span>
            <span class="unit-name">${unit.name} x${unit.count}</span>
            <span class="unit-hp">HP: ${Math.floor(unit.hp)}/${unit.maxHp}</span>
        </div>
    `).join('');
}

function renderEnemyUnits() {
    if (!gameState.combat.inBattle || gameState.combat.enemyUnits.length === 0) {
        return '<div class="no-units">暂无敌人（等待下一波）</div>';
    }

    return gameState.combat.enemyUnits.map((unit, i) => `
        <div class="unit-row enemy">
            <span class="unit-order">${i + 1}.</span>
            <span class="unit-name">${unit.name}</span>
            <span class="unit-hp">HP: ${Math.floor(unit.hp)}/${unit.maxHp}</span>
        </div>
    `).join('');
}

// ===== RESEARCH TAB =====
function renderResearchTab() {
    const container = document.getElementById('tab-content');
    if (!container) return;

    // Auto-select first research if none selected
    if (!selectedResearch && Object.keys(GameData.technologies).length > 0) {
        selectedResearch = Object.keys(GameData.technologies)[0];
    }

    // Build info panel HTML
    const infoPanelHtml = renderResearchInfoPanel();

    // Build compact grid HTML grouped by tier
    let gridHtml = '<div class="research-grid-compact">';

    // Group technologies by tier
    const tiers = { 1: [], 2: [], 3: [] };
    for (const [id, tech] of Object.entries(GameData.technologies)) {
        const tier = tech.tier || 1;
        if (!tiers[tier]) tiers[tier] = [];
        tiers[tier].push({ id, ...tech });
    }

    const tierNames = { 1: '红包科技 (1级)', 2: '绿包科技 (2级)', 3: '蓝包科技 (3级)' };
    const tierColors = { 1: 'tier-red', 2: 'tier-green', 3: 'tier-blue' };

    for (const tier of [1, 2, 3]) {
        const techs = tiers[tier];
        if (!techs || techs.length === 0) continue;

        gridHtml += `<div class="research-category-compact">
            <div class="category-label ${tierColors[tier]}">${tierNames[tier]}</div>
            <div class="research-boxes">`;

        for (const tech of techs) {
            const isCompleted = gameState.research.completed.includes(tech.id);
            const isSelected = selectedResearch === tech.id;
            const prereqsMet = (tech.prerequisites || []).every(p => gameState.research.completed.includes(p));
            const isLocked = !prereqsMet && !isCompleted;

            gridHtml += `
                <div class="research-box ${tierColors[tier]} ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}"
                     onclick="selectResearch('${tech.id}')">
                    <span class="box-name">${tech.name}</span>
                    <span class="box-status">${isCompleted ? '✓' : (isLocked ? '🔒' : '')}</span>
                </div>`;
        }

        gridHtml += '</div></div>';
    }
    gridHtml += '</div>';

    container.innerHTML = infoPanelHtml + gridHtml;
}

function renderResearchInfoPanel() {
    if (!selectedResearch) {
        return `<div class="research-info-panel">
            <div class="info-placeholder">选择一个科技</div>
        </div>`;
    }

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

    // Tier display
    const tierNames = { 1: '红包1级', 2: '绿包2级', 3: '蓝包3级' };
    const tierHtml = `<div class="info-tier">等级: ${tierNames[tech.tier] || '未知'}</div>`;

    return `
        <div class="research-info-panel">
            <div class="info-header">
                <span class="info-name">${tech.name}</span>
                <span class="info-status">${isCompleted ? '已完成' : (prereqsMet ? '可研究' : '未解锁')}</span>
            </div>
            <div class="info-description">${tech.description || ''}</div>
            ${tierHtml}
            ${prereqHtml}
            ${unlocksHtml}
            <div class="info-cost-section">
                <div class="cost-label">科研包消耗:</div>
                ${costHtml}
            </div>
            <div class="info-actions">
                <button class="btn btn-research" onclick="unlockResearch('${selectedResearch}')"
                        ${canUnlock ? '' : 'disabled'}>
                    ${isCompleted ? '已完成' : '研究'}
                </button>
            </div>
        </div>`;
}

function selectResearch(id) {
    selectedResearch = id;
    renderResearchTab();
}

function unlockResearch(id) {
    const tech = GameData.technologies[id];
    if (!tech) return false;

    // Check if already completed
    if (gameState.research.completed.includes(id)) {
        showToast('该科技已研究完成', 'info');
        return false;
    }

    // Check prerequisites
    for (const prereq of (tech.prerequisites || [])) {
        if (!gameState.research.completed.includes(prereq)) {
            showToast('需要先完成前置研究', 'error');
            return false;
        }
    }

    // Check cost
    if (!canAfford(tech.cost || {})) {
        showToast('科研包不足', 'error');
        return false;
    }

    // Spend resources
    spendResources(tech.cost || {});

    // Complete research
    gameState.research.completed.push(id);
    showToast(`研究完成: ${tech.name}！`, 'success');
    renderResearchTab();
    return true;
}

// ===== TOAST NOTIFICATIONS =====
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

// ===== NUMBER FORMATTING =====
function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toString();
}

// ============================================================
// START GAME
// ============================================================

window.addEventListener('DOMContentLoaded', init);
