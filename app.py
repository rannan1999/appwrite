import os
import re
import shutil
import subprocess
import http.server
import socketserver
import threading
import requests
from flask import Flask
import json
import time
import base64

app = Flask(__name__)

# Set environment variables (保持不变)
FILE_PATH = os.environ.get('FILE_PATH', './tmp')
PROJECT_URL = os.environ.get('URL', '')
INTERVAL_SECONDS = int(os.environ.get("TIME", 120))
UUID = os.environ.get('UUID', 'faacf142-dee8-48c2-8558-641123eb939c')
NEZHA_SERVER = os.environ.get('NEZHA_SERVER', 'nezha.mingfei1981.eu.org')
NEZHA_PORT = os.environ.get('NEZHA_PORT', '443')
NEZHA_KEY = os.environ.get('NEZHA_KEY', 'l5GINS8lct8Egroitn')
ARGO_DOMAIN = os.environ.get('ARGO_DOMAIN', 'appwrite.ncaa.nyc.mn')
ARGO_AUTH = os.environ.get('ARGO_AUTH', 'eyJhIjoiOTk3ZjY4OGUzZjBmNjBhZGUwMWUxNGRmZTliOTdkMzEiLCJ0IjoiZDQzMTc4YTEtZGRmYy00YTkwLWI0YzAtNzNkODUwYzY3NDdmIiwicyI6IlptWm1NMlppT0RZdE1tRTFOeTAwTlRVd0xUbGhaV0V0WmpsaFl6VTFOV0k0TVRCbSJ9')
ARGO_PORT = int(os.environ.get('ARGO_PORT', 8001))
CFIP = os.environ.get('CFIP', 'www.visa.com.tw')
CFPORT = int(os.environ.get('CFPORT', 443))
NAME = os.environ.get('NAME', 'Vls')
PORT = int(os.environ.get('SERVER_PORT') or os.environ.get('PORT') or 3000)

# Create directory if it doesn't exist (保持不变)
if not os.path.exists(FILE_PATH):
    os.makedirs(FILE_PATH)
    print(f"{FILE_PATH} has been created")
else:
    print(f"{FILE_PATH} already exists")

# Clean old files (保持不变)
paths_to_delete = ['boot.log', 'list.txt', 'sub.txt', 'npm', 'web', 'bot', 'tunnel.yml', 'tunnel.json']
for file in paths_to_delete:
    file_path = os.path.join(FILE_PATH, file)
    try:
        os.unlink(file_path)
        print(f"{file_path} has been deleted")
    except Exception as e:
        print(f"Skip Delete {file_path}")

# HTTP server (保持不变)
class MyHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'Hello, world')
        elif self.path == '/sub':
            try:
                with open(os.path.join(FILE_PATH, 'sub.txt'), 'rb') as file:
                    content = file.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(content)
            except FileNotFoundError:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b'Error reading file')
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not found')

httpd = socketserver.TCPServer(('', PORT), MyHandler)
server_thread = threading.Thread(target=httpd.serve_forever)
server_thread.daemon = True
server_thread.start()

# Generate xr-ay config file (保持不变)
def generate_config():
    config = {
        "log": {"access": "/dev/null", "error": "/dev/null", "loglevel": "none"},
        "inbounds": [
            {"port": ARGO_PORT, "protocol": "vless", "settings": {"clients": [{"id": UUID, "flow": "xtls-rprx-vision"}], "decryption": "none", "fallbacks": [{"dest": 3001}, {"path": "/vless-argo", "dest": 3002}, {"path": "/vmess-argo", "dest": 3003}, {"path": "/trojan-argo", "dest": 3004}]}, "streamSettings": {"network": "tcp"}},
            {"port": 3001, "listen": "127.0.0.1", "protocol": "vless", "settings": {"clients": [{"id": UUID}], "decryption": "none"}, "streamSettings": {"network": "ws", "security": "none"}},
            {"port": 3002, "listen": "127.0.0.1", "protocol": "vless", "settings": {"clients": [{"id": UUID, "level": 0}], "decryption": "none"}, "streamSettings": {"network": "ws", "security": "none", "wsSettings": {"path": "/vless-argo"}}, "sniffing": {"enabled": True, "destOverride": ["http", "tls", "quic"], "metadataOnly": False}},
            {"port": 3003, "listen": "127.0.0.1", "protocol": "vmess", "settings": {"clients": [{"id": UUID, "alterId": 0}]}, "streamSettings": {"network": "ws", "wsSettings": {"path": "/vmess-argo"}}, "sniffing": {"enabled": True, "destOverride": ["http", "tls", "quic"], "metadataOnly": False}},
            {"port": 3004, "listen": "127.0.0.1", "protocol": "trojan", "settings": {"clients": [{"password": UUID}]}, "streamSettings": {"network": "ws", "security": "none", "wsSettings": {"path": "/trojan-argo"}}, "sniffing": {"enabled": True, "destOverride": ["http", "tls", "quic"], "metadataOnly": False}}
        ],
        "dns": {"servers": ["https+local://8.8.8.8/dns-query"]},
        "outbounds": [{"protocol": "freedom", "tag": "direct"}, {"protocol": "blackhole", "tag": "block"}]
    }
    with open(os.path.join(FILE_PATH, 'config.json'), 'w', encoding='utf-8') as config_file:
        json.dump(config, config_file, ensure_ascii=False, indent=2)

