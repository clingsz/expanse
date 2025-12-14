#!/usr/bin/env node
/**
 * 数据验证脚本
 * 检查游戏数据的完整性和一致性
 */

const fs = require('fs');
const path = require('path');

// 读取数据文件
function loadJSON(filename) {
    const filePath = path.join(__dirname, 'data', filename);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
}

const buildings = loadJSON('buildings.json').buildings;
const recipes = loadJSON('recipes.json').recipes;
const technologies = loadJSON('technologies.json').technologies;
const items = loadJSON('items.json').items;

let errors = [];
let warnings = [];

console.log('🔍 开始验证游戏数据...\n');

// ==================== 1. 验证 Recipes ====================
console.log('📋 验证配方 (Recipes)...');
Object.entries(recipes).forEach(([recipeId, recipe]) => {
    // 检查 requiresTech
    if (recipe.requiresTech !== null && recipe.requiresTech !== undefined) {
        if (!technologies[recipe.requiresTech]) {
            errors.push(`❌ Recipe "${recipeId}" 需要科技 "${recipe.requiresTech}"，但该科技不存在`);
        }
    }

    // 检查 buildingTypes 是否存在
    if (recipe.buildingTypes) {
        recipe.buildingTypes.forEach(buildingType => {
            const buildingExists = Object.values(buildings).some(b => b.id === buildingType);
            if (!buildingExists) {
                errors.push(`❌ Recipe "${recipeId}" 需要建筑 "${buildingType}"，但该建筑不存在`);
            }
        });
    }

    // 检查 ingredients 中的物品是否存在
    if (recipe.ingredients) {
        Object.keys(recipe.ingredients).forEach(itemId => {
            if (!items[itemId]) {
                errors.push(`❌ Recipe "${recipeId}" 的原料 "${itemId}" 不存在于 items.json`);
            }
        });
    }

    // 检查 results 中的物品是否存在
    if (recipe.results) {
        Object.keys(recipe.results).forEach(itemId => {
            if (!items[itemId]) {
                errors.push(`❌ Recipe "${recipeId}" 的产物 "${itemId}" 不存在于 items.json`);
            }
        });
    }
});
console.log(`   检查了 ${Object.keys(recipes).length} 个配方\n`);

// ==================== 2. 验证 Buildings ====================
console.log('🏭 验证建筑 (Buildings)...');
Object.entries(buildings).forEach(([buildingId, building]) => {
    // 检查 requiresTech
    if (building.requiresTech !== null && building.requiresTech !== undefined) {
        if (!technologies[building.requiresTech]) {
            errors.push(`❌ Building "${buildingId}" 需要科技 "${building.requiresTech}"，但该科技不存在`);
        }
    }

    // 检查 cost 中的物品是否存在
    if (building.cost) {
        Object.keys(building.cost).forEach(itemId => {
            if (!items[itemId]) {
                errors.push(`❌ Building "${buildingId}" 的建造成本中的物品 "${itemId}" 不存在于 items.json`);
            }
        });
    }

    // 检查 fuelConsumption 中的物品是否存在
    if (building.fuelConsumption) {
        Object.keys(building.fuelConsumption).forEach(itemId => {
            if (!items[itemId]) {
                errors.push(`❌ Building "${buildingId}" 的燃料 "${itemId}" 不存在于 items.json`);
            }
        });
    }
});
console.log(`   检查了 ${Object.keys(buildings).length} 个建筑\n`);

// ==================== 3. 验证 Technologies ====================
console.log('🔬 验证科技 (Technologies)...');

// 3.1 检查 prerequisites 是否存在
Object.entries(technologies).forEach(([techId, tech]) => {
    if (tech.prerequisites && tech.prerequisites.length > 0) {
        tech.prerequisites.forEach(prereqId => {
            if (!technologies[prereqId]) {
                errors.push(`❌ 科技 "${techId}" 的前置科技 "${prereqId}" 不存在`);
            }
        });
    }

    // 检查 cost 中的科研包是否存在
    if (tech.cost) {
        Object.keys(tech.cost).forEach(itemId => {
            if (!items[itemId]) {
                errors.push(`❌ 科技 "${techId}" 的研究成本中的科研包 "${itemId}" 不存在于 items.json`);
            }
        });
    }

    // 检查 unlocks 中的内容是否存在
    if (tech.unlocks) {
        if (tech.unlocks.buildings) {
            tech.unlocks.buildings.forEach(buildingId => {
                if (!buildings[buildingId]) {
                    errors.push(`❌ 科技 "${techId}" 解锁的建筑 "${buildingId}" 不存在`);
                }
            });
        }
        if (tech.unlocks.recipes) {
            tech.unlocks.recipes.forEach(recipeId => {
                if (!recipes[recipeId]) {
                    errors.push(`❌ 科技 "${techId}" 解锁的配方 "${recipeId}" 不存在`);
                }
            });
        }
    }
});

