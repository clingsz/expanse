#!/usr/bin/env node
/**
 * Add Phase 3 & 4 Technologies, Items, Recipes, and Buildings
 * Also fix boss counts to be exactly 1
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('🔧 Adding Phase 3 & 4 content...\n');

// ===== FIX BOSS COUNTS =====
console.log('📊 Fixing boss counts to 1...');
data.regions.forEach(region => {
  if (region.enemies && region.enemies.length > 0) {
    region.enemies.forEach(spawn => {
      if (spawn.type.includes('boss')) {
        spawn.count = 1;
        console.log(`  ✓ ${region.name}: ${spawn.type} = 1`);
      }
    });
  }
});

// ===== ADD PHASE 3 & 4 ITEMS =====
console.log('\n📊 Adding Phase 3 & 4 items...');

const newItems = {
  "plasma-charge": {
    "id": "plasma-charge",
    "name": "等离子充能包",
    "category": "ammo",
    "stackSize": 500,
    "storageWeight": 0.3
  },
  "fusion-cell": {
    "id": "fusion-cell",
    "name": "聚变电池",
    "category": "component",
    "stackSize": 100,
    "storageWeight": 2
  },
  "quantum-circuit": {
    "id": "quantum-circuit",
    "name": "量子电路",
    "category": "component",
    "stackSize": 50,
    "storageWeight": 2
  },
  "nanomaterial": {
    "id": "nanomaterial",
    "name": "纳米材料",
    "category": "material",
    "stackSize": 100,
    "storageWeight": 1
  },
  "antimatter-charge": {
    "id": "antimatter-charge",
    "name": "反物质充能",
    "category": "ammo",
    "stackSize": 100,
    "storageWeight": 1
  },
  "science-fusion": {
    "id": "science-fusion",
    "name": "聚变科研包",
    "category": "science",
    "stackSize": 100,
    "storageWeight": 2
  }
};

Object.assign(data.items, newItems);
console.log(`  ✓ Added ${Object.keys(newItems).length} new items`);

// ===== ADD PHASE 3 & 4 TECHNOLOGIES =====
console.log('\n📊 Adding Phase 3 & 4 technologies...');

const newTechs = {
  "advanced-military": {
    "id": "advanced-military",
    "name": "高级军事",
    "category": "military",
    "cost": {
      "science-basic": 300,
      "science-automation": 200,
      "science-chemical": 200,
      "science-nuclear": 100
    },
    "researchTime": 200,
    "prerequisites": ["laser-weapons", "nuclear-tech"],
    "unlocks": {
      "recipes": ["plasma-charge", "plasma-drone"]
    },
    "description": "解锁等离子武器"
  },
  "nuclear-weapons": {
    "id": "nuclear-weapons",
    "name": "核武器",
    "category": "military",
    "cost": {
      "science-nuclear": 300
    },
    "researchTime": 300,
    "prerequisites": ["nuclear-power"],
    "unlocks": {
      "recipes": ["artillery-drone"]
    },
    "description": "解锁炮台无人机"
  },
  "fusion-technology": {
    "id": "fusion-technology",
    "name": "聚变科技",
    "category": "nuclear",
    "cost": {
      "science-nuclear": 500
    },
    "researchTime": 500,
    "prerequisites": ["nuclear-power", "advanced-electronics"],
    "unlocks": {
      "buildings": ["fusion-reactor"],
      "recipes": ["fusion-cell", "science-fusion"]
    },
    "description": "解锁聚变反应堆和聚变科研包"
  },
  "quantum-computing": {
    "id": "quantum-computing",
    "name": "量子计算",
    "category": "electronics",
    "cost": {
      "science-nuclear": 400,
      "science-fusion": 200
    },
    "researchTime": 400,
    "prerequisites": ["fusion-technology"],
    "unlocks": {
      "recipes": ["quantum-circuit"]
    },
    "description": "解锁量子电路"
  },
  "nanofabrication": {
    "id": "nanofabrication",
    "name": "纳米制造",
    "category": "production",
    "cost": {
      "science-fusion": 300
    },
    "researchTime": 300,
    "prerequisites": ["quantum-computing"],
    "unlocks": {
      "recipes": ["nanomaterial"]
    },
    "description": "解锁纳米材料"
  },
  "antimatter-weapons": {
    "id": "antimatter-weapons",
    "name": "反物质武器",
    "category": "military",
    "cost": {
      "science-fusion": 500
    },
    "researchTime": 500,
    "prerequisites": ["nanofabrication"],
    "unlocks": {
      "recipes": ["antimatter-charge"]
    },
    "description": "解锁反物质充能，终极武器"
  },
  "ultimate-research": {
    "id": "ultimate-research",
    "name": "终极研究",
    "category": "infrastructure",
    "cost": {
      "science-fusion": 1000
    },
    "researchTime": 1000,
    "prerequisites": ["fusion-technology"],
    "unlocks": {
      "buildings": ["quantum-research-lab"]
    },
    "description": "解锁量子研究中心，5倍研究速度"
  }
};

Object.assign(data.technologies, newTechs);
console.log(`  ✓ Added ${Object.keys(newTechs).length} new technologies`);

// ===== ADD PHASE 3 & 4 BUILDINGS =====
console.log('\n📊 Adding Phase 3 & 4 buildings...');

const newBuildings = {
  "fusion-reactor": {
    "id": "fusion-reactor",
    "name": "聚变反应堆",
    "category": "power",
    "slots": 2,
    "cost": {
      "steel-plate": 100,
      "advanced-circuit": 50,
      "uranium-fuel-rod": 10
    },
    "powerProduction": 1000,
    "fuelConsumption": {
      "fusion-cell": 0.1
    },
    "requiresTech": "fusion-technology",
    "description": "聚变能发电，产出 1000 电力/秒"
  },
  "quantum-research-lab": {
    "id": "quantum-research-lab",
    "name": "量子研究中心",
    "category": "science",
    "slots": 2,
    "cost": {
      "steel-plate": 100,
      "quantum-circuit": 50,
      "nanomaterial": 50
    },
    "powerConsumption": 50,
    "researchSpeed": 50,
    "requiresTech": "ultimate-research",
    "description": "研究科技，速度 50 科研包/秒 (5倍速)"
  }
};

Object.assign(data.buildings, newBuildings);
console.log(`  ✓ Added ${Object.keys(newBuildings).length} new buildings`);

// ===== ADD PHASE 3 & 4 RECIPES =====
console.log('\n📊 Adding Phase 3 & 4 recipes...');

const newRecipes = {
  "plasma-charge": {
    "id": "plasma-charge",
    "name": "等离子充能包",
    "category": "military",
    "buildingTypes": ["assembler-mk2", "assembler-mk3"],
    "time": 3,
    "ingredients": {
      "advanced-circuit": 2,
      "battery": 3,
      "uranium-235": 0.1
    },
    "results": {
      "plasma-charge": 5
    },
    "requiresTech": "advanced-military"
  },
  "fusion-cell": {
    "id": "fusion-cell",
    "name": "聚变电池",
    "category": "nuclear",
    "buildingTypes": ["nuclear-processor"],
    "time": 30,
    "ingredients": {
      "uranium-fuel-rod": 2,
      "advanced-circuit": 10,
      "battery": 10
    },
    "results": {
      "fusion-cell": 1
    },
    "requiresTech": "fusion-technology"
  },
  "quantum-circuit": {
    "id": "quantum-circuit",
    "name": "量子电路",
    "category": "crafting",
    "buildingTypes": ["assembler-mk3"],
    "time": 10,
    "ingredients": {
      "advanced-circuit": 5,
      "fusion-cell": 1,
      "plastic": 10
    },
    "results": {
      "quantum-circuit": 1
    },
    "requiresTech": "quantum-computing"
  },
  "nanomaterial": {
    "id": "nanomaterial",
    "name": "纳米材料",
    "category": "crafting",
    "buildingTypes": ["assembler-mk3"],
    "time": 15,
    "ingredients": {
      "steel-plate": 10,
      "quantum-circuit": 2,
      "plastic": 20
    },
    "results": {
      "nanomaterial": 10
    },
    "requiresTech": "nanofabrication"
  },
  "antimatter-charge": {
    "id": "antimatter-charge",
    "name": "反物质充能",
    "category": "military",
    "buildingTypes": ["nuclear-processor"],
    "time": 50,
    "ingredients": {
      "uranium-235": 5,
      "quantum-circuit": 10,
      "fusion-cell": 5
    },
    "results": {
      "antimatter-charge": 1
    },
    "requiresTech": "antimatter-weapons"
  },
  "science-fusion": {
    "id": "science-fusion",
    "name": "聚变科研包",
    "category": "science",
    "buildingTypes": ["nuclear-processor"],
    "time": 50,
    "ingredients": {
      "fusion-cell": 2,
      "quantum-circuit": 5,
      "nanomaterial": 10
    },
    "results": {
      "science-fusion": 1
    },
    "requiresTech": "fusion-technology"
  }
};

Object.assign(data.recipes, newRecipes);
console.log(`  ✓ Added ${Object.keys(newRecipes).length} new recipes`);

// ===== SAVE UPDATED DATA =====
console.log('\n💾 Saving updated data.json...');
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Phase 3 & 4 content addition complete!');
console.log('\n📊 Final Summary:');
console.log(`  • Items: ${Object.keys(data.items).length} total`);
console.log(`  • Buildings: ${Object.keys(data.buildings).length} total`);
console.log(`  • Recipes: ${Object.keys(data.recipes).length} total`);
console.log(`  • Technologies: ${Object.keys(data.technologies).length} total`);
console.log(`  • Enemies: ${Object.keys(data.enemies).length} total`);
console.log(`  • Regions: ${data.regions.length} total`);
console.log('\n🎉 Game content is complete and ready for epic battles!');