generate_config()

# Determine system architecture (保持不变)
def get_system_architecture():
    arch = os.uname().machine
    if 'arm' in arch or 'aarch64' in arch or 'arm64' in arch:
        return 'arm'
    else:
        return 'amd'

# Download file (保持不变)
def download_file(file_name, file_url):
    file_path = os.path.join(FILE_PATH, file_name)
    with requests.get(file_url, stream=True) as response, open(file_path, 'wb') as file:
        shutil.copyfileobj(response.raw, file)

# Download and run files (保持不变)
def download_files_and_run():
    architecture = get_system_architecture()
    files_to_download = get_files_for_architecture(architecture)

    if not files_to_download:
        print("Can't find a file for the current architecture")
        return

    for file_info in files_to_download:
        try:
            download_file(file_info['file_name'], file_info['file_url'])
            print(f"Downloaded {file_info['file_name']} successfully")
        except Exception as e:
            print(f"Download {file_info['file_name']} failed: {e}")

    files_to_authorize = ['npm', 'web', 'bot']
    authorize_files(files_to_authorize)

    NEZHA_TLS = ''
    valid_ports = ['443', '8443', '2096', '2087', '2083', '2053']
    if NEZHA_SERVER and NEZHA_PORT and NEZHA_KEY:
        if NEZHA_PORT in valid_ports:
            NEZHA_TLS = '--tls'
        command = f"nohup {FILE_PATH}/npm -s {NEZHA_SERVER}:{NEZHA_PORT} -p {NEZHA_KEY} {NEZHA_TLS} >/dev/null 2>&1 &"
        try:
            subprocess.run(command, shell=True, check=True)
            print('npm is running')
            subprocess.run('sleep 1', shell=True)
        except subprocess.CalledProcessError as e:
            print(f'npm running error: {e}')
    else:
        print('NEZHA variable is empty, skip running')

    command1 = f"nohup {FILE_PATH}/web -c {FILE_PATH}/config.json >/dev/null 2>&1 &"
    try:
        subprocess.run(command1, shell=True, check=True)
        print('web is running')
        subprocess.run('sleep 1', shell=True)
    except subprocess.CalledProcessError as e:
        print(f'web running error: {e}')

    if os.path.exists(os.path.join(FILE_PATH, 'bot')):
        args = get_cloud_flare_args()
        try:
            subprocess.run(f"nohup {FILE_PATH}/bot {args} >/dev/null 2>&1 &", shell=True, check=True)
            print('bot is running')
            subprocess.run('sleep 2', shell=True)
        except subprocess.CalledProcessError as e:
            print(f'Error executing command: {e}')

    subprocess.run('sleep 3', shell=True)

def get_cloud_flare_args():
    processed_auth = ARGO_AUTH
    try:
        auth_data = json.loads(ARGO_AUTH)
        if 'TunnelSecret' in auth_data and 'AccountTag' in auth_data and 'TunnelID' in auth_data:
            processed_auth = 'TunnelSecret'
    except json.JSONDecodeError:
        pass

    if not processed_auth and not ARGO_DOMAIN:
        args = f'tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile {FILE_PATH}/boot.log --loglevel info --url http://localhost:{ARGO_PORT}'
    elif processed_auth == 'TunnelSecret':
        args = f'tunnel --edge-ip-version auto --config {FILE_PATH}/tunnel.yml run'
    elif processed_auth and ARGO_DOMAIN and 120 <= len(processed_auth) <= 250:
        args = f'tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token {processed_auth}'
    else:
        args = f'tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile {FILE_PATH}/boot.log --loglevel info --url http://localhost:{ARGO_PORT}'
    return args

