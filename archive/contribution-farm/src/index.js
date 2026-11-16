/**
 * index.js - 主入口
 *
 * 串联 fetcher → layout → renderer 全流程
 * 支持 CLI 调用和 programmable API
 */

import { fetchContributions } from './fetcher.js';
import { createFarmScene, createDemoData } from './living-farm.js';
import { renderLivingFarm } from './renderer.js';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 生成农场 PNG
 * @param {Object} options
 * @param {string} options.username - GitHub 用户名
 * @param {string} options.token - GitHub PAT（可选）
 * @param {string} options.output - 输出文件路径
 * @param {number} options.width - 画布宽度
 * @param {number} options.height - 画布高度
 * @param {boolean} options.mock - 使用模拟数据
 * @returns {Promise<Buffer>} PNG 数据
 */
export async function generateFarm(options = {}) {
  const {
    username = 'YeatsLiao',
    token = process.env.GITHUB_TOKEN || '',
    output = resolve(__dirname, '../dist/farm.png'),
    width = 1536,
    height = 1024,
    mock = false,
    profile = 'medium',
    evening = false,
  } = options;

  // 1. 获取数据
  let farmData;
  if (mock) {
    console.log('[farm] Using mock data');
    farmData = createDemoData(profile, username);
  } else {
    console.log(`[farm] Fetching data for ${username}...`);
    farmData = await fetchContributions(username, token);
  }

  console.log(`[farm] Total contributions: ${farmData.totalContributions}`);
  console.log(`[farm] Current streak: ${farmData.streak.current} days`);
  console.log(`[farm] Season: ${farmData.season}`);
  console.log(`[farm] Languages: ${farmData.languages.map(l => l.name).join(', ')}`);

  // 2. 构建场景 (传入用户名作为伪随机种子)
  const scene = createFarmScene(farmData, username);
  console.log(`[farm] 周贡献地块：${scene.crops.length}`);

  // 3. 渲染 PNG (Canvas)
  const png = await renderLivingFarm(scene, width, height, { evening });

  // 4. 写入文件
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, png);
  console.log(`[farm] PNG saved to: ${output} (${(png.length / 1024).toFixed(1)} KB)`);

  return png;
}

// CLI 入口
async function main() {
  const args = process.argv.slice(2);
  const opts = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--username':
        opts.username = args[++i];
        break;
      case '--token':
        opts.token = args[++i];
        break;
      case '--output':
        opts.output = args[++i];
        break;
      case '--width':
        opts.width = parseInt(args[++i]);
        break;
      case '--height':
        opts.height = parseInt(args[++i]);
        break;
      case '--mock':
        opts.mock = true;
        break;
      case '--profile':
        opts.profile = args[++i];
        break;
      case '--evening':
        opts.evening = true;
        break;
      case '--help':
      case '-h':
        console.log(`
GitHub Farm - 贡献可视化农场

用法:
  node src/index.js [选项]

选项:
  --username <name>   GitHub 用户名 (默认: YeatsLiao)
  --token <token>     GitHub PAT (或使用 GITHUB_TOKEN 环境变量)
  --output <path>     输出文件路径 (默认: dist/farm.png)
  --width <px>        画布宽度 (默认: 1536)
  --height <px>       画布高度 (默认: 1024)
  --mock              使用模拟数据（开发调试用）
  --profile <档位>    演示数据 low / medium / high（默认 medium）
  --evening           暮色场景
  --help, -h          显示帮助

示例:
  node src/index.js --mock
  node src/index.js --username YeatsLiao --token ghp_xxx
  GITHUB_TOKEN=ghp_xxx node src/index.js
`);
        process.exit(0);
        break;
    }
  }

  if (!opts.token && !process.env.GITHUB_TOKEN && !opts.mock) {
    console.error('[farm] 真实数据需要 GITHUB_TOKEN；本地演示请加 --mock。');
    process.exitCode = 1;
    return;
  }

  try {
    await generateFarm(opts);
  } catch (err) {
    console.error('[farm] Error:', err.message);
    process.exit(1);
  }
}

// 直接运行时执行 CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}