// 3.2 检查科技树是否有循环依赖
console.log('   检查科技树循环依赖...');
function detectCycle(techId, visited = new Set(), recStack = new Set()) {
    if (recStack.has(techId)) {
        return true; // 找到循环
    }
    if (visited.has(techId)) {
        return false; // 已经访问过，且无循环
    }

    visited.add(techId);
    recStack.add(techId);

    const tech = technologies[techId];
    if (tech.prerequisites) {
        for (let prereqId of tech.prerequisites) {
            if (detectCycle(prereqId, visited, recStack)) {
                errors.push(`❌ 科技树存在循环依赖: ${techId} -> ${prereqId}`);
                return true;
            }
        }
    }

    recStack.delete(techId);
    return false;
}

Object.keys(technologies).forEach(techId => {
    detectCycle(techId);
});

// 3.3 检查科技树可达性（从无前置科技的科技开始）
console.log('   检查科技树可达性...');
const reachableTechs = new Set();

function markReachable(techId) {
    if (reachableTechs.has(techId)) return;
    reachableTechs.add(techId);

    // 找出所有依赖此科技的后续科技
    Object.entries(technologies).forEach(([id, tech]) => {
        if (tech.prerequisites && tech.prerequisites.includes(techId)) {
            markReachable(id);
        }
    });
}

// 从所有无前置科技的科技开始标记
Object.entries(technologies).forEach(([techId, tech]) => {
    if (!tech.prerequisites || tech.prerequisites.length === 0) {
        markReachable(techId);
    }
});

// 检查是否有不可达的科技
Object.keys(technologies).forEach(techId => {
    if (!reachableTechs.has(techId)) {
        warnings.push(`⚠️  科技 "${techId}" 无法从初始科技到达（可能形成孤岛）`);
    }
});

console.log(`   检查了 ${Object.keys(technologies).length} 个科技\n`);

// ==================== 4. 验证解锁关系 ====================
console.log('🔓 验证解锁关系...');

// 4.1 检查所有需要科技的配方，是否真的被某个科技解锁
Object.entries(recipes).forEach(([recipeId, recipe]) => {
    if (recipe.requiresTech) {
        const tech = technologies[recipe.requiresTech];
        if (tech && tech.unlocks && tech.unlocks.recipes) {
            if (!tech.unlocks.recipes.includes(recipeId)) {
                warnings.push(`⚠️  Recipe "${recipeId}" 需要科技 "${recipe.requiresTech}"，但该科技的 unlocks 列表中没有包含此配方`);
            }
        }
    }
});

// 4.2 检查所有需要科技的建筑，是否真的被某个科技解锁
Object.entries(buildings).forEach(([buildingId, building]) => {
    if (building.requiresTech) {
        const tech = technologies[building.requiresTech];
        if (tech && tech.unlocks && tech.unlocks.buildings) {
            if (!tech.unlocks.buildings.includes(buildingId)) {
                warnings.push(`⚠️  Building "${buildingId}" 需要科技 "${building.requiresTech}"，但该科技的 unlocks 列表中没有包含此建筑`);
            }
        }
    }
});

// 4.3 检查电路板是否有解锁科技
console.log('   特别检查：电路板 (circuit) 配方...');
const circuitRecipe = recipes['circuit'];
if (circuitRecipe) {
    if (circuitRecipe.requiresTech === null || circuitRecipe.requiresTech === undefined) {
        console.log('   ✅ 电路板 (circuit) 配方初始解锁，无需科技');
    } else {
        console.log(`   ✅ 电路板 (circuit) 配方需要科技: ${circuitRecipe.requiresTech}`);
    }
}

console.log('');

// ==================== 5. 显示结果 ====================
console.log('═══════════════════════════════════════');
console.log('📊 验证结果');
console.log('═══════════════════════════════════════\n');

if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ 所有检查通过！数据完整且一致。\n');
} else {
    if (errors.length > 0) {
        console.log(`🚨 发现 ${errors.length} 个错误:\n`);
        errors.forEach(err => console.log(err));
        console.log('');
    }

    if (warnings.length > 0) {
        console.log(`⚠️  发现 ${warnings.length} 个警告:\n`);
        warnings.forEach(warn => console.log(warn));
        console.log('');
    }

    if (errors.length > 0) {
        console.log('❌ 验证失败！请修复以上错误。\n');
        process.exit(1);
    } else {
        console.log('⚠️  验证通过，但存在警告。建议检查以上问题。\n');
    }
}
