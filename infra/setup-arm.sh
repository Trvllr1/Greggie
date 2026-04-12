#!/bin/bash
# Greggie ARM Server Setup — OCI Ubuntu 24.04 aarch64 (Ampere A1.Flex)
# 4 OCPU / 24 GB RAM — much more room than the AMD Micro
# Run: ssh ubuntu@<ARM_IP> 'bash -s' < infra/setup-arm.sh
set -euo pipefail

echo "=== Greggie ARM Server Setup (4 OCPU / 24 GB) ==="

# 1. System update
echo ">>> Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
echo ">>> Installing Docker..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

# 3. Install Docker Compose plugin
echo ">>> Installing Docker Compose..."
sudo apt install -y docker-compose-plugin

# 4. Useful tools
echo ">>> Installing utilities..."
sudo apt install -y htop curl jq git

# 5. Open firewall ports (OCI Ubuntu ships with iptables rules by default)
echo ">>> Opening firewall ports..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 1935 -j ACCEPT

# Persist iptables rules
echo iptables-persistent iptables-persistent/autosave_v4 boolean true | sudo debconf-set-selections
echo iptables-persistent iptables-persistent/autosave_v6 boolean true | sudo debconf-set-selections
sudo apt install -y iptables-persistent
sudo netfilter-persistent save

# 6. Swap — 24 GB RAM is plenty, but a small swap is good practice
echo ">>> Creating 2 GB swap..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  sudo sysctl vm.swappiness=10
  echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
fi

# 7. Kernel tuning for better container performance with 24 GB
echo ">>> Tuning kernel params..."
cat <<'SYSCTL' | sudo tee /etc/sysctl.d/99-greggie.conf
# Network
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.ip_local_port_range = 1024 65535

# VM — less aggressive swapping with 24 GB
vm.swappiness = 10
vm.overcommit_memory = 1

# File descriptors
fs.file-max = 100000
SYSCTL
sudo sysctl -p /etc/sysctl.d/99-greggie.conf

# 8. Create backup directory
echo ">>> Setting up backup directory..."
mkdir -p ~/greggie-backups

# 9. Install backup cron job
echo ">>> Installing backup cron..."
(crontab -l 2>/dev/null | grep -v backup-db.sh; echo "0 3 * * * cd ~/greggie && bash infra/backup-db.sh >> ~/greggie-backups/cron.log 2>&1") | crontab -

echo ""
echo "============================================"
echo "  ARM Server Setup Complete!"
echo "  4 OCPU / 24 GB RAM ready"
echo "============================================"
echo ""
echo "Log out and back in for docker group, then:"
echo ""
echo "  git clone <your-repo-url> greggie"
echo "  cd greggie"
echo "  cp .env.example .env"
echo "  nano .env  # fill in secrets"
echo "  docker compose -f docker-compose.prod.yml -f docker-compose.arm.yml up -d"
echo ""
echo "The ARM override (docker-compose.arm.yml) lifts memory"
echo "limits to take full advantage of 24 GB."
