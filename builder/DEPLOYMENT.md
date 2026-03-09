# 🚀 Production Deployment Guide

Bu rehber Android Builder sistemini production sunucusuna (VPS) nasıl deploy edeceğini açıklar.

---

## 📋 Gereksinimler

Sunucuda olması gerekenler:
- **Docker** 24.0+
- **Docker Compose** 2.0+
- **Git**
- **4GB+ RAM** (Worker için Android SDK)
- **20GB+ Disk** (Build artifacts için)

---

## 1️⃣ Sunucuya Bağlanma

```bash
ssh user@your-vps-ip
```

---

## 2️⃣ Docker Kurulumu (eğer yoksa)

```bash
# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose kurulumu
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Docker'ı sudo olmadan kullanmak için (opsiyonel)
sudo usermod -aG docker $USER
newgrp docker

# Test
docker --version
docker compose version
```

---

## 3️⃣ Projeyi Klonlama

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/com-umingleapp-aab.git
cd com-umingleapp-aab
```

---

## 4️⃣ Environment Ayarları

Production `.env` dosyası oluştur:

```bash
cd builder
cp .env.production .env
nano .env
```

**`.env` içeriği:**

```env
# MongoDB
MONGODB_URI=mongodb://mongo:27017/android_builder

# API
API_PORT=4000

# Paths (Docker volumes)
ARTIFACTS_ROOT=/data/artifacts
WORKSPACES_ROOT=/data/workspaces
KEYS_ROOT=/data/keys
ASSETS_ROOT=/data/assets
TEMPLATE_DEFAULT_PATH=/app/android

# Web -> API connection
API_URL=http://api:4000
```

**Not:** Bu değerler zaten `docker-compose.yml` içinde ayarlı, manuel değiştirmeye gerek yok.

---

## 5️⃣ Docker Build (İlk Kez)

**Tüm image'ları build et (worker dahil):**

```bash
cd builder
docker compose build
docker compose --profile build-image build
```

İlk komut API, Web, Envoy image'larını build eder.
İkinci komut **Worker image'ını** build eder (`builder-worker:latest`).

Bu işlem **10-15 dakika** sürebilir çünkü:
- Worker image Android SDK indiriyor (~1GB)
- Web Next.js production build alıyor
- Dependencies kuruluyor

**Not:** Worker bir servis olarak çalışmaz. Her build isteğinde API, bu image'dan
yeni bir container spawn eder. Build bitince container otomatik silinir.

---

## 6️⃣ Container'ları Başlatma

```bash
docker compose up -d
```

**Servisleri kontrol et:**

```bash
docker compose ps
```

Çıktı şöyle olmalı (worker YOK — o on-demand spawn edilir):
```
NAME               SERVICE    STATUS        PORTS
builder-api-1      api        Up 10s
builder-envoy-1    envoy      Up 10s        0.0.0.0:80->80/tcp
builder-mongo-1    mongo      Up 10s
builder-web-1      web        Up 10s
```

---

## 7️⃣ Logları İzleme

**Tüm servisleri izle:**

```bash
docker compose logs -f
```

**Sadece Worker'ı izle (build logları için):**

```bash
docker compose logs -f worker
```

**API loglarını izle:**

```bash
docker compose logs -f api
```

---

## 8️⃣ MongoDB Seed (İlk Kurulum)

**MongoDB'ye seed data yükle:**

```bash
# Seed script'i çalıştır
docker compose exec api npm run seed
```

Bu komut:
- "Umingle Template" oluşturur (`./android` — orijinal glassmorphism login ekranı)
- "Umingle V2 Template" oluşturur (`./android-v2` — bottom sheet login ekranı)
- MongoDB'ye template kayıtları ekler

**Seed çıktısı:**

```
Connected to MongoDB
Template oluşturuldu: "Umingle Template" → <id>
Template oluşturuldu: "Umingle V2 Template" → <id>
Seed tamamlandı.
```

---

## 9️⃣ DNS/Domain Ayarları

**Alan adınızı sunucuya yönlendirin:**

```
A record: builder.yourdomain.com -> YOUR_VPS_IP
```

**Envoy zaten port 80'de dinliyor**, DNS propagate olduktan sonra direkt erişebilirsin:

```
http://builder.yourdomain.com
```

---

## 🔟 HTTPS/SSL (Opsiyonel)

**Certbot ile SSL sertifikası almak için:**

```bash
sudo apt install certbot

