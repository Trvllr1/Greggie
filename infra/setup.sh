#!/bin/bash
# Greggie Dev Server Setup — OCI Ubuntu 24.04 (AMD Micro)
# Run: bash setup.sh
set -euo pipefail

echo "=== Greggie Dev Server Setup ==="

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

# 4. Open firewall ports (OCI Ubuntu has iptables rules by default)
echo ">>> Opening firewall ports..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Persist iptables rules
echo iptables-persistent iptables-persistent/autosave_v4 boolean true | sudo debconf-set-selections
echo iptables-persistent iptables-persistent/autosave_v6 boolean true | sudo debconf-set-selections
sudo apt install -y iptables-persistent
sudo netfilter-persistent save

# 5. Create swap (1 GB RAM is tight — add 2 GB swap)
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

echo ""
echo "=== Setup complete! ==="
echo "Log out and back in for docker group to take effect:"
echo "  exit"
echo "  ssh -i ~/.ssh/greggie-dev ubuntu@$(curl -s ifconfig.me)"
echo ""
echo "Then clone your repo and deploy:"
echo "  git clone <your-repo-url> greggie"
echo "  cd greggie"
echo "  cp .env.example .env"
echo "  nano .env  # fill in secrets"
echo "  docker compose -f docker-compose.prod.yml up -d"
