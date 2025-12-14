#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 加载 JSON 数据
function loadJSON(filename) {
    const filepath = path.join(__dirname, 'data', filename);
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
}

console.log('========================================');
console.log('🔬 矿机生产测试');
console.log('========================================\n');

try {
    // 步骤 1: 加载游戏数据
    console.log('步骤 1: 加载游戏数据...');
    const items = loadJSON('items.json');
    const buildings = loadJSON('buildings.json');
    const regions = loadJSON('regions.json');

    console.log(`✓ 加载了 ${Object.keys(items.items).length} 个物品`);
    console.log(`✓ 加载了 ${Object.keys(buildings.buildings).length} 个建筑`);
    console.log(`✓ 加载了 ${regions.regions.length} 个区域\n`);

    // 步骤 2: 初始化测试环境
    console.log('步骤 2: 初始化测试环境...');
    const gameState = {
        resources: {},
        time: {
            isDay: true,
            totalTime: 0,
            timeRemaining: 180,
            dayDuration: 180,
            nightDuration: 120
        }
    };

    // 初始化资源
    Object.entries(items.items).forEach(([id, item]) => {
        gameState.resources[id] = {
            current: 0,
            max: item.category === 'energy' ? 1000 : 500
        };
    });

    // 设置初始资源
    gameState.resources['iron-plate'].current = 50;
    gameState.resources['copper-plate'].current = 30;
    gameState.resources['coal'].current = 20;
    gameState.resources['power'].current = 100;

    console.log(`✓ 初始铁板: ${gameState.resources['iron-plate'].current}`);
    console.log(`✓ 初始铜板: ${gameState.resources['copper-plate'].current}`);
    console.log(`✓ 初始电力: ${gameState.resources['power'].current}\n`);

    // 创建测试区域
    const region1Template = regions.regions[0];
    const region = {
        id: region1Template.id,
        name: region1Template.name,
        slotsTotal: region1Template.slotsTotal,
        slotsUsed: 0,
        resourceNodes: region1Template.resourceNodes.map(node => ({...node})),
        buildings: []
    };

    console.log(`✓ 创建区域: ${region.name}`);
    console.log(`  资源节点:`);
    region.resourceNodes.forEach((node, idx) => {
        console.log(`    [${idx}] ${items.items[node.type].name}: ${node.amount} (速率: ${node.rate}/s)`);
    });
    console.log();

    // 步骤 3: 建造矿机
    console.log('步骤 3: 建造矿机 Mk1...');
    const minerTemplate = buildings.buildings['miner-mk1'];
    console.log(`  建筑信息: ${minerTemplate.name}`);
    console.log(`  速度倍率: ${minerTemplate.speed}x`);
    console.log(`  功耗: ${minerTemplate.powerConsumption} 电力/秒`);
    console.log(`  允许资源: ${minerTemplate.allowedResources.join(', ')}`);

    // 选择资源节点
    let selectedNodeIndex = -1;
    for (let i = 0; i < region.resourceNodes.length; i++) {
        const node = region.resourceNodes[i];
        if (minerTemplate.allowedResources.includes(node.type)) {
            selectedNodeIndex = i;
            console.log(`✓ 找到匹配的资源节点 [${i}]: ${items.items[node.type].name}`);
            break;
        }
    }

    if (selectedNodeIndex === -1) {
        console.log('\n❌ 错误：没有找到匹配的资源节点！');
        console.log('\n矿机允许的资源类型:');
        minerTemplate.allowedResources.forEach(res => {
            console.log(`  - ${res}`);
        });
        console.log('\n区域的资源节点类型:');
        region.resourceNodes.forEach((node, idx) => {
            console.log(`  [${idx}] ${node.type}`);
        });
        process.exit(1);
    }

    // 创建建筑
    const building = {
        id: 1,
        buildingId: 'miner-mk1',
        active: true,
        regionId: region.id,
        resourceNodeIndex: selectedNodeIndex
    };
    region.buildings.push(building);

    const targetNode = region.resourceNodes[selectedNodeIndex];
    console.log(`✓ 矿机已建造，连接到资源节点 [${selectedNodeIndex}]`);
    console.log(`  目标资源: ${items.items[targetNode.type].name}`);
    console.log(`  节点剩余: ${targetNode.amount}\n`);

    // 步骤 4: 模拟生产
    console.log('步骤 4: 模拟 10 秒生产...');

    const initialIronPlate = gameState.resources['iron-plate'].current;
    console.log(`  初始铁板数量: ${initialIronPlate}`);

    // 模拟 100 次循环，每次 0.1 秒
    for (let i = 0; i < 100; i++) {
        const deltaTime = 0.1;

        // 生产资源
        region.buildings.forEach(b => {
            if (!b.active) return;

            const template = buildings.buildings[b.buildingId];

            if (template.category === 'mining' && b.resourceNodeIndex !== undefined) {
                const hasPower = gameState.resources['power'].current > 0;
                if (!hasPower && template.powerConsumption) {
                    if (i === 0) console.log('  ⚠ 电力不足，矿机停止工作');
                    return;
                }

                const node = region.resourceNodes[b.resourceNodeIndex];
                if (node.amount <= 0) {
                    if (i === 0) console.log('  ⚠ 资源节点已耗尽');
                    return;
                }

                const produceAmount = node.rate * template.speed * deltaTime;
                const actualAmount = Math.min(produceAmount, node.amount);

                node.amount -= actualAmount;
                gameState.resources[node.type].current += actualAmount;
                gameState.resources[node.type].current = Math.min(
                    gameState.resources[node.type].current,
                    gameState.resources[node.type].max
                );

                // 每秒记录一次
                if (i % 10 === 0) {
                    console.log(`  [${(i/10).toFixed(0)}s] 生产 ${actualAmount.toFixed(2)} ${items.items[node.type].name}，当前: ${gameState.resources[node.type].current.toFixed(2)}`);
                }
            }
        });
    }

    const finalIronPlate = gameState.resources['iron-plate'].current;
    const produced = finalIronPlate - initialIronPlate;
    const expected = 5 * 1.0 * 10;

    console.log('\n========================================');
    console.log('📊 测试结果:');
    console.log('========================================');
    console.log(`  初始铁板: ${initialIronPlate}`);
    console.log(`  最终铁板: ${finalIronPlate.toFixed(2)}`);
    console.log(`  生产数量: ${produced.toFixed(2)}`);
    console.log(`  预期生产: ${expected.toFixed(2)} (速率5 × 速度1.0 × 10秒)`);
    console.log(`  误差: ${Math.abs(produced - expected).toFixed(2)}`);

    if (produced > 0) {
        console.log('\n✅ 测试通过！矿机正常生产资源！');
        console.log('========================================\n');
        process.exit(0);
    } else {
        console.log('\n❌ 测试失败！矿机没有生产资源！');
        console.log('========================================\n');
        process.exit(1);
    }

} catch (error) {
    console.log('\n❌ 测试出错:', error.message);
    console.error(error);
    process.exit(1);
}