# Sertifika al
sudo certbot certonly --standalone -d builder.yourdomain.com

# Sertifika konumu
ls /etc/letsencrypt/live/builder.yourdomain.com/
```

**Envoy'da HTTPS için** `builder/envoy.yaml` güncelle (şimdilik HTTP yeterli).

---

## 1️⃣1️⃣ Sistem Durumunu Kontrol Etme

**Health check:**

```bash
curl http://localhost/api/health
# Çıktı: {"status":"ok"}
```

**Container resource kullanımı:**

```bash
docker stats
```

Örnek çıktı:
```
CONTAINER       CPU %   MEM USAGE / LIMIT    MEM %
builder-api-1    0.5%   80MB / 4GB          2%
builder-worker-1 15%    1.2GB / 4GB         30%
builder-web-1    0.3%   120MB / 4GB         3%
builder-mongo-1  2%     200MB / 4GB         5%
```

---

## 1️⃣2️⃣ Build Süreci (Production'da)

**Her build = yeni container:**

```
Web UI → "ÜRET" butonu
     ↓
Envoy (port 80)
     ↓
API: POST /api/apps/:id/builds
     ↓
1. MongoDB'de Build kaydı (status=queued)
2. Docker API → yeni container spawn
     ↓
build-{buildId} container başlar
     ↓
Worker: BUILD_ID env var ile tek build işler
     ↓
gradlew assembleRelease & bundleRelease
     ↓
Artifacts → /data/artifacts (shared volume)
     ↓
MongoDB (status=success)
     ↓
Container otomatik silinir (AutoRemove)
     ↓
Web UI download link
```

**Neden her build = yeni container?**
- Her container benzersiz bir ortam (hostname, PID, timing)
- Build workspace tamamen izole
- Klon algılama riskini azaltır (farklı binary footprint)
- Container bitince temizlenir (disk dolmaz)

**Build container'larını izlemek:**

```bash
docker ps --filter "name=build-"
```

---

## 1️⃣3️⃣ Güncelleme (Yeni Kod Deploy)

**Sunucuda kod güncellemek için:**

```bash
cd ~/com-umingleapp-aab

# Yeni kodu çek
git pull origin main

# Container'ları yeniden build et
cd builder
docker compose build

# Yeniden başlat
docker compose up -d
```

**Zero-downtime deployment için:**

```bash
docker compose up -d --no-deps --build api
docker compose up -d --no-deps --build worker
docker compose up -d --no-deps --build web
```

---

## 1️⃣4️⃣ Backup

**MongoDB backup:**

```bash
# Manuel backup
docker compose exec mongo mongodump --db=android_builder --out=/data/db/backup

# Backup'ı sunucudan indir
docker cp builder-mongo-1:/data/db/backup ./mongo_backup
```

**Artifacts backup:**

```bash
tar -czf artifacts_backup.tar.gz builder/artifacts/
```

---

## 1️⃣5️⃣ Troubleshooting

### Worker build yapamıyor

```bash
# Worker loglarını kontrol et
docker compose logs worker

# Worker container'a gir
docker compose exec worker bash

# Android SDK kurulu mu?
ls /opt/android-sdk
```

### MongoDB bağlantı hatası

```bash
# Mongo çalışıyor mu?
docker compose ps mongo

# Mongo logları
docker compose logs mongo

