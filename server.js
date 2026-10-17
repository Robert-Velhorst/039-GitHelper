const { execFile } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { getAsset, isSea } = require('node:sea');
const handler = require('serve-handler');

const port = Number(process.env.PORT || 3000);
const publicDir = resolvePublicDir();

function resolvePublicDir() {
  if (!isSea()) return path.join(__dirname, 'build');

  const assetRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'git-helper-'));
  const manifest = JSON.parse(getAsset('__git_helper_assets.json', 'utf8'));

  for (const entry of manifest) {
    const destination = path.resolve(assetRoot, entry.path);
    if (!destination.startsWith(`${assetRoot}${path.sep}`)) {
      throw new Error(`Invalid embedded asset path: ${entry.path}`);
    }

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, Buffer.from(getAsset(entry.key)));
  }

  process.on('exit', () => fs.rmSync(assetRoot, { recursive: true, force: true }));
  return path.join(assetRoot, 'build');
}

const server = http.createServer((req, res) => {
  return handler(req, res, {
    public: publicDir,
    rewrites: [{ source: '**', destination: '/index.html' }],
  });
});

server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`React app running at ${url}`);

  const command = process.platform === 'win32'
    ? 'rundll32.exe'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  const args = process.platform === 'win32'
    ? ['url.dll,FileProtocolHandler', url]
    : [url];

  execFile(command, args, { windowsHide: true }, (error) => {
    if (error) console.error('Could not open the browser automatically:', error.message);
  });
});