def get_files_for_architecture(architecture):
    if architecture == 'arm':
        return [
            {'file_name': 'npm', 'file_url': 'https://arm64.ssss.nyc.mn/agent'},
            {'file_name': 'web', 'file_url': 'https://arm64.ssss.nyc.mn/web'},
            {'file_name': 'bot', 'file_url': 'https://arm64.ssss.nyc.mn/2go'},
        ]
    elif architecture == 'amd':
        return [
            {'file_name': 'npm', 'file_url': 'https://amd64.ssss.nyc.mn/agent'},
            {'file_name': 'web', 'file_url': 'https://amd64.ssss.nyc.mn/web'},
            {'file_name': 'bot', 'file_url': 'https://amd64.ssss.nyc.mn/2go'},
        ]
    return []

def authorize_files(file_paths):
    new_permissions = 0o775
    for relative_file_path in file_paths:
        absolute_file_path = os.path.join(FILE_PATH, relative_file_path)
        try:
            os.chmod(absolute_file_path, new_permissions)
            print(f"Empowerment success for {absolute_file_path}: {oct(new_permissions)}")
        except Exception as e:
            print(f"Empowerment failed for {absolute_file_path}: {e}")

def argo_config():
    if not ARGO_AUTH or not ARGO_DOMAIN:
        print("ARGO_DOMAIN or ARGO_AUTH is empty, use quick Tunnels")
        return

    if 'TunnelSecret' in ARGO_AUTH:
        with open(os.path.join(FILE_PATH, 'tunnel.json'), 'w') as file:
            file.write(ARGO_AUTH)
        tunnel_yaml = f"""
tunnel: {ARGO_AUTH.split('"')[11]}
credentials-file: {os.path.join(FILE_PATH, 'tunnel.json')}
protocol: http2

ingress:
  - hostname: {ARGO_DOMAIN}
    service: http://localhost:{ARGO_PORT}
    originRequest:
      noTLSVerify: true
  - service: http_status:404
  """
        with open(os.path.join(FILE_PATH, 'tunnel.yml'), 'w') as file:
            file.write(tunnel_yaml)
    else:
        print("Use token connect to tunnel")

argo_config()

def extract_domains():
    argo_domain = ''
    if ARGO_AUTH and ARGO_DOMAIN:
        argo_domain = ARGO_DOMAIN
        print('ARGO_DOMAIN:', argo_domain)
        generate_links(argo_domain)
    else:
        try:
            with open(os.path.join(FILE_PATH, 'boot.log'), 'r', encoding='utf-8') as file:
                content = file.read()
                match = re.search(r'https://([^ ]+\.trycloudflare\.com)', content)
                if match:
                    argo_domain = match.group(1)
                    print('ArgoDomain:', argo_domain)
                    generate_links(argo_domain)
                else:
                    print('ArgoDomain not found, re-running bot to obtain ArgoDomain')
                    try:
                        subprocess.run("pkill -f 'bot tunnel'", shell=True)
                        print('Stopped existing bot process')
                    except Exception as e:
                        print(f'Error stopping bot process: {e}')
                    
                    time.sleep(2)
                    os.remove(os.path.join(FILE_PATH, 'boot.log'))
                    
                    max_retries = 10
                    for attempt in range(max_retries):
                        print(f'Attempt {attempt + 1} of {max_retries}')
                        args = f"tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile {FILE_PATH}/boot.log --loglevel info --url http://localhost:{ARGO_PORT}"
                        try:
                            subprocess.run(f"nohup {FILE_PATH}/bot {args} >/dev/null 2>&1 &", shell=True, check=True)
                            print('bot is running')
                            time.sleep(3)
                            with open(os.path.join(FILE_PATH, 'boot.log'), 'r', encoding='utf-8') as file:
                                content = file.read()
                                match = re.search(r'https://([^ ]+\.trycloudflare\.com)', content)
                                if match:
                                    argo_domain = match.group(1)
                                    print('ArgoDomain:', argo_domain)
                                    generate_links(argo_domain)
                                    break
                            if attempt < max_retries - 1:
                                print('ArgoDomain not found, retrying...')
                                subprocess.run("pkill -f 'bot tunnel'", shell=True)
                                time.sleep(2)
                        except subprocess.CalledProcessError as e:
                            print(f"Error executing command: {e}")
                        except Exception as e:
                            print(f"Error: {e}")
                    else:
                        print("Failed to obtain ArgoDomain after maximum retries")
        except IndexError as e:
            print(f"IndexError while reading boot.log: {e}")
        except Exception as e:
            print(f"Error reading boot.log: {e}")

