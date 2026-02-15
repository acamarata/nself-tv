#!/bin/bash
set -e

# nself-tv One-Line NAS Installer
# Detects platform and installs nTV with minimal configuration

NTREV_VERSION="0.9.1"
INSTALL_URL="https://raw.githubusercontent.com/acamarata/nself-tv/main/backend"
COLORS=true

# Colors
if [ "$COLORS" = true ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' NC=''
fi

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Detect platform
detect_platform() {
  if [ -f "/etc/synoinfo.conf" ]; then
    echo "synology"
  elif [ -f "/etc/config/qpkg.conf" ]; then
    echo "qnap"
  elif [ -f "/boot/config/plugins/dynamix/dynamix.cfg" ]; then
    echo "unraid"
  elif [ -f "/etc/os-release" ]; then
    echo "linux"
  else
    echo "unknown"
  fi
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."

  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
  fi

  if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
  fi

  log_success "Prerequisites check passed"
}

# Install on Synology
install_synology() {
  log_info "Installing on Synology DSM..."

  # Download SPK package
  local spk_url="${INSTALL_URL}/packages/synology/nself-tv-${NTREV_VERSION}.spk"
  local spk_file="/tmp/nself-tv.spk"

  log_info "Downloading Synology package..."
  curl -L -o "$spk_file" "$spk_url" || log_error "Failed to download SPK"

  # Install via synopkg
  log_info "Installing package..."
  sudo synopkg install "$spk_file" || log_error "SPK installation failed"

  # Start package
  sudo synopkg start nself-tv || log_error "Failed to start nself-tv"

  log_success "Installation complete!"
  log_info "Access nself-tv at: http://$(hostname -I | awk '{print $1}'):8080"
}

# Install on QNAP
install_qnap() {
  log_info "Installing on QNAP..."

  local qpkg_url="${INSTALL_URL}/packages/qnap/nself-tv-${NTREV_VERSION}.qpkg"
  local qpkg_file="/tmp/nself-tv.qpkg"

  log_info "Downloading QNAP package..."
  curl -L -o "$qpkg_file" "$qpkg_url" || log_error "Failed to download QPKG"

  log_info "Installing package..."
  sh "$qpkg_file" || log_error "QPKG installation failed"

  log_success "Installation complete!"
  log_info "Access nself-tv at: http://$(hostname -I | awk '{print $1}'):8080"
}

# Install on Unraid
install_unraid() {
  log_info "Installing on Unraid..."

  log_info "Please install nself-tv from Community Applications:"
  log_info "1. Open Unraid web UI"
  log_info "2. Go to Apps tab"
  log_info "3. Search for 'nself-tv'"
  log_info "4. Click Install"
  log_info ""
  log_info "Or manually with docker compose:"
  log_info "  mkdir -p /mnt/user/appdata/nself-tv"
  log_info "  cd /mnt/user/appdata/nself-tv"
  log_info "  curl -L -o docker-compose.yml ${INSTALL_URL}/docker-compose.nas.yml"
  log_info "  curl -L -o .env ${INSTALL_URL}/.env.nas.example"
  log_info "  docker compose up -d"
}

# Install on generic Linux
install_linux() {
  log_info "Installing on generic Linux..."

  local install_dir="${INSTALL_DIR:-$HOME/nself-tv}"

  log_info "Creating installation directory: $install_dir"
  mkdir -p "$install_dir"
  cd "$install_dir"

  # Download docker-compose and .env
  log_info "Downloading configuration files..."
  curl -L -o docker-compose.yml "${INSTALL_URL}/docker-compose.nas.yml" || log_error "Failed to download docker-compose.yml"
  curl -L -o .env.example "${INSTALL_URL}/.env.nas.example" || log_error "Failed to download .env.example"

  # Copy .env.example to .env if doesn't exist
  if [ ! -f .env ]; then
    cp .env.example .env
    log_info "Created .env file. Please customize it before starting services."
  fi

  # Create required directories
  mkdir -p media config data backups

  log_info "Starting services..."
  docker compose up -d || log_error "Failed to start services"

  # Wait for services to be healthy
  log_info "Waiting for services to be ready..."
  sleep 10

  local ip_address=$(hostname -I | awk '{print $1}')
  log_success "Installation complete!"
  log_info "Access nself-tv at: http://${ip_address}:8080"
  log_info ""
  log_info "Installation directory: $install_dir"
  log_info "To stop: cd $install_dir && docker compose down"
  log_info "To view logs: cd $install_dir && docker compose logs -f"
  log_info "To update: cd $install_dir && docker compose pull && docker compose up -d"
}

# Main installation flow
main() {
  echo ""
  echo "======================================"
  echo "  nself-tv NAS Installer v${NTREV_VERSION}"
  echo "======================================"
  echo ""

  local platform=$(detect_platform)
  log_info "Detected platform: $platform"

  check_prerequisites

  case "$platform" in
    synology)
      install_synology
      ;;
    qnap)
      install_qnap
      ;;
    unraid)
      install_unraid
      ;;
    linux)
      install_linux
      ;;
    *)
      log_error "Unsupported platform: $platform"
      ;;
  esac

  echo ""
  log_success "Thank you for installing nself-tv!"
  log_info "Documentation: https://github.com/acamarata/nself-tv/wiki"
  log_info "Support: https://discord.gg/nself"
  echo ""
}

# Run installer
main
