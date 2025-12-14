#!/usr/bin/env node
/**
 * Validate consolidated data.json
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data.json');
let data;

console.log('🔍 Validating data.json...\n');

try {
  data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log('✅ JSON syntax is valid\n');
} catch (err) {
  console.error('❌ JSON syntax error:', err.message);
  process.exit(1);
}

let errors = 0;
let warnings = 0;

// ===== VALIDATE ITEMS =====
console.log('📦 Validating items...');
const itemIds = Object.keys(data.items);
console.log(`  Found ${itemIds.length} items`);

// ===== VALIDATE BUILDINGS =====
console.log('\n🏭 Validating buildings...');
const buildingIds = Object.keys(data.buildings);
console.log(`  Found ${buildingIds.length} buildings`);

Object.values(data.buildings).forEach(building => {
  // Check cost items exist
  if (building.cost) {
    Object.keys(building.cost).forEach(itemId => {
      if (!data.items[itemId]) {
        console.error(`  ❌ Building "${building.name}" requires unknown item: ${itemId}`);
        errors++;
      }
    });
  }

  // Check tech requirements exist
  if (building.requiresTech && !data.technologies[building.requiresTech]) {
    console.error(`  ❌ Building "${building.name}" requires unknown tech: ${building.requiresTech}`);
    errors++;
  }

  // Check fuel consumption items exist
  if (building.fuelConsumption) {
    Object.keys(building.fuelConsumption).forEach(itemId => {
      if (!data.items[itemId]) {
        console.error(`  ❌ Building "${building.name}" uses unknown fuel: ${itemId}`);
        errors++;
      }
    });
  }
});

if (errors === 0) console.log('  ✅ All buildings valid');

// ===== VALIDATE RECIPES =====
console.log('\n⚗️  Validating recipes...');
const recipeIds = Object.keys(data.recipes);
console.log(`  Found ${recipeIds.length} recipes`);

Object.values(data.recipes).forEach(recipe => {
  // Check building types exist
  recipe.buildingTypes.forEach(buildingId => {
    if (!data.buildings[buildingId]) {
      console.error(`  ❌ Recipe "${recipe.name}" requires unknown building: ${buildingId}`);
      errors++;
    }
  });

  // Check ingredients exist
  Object.keys(recipe.ingredients).forEach(itemId => {
    if (!data.items[itemId]) {
      console.error(`  ❌ Recipe "${recipe.name}" uses unknown ingredient: ${itemId}`);
      errors++;
    }
  });

  // Check results exist
  Object.keys(recipe.results).forEach(itemId => {
    if (!data.items[itemId]) {
      console.error(`  ❌ Recipe "${recipe.name}" produces unknown item: ${itemId}`);
      errors++;
    }
  });

  // Check tech requirements exist
  if (recipe.requiresTech && !data.technologies[recipe.requiresTech]) {
    console.error(`  ❌ Recipe "${recipe.name}" requires unknown tech: ${recipe.requiresTech}`);
    errors++;
  }
});

if (errors === 0) console.log('  ✅ All recipes valid');

// ===== VALIDATE TECHNOLOGIES =====
console.log('\n🔬 Validating technologies...');
const techIds = Object.keys(data.technologies);
console.log(`  Found ${techIds.length} technologies`);

Object.values(data.technologies).forEach(tech => {
  // Check science pack costs exist
  Object.keys(tech.cost).forEach(itemId => {
    if (!data.items[itemId]) {
      console.error(`  ❌ Tech "${tech.name}" requires unknown science pack: ${itemId}`);
      errors++;
    }
  });

  // Check prerequisites exist
  if (tech.prerequisites) {
    tech.prerequisites.forEach(prereqId => {
      if (!data.technologies[prereqId]) {
        console.error(`  ❌ Tech "${tech.name}" requires unknown prerequisite: ${prereqId}`);
        errors++;
      }
    });
  }

  // Check unlocked buildings exist
  if (tech.unlocks && tech.unlocks.buildings) {
    tech.unlocks.buildings.forEach(buildingId => {
      if (!data.buildings[buildingId]) {
        console.error(`  ❌ Tech "${tech.name}" unlocks unknown building: ${buildingId}`);
        errors++;
      }
    });
  }

  // Check unlocked recipes exist
  if (tech.unlocks && tech.unlocks.recipes) {
    tech.unlocks.recipes.forEach(recipeId => {
      if (!data.recipes[recipeId]) {
        console.error(`  ❌ Tech "${tech.name}" unlocks unknown recipe: ${recipeId}`);
        errors++;
      }
    });
  }
});

if (errors === 0) console.log('  ✅ All technologies valid');

// ===== VALIDATE UNITS =====
console.log('\n🤖 Validating units...');
const unitIds = Object.keys(data.units);
console.log(`  Found ${unitIds.length} units`);

Object.values(data.units).forEach(unit => {
  // Check cost items exist
  if (unit.cost) {
    Object.keys(unit.cost).forEach(itemId => {
      if (!data.items[itemId]) {
        console.error(`  ❌ Unit "${unit.name}" requires unknown item: ${itemId}`);
        errors++;
      }
    });
  }

  // Check ammo exists
  if (unit.combat && unit.combat.ammoPerTurn) {
    Object.keys(unit.combat.ammoPerTurn).forEach(itemId => {
      if (!data.items[itemId]) {
        console.error(`  ❌ Unit "${unit.name}" uses unknown ammo: ${itemId}`);
        errors++;
      }
    });
  }

  // Check tech requirements exist
  if (unit.requiresTech && !data.technologies[unit.requiresTech]) {
    console.error(`  ❌ Unit "${unit.name}" requires unknown tech: ${unit.requiresTech}`);
    errors++;
  }
});

if (errors === 0) console.log('  ✅ All units valid');

// ===== VALIDATE ENEMIES =====
console.log('\n👾 Validating enemies...');
const enemyIds = Object.keys(data.enemies);
console.log(`  Found ${enemyIds.length} enemies`);

Object.values(data.enemies).forEach(enemy => {
  // Check spawn types exist
  if (enemy.spawnPerTurn) {
    Object.keys(enemy.spawnPerTurn).forEach(spawnId => {
      if (!data.enemies[spawnId]) {
        console.error(`  ❌ Enemy "${enemy.name}" spawns unknown enemy: ${spawnId}`);
        errors++;
      }
    });
  }

  // Check next phase exists
  if (enemy.nextPhase && !data.enemies[enemy.nextPhase]) {
    console.error(`  ❌ Enemy "${enemy.name}" transitions to unknown phase: ${enemy.nextPhase}`);
    errors++;
  }
});

if (errors === 0) console.log('  ✅ All enemies valid');

// ===== VALIDATE REGIONS =====
console.log('\n🗺️  Validating regions...');
console.log(`  Found ${data.regions.length} regions`);

data.regions.forEach(region => {
  // Check resource nodes reference valid items
  region.resourceNodes.forEach(node => {
    if (!data.items[node.type]) {
      console.error(`  ❌ Region ${region.id} "${region.name}" has unknown resource: ${node.type}`);
      errors++;
    }
  });

  // Check enemies exist
  if (region.enemies) {
    region.enemies.forEach(spawn => {
      if (!data.enemies[spawn.type]) {
        console.error(`  ❌ Region ${region.id} "${region.name}" has unknown enemy: ${spawn.type}`);
        errors++;
      }
    });
  }
});

// Check boss regions
const bossRegions = data.regions.filter(r => r.name.includes('BOSS'));
console.log(`  ✓ Found ${bossRegions.length} boss regions: ${bossRegions.map(r => r.id).join(', ')}`);

if (errors === 0) console.log('  ✅ All regions valid');

// ===== FINAL SUMMARY =====
console.log('\n' + '='.repeat(50));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(50));
console.log(`Items: ${itemIds.length}`);
console.log(`Buildings: ${buildingIds.length}`);
console.log(`Recipes: ${recipeIds.length}`);
console.log(`Technologies: ${techIds.length}`);
console.log(`Units: ${unitIds.length}`);
console.log(`Enemies: ${enemyIds.length}`);
console.log(`Regions: ${data.regions.length}`);
console.log(`Boss Regions: ${bossRegions.map(r => r.id).join(', ')}`);
console.log('='.repeat(50));

if (errors > 0) {
  console.log(`\n❌ Found ${errors} error(s)`);
  process.exit(1);
} else {
  console.log('\n✅ All validation checks passed!');
  console.log('🎉 data.json is ready for use!');
}
