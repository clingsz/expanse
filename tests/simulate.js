#!/usr/bin/env node
// Game simulation script
// Usage: node simulate.js

const fs = require('fs');
const path = require('path');

// Load game data
const dataDir = path.join(__dirname, 'data');
const GameData = {
    items: JSON.parse(fs.readFileSync(path.join(dataDir, 'items.json'), 'utf8')).items,
    buildings: JSON.parse(fs.readFileSync(path.join(dataDir, 'buildings.json'), 'utf8')).buildings,
    recipes: JSON.parse(fs.readFileSync(path.join(dataDir, 'recipes.json'), 'utf8')).recipes,
    technologies: JSON.parse(fs.readFileSync(path.join(dataDir, 'technologies.json'), 'utf8')).technologies,
    units: JSON.parse(fs.readFileSync(path.join(dataDir, 'units.json'), 'utf8')).units,
    enemies: JSON.parse(fs.readFileSync(path.join(dataDir, 'enemies.json'), 'utf8')).enemies,
    regionTemplates: JSON.parse(fs.readFileSync(path.join(dataDir, 'regions.json'), 'utf8')).regions
};

// Initialize game state
const gameState = {
    currentRegionId: 1,
    regions: [],
    resources: {},
    researchedTech: [],
    currentResearch: null,
    researchProgress: 0,
    buildingIdCounter: 1
};

// Initialize resources
Object.entries(GameData.items).forEach(([id, item]) => {
    gameState.resources[id] = { current: 0, max: 500 };
});

// Starting resources
gameState.resources['iron-plate'].current = 500;
gameState.resources['copper-plate'].current = 300;
gameState.resources['stone'].current = 200;
gameState.resources['gear'].current = 100;
gameState.resources['circuit'].current = 50;

// Initialize region 1
const region1 = {
    id: 1,
    name: "区域 1",
    slotsTotal: 16,
    slotsUsed: 0,
    resourceNodes: GameData.regionTemplates[0].resourceNodes.map(n => ({...n})),
    buildings: [],
    conquered: true
};
gameState.regions.push(region1);

function log(msg) {
    console.log(`[T=${ticks.toFixed(1)}] ${msg}`);
}

function getCurrentRegion() {
    return gameState.regions.find(r => r.id === gameState.currentRegionId);
}

// Actions
function build(buildingId, resourceNodeIndex = null, recipeId = null) {
    const region = getCurrentRegion();
    const template = GameData.buildings[buildingId];

    if (!template) {
        log(`❌ Building ${buildingId} not found`);
        return false;
    }

    // Check tech
    if (template.requiresTech && !gameState.researchedTech.includes(template.requiresTech)) {
        log(`❌ ${template.name} requires tech ${template.requiresTech}`);
        return false;
    }

    // Check cost
    if (template.cost) {
        for (let [item, amount] of Object.entries(template.cost)) {
            if (gameState.resources[item].current < amount) {
                log(`❌ Not enough ${item} (need ${amount}, have ${gameState.resources[item].current})`);
                return false;
            }
        }
    }

    // Check slots
    if (region.slotsUsed + template.slots > region.slotsTotal) {
        log(`❌ Not enough slots`);
        return false;
    }

    // Deduct cost
    if (template.cost) {
        for (let [item, amount] of Object.entries(template.cost)) {
            gameState.resources[item].current -= amount;
        }
    }

    // Build
    const building = {
        id: gameState.buildingIdCounter++,
        buildingId: buildingId,
        active: true,
        productionProgress: 0
    };

    if (resourceNodeIndex !== null) {
        building.resourceNodeIndex = resourceNodeIndex;
    }
    if (recipeId) {
        building.recipeId = recipeId;
    }

    region.buildings.push(building);
    region.slotsUsed += template.slots;

    log(`✓ Built ${template.name} #${building.id}`);
    return building.id;
}

function setRecipe(buildingId, recipeId) {
    const region = getCurrentRegion();
    const building = region.buildings.find(b => b.id === buildingId);
    if (!building) {
        log(`❌ Building #${buildingId} not found`);
        return false;
    }
    building.recipeId = recipeId;
    building.productionProgress = 0;
    log(`✓ Set recipe ${recipeId} on building #${buildingId}`);
    return true;
}

function research(techId) {
    if (gameState.researchedTech.includes(techId)) {
        log(`❌ ${techId} already researched`);
        return false;
    }
    gameState.currentResearch = techId;
    gameState.researchProgress = 0;
    log(`✓ Started research: ${techId}`);
    return true;
}

let ticks = 0;

