from flask import Flask
from flask_socketio import SocketIO
import time
import threading
import requests
import random
from scapy.all import sniff, IP, UDP, DNS, DNSQR
import socket

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")


BOTNET_IPS = [
    '185.220.101.45', '185.220.101.1', '188.127.237.5', '178.79.162.152',
    '217.79.179.62', '185.10.58.221', '185.212.47.239', '91.218.116.52',
    '185.249.170.4', '176.10.104.240', '82.102.23.186', '195.154.33.203',
    '65.21.92.162', '167.99.75.195', '176.10.99.200', '188.34.170.184'
]

def get_location(ip):
    try:
        response = requests.get(f'http://ip-api.com/json/{ip}', timeout=2)
        data = response.json()
        if data.get('status') == 'success':
            return data.get('lat'), data.get('lon')
        return None, None
    except:
        return None, None

def packet_callback(packet):
    """Callback for Scapy packet sniffer - captures DNS packets"""
    try:
        if IP in packet:
            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
            
           
            if UDP in packet and packet[UDP].dport == 53:
                print(f"DNS Query detected: {src_ip} -> {dst_ip}")
                
                src_lat, src_lng = get_location(src_ip)
                dst_lat, dst_lng = get_location(dst_ip)
                
                if src_lat is not None and dst_lat is not None:
                    data = {
                        "sourceLat": src_lat,
                        "sourceLng": src_lng,
                        "targetLat": dst_lat,
                        "targetLng": dst_lng,
                        "type": "dns_query"
                    }
                    socketio.emit("attack", data)
                    print(f"✓ DNS Attack emitted: {src_ip} -> {dst_ip}")
    except Exception as e:
        print(f"Error processing packet: {e}")

def capture_dns_packets():
    """Sniff DNS packets on the network"""
    print("Starting DNS packet sniffer...")
    try:
        sniff(filter="udp port 53", prn=packet_callback, store=False)
    except PermissionError:
        print(" ERROR: Need admin/root privileges to sniff packets!")
        print("Run this script with: sudo python server.py")
        print("Or: Run as Administrator (Windows)")
        fallback_to_simulated()
    except Exception as e:
        print(f"Error starting packet sniffer: {e}")
        fallback_to_simulated()

def fallback_to_simulated():
    """Fallback to simulated DNS attacks if sniffing fails"""
    print("Falling back to simulated DNS attacks...")
    while True:
        try:
            src_ip = random.choice(BOTNET_IPS)
            dst_ip = random.choice(BOTNET_IPS)
            while dst_ip == src_ip:
                dst_ip = random.choice(BOTNET_IPS)
            
            src_lat, src_lng = get_location(src_ip)
            dst_lat, dst_lng = get_location(dst_ip)
            
            if src_lat is not None and dst_lat is not None:
                data = {
                    "sourceLat": src_lat,
                    "sourceLng": src_lng,
                    "targetLat": dst_lat,
                    "targetLng": dst_lng,
                    "type": "simulated"
                }
                socketio.emit("attack", data)
                print(f"Simulated attack: {src_ip} -> {dst_ip}")
        except Exception as e:
            print(f"Error in fallback: {e}")
        
        time.sleep(3)

@app.route("/")
def home():
    return "DNS Attack Visualization Server Running"

if __name__ == "__main__":
   
    sniffer_thread = threading.Thread(target=capture_dns_packets, daemon=True)
    sniffer_thread.start()
    
    print("Server starting on http://0.0.0.0:5000")
    print("DNS packet sniffer running in background...")
    
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)