# 修改 generate_links 函数，增加重试机制和超时设置
def generate_links(argo_domain):
    max_retries = 3
    retry_delay = 5  # 秒
    timeout = 30     # 请求超时时间，单位秒

    for attempt in range(max_retries):
        try:
            response = requests.get('https://speed.cloudflare.com/meta', timeout=timeout)
            response.raise_for_status()
            meta_info = response.text.split('"')
            ISP = f"{meta_info[25]}-{meta_info[17]}".replace(' ', '_').strip()
            break  # 成功后跳出循环
        except requests.RequestException as e:
            print(f"Attempt {attempt + 1} failed to fetch meta info: {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("Max retries reached, using default ISP")
                ISP = "Unknown-ISP"

    time.sleep(2)
    VMESS = {
        "v": "2", "ps": f"{NAME}-{ISP}", "add": CFIP, "port": CFPORT, "id": UUID,
        "aid": "0", "scy": "none", "net": "ws", "type": "none", "host": argo_domain,
        "path": "/vmess-argo?ed=2048", "tls": "tls", "sni": argo_domain, "alpn": ""
    }
 
    list_txt = f"""
vless://{UUID}@{CFIP}:{CFPORT}?encryption=none&security=tls&sni={argo_domain}&type=ws&host={argo_domain}&path=%2Fvless-argo%3Fed%3D2048#{NAME}-{ISP}
  
vmess://{base64.b64encode(json.dumps(VMESS).encode('utf-8')).decode('utf-8')}

trojan://{UUID}@{CFIP}:{CFPORT}?security=tls&sni={argo_domain}&type=ws&host={argo_domain}&path=%2Ftrojan-argo%3Fed%3D2048#{NAME}-{ISP}
    """
    
    with open(os.path.join(FILE_PATH, 'list.txt'), 'w', encoding='utf-8') as list_file:
        list_file.write(list_txt)

    sub_txt = base64.b64encode(list_txt.encode('utf-8')).decode('utf-8')
    with open(os.path.join(FILE_PATH, 'sub.txt'), 'w', encoding='utf-8') as sub_file:
        sub_file.write(sub_txt)
        
    try:
        with open(os.path.join(FILE_PATH, 'sub.txt'), 'rb') as file:
            sub_content = file.read()
        print(f"\n{sub_content.decode('utf-8')}")
    except FileNotFoundError:
        print(f"sub.txt not found")
    
    print(f'\n{FILE_PATH}/sub.txt saved successfully')
    time.sleep(45)
 
    files_to_delete = ['npm', 'web', 'bot', 'boot.log', 'list.txt', 'config.json', 'tunnel.yml', 'tunnel.json']
    for file_to_delete in files_to_delete:
        file_path_to_delete = os.path.join(FILE_PATH, file_to_delete)
        if os.path.exists(file_path_to_delete):
            try:
                os.remove(file_path_to_delete)
            except Exception as e:
                print(f"Error deleting {file_path_to_delete}: {e}")
        else:
            print(f"{file_path_to_delete} doesn't exist, skipping deletion")

    print('\033c', end='')
    print('App is running')
    print('Thank you for using this script, enjoy!')

def start_server():
    download_files_and_run()
    extract_domains()
    
start_server()

# 修改 visit_project_page 函数，增加重试机制和超时设置
has_logged_empty_message = False

def visit_project_page():
    max_retries = 3
    retry_delay = 5  # 秒
    timeout = 30     # 请求超时时间，单位秒

    try:
        if not PROJECT_URL or not INTERVAL_SECONDS:
            global has_logged_empty_message
            if not has_logged_empty_message:
                print("URL or TIME variable is empty, Skipping visit web")
                has_logged_empty_message = True
            return

        for attempt in range(max_retries):
            try:
                response = requests.get(PROJECT_URL, timeout=timeout)
                response.raise_for_status()
                print("Page visited successfully")
                print('\033c', end='')
                break
            except requests.RequestException as e:
                print(f"Attempt {attempt + 1} failed to visit {PROJECT_URL}: {e}")
                if attempt < max_retries - 1:
                    print(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    print("Max retries reached, skipping visit")
    except Exception as error:
        print(f"Unexpected error visiting project page: {error}")

if __name__ == "__main__":
    while True:
        visit_project_page()
        time.sleep(INTERVAL_SECONDS)