# Mongo içine gir
docker compose exec mongo mongosh
use android_builder
db.apps.find()
```

### Disk doldu

```bash
# Build workspace'lerini temizle
docker compose exec worker rm -rf /data/workspaces/*

# Eski artifacts'ı sil (manuel)
rm -rf builder/artifacts/apps/*/builds/OLD_BUILD_ID
```

### Container yeniden başlatma

```bash
# Tüm servisleri durdur
docker compose down

# Yeniden başlat
docker compose up -d

# Tek bir servisi yeniden başlat
docker compose restart worker
```

---

## 1️⃣6️⃣ Performance Tuning

**Eşzamanlı build:**

Her build kendi container'ında çalıştığı için **paralel build otomatik olarak destekleniyor**.
3 build aynı anda başlatırsanız, 3 ayrı container spawn olur.

**Not:** Android SDK RAM kullanımı yüksek. Her container ~1.5GB RAM kullanır.
3 paralel build için minimum **8GB RAM** gerekir.

**Build container sayısını sınırlamak için** (ileri seviye):
API tarafında bir semaphore/queue eklenebilir.

---

## 1️⃣7️⃣ Monitoring (Opsiyonel)

**Prometheus + Grafana eklemek için:**

```yaml
# docker-compose.yml'e ekle
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
```

---

## 1️⃣8️⃣ Komutlar Özeti

```bash
# İlk kurulum
git clone REPO && cd com-umingleapp-aab/builder
docker compose build
docker compose --profile build-image build
docker compose up -d
docker compose exec api npm run seed

# Log izleme
docker compose logs -f
docker compose logs -f worker

# Güncelleme
git pull && docker compose build && docker compose --profile build-image build && docker compose up -d

# Durum kontrol
docker compose ps
docker stats

# Durdurma/başlatma
docker compose down
docker compose up -d

# Backup
docker compose exec mongo mongodump --db=android_builder --out=/backup
tar -czf artifacts.tar.gz builder/artifacts/
```

---

## ✅ Başarılı Deploy Kriterleri

Deploy başarılı sayılır eğer:

1. ✅ `docker compose ps` tüm servisler UP
2. ✅ `curl http://localhost/api/health` → `{"status":"ok"}`
3. ✅ Web UI açılıyor (`http://YOUR_VPS_IP`)
4. ✅ Template listesi görünüyor
5. ✅ Yeni app oluşturuluyor
6. ✅ Build başlatılıyor ve success oluyor
7. ✅ APK/AAB download ediliyor

---

## 🆘 Destek

Sorun yaşarsan:
1. `docker compose logs -f` kontrol et
2. Container içine gir: `docker compose exec SERVICE bash`
3. MongoDB'yi kontrol et: `docker compose exec mongo mongosh`

---

## 📊 Production Mimari

```
Internet
    ↓
Envoy (port 80)
    ├── /api/* → API (Express + Docker socket)
    └── /*     → Web (Next.js)

API → build isteği gelince:
    1. MongoDB'de Build kaydı oluştur
    2. Docker API ile yeni container spawn et
       └── builder-worker:latest image
           ├── BUILD_ID env var
           ├── MONGODB_URI → mongo:27017
           └── Shared volumes (artifacts, keys, workspaces, assets)
    3. Container: tek build işle → exit → auto-remove

Docker Volumes (tüm container'lar paylaşır):
    - artifacts (APK/AAB çıktıları)
    - workspaces (geçici build dosyaları)
    - keys (signing keystores)
    - assets (logolar)
```

**Her build = yeni container** çünkü:
- Benzersiz ortam (klon koruması)
- Tam izolasyon (workspace + container)
- Paralel build desteği (birden fazla container aynı anda)
- Otomatik temizlik (container bitince silinir)

**Local geliştirmede:**
- Docker yok → Worker poll mode (10 saniyede bir kontrol)
- `npm run dev` ile API + Worker ayrı çalışır

---

**🎉 Deploy tamamlandı! Artık production sistemin hazır.**
