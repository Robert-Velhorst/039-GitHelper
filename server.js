const { execFile } = require('child_process');
const http = require('http');
const path = require('path');
const handler = require('serve-handler');

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, 'build');

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
