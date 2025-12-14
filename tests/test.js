#!/usr/bin/env node
// Self-test script for Expansion Front game
// Usage: node test.js

const fs = require('fs');
const path = require('path');

let errors = 0;
let warnings = 0;

function error(msg) {
    console.error(`❌ ${msg}`);
    errors++;
}

function warn(msg) {
    console.warn(`⚠️  ${msg}`);
    warnings++;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

// Load JSON files
const dataDir = path.join(__dirname, 'data');
let items, buildings, recipes, technologies, units, enemies, regions;

try {
    items = JSON.parse(fs.readFileSync(path.join(dataDir, 'items.json'), 'utf8')).items;
    buildings = JSON.parse(fs.readFileSync(path.join(dataDir, 'buildings.json'), 'utf8')).buildings;
    recipes = JSON.parse(fs.readFileSync(path.join(dataDir, 'recipes.json'), 'utf8')).recipes;
    technologies = JSON.parse(fs.readFileSync(path.join(dataDir, 'technologies.json'), 'utf8')).technologies;
    units = JSON.parse(fs.readFileSync(path.join(dataDir, 'units.json'), 'utf8')).units;
    enemies = JSON.parse(fs.readFileSync(path.join(dataDir, 'enemies.json'), 'utf8')).enemies;
    regions = JSON.parse(fs.readFileSync(path.join(dataDir, 'regions.json'), 'utf8')).regions;
    ok('All JSON files loaded');
} catch (e) {
    error(`Failed to load JSON: ${e.message}`);
    process.exit(1);
}

// Test 1: Check building tech requirements exist
Object.entries(buildings).forEach(([id, building]) => {
    if (building.requiresTech && !technologies[building.requiresTech]) {
        error(`Building ${id} requires non-existent tech: ${building.requiresTech}`);
    }
});

// Test 2: Check recipe ingredients/results exist in items
Object.entries(recipes).forEach(([id, recipe]) => {
    if (recipe.ingredients) {
        Object.keys(recipe.ingredients).forEach(item => {
            if (!items[item]) error(`Recipe ${id} ingredient not found: ${item}`);
        });
    }
    if (recipe.results) {
        Object.keys(recipe.results).forEach(item => {
            if (!items[item] && !units[item]) error(`Recipe ${id} result not found: ${item}`);
        });
    }
    if (recipe.requiresTech && !technologies[recipe.requiresTech]) {
        error(`Recipe ${id} requires non-existent tech: ${recipe.requiresTech}`);
    }
});

// Test 3: Check tech unlocks reference existing buildings/recipes
Object.entries(technologies).forEach(([id, tech]) => {
    if (tech.unlocks) {
        if (tech.unlocks.buildings) {
            tech.unlocks.buildings.forEach(b => {
                if (!buildings[b]) error(`Tech ${id} unlocks non-existent building: ${b}`);
            });
        }
        if (tech.unlocks.recipes) {
            tech.unlocks.recipes.forEach(r => {
                if (!recipes[r]) error(`Tech ${id} unlocks non-existent recipe: ${r}`);
            });
        }
    }
    if (tech.prerequisites) {
        tech.prerequisites.forEach(prereq => {
            if (!technologies[prereq]) error(`Tech ${id} prerequisite not found: ${prereq}`);
        });
    }
});

// Test 4: Check region resource nodes reference existing items
regions.forEach((region, idx) => {
    region.resourceNodes.forEach((node, nIdx) => {
        if (!items[node.type]) {
            error(`Region ${region.id} node ${nIdx} references non-existent item: ${node.type}`);
        }
    });
    region.enemies.forEach((enemy, eIdx) => {
        if (!enemies[enemy.type]) {
            error(`Region ${region.id} enemy ${eIdx} references non-existent enemy: ${enemy.type}`);
        }
    });
});

// Test 5: Check building costs reference existing items
Object.entries(buildings).forEach(([id, building]) => {
    if (building.cost) {
        Object.keys(building.cost).forEach(item => {
            if (!items[item]) error(`Building ${id} cost references non-existent item: ${item}`);
        });
    }
});

// Summary
console.log('\n' + '='.repeat(50));
if (errors === 0 && warnings === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
} else {
    console.log(`Found ${errors} error(s), ${warnings} warning(s)`);
    process.exit(errors > 0 ? 1 : 0);
}
