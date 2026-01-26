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
        log: [],
        turretsOperational: 0,  // 可用机枪塔数量
        turretsDamaged: 0,      // 损坏的机枪塔数量
        // Flow combat state
        pollution: 0,           // Current pollution rate (threat inflow)
        suppression: 0,         // Current suppression rate (from turrets)
        netThreat: 0,           // Net threat = pollution - suppression
        defenseHP: 0,           // Combined defense HP pool
        defenseMaxHP: 0         // Max defense HP
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
        // max comes from data.json baseStorage (100)
    }

    // Initialize drone with damaged tracking
    if (gameState.resources['drone']) {
        gameState.resources['drone'].damaged = 0;
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

    // Flow-based combat (V2.0) - replaces wave-based system
    // Combat is now continuous based on pollution vs suppression
    processCombatFlow(dt);

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

    // Update danger overlay (screen edge warning)
    updateDangerOverlay();
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

    // Sync turret count with combat state
    if (id === 'turret-basic') {
        gameState.combat.turretsOperational++;
    }

    showToast(`已建造 ${building.name}！`, 'success');

    // Floating text feedback for building construction
    const btn = document.querySelector(`.building-box[onclick*="'${id}'"]`);
    if (btn) {
        spawnFloatingTextAtElement(btn, `+1 ${building.name}`, 'var(--success-color)', false);
    }

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

    // Sync turret count with combat state (prioritize removing operational ones)
    if (id === 'turret-basic') {
        if (gameState.combat.turretsOperational > 0) {
            gameState.combat.turretsOperational--;
        } else if (gameState.combat.turretsDamaged > 0) {
            gameState.combat.turretsDamaged--;
        }
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
    let power = 20;  // 基地基础攻击力 20/秒

    // 可用机枪塔攻击力: 5/秒 each
    power += gameState.combat.turretsOperational * 5;

    // 可用无人机攻击力: 10/秒 each
    const drones = gameState.resources['drone'];
    if (drones) {
        power += drones.current * 10;
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

    // 1. 先打无人机 (每个50HP)
    const drones = gameState.resources['drone'];
    if (drones && drones.current > 0 && remainingDamage > 0) {
        const droneHp = 50;
        const totalDroneHp = drones.current * droneHp;
        const droneDamage = Math.min(remainingDamage, totalDroneHp);
        const dronesKilled = Math.ceil(droneDamage / droneHp);

        if (dronesKilled > 0) {
            const actualKilled = Math.min(dronesKilled, drones.current);
            drones.current -= actualKilled;
            drones.damaged = (drones.damaged || 0) + actualKilled;
            remainingDamage -= actualKilled * droneHp;
            if (actualKilled > 0) {
                gameState.combat.log.push(`${actualKilled}架无人机损坏！`);
            }
        }
    }

    // 2. 再打机枪塔 (每个100HP)
    if (remainingDamage > 0 && gameState.combat.turretsOperational > 0) {
        const turretHp = 100;
        const totalTurretHp = gameState.combat.turretsOperational * turretHp;
        const turretDamage = Math.min(remainingDamage, totalTurretHp);
        const turretsKilled = Math.ceil(turretDamage / turretHp);

        if (turretsKilled > 0) {
            const actualKilled = Math.min(turretsKilled, gameState.combat.turretsOperational);
            gameState.combat.turretsOperational -= actualKilled;
            gameState.combat.turretsDamaged += actualKilled;
            remainingDamage -= actualKilled * turretHp;
            if (actualKilled > 0) {
                gameState.combat.log.push(`${actualKilled}座机枪塔损坏！`);
            }
        }
    }

    // 3. 最后打基地
    if (remainingDamage > 0) {
        gameState.base.hp -= remainingDamage;
    }
}

function gameOver() {
    clearInterval(gameLoopInterval);
    gameState.combat.log.push('基地被摧毁！游戏结束！');
    showToast('游戏结束 - 基地被摧毁！', 'error');

    // Only access DOM in browser environment
    if (typeof document !== 'undefined') {
        const modal = document.getElementById('game-over-modal');
        if (modal) modal.style.display = 'flex';
    }
}

function restartGame() {
    location.reload();
}

// ===== Combat HP Calculation Helpers =====

function getPlayerTotalHP() {
    let hp = gameState.base.hp;

    // 可用机枪塔HP
    hp += gameState.combat.turretsOperational * 100;

    // 可用无人机HP
    const drones = gameState.resources['drone'];
    if (drones) {
        hp += drones.current * 50;
    }

    // Wall HP (walls are buildings that add to defense pool)
    const stoneWalls = getBuildingCount('wall-stone');
    const steelWalls = getBuildingCount('wall-steel');
    hp += stoneWalls * 50;  // Stone wall: 50 HP each
    hp += steelWalls * 150; // Steel wall: 150 HP each

    return hp;
}

function getPlayerMaxHP() {
    let maxHp = gameState.base.maxHp;

    // 总机枪塔HP (包括损坏的)
    const totalTurrets = gameState.combat.turretsOperational + gameState.combat.turretsDamaged;
    maxHp += totalTurrets * 100;

    // 总无人机HP (包括损坏的)
    const drones = gameState.resources['drone'];
    if (drones) {
        const totalDrones = drones.current + (drones.damaged || 0);
        maxHp += totalDrones * 50;
    }

    // Wall HP (walls are always at full health)
    const stoneWalls = getBuildingCount('wall-stone');
    const steelWalls = getBuildingCount('wall-steel');
    maxHp += stoneWalls * 50;  // Stone wall: 50 HP each
    maxHp += steelWalls * 150; // Steel wall: 150 HP each

    return maxHp;
}

function getEnemyTotalHP() {
    let hp = 0;
    for (const unit of gameState.combat.enemyUnits) {
        hp += Math.max(0, unit.hp);
    }
    return hp;
}

function getEnemyMaxHP() {
    let maxHp = 0;
    for (const unit of gameState.combat.enemyUnits) {
        maxHp += unit.maxHp;
    }
    return maxHp;
}

// ===== Flow-based Combat System (V2.0) =====

/**
 * Calculate total pollution rate from all running buildings
 * Pollution serves as the "enemy attack power" in flow combat
 */
function getTotalPollutionRate() {
    let pollution = 0;
    for (const [id, count] of Object.entries(gameState.buildings)) {
        if (count <= 0) continue;
        const building = GameData.buildings[id];
        if (!building || !building.pollution) continue;
        // Pollution rate = pollution per cycle * cycles per second * count
        const cycleTime = building.cycleTime || 1;
        const pollutionPerSecond = (building.pollution / cycleTime) * count;
        pollution += pollutionPerSecond;
    }
    return pollution;
}

/**
 * Calculate suppression rate from turrets (requires ammo)
 * Returns { suppression: number, ammoNeeded: number }
 */
function getSuppressionRate() {
    const turretData = GameData.buildings['turret-basic'];
    if (!turretData || !turretData.defense) return { suppression: 0, ammoNeeded: 0 };

    const turretCount = gameState.combat.turretsOperational;
    if (turretCount <= 0) return { suppression: 0, ammoNeeded: 0 };

    const ammoPerSecond = turretData.defense.ammoPerSecond || 2;
    const suppressionPerAmmo = turretData.defense.suppressionPerAmmo || 5;

    const ammoNeeded = turretCount * ammoPerSecond;  // per second
    const baseSuppression = turretCount * ammoPerSecond * suppressionPerAmmo;  // 10 per turret per second

    // Drones also provide suppression (10/s each, no ammo needed)
    const drones = gameState.resources['drone'];
    const droneCount = drones ? drones.current : 0;
    const droneSuppression = droneCount * 10;

    // Base provides base suppression of 20/s
    const basePower = 20;

    return {
        suppression: baseSuppression + droneSuppression + basePower,
        ammoNeeded: ammoNeeded
    };
}

/**
 * Process flow-based combat each tick
 * Replaces wave-based combat with continuous threat management
 */
function processCombatFlow(dt) {
    // 1. Calculate pollution (threat inflow) from all running buildings
    const rawPollution = getTotalPollutionRate();

    // Apply pollution buffer: pollution < 100 means no effective threat
    const POLLUTION_BUFFER = 100;
    const effectivePollution = Math.max(0, rawPollution - POLLUTION_BUFFER);
    gameState.combat.pollution = effectivePollution;
    gameState.combat.rawPollution = rawPollution; // Store raw value for display

    // 2. Calculate base suppression (without ammo consumption)
    // Drones (10/s each) + Base (20/s) don't need ammo
    const drones = gameState.resources['drone'];
    const droneCount = drones ? drones.current : 0;
    const droneSuppression = droneCount * 10;
    const basePower = 20;
    const passiveSuppression = droneSuppression + basePower;

    // 3. Calculate potential turret suppression
    const turretData = GameData.buildings['turret-basic'];
    const turretCount = gameState.combat.turretsOperational;
    const ammoPerSecond = turretData?.defense?.ammoPerSecond || 2;
    const suppressionPerAmmo = turretData?.defense?.suppressionPerAmmo || 5;
    const maxTurretSuppression = turretCount * ammoPerSecond * suppressionPerAmmo;

    // 4. Only consume ammo if we need turrets to fire (pollution > passive suppression)
    let turretSuppression = 0;
    const needsActiveFire = effectivePollution > passiveSuppression;

    if (needsActiveFire && turretCount > 0) {
        const ammo = gameState.resources['ammo'];
        const ammoAvailable = ammo ? ammo.current : 0;
        const ammoNeeded = turretCount * ammoPerSecond;
        const ammoToConsume = ammoNeeded * dt;

        let efficiency = 1.0;
        if (ammoToConsume > 0) {
            if (ammoAvailable >= ammoToConsume) {
                // Consume ammo
                if (ammo) ammo.current -= ammoToConsume;
            } else {
                // Ammo shortage - suppression reduced proportionally
                efficiency = ammoAvailable / ammoToConsume;
                if (ammo) ammo.current = 0;
            }
        }
        turretSuppression = maxTurretSuppression * efficiency;
    }

    const totalSuppression = turretSuppression + passiveSuppression;
    gameState.combat.suppression = totalSuppression;

    // 5. Calculate net threat
    const netThreat = effectivePollution - totalSuppression;
    gameState.combat.netThreat = netThreat;

    // 6. If net threat > 0, apply damage to defenses
    if (netThreat > 0) {
        const damageDealt = netThreat * dt;
        applyDamageToPlayer(damageDealt);

        // Set inBattle flag if we're taking damage
        if (!gameState.combat.inBattle && damageDealt > 0) {
            gameState.combat.inBattle = true;
            gameState.combat.log.push(`污染突破防线！正在受到伤害...`);
        }
    } else {
        // Defense holding - exit battle state
        if (gameState.combat.inBattle) {
            gameState.combat.inBattle = false;
            gameState.combat.log.push(`防线稳固，污染被压制`);
        }
    }

    // 7. Process auto-repair flow (uses repair packs)
    processRepairFlow(dt);

    // Update defense HP tracking
    gameState.combat.defenseHP = getPlayerTotalHP();
    gameState.combat.defenseMaxHP = getPlayerMaxHP();

    // Check game over
    if (gameState.base.hp <= 0) {
        gameOver();
    }
}

/**
 * Auto-repair flow: drones consume repair packs to heal damaged units
 * Only active when not under heavy attack and when there's something to repair
 */
function processRepairFlow(dt) {
    // Only repair when net threat <= 0 (defense holding)
    if (gameState.combat.netThreat > 0) return;

    const packs = gameState.resources['repair-pack'];
    if (!packs || packs.current <= 0) return;

    // Check if anything needs repair
    const turretsDamaged = gameState.combat.turretsDamaged > 0;
    const dronesDamaged = gameState.resources['drone'] && gameState.resources['drone'].damaged > 0;
    const baseNeedsRepair = gameState.base.hp < gameState.base.maxHp;

    // Don't consume repair packs if nothing needs repair
    if (!turretsDamaged && !dronesDamaged && !baseNeedsRepair) return;

    // Repair rate: 1 repair pack = 25 HP, consume 0.5/s when idle
    const repairRate = 0.5;  // packs per second
    const hpPerPack = 25;
    const repairNeeded = repairRate * dt;

    if (packs.current < repairNeeded) return;

    // Priority: repair turrets first, then drones, then base
    if (turretsDamaged) {
        // Accumulate repair progress
        gameState.combat.turretRepairProgress = (gameState.combat.turretRepairProgress || 0) + repairNeeded * hpPerPack;
        packs.current -= repairNeeded;

        // 100 HP to fully repair a turret (4 repair packs worth)
        if (gameState.combat.turretRepairProgress >= 100) {
            gameState.combat.turretRepairProgress -= 100;
            gameState.combat.turretsDamaged--;
            gameState.combat.turretsOperational++;
            gameState.combat.log.push(`自动修复：机枪塔恢复运行`);
        }
    } else if (dronesDamaged) {
        // Accumulate repair progress for drones
        gameState.combat.droneRepairProgress = (gameState.combat.droneRepairProgress || 0) + repairNeeded * hpPerPack;
        packs.current -= repairNeeded;

        // 50 HP to fully repair a drone (2 repair packs worth)
        if (gameState.combat.droneRepairProgress >= 50) {
            gameState.combat.droneRepairProgress -= 50;
            gameState.resources['drone'].damaged--;
            gameState.resources['drone'].current++;
            gameState.combat.log.push(`自动修复：无人机恢复运行`);
        }
    } else if (baseNeedsRepair) {
        // Repair base HP
        const healAmount = repairNeeded * hpPerPack;
        const actualHeal = Math.min(healAmount, gameState.base.maxHp - gameState.base.hp);
        gameState.base.hp += actualHeal;
        packs.current -= repairNeeded;
    }
}

// ===== Repair Functions =====

function repairTurret() {
    const cost = 3;  // 修复包消耗
    const packs = gameState.resources['repair-pack'];

    if (!packs || packs.current < cost) {
        showToast('修复包不足 (需要3个)', 'error');
        return false;
    }

    if (gameState.combat.turretsDamaged <= 0) {
        showToast('没有损坏的机枪塔', 'info');
        return false;
    }

    if (gameState.combat.inBattle) {
        showToast('战斗中无法修复', 'error');
        return false;
    }

    packs.current -= cost;
    gameState.combat.turretsDamaged--;
    gameState.combat.turretsOperational++;
    showToast('修复了1座机枪塔！', 'success');
    renderCurrentTab();
    updateInfoPanel();
    return true;
}

function repairDrone() {
    const cost = 1;  // 修复包消耗
    const packs = gameState.resources['repair-pack'];
    const drones = gameState.resources['drone'];

    if (!packs || packs.current < cost) {
        showToast('修复包不足 (需要1个)', 'error');
        return false;
    }

    if (!drones || (drones.damaged || 0) <= 0) {
        showToast('没有损坏的无人机', 'info');
        return false;
    }

    if (gameState.combat.inBattle) {
        showToast('战斗中无法修复', 'error');
        return false;
    }

    packs.current -= cost;
    drones.damaged--;
    drones.current++;
    showToast('修复了1架无人机！', 'success');
    renderCurrentTab();
    updateInfoPanel();
    return true;
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

    // Floating text feedback for research completion
    const btn = document.querySelector(`[onclick="unlockResearch('${id}')"]`);
    if (btn) {
        spawnFloatingTextAtElement(btn, `✓ ${tech.name}`, '#ffd700', true);
    }

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
    const energyBarEl = document.getElementById('status-energy-bar');
    const spaceBarEl = document.getElementById('status-space-bar');

    if (energyEl) {
        const energy = Math.floor(getResource('energy'));
        const energyMax = getResourceMax('energy');
        energyEl.textContent = `${energy}/${energyMax}`;

        // Update energy progress bar
        if (energyBarEl) {
            const energyPercent = energyMax > 0 ? (energy / energyMax) * 100 : 0;
            const energyDelta = getNetRate('energy');
            let energyBarColor = 'var(--danger-color)'; // red
            if (energyDelta >= 0) {
                energyBarColor = 'var(--success-color)'; // green
            } else if (energyDelta > -10) {
                energyBarColor = 'var(--warning-color)'; // yellow
            }
            energyBarEl.style.width = `${energyPercent}%`;
            energyBarEl.style.backgroundColor = energyBarColor;
            // Add flow-stripe animation when energy is being produced
            energyBarEl.classList.toggle('active', energyDelta > 0);
        }
    }

    if (spaceEl) {
        const spaceUsed = getSpaceUsed();
        const spaceMax = getSpaceMax();
        spaceEl.textContent = `${spaceUsed}/${spaceMax}`;

        // Update space progress bar
        if (spaceBarEl) {
            const spacePercent = spaceMax > 0 ? (spaceUsed / spaceMax) * 100 : 0;
            let spaceBarColor = 'var(--success-color)'; // green
            if (spacePercent >= 75) {
                spaceBarColor = 'var(--danger-color)'; // red
            } else if (spacePercent >= 50) {
                spaceBarColor = 'var(--warning-color)'; // yellow
            }
            spaceBarEl.style.width = `${spacePercent}%`;
            spaceBarEl.style.backgroundColor = spaceBarColor;
        }
    }

    if (threatEl) {
        const threat = gameState.threat.level;
        const timer = Math.ceil(gameState.threat.timer);
        const pollution = gameState.combat.pollution || 0;
        const suppression = gameState.combat.suppression || 0;
        const netThreat = gameState.combat.netThreat || 0;

        if (threat >= gameState.threat.minThreshold) {
            threatEl.textContent = `Lv.${threat} (${timer}s)`;
            threatEl.classList.add('warning');
        } else {
            threatEl.textContent = `Lv.${threat} (安全)`;
            threatEl.classList.remove('warning');
        }

        // Update threat bar - shows suppression margin (green = safe, red = danger)
        const threatBarEl = document.getElementById('status-threat-bar');
        const threatDetailEl = document.getElementById('status-threat-detail');
        if (threatBarEl) {
            // Calculate margin: positive = safe (suppression > pollution), negative = danger
            const margin = suppression - pollution;
            const maxMargin = Math.max(suppression, pollution, 1);
            let barPercent, barColor;

            if (pollution === 0) {
                // No pollution = 100% safe
                barPercent = 100;
                barColor = 'var(--success-color)';
            } else if (margin >= 0) {
                // Safe: bar shows how much suppression margin we have
                barPercent = Math.min(100, (suppression / maxMargin) * 100);
                barColor = 'var(--success-color)';
            } else {
                // Danger: bar shows how much we're lacking
                barPercent = Math.min(100, (pollution / maxMargin) * 100);
                barColor = 'var(--danger-color)';
            }

            threatBarEl.style.width = `${barPercent}%`;
            threatBarEl.style.backgroundColor = barColor;
        }
        if (threatDetailEl) {
            if (netThreat > 0) {
                threatDetailEl.textContent = `受损中 -${netThreat.toFixed(1)}/s`;
                threatDetailEl.style.color = 'var(--danger-color)';
            } else if (pollution > 0) {
                threatDetailEl.textContent = `压制中 +${Math.abs(netThreat).toFixed(1)}/s`;
                threatDetailEl.style.color = 'var(--success-color)';
            } else {
                threatDetailEl.textContent = '无威胁';
                threatDetailEl.style.color = 'var(--text-dim)';
            }
        }
    }

    // Update defense HP bar
    const defenseEl = document.getElementById('status-defense');
    const defenseBarEl = document.getElementById('status-defense-bar');
    if (defenseEl && defenseBarEl) {
        const currentHP = getPlayerTotalHP();
        const maxHP = getPlayerMaxHP();
        const hpPercent = maxHP > 0 ? (currentHP / maxHP) * 100 : 100;

        defenseEl.textContent = `${Math.floor(currentHP)}/${maxHP}`;
        defenseBarEl.style.width = `${hpPercent}%`;

        // Color based on HP percentage
        if (hpPercent > 50) {
            defenseBarEl.style.backgroundColor = 'var(--success-color)';
        } else if (hpPercent > 25) {
            defenseBarEl.style.backgroundColor = 'var(--warning-color)';
        } else {
            defenseBarEl.style.backgroundColor = 'var(--danger-color)';
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

    // If no specific panel content, show dashboard
    if (!html) {
        html = renderDashboardPanel();
    }

    panel.innerHTML = html;
}

// ===== DASHBOARD PANEL (Factory Overview) =====
function renderDashboardPanel() {
    // Power status
    const energy = Math.floor(getResource('energy'));
    const energyMax = getResourceMax('energy');
    const energyNet = getNetRate('energy');
    let powerStatus = '正常';
    let powerClass = 'safe';
    if (energyNet < -10) {
        powerStatus = '严重不足';
        powerClass = 'danger';
    } else if (energyNet < 0) {
        powerStatus = '不足';
        powerClass = 'warning';
    }

    // Find bottleneck (most negative rate)
    let bottleneck = null;
    let worstRate = 0;
    for (const id of Object.keys(GameData.resources)) {
        const net = getNetRate(id);
        if (net < worstRate) {
            worstRate = net;
            bottleneck = GameData.resources[id];
        }
    }

    // Space usage
    const spaceUsed = getSpaceUsed();
    const spaceMax = getSpaceMax();
    const spacePercent = spaceMax > 0 ? (spaceUsed / spaceMax) * 100 : 0;

    // Threat status
    const threat = gameState.threat.level;
    const timer = Math.ceil(gameState.threat.timer);
    const pollution = gameState.combat.pollution || 0;
    const suppression = gameState.combat.suppression || 0;

    // Next research recommendation
    let nextResearch = null;
    for (const [id, tech] of Object.entries(GameData.technologies)) {
        if (gameState.research.completed.includes(id)) continue;
        const prereqsMet = tech.prerequisites.every(p => gameState.research.completed.includes(p));
        if (prereqsMet) {
            nextResearch = tech;
            break;
        }
    }

    return `
        <div class="dashboard-panel">
            <div class="info-header">
                <span class="info-name">工厂概览</span>
                <span class="info-status">Dashboard</span>
            </div>

            <div class="info-section">
                <div class="info-section-title">电力状态</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>${energy}/${energyMax}</span>
                    <span class="rate-indicator ${powerClass}">${energyNet >= 0 ? '+' : ''}${energyNet.toFixed(1)}/s</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(energy / energyMax) * 100}%"></div>
                </div>
            </div>

            <div class="info-section">
                <div class="info-section-title">空间使用</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>${spaceUsed}/${spaceMax}</span>
                    <span style="color: ${spacePercent > 80 ? 'var(--danger-color)' : 'var(--text-dim)'}">${spacePercent.toFixed(0)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${spacePercent}%; background-color: ${spacePercent > 80 ? 'var(--danger-color)' : 'var(--accent-color)'}"></div>
                </div>
            </div>

            ${bottleneck && worstRate < -1 ? `
            <div class="info-section" style="background: rgba(255, 153, 51, 0.1); padding: 8px; border-radius: 4px; border-left: 3px solid var(--warning-color);">
                <div class="info-section-title" style="color: var(--warning-color);">⚠ 瓶颈警告</div>
                <div style="font-size: 0.9rem;">${bottleneck.name} 产量限制中</div>
                <div class="rate-indicator ${worstRate < -5 ? 'critical' : 'negative'}">${worstRate.toFixed(1)}/s</div>
            </div>
            ` : ''}

            <div class="info-section">
                <div class="info-section-title">威胁状态</div>
                <div style="font-size: 0.9rem; margin-bottom: 4px;">
                    威胁等级: Lv.${threat} ${threat >= gameState.threat.minThreshold ? `(${timer}s)` : ''}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-dim);">
                    污染: ${pollution.toFixed(1)}/s | 压制: ${suppression.toFixed(1)}/s
                </div>
            </div>

            ${nextResearch ? `
            <div class="info-section">
                <div class="info-section-title">推荐科研</div>
                <div style="font-size: 0.9rem; color: var(--accent-color);">${nextResearch.name}</div>
                <div style="font-size: 0.85rem; color: var(--text-dim);">${nextResearch.description}</div>
            </div>
            ` : ''}
        </div>
    `;
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

            // Skip locked buildings - don't display them at all
            if (isLocked) continue;

            // Determine building tier for visual styling
            let tierClass = 'tier-1';
            if (building.requiresTech) {
                const tech = GameData.technologies[building.requiresTech];
                if (tech && tech.tier >= 3) {
                    tierClass = 'tier-3';
                } else if (tech && tech.tier >= 2) {
                    tierClass = 'tier-2';
                }
            }

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
                <div class="game-box building-box ${tierClass} ${isSelected ? 'selected' : ''}"
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

            // Enhanced rate indicator with arrows and critical state
            let rateClass = 'neutral';
            let rateArrow = '';
            if (net > 0.1) {
                rateClass = 'positive';
                rateArrow = '▲ ';
            } else if (net < -5) {
                rateClass = 'critical';  // Severe deficit - flashing red
                rateArrow = '▼ ';
            } else if (net < -0.1) {
                rateClass = 'negative';
                rateArrow = '▼ ';
            }

            html += `
                <div class="game-box resource-box ${isSelected ? 'selected' : ''}"
                     onclick="selectResource('${res.id}')">
                    <div class="box-name">${res.name}</div>
                    <div class="box-amount">${current}</div>
                    <div class="box-rate rate-indicator ${rateClass}">${rateArrow}${net >= 0 ? '+' : ''}${net.toFixed(1)}/s</div>
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

    let html = '';

    // ===== COMBAT STATUS (Simplified Two-Bar Design) =====
    const pollution = gameState.combat.pollution || 0;
    const suppression = gameState.combat.suppression || 0;
    const netThreat = gameState.combat.netThreat || 0;

    // Normalize bars relative to max of the two values
    const maxVal = Math.max(pollution, suppression, 1);
    const threatPercent = (pollution / maxVal) * 100;
    const suppressPercent = (suppression / maxVal) * 100;

    // Determine status
    let statusClass = 'safe';
    let statusText = '防线稳固';
    let statusIcon = '✓';
    if (netThreat > 10) {
        statusClass = 'danger';
        statusText = '污染超载!';
        statusIcon = '⚠';
    } else if (netThreat > 0) {
        statusClass = 'warning';
        statusText = '压制力不足';
        statusIcon = '!';
    }

    html += `
        <div class="combat-status-panel">
            <div class="combat-status-header ${statusClass}">
                <span class="status-icon">${statusIcon}</span>
                <span class="status-text">${statusText}</span>
            </div>
            <div class="combat-bars">
                <div class="combat-bar-row threat">
                    <span class="bar-label">威胁</span>
                    <div class="bar-track">
                        <div class="bar-fill threat" style="width: ${threatPercent}%"></div>
                    </div>
                    <span class="bar-value">${pollution.toFixed(1)}/s</span>
                </div>
                <div class="combat-bar-row suppress">
                    <span class="bar-label">压制</span>
                    <div class="bar-track">
                        <div class="bar-fill suppress" style="width: ${suppressPercent}%"></div>
                    </div>
                    <span class="bar-value">${suppression.toFixed(1)}/s</span>
                </div>
            </div>
            <div class="combat-net-result ${statusClass}">
                净值: ${netThreat >= 0 ? '+' : ''}${netThreat.toFixed(1)}/s
                ${netThreat > 0 ? '(正在受损)' : '(安全)'}
            </div>
        </div>`;

    // ===== THREE-COLUMN UNIT LAYOUT =====
    html += '<div class="battle-units-grid">';

    // --- Column 1: DEFENSE (防御) ---
    // Calculate aggregated defense stats
    const totalDefenseHP = getPlayerTotalHP();
    const maxDefenseHP = getPlayerMaxHP();
    const defensePercent = maxDefenseHP > 0 ? (totalDefenseHP / maxDefenseHP) * 100 : 100;
    const defenseClass = defensePercent > 50 ? 'healthy' : defensePercent > 25 ? 'warning' : 'critical';

    // Count defense buildings
    const stoneWalls = getBuildingCount('wall-stone');
    const steelWalls = getBuildingCount('wall-steel');
    const totalWalls = stoneWalls + steelWalls;
    const wallHP = stoneWalls * 50 + steelWalls * 150;

    html += `
        <div class="battle-unit-column">
            <div class="column-header defense">🛡️ 防御</div>
            <div class="unit-stat-card">
                <div class="stat-title">总防御血量</div>
                <div class="stat-value ${defenseClass}">${Math.floor(totalDefenseHP)} / ${maxDefenseHP}</div>
                <div class="stat-bar">
                    <div class="stat-bar-fill ${defenseClass}" style="width: ${defensePercent}%"></div>
                </div>
            </div>
            <div class="unit-stat-card sub">
                <div class="stat-row">
                    <span class="stat-label">基地</span>
                    <span class="stat-value-small">${Math.floor(gameState.base.hp)}/${gameState.base.maxHp} HP</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">城墙 (${totalWalls}座)</span>
                    <span class="stat-value-small">+${wallHP} HP</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">威胁等级</span>
                    <span class="stat-value-small">Lv.${gameState.threat.level}</span>
                </div>
            </div>
        </div>`;

    // --- Column 2: FIREPOWER (火力) ---
    const totalTurrets = gameState.combat.turretsOperational + gameState.combat.turretsDamaged;
    const turretOperationalPercent = totalTurrets > 0 ? (gameState.combat.turretsOperational / totalTurrets) * 100 : 0;
    const ammo = gameState.resources['ammo'] || { current: 0, max: 500 };
    const ammoPercent = (ammo.current / ammo.max) * 100;
    const turretSuppression = gameState.combat.turretsOperational * 10; // 10/s per turret

    // Calculate if turrets are actively firing (pollution > passive suppression)
    const drones = gameState.resources['drone'] || { current: 0, max: 10 };
    const passiveSuppression = 20 + drones.current * 10; // Base + drones
    const turretsAreFiring = pollution > passiveSuppression && gameState.combat.turretsOperational > 0;
    const actualAmmoConsumption = turretsAreFiring ? gameState.combat.turretsOperational * 2 : 0;

    html += `
        <div class="battle-unit-column">
            <div class="column-header firepower">🔫 火力</div>
            <div class="unit-stat-card">
                <div class="stat-title">总压制力</div>
                <div class="stat-value">${suppression.toFixed(1)}/s</div>
                <div class="stat-detail">
                    <span class="neutral">基地: 20/s</span>
                    <span class="neutral">无人机: ${(drones.current * 10).toFixed(0)}/s</span>
                </div>
            </div>
            <div class="unit-stat-card sub">
                <div class="stat-row">
                    <span class="stat-label">机枪塔 (${gameState.combat.turretsOperational}座)</span>
                    <span class="stat-value-small">${turretsAreFiring ? '开火中' : '待机'}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">弹药</span>
                    <span class="stat-value-small">${Math.floor(ammo.current)}/${ammo.max}</span>
                </div>
                ${turretsAreFiring ? `<div class="stat-row">
                    <span class="stat-label">弹药消耗</span>
                    <span class="stat-value-small bad">-${actualAmmoConsumption}/s</span>
                </div>` : ''}
            </div>
        </div>`;

    // --- Column 3: LOGISTICS (后勤) ---
    const repairPacks = gameState.resources['repair-pack'] || { current: 0, max: 50 };
    const repairPercent = repairPacks.max > 0 ? (repairPacks.current / repairPacks.max) * 100 : 0;

    // Check if repair is active
    const needsRepair = totalDefenseHP < maxDefenseHP;
    const isRepairing = needsRepair && repairPacks.current > 0 && netThreat <= 0;

    html += `
        <div class="battle-unit-column">
            <div class="column-header logistics">🔧 后勤</div>
            <div class="unit-stat-card">
                <div class="stat-title">修复状态</div>
                <div class="stat-value">${isRepairing ? '修复中' : (needsRepair ? '待修复' : '完好')}</div>
                <div class="stat-detail">
                    <span class="neutral">修复包: ${Math.floor(repairPacks.current)}/${repairPacks.max}</span>
                </div>
            </div>
            <div class="unit-stat-card sub">
                <div class="stat-row">
                    <span class="stat-label">无人机</span>
                    <span class="stat-value-small">${Math.floor(drones.current)}个</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">修复速度</span>
                    <span class="stat-value-small">${isRepairing ? '12.5 HP/s' : '0 HP/s'}</span>
                </div>
                ${needsRepair && !isRepairing && repairPacks.current <= 0 ? `<div class="stat-row">
                    <span class="stat-label bad">缺少修复包!</span>
                </div>` : ''}
            </div>
        </div>`;

    html += '</div>'; // End battle-units-grid

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
    const repairPacks = gameState.resources['repair-pack']?.current || 0;

    let unitInfo = '';
    if (selectedUnit) {
        if (selectedUnit.type === 'player' && selectedUnit.id) {
            // Player unit selected (base, turret, drone)
            if (selectedUnit.id === 'base') {
                unitInfo = `
                    <div class="info-section">
                        <div class="info-section-title">基地</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px;">攻击力: 20/秒</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px;">生命值: ${baseHp}/${baseMaxHp}</div>
                        <div class="health-bar-container">
                            <div class="health-bar" style="width: ${basePercent}%"></div>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-dim); margin-top: 8px;">基地是你的核心，被摧毁即游戏结束</div>
                    </div>`;
            } else if (selectedUnit.id === 'turret') {
                const operational = gameState.combat.turretsOperational;
                const damaged = gameState.combat.turretsDamaged;
                const total = operational + damaged;
                const hpPercent = total > 0 ? (operational / total) * 100 : 0;
                const canRepair = damaged > 0 && repairPacks >= 3 && !gameState.combat.inBattle;

                unitInfo = `
                    <div class="info-section">
                        <div class="info-section-title">机枪塔</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px;">攻击力: ${operational * 5}/秒</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px;">可用: ${operational}座</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px; color: ${damaged > 0 ? 'var(--danger-color)' : 'inherit'};">损坏: ${damaged}座</div>
                        <div class="health-bar-container">
                            <div class="health-bar" style="width: ${hpPercent}%"></div>
                        </div>
                        ${damaged > 0 ? `
                            <div style="margin-top: 10px;">
                                <button class="btn btn-repair ${canRepair ? '' : 'disabled'}" onclick="repairTurret()" ${canRepair ? '' : 'disabled'}>
                                    修复 (消耗3修复包)
                                </button>
                                <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 4px;">
                                    修复包: ${repairPacks}
                                    ${gameState.combat.inBattle ? ' (战斗中无法修复)' : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>`;
            } else if (selectedUnit.id === 'drone') {
                const drones = gameState.resources['drone'];
                const current = drones?.current || 0;
                const damaged = drones?.damaged || 0;
                const max = drones?.max || 10;
                const total = current + damaged;
                const hpPercent = total > 0 ? (current / total) * 100 : 0;
                const canRepair = damaged > 0 && repairPacks >= 1 && !gameState.combat.inBattle;

                unitInfo = `
                    <div class="info-section">
                        <div class="info-section-title">无人机</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px;">攻击力: ${current * 10}/秒</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px;">可用: ${current}/${max}</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px; color: ${damaged > 0 ? 'var(--danger-color)' : 'inherit'};">损坏: ${damaged}架</div>
                        <div class="health-bar-container">
                            <div class="health-bar" style="width: ${hpPercent}%"></div>
                        </div>
                        ${damaged > 0 ? `
                            <div style="margin-top: 10px;">
                                <button class="btn btn-repair ${canRepair ? '' : 'disabled'}" onclick="repairDrone()" ${canRepair ? '' : 'disabled'}>
                                    修复 (消耗1修复包)
                                </button>
                                <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 4px;">
                                    修复包: ${repairPacks}
                                    ${gameState.combat.inBattle ? ' (战斗中无法修复)' : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>`;
            }
        } else if (selectedUnit.type === 'enemy') {
            // Enemy unit selected
            const unit = gameState.combat.enemyUnits[selectedUnit.index];
            if (unit) {
                const hpPercent = (Math.max(0, unit.hp) / unit.maxHp) * 100;
                unitInfo = `
                    <div class="info-section">
                        <div class="info-section-title">敌方单位</div>
                        <div style="font-size: 1rem; color: var(--danger-color); margin-bottom: 8px;">${unit.name}</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px;">数量: ${unit.count}</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px;">攻击力: ${unit.attack}/秒</div>
                        <div style="font-size: 0.9rem; margin-bottom: 4px;">生命值: ${Math.floor(unit.hp)}/${unit.maxHp}</div>
                        <div class="health-bar-container enemy-hp-container">
                            <div class="health-bar enemy-hp" style="width: ${hpPercent}%"></div>
                        </div>
                    </div>`;
            }
        }
    }

    return `
        <div class="info-header">
            <span class="info-name">战斗状态</span>
            <span class="info-status">${gameState.combat.inBattle ? '战斗中' : '安全'}</span>
        </div>
        <div class="info-section">
            <div class="info-section-title">总攻击力</div>
            <div style="font-size: 1.1rem; color: var(--primary-color); margin: 4px 0;">${getPlayerAttackPower()}/秒</div>
        </div>
        <div class="info-section">
            <div class="info-section-title">威胁等级</div>
            <div style="font-size: 1rem; color: var(--warning-color); margin: 4px 0;">Lv.${threat}</div>
            ${threat >= gameState.threat.minThreshold
                ? `<div style="color: var(--text-dim); font-size: 0.85rem;">下波攻击: ${timer}秒</div>`
                : `<div style="color: var(--success-color); font-size: 0.85rem;">安全 (威胁低于${gameState.threat.minThreshold}级)</div>`
            }
        </div>
        ${unitInfo}`;
}

function selectUnit(type, index, id = null) {
    selectedUnit = { type, index, id };
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
                // Enhanced rate indicator with arrows and critical state
                let rateClass = 'rate-indicator neutral';
                let rateArrow = '';
                if (net > 0.1) {
                    rateClass = 'rate-indicator positive';
                    rateArrow = '▲ ';
                } else if (net < -5) {
                    rateClass = 'rate-indicator critical';  // Severe deficit
                    rateArrow = '▼ ';
                } else if (net < -0.1) {
                    rateClass = 'rate-indicator negative';
                    rateArrow = '▼ ';
                }
                rateEl.textContent = `${rateArrow}${net >= 0 ? '+' : ''}${net.toFixed(1)}/s`;
                rateEl.className = 'box-rate ' + rateClass;
            }
        }
    }
}

function updateBattleDisplay() {
    // During battle, re-render the entire tab for smooth updates
    if (gameState.combat.inBattle) {
        renderBattleTab();
        return;
    }

    // Update combat log
    const logContainer = document.querySelector('.log-entries');
    if (logContainer) {
        logContainer.innerHTML = gameState.combat.log.slice(-5)
            .map(entry => `<div class="log-entry">${entry}</div>`).join('');
    }

    // Update base HP bar
    const baseBox = document.querySelector('.unit-box.friendly[onclick*="base"]');
    if (baseBox) {
        const hpFill = baseBox.querySelector('.unit-hp-fill');
        if (hpFill) {
            const percent = (gameState.base.hp / gameState.base.maxHp) * 100;
            hpFill.style.width = `${percent}%`;
        }
    }

    // Update turret display
    const turretBox = document.querySelector('.unit-box.friendly[onclick*="turret"]');
    if (turretBox) {
        const totalTurrets = gameState.combat.turretsOperational + gameState.combat.turretsDamaged;
        const valueEl = turretBox.querySelector('.box-value');
        if (valueEl) {
            valueEl.textContent = `${gameState.combat.turretsOperational}/${totalTurrets}`;
        }
        const hpFill = turretBox.querySelector('.unit-hp-fill');
        if (hpFill && totalTurrets > 0) {
            const percent = (gameState.combat.turretsOperational / totalTurrets) * 100;
            hpFill.style.width = `${percent}%`;
        }
        // Update damaged state
        if (gameState.combat.turretsDamaged > 0) {
            turretBox.classList.add('unit-damaged');
        } else {
            turretBox.classList.remove('unit-damaged');
        }
    }

    // Update drone display
    const droneBox = document.querySelector('.unit-box.friendly[onclick*="drone"]');
    const drones = gameState.resources['drone'];
    if (droneBox && drones) {
        const valueEl = droneBox.querySelector('.box-value');
        if (valueEl) {
            valueEl.textContent = `${drones.current}/${drones.max}`;
        }
        const totalDrones = drones.current + (drones.damaged || 0);
        const hpFill = droneBox.querySelector('.unit-hp-fill');
        if (hpFill && totalDrones > 0) {
            const percent = (drones.current / totalDrones) * 100;
            hpFill.style.width = `${percent}%`;
        }
        // Update damaged state
        if ((drones.damaged || 0) > 0) {
            droneBox.classList.add('unit-damaged');
        } else {
            droneBox.classList.remove('unit-damaged');
        }
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

// ===== FLOATING TEXT SYSTEM (Juice) =====
function spawnFloatingText(x, y, text, color = '#fff', isCritical = false) {
    // Node.js environment: skip
    if (typeof document === 'undefined') return;

    const el = document.createElement('div');
    el.className = 'float-text' + (isCritical ? ' critical' : '');
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    document.body.appendChild(el);

    // Remove after animation ends
    setTimeout(() => el.remove(), isCritical ? 1200 : 1000);
}

// Spawn floating text at element center
function spawnFloatingTextAtElement(element, text, color = '#fff', isCritical = false) {
    if (!element || typeof document === 'undefined') return;
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    spawnFloatingText(x, y, text, color, isCritical);
}

// ===== DANGER OVERLAY MANAGEMENT =====
function updateDangerOverlay() {
    if (typeof document === 'undefined') return;

    let overlay = document.getElementById('screen-danger-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'screen-danger-overlay';
        overlay.className = 'screen-danger-overlay';
        document.body.appendChild(overlay);
    }

    // Show overlay when threat is overwhelming
    const netThreat = gameState.combat.netThreat || 0;
    const isInDanger = netThreat > 0 && gameState.combat.inBattle;
    overlay.classList.toggle('active', isInDanger);
}

function showToast(message, type = 'info') {
    // Node.js environment: just log to console
    if (typeof document === 'undefined') {
        // Suppress logs in headless mode unless it's an error
        if (type === 'error') {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
        return;
    }

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

// Browser environment: auto-init on DOM load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', init);
}

// ============================================================
// NODE.JS MODULE EXPORTS (for headless testing)
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Game state and data
        getGameState: () => gameState,
        getGameData: () => GameData,

        // Initialize with custom data
        initHeadless: function(data) {
            GameData = data;
            // Initialize resources
            for (const [id, resData] of Object.entries(GameData.resources)) {
                gameState.resources[id] = {
                    current: 0,
                    max: resData.baseStorage || 500
                };
            }
            // Initialize drone damaged tracking
            if (gameState.resources['drone']) {
                gameState.resources['drone'].damaged = 0;
            }
            // Initialize buildings
            for (const id of Object.keys(GameData.buildings)) {
                gameState.buildings[id] = 0;
            }
            // Initialize stats
            for (const id of Object.keys(GameData.resources)) {
                gameState.stats.totalProduction[id] = 0;
                gameState.stats.totalConsumption[id] = 0;
            }
        },

        // Reset game state for new test
        resetGame: function() {
            // Reset resources
            for (const [id, resData] of Object.entries(GameData.resources)) {
                gameState.resources[id] = {
                    current: 0,
                    max: resData.baseStorage || 500
                };
            }
            if (gameState.resources['drone']) {
                gameState.resources['drone'].damaged = 0;
            }
            // Reset buildings
            for (const id of Object.keys(GameData.buildings)) {
                gameState.buildings[id] = 0;
            }
            // Reset stats
            for (const id of Object.keys(GameData.resources)) {
                gameState.stats.totalProduction[id] = 0;
                gameState.stats.totalConsumption[id] = 0;
            }
            // Reset combat
            gameState.combat = {
                inBattle: false,
                playerUnits: [],
                enemyUnits: [],
                log: [],
                turretsOperational: 0,
                turretsDamaged: 0,
                // Flow combat state (V2.0)
                pollution: 0,
                suppression: 0,
                netThreat: 0,
                defenseHP: 0,
                defenseMaxHP: 0,
                turretRepairProgress: 0,
                droneRepairProgress: 0
            };
            // Reset threat
            gameState.threat = {
                level: 0,
                timer: 60,
                timerMax: 60,
                minThreshold: 2
            };
            // Reset base
            gameState.base = {
                hp: 1000,
                maxHp: 1000,
                energyGeneration: 10
            };
            // Reset research
            gameState.research = {
                completed: []
            };
        },

        // Resource management
        getResource,
        getResourceMax,
        addResource,
        removeResource,
        canAfford,
        spendResources,
        getNetRate,
        getProductionRate,
        getConsumptionRate,

        // Space management
        getSpaceUsed,
        getSpaceMax,
        getSpaceAvailable,

        // Building management
        getBuildingCount,

        // Core simulation functions
        resetTickStats,
        processBuildings,
        updateThreat,
        spawnEnemyWave,
        processCombat,

        // Flow combat (V2.0)
        getTotalPollutionRate,
        getSuppressionRate,
        processCombatFlow,
        processRepairFlow,

        // Combat helpers
        getPlayerAttackPower,
        getEnemyAttackPower,
        applyDamageToPlayer,
        getPlayerTotalHP,
        getPlayerMaxHP,
        getEnemyTotalHP,
        getEnemyMaxHP,

        // Direct state access for tests
        setResource: function(id, value) {
            if (gameState.resources[id]) {
                gameState.resources[id].current = value;
            }
        },
        setBuilding: function(id, count) {
            gameState.buildings[id] = count;
            // Sync turret count with combat state
            if (id === 'turret-basic') {
                gameState.combat.turretsOperational = count;
            }
        },
        setThreatLevel: function(level) {
            gameState.threat.level = level;
        },
        setBaseHP: function(hp) {
            gameState.base.hp = hp;
        },

        // Constants
        TICK_RATE,
        TICK_SECONDS
    };
}
