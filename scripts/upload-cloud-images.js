#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMP_DIR = path.join(ROOT, 'assets', 'temp');
const DEFAULT_MANIFEST_PATH = path.join(ROOT, 'docs', 'cloud-image-manifest.json');

function parseArgs(argv) {
  const args = { manifestPath: DEFAULT_MANIFEST_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--manifest' && argv[index + 1]) {
      args.manifestPath = path.resolve(process.cwd(), argv[index + 1]);
      index += 1;
      continue;
    }
    if (current === '--print-only') {
      args.printOnly = true;
      continue;
    }
  }
  return args;
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map((name) => path.join(dir, name))
    .filter((fullPath) => fs.statSync(fullPath).isFile());
}

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function resolveCloudPath(fileName) {
  if (fileName === 'logo.jpg') return 'branding/logo/logo.jpg';
  if (fileName === 'home-hero.jpg') return 'home/hero/home-hero.jpg';
  if (fileName === 'topic-new.jpg') return 'home/topic/topic-new.jpg';
  if (fileName.startsWith('product-')) return `products/main/${fileName}`;
  return `temp/${fileName}`;
}

function buildManifest() {
  const files = listFiles(TEMP_DIR);
  const items = files.map((fullPath) => {
    const stat = fs.statSync(fullPath);
    const fileName = path.basename(fullPath);
    return {
      fileName,
      localPath: toPosix(path.relative(ROOT, fullPath)),
      absolutePath: fullPath,
      cloudPath: resolveCloudPath(fileName),
      size: stat.size
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: toPosix(path.relative(ROOT, TEMP_DIR)),
    note: '当前脚本生成的是图片上传清单 manifest，用于人工上传或后续扩展自动上传逻辑。',
    itemCount: items.length,
    items
  };
}

function printSummary(manifest) {
  console.log('云存储图片清单已生成');
  console.log(`源目录: ${manifest.sourceRoot}`);
  console.log(`图片数量: ${manifest.itemCount}`);
  console.log('');
  manifest.items.forEach((item) => {
    console.log(`${item.localPath} -> ${item.cloudPath}`);
  });
}

function writeManifest(manifest, targetPath) {
  ensureDir(targetPath);
  fs.writeFileSync(targetPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = buildManifest();
  printSummary(manifest);
  if (!args.printOnly) {
    writeManifest(manifest, args.manifestPath);
    console.log('');
    console.log(`manifest 已写入: ${args.manifestPath}`);
  }
}

main();
