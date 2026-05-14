from flask import Flask
from flask_socketio import SocketIO
import time
import threading
import requests
import random



app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')


BOTNET_IPS = [
    '185.220.101.45', '185.220.101.1', '188.127.237.5', '178.79.162.152',
    '217.79.179.62', '185.10.58.221', '185.212.47.239', '91.218.116.52',
    '185.249.170.4', '176.10.104.240', '82.102.23.186', '195.154.33.203',
    '65.21.92.162', '167.99.75.195', '176.10.99.200', '188.34.170.184',
    '91.108.4.1', '5.188.206.14', '103.75.190.12', '45.142.212.100',
    '46.101.166.19', '134.209.82.236', '159.65.220.255', '209.97.189.254',
]


TARGET_IPS = [
    '8.8.8.8',          # Google DNS
    '1.1.1.1',          # Cloudflare
    '208.67.222.222',   # OpenDNS
    '9.9.9.9',          # Quad9
    '77.88.8.8',        # Yandex DNS
    '64.6.64.6',        # Verisign
]

ATTACK_TYPES = [
    'DNS Amplification', 'DDoS Flood', 'NXDomain Attack',
    'DNS Spoofing', 'Botnet C2', 'Reflection Attack', 'DNS Tunneling'
]

SEVERITY_LEVELS  = ['low', 'medium', 'high', 'critical']
SEVERITY_WEIGHTS = [0.30, 0.35, 0.25, 0.10]
#---------------------------
#     Live threat feed 
#--------------------------
live_threat_ips = []

def fetch_live_threat_ips():
    global live_threat_ips
    feeds = [
        'https://rules.emergingthreats.net/blockrules/compromised-ips.txt',
        'https://cinsscore.com/list/ci-badguys.txt',
    ]
    for url in feeds:
        try:
            print(f"Fetching threat feed: {url}")
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                ips = [
                    line.strip() for line in r.text.splitlines()
                    if line.strip() and not line.startswith('#') and '.' in line
                ]
                if len(ips) > 10:
                    live_threat_ips = random.sample(ips, min(300, len(ips)))
                    print(f"✓ Loaded {len(live_threat_ips)} live threat IPs")
                    return
        except Exception as e:
            print(f"Feed failed ({url}): {e}")
    print("⚠ Using fallback IPs")
    live_threat_ips = BOTNET_IPS


location_cache = {}

def get_location(ip):
    if ip in location_cache:
        return location_cache[ip]
    try:
        r = requests.get(f'http://ip-api.com/json/{ip}', timeout=3)
        d = r.json()
        if d.get('status') == 'success':
            loc = {
                'lat':     d.get('lat'),
                'lng':     d.get('lon'),
                'country': d.get('country', 'Unknown'),
                'city':    d.get('city', ''),
                'isp':     d.get('isp', ''),
            }
            location_cache[ip] = loc
            return loc
    except:
        pass
    return None


attack_count = 0
top_sources  = {}
top_targets  = {}


def emit_attack_loop():
    global attack_count, top_sources, top_targets

    fetch_live_threat_ips()

    
    def refresh():
        while True:
            time.sleep(600)
            fetch_live_threat_ips()
    threading.Thread(target=refresh, daemon=True).start()

    print("Attack emission loop started...")

    while True:
        try:
            src_pool = live_threat_ips if live_threat_ips else BOTNET_IPS
            src_ip   = random.choice(src_pool)
            dst_ip   = random.choice(TARGET_IPS)

            src = get_location(src_ip)
            dst = get_location(dst_ip)

            if src and dst and src['lat'] and dst['lat']:
                attack_count += 1
                attack_type = random.choice(ATTACK_TYPES)
                severity    = random.choices(SEVERITY_LEVELS, SEVERITY_WEIGHTS)[0]

                top_sources[src['country']] = top_sources.get(src['country'], 0) + 1
                top_targets[dst['country']] = top_targets.get(dst['country'], 0) + 1

                data = {
                    'sourceLat':     src['lat'],
                    'sourceLng':     src['lng'],
                    'sourceCountry': src['country'],
                    'sourceCity':    src['city'],
                    'sourceIP':      src_ip,
                    'targetLat':     dst['lat'],
                    'targetLng':     dst['lng'],
                    'targetCountry': dst['country'],
                    'targetCity':    dst['city'],
                    'targetIP':      dst_ip,
                    'attackType':    attack_type,
                    'severity':      severity,
                    'totalCount':    attack_count,
                    'topSources':    sorted(top_sources.items(), key=lambda x: -x[1])[:5],
                    'topTargets':    sorted(top_targets.items(), key=lambda x: -x[1])[:5],
                    'timestamp':     time.strftime('%H:%M:%S'),
                }
                socketio.emit('attack', data)
                print(f"[{attack_count:04d}] {src['country']:<20} → {dst['country']:<20} | {severity:<8} | {attack_type}")

        except Exception as e:
            print(f"Error: {e}")

        time.sleep(0.5)

@app.route("/")
def home():
    return "DNS Attack Visualization Server Running"

if __name__ == "__main__":
    t = threading.Thread(target=emit_attack_loop, daemon=True)
    t.start()
    print("Server starting on http://0.0.0.0:5000")
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)