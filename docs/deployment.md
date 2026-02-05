# Explorer Deployment Guide

One-time setup guide for deploying Explorer to a fresh Vultr instance.

## Prerequisites

- Vultr account with API access
- SSH key added to Vultr
- DNS management access for `postfiat.org`

## Architecture

```
                    ┌─────────────────────┐
                    │   GitHub Actions    │
                    │  (CI/CD Pipeline)   │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
      ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
      │  Docker Hub   │ │ Devnet Server │ │Testnet Server │
      │   (Images)    │ │  (Vultr)      │ │  (Vultr)      │
      └───────────────┘ └───────────────┘ └───────────────┘
```

## Automated (GitHub Actions handles)

After one-time setup, pushes to environment branches trigger:
1. Run tests (lint + unit tests)
2. Build Docker image with environment-specific config
3. Push image to Docker Hub as `agtipft/explorer:{env}-latest`
4. SCP docker-compose file to server
5. SSH to server and run `docker compose pull && up -d`

## One-Time Server Setup

### 1. Create Vultr Instance

Recommended specs:
- **OS:** Ubuntu 24.04 LTS
- **Plan:** Regular Cloud Compute, 2 vCPU, 4GB RAM, 80GB SSD ($24/mo)
- **Region:** Choose closest to target users
- **SSH Key:** Add your key during creation

Note: Explorer is lightweight (static files + Express server). This spec provides headroom for Docker and traffic spikes.

### 2. Initial Server Configuration

SSH into the new instance:

```bash
ssh root@<instance-ip>
```

Update system and install Docker:

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
```

Create application directory:

```bash
mkdir -p /opt/explorer
```

### 3. Configure Firewall

Set up UFW to allow SSH, HTTP, and HTTPS:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

### 4. Install and Configure Caddy

Install Caddy:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy
```

Configure Caddy for Explorer (replace `{env}` with `devnet` or `testnet`):

```bash
cat > /etc/caddy/Caddyfile << 'EOF'
explorer.{env}.postfiat.org {
    reverse_proxy localhost:5001
}
EOF
```

Restart Caddy:

```bash
systemctl reload caddy
```

### 5. Configure DNS

Add A record pointing to the instance IP:

| Type | Name | Value |
|------|------|-------|
| A | explorer.devnet | `<devnet-instance-ip>` |
| A | explorer.testnet | `<testnet-instance-ip>` |

### 6. Add GitHub Secrets

Add the following secrets to the repository (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `VULTR_SSH_KEY` | Private SSH key for deployment |
| `VULTR_SSH_USER` | SSH username (typically `root`) |
| `VULTR_DEVNET_HOST` | Devnet instance IP address |
| `VULTR_TESTNET_HOST` | Testnet instance IP address |

### 7. Verify Deployment

After pushing to the environment branch:

1. Check GitHub Actions workflow completes successfully
2. SSH to server and verify container is running:
   ```bash
   docker ps
   docker logs explorer
   ```
3. Access Explorer at `https://explorer.{env}.postfiat.org`

## Troubleshooting

### Container won't start

Check logs:
```bash
docker logs explorer
```

### SSL certificate issues

Caddy auto-provisions certificates. Check Caddy logs:
```bash
journalctl -u caddy -f
```

### WebSocket connection fails

Verify the rippled WebSocket endpoint is accessible:
```bash
curl -v wss://ws.{env}.postfiat.org
```

## Manual Deployment

If needed, deploy manually:

```bash
ssh root@<instance-ip>
cd /opt/explorer
docker compose -f docker-compose.{env}.yml pull
docker compose -f docker-compose.{env}.yml up -d
```
