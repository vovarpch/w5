#!/usr/bin/env node

const http = require('http');
const fs = require('fs').promises;
const { existsSync, mkdirSync } = require('fs');
const path = require('path');
const { Command } = require('commander');
const superagent = require('superagent');

// 🔹 Командний рядок
const program = new Command();
program
  .requiredOption('-h, --host <host>', 'Host address')
  .requiredOption('-p, --port <port>', 'Port number')
  .requiredOption('-c, --cache <dir>', 'Cache directory');
program.parse(process.argv);

const { host, port, cache } = program.opts();

// 🔹 Створення директорії кешу, якщо не існує
if (!existsSync(cache)) {
  mkdirSync(cache, { recursive: true });
}

// 🔹 Основний сервер
const server = http.createServer(async (req, res) => {
  const method = req.method;
  const urlParts = req.url.split('/');
  const code = urlParts[1];

  if (!/^\d{3}$/.test(code)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Invalid status code in URL');
  }

  const filePath = path.join(cache, `${code}.jpg`);

  try {
    if (method === 'GET') {
      try {
        const data = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        return res.end(data);
      } catch {
        // Завантаження з http.cat
        try {
          const response = await superagent.get(`https://http.cat/${code}`);
          const buffer = response.body;
          await fs.writeFile(filePath, buffer);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          return res.end(buffer);
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('Image not found');
        }
      }
    }

    else if (method === 'PUT') {
      let data = [];
      req.on('data', chunk => data.push(chunk));
      req.on('end', async () => {
        const buffer = Buffer.concat(data);
        await fs.writeFile(filePath, buffer);
        res.writeHead(201, { 'Content-Type': 'text/plain' });
        res.end('Image saved');
      });
    }

    else if (method === 'DELETE') {
      try {
        await fs.unlink(filePath);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Image deleted');
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Image not found');
      }
    }

    else {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
    }

  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
