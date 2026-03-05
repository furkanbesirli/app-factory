# 🖥️ Sıfırdan Sunucu Kurulum Rehberi

Bu rehber, sıfır bir VPS/sunucuyu Android Builder sistemini çalıştıracak şekilde adım adım hazırlamayı anlatır.

---

## 📋 Gereksinimler

| Bileşen | Minimum |
|---------|---------|
| **OS** | Ubuntu 22.04 LTS (önerilir) |
| **RAM** | 4 GB (paralel build için 8 GB) |
| **Disk** | 30 GB SSD |
| **CPU** | 2 vCPU |
| **Ağ** | Statik IP veya domain ile erişilebilir |

---

## 1️⃣ Sunucuya Bağlanma

```bash
ssh root@SUNUCU_IP
```

veya SSH key kullanıyorsan:

```bash
ssh -i ~/.ssh/anahtar root@SUNUCU_IP
```

---

## 2️⃣ Sistemi Güncelleme

```bash
apt update && apt upgrade -y
```

Bu işlem birkaç dakika sürebilir.

---

## 3️⃣ Temel Araçları Kurma

```bash
apt install -y curl wget git unzip
```

---

## 4️⃣ Docker Kurulumu

### 4.1 Docker'ı indir ve kur

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 4.2 Docker Compose plugin kurulumu

```bash
apt install -y docker-compose-plugin
```

### 4.3 Kurulumu doğrula

```bash
docker --version
docker compose version
```

Örnek çıktı:
```
Docker version 24.0.x
Docker Compose version v2.x.x
```

### 4.4 Root dışı kullanıcı için Docker erişimi (opsiyonel)

Eğer `root` yerine başka bir kullanıcı ile çalışacaksan:

```bash
usermod -aG docker $USER
```

Sonra oturumu kapatıp yeniden bağlan veya:

```bash
newgrp docker
```

---

## 5️⃣ Proje Dizini Oluşturma

```bash
mkdir -p /opt/apps
cd /opt/apps
```

---

## 6️⃣ GitHub'dan Kodu Çekme

### 6.1 Public repo ise

```bash
git clone https://github.com/KULLANICI_ADI/com-umingleapp-aab.git
cd com-umingleapp-aab
```

### 6.2 Private repo ise (SSH key ile)

Önce sunucuda SSH key oluştur:

```bash
ssh-keygen -t ed25519 -C "sunucu@builder" -f ~/.ssh/github_key -N ""
cat ~/.ssh/github_key.pub
```

Bu çıktıyı GitHub → Settings → SSH Keys bölümüne ekle.

Sonra:

```bash
git clone git@github.com:KULLANICI_ADI/com-umingleapp-aab.git
cd com-umingleapp-aab
```

### 6.3 Belirli branch kullanacaksan

```bash
git checkout main
# veya
git checkout production
```

---

## 7️⃣ Environment Dosyası

```bash
cd builder
cp .env.production .env
nano .env
```

**Örnek `.env` içeriği:**

```env
MONGODB_URI=mongodb://mongo:27017/android_builder
API_PORT=4000
ARTIFACTS_ROOT=/data/artifacts
WORKSPACES_ROOT=/data/workspaces
KEYS_ROOT=/data/keys
ASSETS_ROOT=/data/assets
API_URL=http://api:4000
```

Kaydet: `Ctrl+O`, Enter, `Ctrl+X`

---

## 8️⃣ Docker Image'larını Build Etme

### 8.1 Ana servisleri build et

```bash
cd /opt/apps/com-umingleapp-aab/builder
docker compose build
```

Bu işlem **5–10 dakika** sürebilir (API, Web, dependencies).

### 8.2 Worker image'ını build et

```bash
docker compose --profile build-image build
```

Bu işlem **10–15 dakika** sürebilir (Android SDK indiriliyor).

---

## 9️⃣ Container'ları Başlatma

```bash
docker compose up -d
```

### 9.1 Durumu kontrol et

```bash
docker compose ps
```

Beklenen çıktı:
```
NAME               SERVICE    STATUS
builder-api-1      api        Up
builder-envoy-1    envoy      Up
builder-mongo-1    mongo      Up
builder-web-1      web        Up
```

### 9.2 Logları izle (opsiyonel)

```bash
docker compose logs -f
```

Çıkmak için: `Ctrl+C`

---

## 🔟 MongoDB Seed (İlk Kurulum)

Template ve varsayılan verileri yükle:

```bash
docker compose exec api npm run seed
```

Örnek çıktı:
```
MongoDB connected
Template created: Umingle Template
Seed data inserted
```

---

## 1️⃣1️⃣ Domain Yönlendirme

### 11.1 DNS Ayarı

Domain sağlayıcında (Cloudflare, GoDaddy, vb.) şu kaydı ekle:

| Tip | İsim | Değer | TTL |
|-----|------|-------|-----|
| A | builder | SUNUCU_IP | 300 |
| A | @ | SUNUCU_IP | 300 |

Örnek: `builder.senindomain.com` → `123.45.67.89`

### 11.2 Firewall (Port 80 ve 443)

```bash
ufw allow 80
ufw allow 443
ufw allow 22
ufw enable
ufw status
```

### 11.3 Test

DNS yayıldıktan sonra (5–30 dakika):

```bash
curl http://builder.senindomain.com/api/health
```

Beklenen: `{"status":"ok"}`

---

## 1️⃣2️⃣ HTTPS (Opsiyonel)

### 12.1 Certbot kurulumu

```bash
apt install -y certbot
```

### 12.2 Sertifika al

```bash
certbot certonly --standalone -d builder.senindomain.com
```

Sertifika konumu:
```
/etc/letsencrypt/live/builder.senindomain.com/fullchain.pem
/etc/letsencrypt/live/builder.senindomain.com/privkey.pem
```

### 12.3 Envoy'da HTTPS

`envoy.yaml` dosyasına TLS listener eklenebilir. Şimdilik HTTP yeterli; reverse proxy (Nginx, Caddy) ile de SSL yapılabilir.

---

## 1️⃣3️⃣ Güncelleme (Yeni Kod)

```bash
cd /opt/apps/com-umingleapp-aab
git pull origin main

cd builder
docker compose build
docker compose --profile build-image build
docker compose up -d
```

---

## 1️⃣4️⃣ Sorun Giderme

### API çalışmıyor

```bash
docker compose logs api
docker compose restart api
```

### Worker build yapamıyor

```bash
docker compose logs worker
# veya build container logları:
docker ps -a --filter "name=build-"
```

### MongoDB bağlantı hatası

```bash
docker compose ps mongo
docker compose logs mongo
```

### Disk doldu

```bash
df -h
docker system prune -f
# Eski workspace'leri temizle:
docker compose exec api rm -rf /data/workspaces/*
```

---

## 1️⃣5️⃣ Komut Özeti

```bash
# İlk kurulum
apt update && apt upgrade -y
apt install -y curl wget git
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

mkdir -p /opt/apps && cd /opt/apps
git clone https://github.com/KULLANICI/com-umingleapp-aab.git
cd com-umingleapp-aab/builder

cp .env.production .env
docker compose build
docker compose --profile build-image build
docker compose up -d
docker compose exec api npm run seed

# Domain + Firewall
ufw allow 80 && ufw allow 443 && ufw allow 22 && ufw enable
```

---

## 1️⃣6️⃣ Erişim

| URL | Açıklama |
|-----|----------|
| `http://builder.senindomain.com` | Web panel |
| `http://builder.senindomain.com/api/health` | API sağlık kontrolü |

---

**Kurulum tamamlandı.**