function wait(numTicks) {
    const deltaTime = 0.1;
    for (let i = 0; i < numTicks; i++) {
        ticks += deltaTime;
        tick(deltaTime);
    }
    log(`Waited ${numTicks * deltaTime}s`);
}

function tick(deltaTime) {
    const region = getCurrentRegion();

    // Production
    region.buildings.forEach(building => {
        if (!building.active) return;
        const template = GameData.buildings[building.buildingId];

        // Mining
        if (template.category === 'mining' && building.resourceNodeIndex !== undefined) {
            const node = region.resourceNodes[building.resourceNodeIndex];
            if (node.amount <= 0) return;

            const produceAmount = node.rate * template.speed * deltaTime;
            const actualAmount = Math.min(produceAmount, node.amount);

            node.amount -= actualAmount;
            gameState.resources[node.type].current += actualAmount;
        }

        // Production
        if (template.category === 'production' && building.recipeId) {
            const recipe = GameData.recipes[building.recipeId];
            if (!recipe) return;

            if (building.productionProgress === undefined) {
                building.productionProgress = 0;
            }

            const speed = template.speed || 1.0;
            const progressPerSecond = speed / recipe.time;
            building.productionProgress += progressPerSecond * deltaTime;

            if (building.productionProgress >= 1.0) {
                // Check ingredients
                let canProduce = true;
                for (let [ing, amt] of Object.entries(recipe.ingredients)) {
                    if (gameState.resources[ing].current < amt) {
                        canProduce = false;
                        break;
                    }
                }

                if (canProduce) {
                    // Consume
                    for (let [ing, amt] of Object.entries(recipe.ingredients)) {
                        gameState.resources[ing].current -= amt;
                    }
                    // Produce
                    for (let [res, amt] of Object.entries(recipe.results)) {
                        gameState.resources[res].current += amt;
                    }
                    building.productionProgress -= 1.0;
                } else {
                    building.productionProgress = 0;
                }
            }
        }

        // Research
        if (template.category === 'science' && gameState.currentResearch) {
            const tech = GameData.technologies[gameState.currentResearch];
            if (!tech) return;

            const researchSpeed = template.researchSpeed || 1.0;
            const progressPerSecond = researchSpeed / tech.researchTime;
            gameState.researchProgress += progressPerSecond * deltaTime;

            // Consume science packs
            for (let [scienceId, totalAmount] of Object.entries(tech.cost)) {
                const consumeRate = (totalAmount / tech.researchTime) * deltaTime * researchSpeed;
                gameState.resources[scienceId].current -= consumeRate;
                gameState.resources[scienceId].current = Math.max(0, gameState.resources[scienceId].current);
            }

            if (gameState.researchProgress >= 1.0) {
                gameState.researchedTech.push(gameState.currentResearch);
                log(`✅ Research completed: ${gameState.currentResearch}`);
                gameState.currentResearch = null;
                gameState.researchProgress = 0;
            }
        }
    });
}

function status() {
    const region = getCurrentRegion();
    log(`Region ${region.id}: ${region.buildings.length} buildings, ${region.slotsUsed}/${region.slotsTotal} slots`);
    log(`Resources: Iron=${gameState.resources['iron-plate'].current.toFixed(0)}, Copper=${gameState.resources['copper-plate'].current.toFixed(0)}, Gear=${gameState.resources['gear'].current.toFixed(0)}, Circuit=${gameState.resources['circuit'].current.toFixed(0)}`);
    log(`Research: ${gameState.researchedTech.length} techs, Current=${gameState.currentResearch || 'none'}`);
}

// Simulation: Conquer Region 2
console.log('=== Simulation: Conquer Region 2 ===\n');

log('Initial state');
status();

log('\n--- Phase 1: Setup Basic Production ---');
build('wind-turbine');
build('miner-mk1', 0); // iron-ore
build('miner-mk1', 1); // copper-ore
build('furnace');
setRecipe(4, 'iron-smelting');
build('furnace');
setRecipe(5, 'copper-smelting');

wait(50);
status();

log('\n--- Phase 2: Research and Production ---');
build('assembler-mk1');
setRecipe(6, 'gear');
build('research-lab');

wait(30);
gameState.resources['science-basic'].current = 100; // Cheat for demo
research('basic-military');

wait(30);
status();

log('\n--- Phase 3: Build Military Units ---');
build('assembler-mk1');
setRecipe(8, 'normal-bullet');
build('assembler-mk1');
setRecipe(9, 'machinegun-drone');

wait(50);
status();

log(`\nFinal: Bullets=${gameState.resources['normal-bullet']?.current || 0}, Drones=${gameState.resources['machinegun-drone']?.current || 0}`);
log('\n✅ Simulation completed!');
