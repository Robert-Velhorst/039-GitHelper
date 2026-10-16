const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'build');
const distDir = path.join(root, 'dist');
const manifestPath = path.join(distDir, 'sea-assets.json');
const configPath = path.join(distDir, 'sea-config.json');

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

fs.mkdirSync(distDir, { recursive: true });

const files = listFiles(buildDir);
const assets = files.map((file, index) => ({
  key: `git-helper-asset-${index}`,
  path: path.relative(root, file).replaceAll(path.sep, '/'),
  source: file,
}));

fs.writeFileSync(manifestPath, JSON.stringify(assets.map(({ key, path: assetPath }) => ({ key, path: assetPath }))));

const assetMap = Object.fromEntries(assets.map(({ key, source }) => [key, source]));
assetMap['__git_helper_assets.json'] = manifestPath;

const config = {
  main: path.join(distDir, 'server.cjs'),
  mainFormat: 'commonjs',
  output: path.join(root, 'myapp.exe'),
  assets: assetMap,
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
execFileSync(process.execPath, ['--build-sea', configPath], { cwd: root, stdio: 'inherit' });
