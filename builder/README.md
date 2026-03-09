# Android Builder - Local MVP

Web paneli üzerinden Android APK ve AAB üreten lokal build sistemi.

---

## Temel Kavramlar

keytool -genkeypair -v -keystore builder/keys/com.signal.test/key.jks -alias furkankey -keyalg RSA -keysize 2048 -validity 10000 -storepass furkankey -keypass furkankey -dname "CN=Signal, OU=Prod, O=App, L=California, ST=California, C=US"


### Taslak (Template) Nedir?

**Taslak = Senin hazır Android projen.** Repoda iki farklı taslak var:

| Taslak | Klasör | Login Ekranı |
|--------|--------|-------------|
| Umingle Template | `./android` | Glassmorphism kart, merkezi hero section |
| Umingle V2 Template | `./android-v2` | Bottom sheet kart, minimal üst alan |

- Taslak, üretilecek uygulamaların **kaynak kodu**dır
- Aynı taslaktan farklı paket adı, uygulama adı ve logo ile birden fazla uygulama üretebilirsin
- Her iki taslakta da logo, renkler, uygulama adı ve subtitle dinamik olarak değiştirilebilir
- Orijinal klasörlere **hiç dokunulmaz** — her build kendi geçici workspace'inde çalışır

### Logo Boyutları (Ana Ekran İkonu)

Ana ekranda logo **zoom/crop olmadan** tam görünsün diye:

| Format | Boyut | Açıklama |
|--------|-------|----------|
| **Önerilen** | **512×512 px** | Kare, PNG. Logo ortada, kenarlarda boşluk bırak. |
| Minimum | 432×432 px | xxxhdpi adaptive icon için yeterli |
| Play Store | 512×512 px | Play Console gereksinimi |

Logo kare olmalı (1:1). İçerik ortada, kenarlarda ~%10–15 boşluk bırak — Android safe zone (66dp) dışı kesilebilir.

### Uygulama (App) Nedir?

**Uygulama = Taslaktan üretilen bir "marka" veya "versiyon".**

- Her uygulama: kendi paket adı (`com.example.app`), gözüken isim, gizlilik politikası adı
- Her uygulamanın **kendi keystore (.jks) dosyası** olmalı — Play Store aynı uygulamayı aynı key ile imzalamanı bekler
- Bir uygulamadan birden fazla versiyon (v1.0.0, v1.0.1, …) üretebilirsin

---

## Key.jks (Keystore) Hakkında

### Key'ler Nerede Tutulur?

**Dosya sisteminde.** Key'ler `builder/keys/{paketAdi}/` klasöründe tutulur:

```
builder/keys/
  {applicationId}/      ← Paket adı (örn: com.example.app)
    key.jks             ← Keystore dosyası
    keystore.properties ← Şifreler (storePassword, keyAlias, keyPassword)
```

- Panelden "KEY YÜKLE" ile yüklersen bu dizine yazılır
- İstersen dosyaları **manuel** de koyabilirsin (bkz. `builder/keys/README.md`)

### Key.jks Nasıl ve Nerede Üretilir?

**Çakışma olmaz.** Her uygulama kendi klasöründe (`builder/keys/{paketAdi}/`) key tutar. Farklı uygulamalar farklı dizinlerde olduğu için çakışma yok.

**JDK ile (terminal):**

**ÖNEMLİ:** Komutu **proje kök dizininden** (`com-umingleapp-aab/`) çalıştır, `builder/` içinden değil.

Her uygulama için:

```bash
# Proje kökündeyken (cd com-umingleapp-aab)
mkdir -p builder/keys/com.furkan.app
keytool -genkeypair -v -keystore builder/keys/com.furkan.app/key.jks \
  -alias furkankey -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass furkankey -keypass furkankey \
  -dname "CN=Furkan, OU=Dev, O=App, L=Istanbul, ST=Istanbul, C=TR"
```

Sonra `builder/keys/com.furkan.app/keystore.properties` oluştur:

```
storePassword=furkankey
keyAlias=furkankey
keyPassword=furkankey
```

**Android Studio ile:**

1. Build → Generate Signed Bundle / APK
2. "Create new..." ile yeni keystore oluştur
3. Oluşan `.jks` dosyasını `builder/keys/{paketAdi}/key.jks` olarak kopyala

**Online araç yok.** Key üretimi güvenlik gereği lokal yapılır.

### Her Uygulama İçin Ayrı Key Gerekir mi?

**Evet.** Her Play Store uygulaması (farklı paket adı) için ayrı keystore kullanmalısın. Bir kez yanlış key ile yayınlarsan, o uygulama için o key’i değiştiremezsin.

### Store Password, Key Alias, Key Password — Hepsi Aynı Olabilir mi?

**Evet, sorun olmaz.** Tüm uygulamalar için aynı değerleri kullanabilirsin (örn. `furkankey`). Önemli olan her uygulama için **ayrı key.jks dosyası** olması; şifreler aynı olabilir.

| Alan            | Değer      |
|-----------------|------------|
| storePassword   | furkankey  |
| keyAlias        | furkankey  |
| keyPassword     | furkankey  |

### Şifreleri Nereye Kaydedeyim?

Her uygulama için `builder/keys/{paketAdi}/keystore.properties`:

```
storePassword=furkankey
keyAlias=furkankey
keyPassword=furkankey
```

Örnek: `builder/keys/keystore.properties.example`

---

Hangi dizinden çalıştırmalısın?
Proje kökünden (com-umingleapp-aab/):
cd /Users/furkanbesirli/Projects/mobile/com-umingleapp-aabmkdir -p builder/keys/com.yeni.app

keytool -genkeypair -v -keystore builder/keys/com.frkn.app/key.jks -alias furkankey -keyalg RSA -keysize 2048 -validity 10000 -storepass furkankey -keypass furkankey -dname "CN=Frkn, OU=Prod, O=App, L=California, ST=California, C=US"

2. Key.jks nasıl oluşturulur?
mkdir -p builder/keys/com.example.app1
keytool -genkeypair -v -keystore builder/keys/com.example.app1/key.jks \
  -alias furkankey -keyalg RSA -keysize 2048 -validity 10000
  
mkdir -p builder/keys/com.example.app1keytool -genkeypair -v -keystore builder/keys/com.example.app1/key.jks \  -alias furkankey -keyalg RSA -keysize 2048 -validity 10000
Keytool sorduğu store password ve key password için furkankey kullanabilirsin.
3. Store password, key alias, key password aynı olabilir mi?
Evet. Tüm uygulamalar için aynı değerleri kullanabilirsin:
Alan	Değer
storePassword	furkankey
keyAlias	furkankey
keyPassword	furkankey


## Mimari

```
builder/
  api/          → Express API (port 4000)
  web/          → Next.js Admin Panel (port 3000)
  worker/       → Build worker (Gradle runner)
  shared/       → Paylaşılan TypeScript tipleri
  artifacts/    → Üretilen APK/AAB/Log dosyaları
  workspaces/   → Geçici build çalışma dizinleri (her build için ayrı)
```

## Gereksinimler

- Node.js >= 18
- MongoDB (lokal veya Docker)
- Java JDK 17 (Android build için)
- Android SDK (ANDROID_HOME veya ANDROID_SDK_ROOT ayarlı)

## Kurulum

### 1. MongoDB başlat

Docker ile:
```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```

Veya lokal MongoDB kurulumu kullanın.

### 2. .env dosyasını ayarla

```bash
cd builder
cp .env.example .env
# .env dosyasını düzenleyin (ENCRYPTION_KEY, JAVA_HOME vb.)
```

### 3. Bağımlılıkları yükle

```bash
# API
cd builder/api && npm install

# Worker
cd builder/worker && npm install

# Web
cd builder/web && npm install
```

### 4. Seed (Varsayılan taslak oluştur)

```bash
cd builder/api && npm run seed
```

Bu komut iki taslak oluşturur:
- **Umingle Template** → `./android` (orijinal login ekranı)
- **Umingle V2 Template** → `./android-v2` (farklı login ekranı — bottom sheet)

## Çalıştırma

3 ayrı terminal açın:

**Terminal 1 - API:**
```bash
cd builder/api && npm run dev
```

**Terminal 2 - Worker:**
```bash
cd builder/worker && npm run dev
```

**Terminal 3 - Web:**
```bash
cd builder/web && npm run dev
```

Web paneli: http://localhost:3000

---

## Kullanım Akışı (Adım Adım)

### Adım 1: Taslak Oluştur (İlk Kurulumda Bir Kez)

- http://localhost:3000/templates adresine git
- "YENİ TASLAK +" tıkla
- **Taslak adı:** Örn. "Umingle Template"
- **Yerel yol:** `./android` (veya proje kökünden android klasörünün yolu)
- OLUŞTUR'a tıkla

> Bu taslak, senin Umingle Android projeni işaret eder. Seed çalıştırdıysan zaten "Umingle Template" vardır.

### Adım 2: Uygulama Oluştur

- http://localhost:3000/apps adresine git
- "YENİ UYGULAMA +" tıkla
- **Taslak:** Hangi taslağı kullanacağını seç (Umingle Template veya Umingle V2 Template)
- **Gözüken isim:** Play Store’da görünecek uygulama adı
- **Paket adı:** `com.sirket.uygulama` formatında, her uygulama için benzersiz olmalı
- **Gizlilik politikası adı:** İsteğe bağlı
- OLUŞTUR'a tıkla

### Adım 3: Keystore Yükle (Her Uygulama İçin)

- Oluşturduğun uygulamaya tıkla (detay sayfası açılır)
- "Keystore" bölümünde:
  - **Dosya:** Bilgisayarından `.jks` dosyasını seç (dışarıdan ürettiğin key)
  - **Store Password:** Keystore şifresi
  - **Key Alias:** Key alias (örn. `upload`, `key0`)
  - **Key Password:** Key şifresi
- "KEY YÜKLE" tıkla

> Key MongoDB’de şifrelenerek saklanır. Kaynak koduna eklemen gerekmez.

### Adım 4: Build Başlat

- Uygulama detay sayfasında "ÜRET" butonuna tıkla
- Versiyon kodu (örn. 100, 101), versiyon adı (örn. 1.0.0), uygulama isimleri (TR/EN/ES) gir
- "ÜRET" tıkla
- Worker build’i alır, Gradle çalışır
- Tamamlanınca APK ve AAB indirme linkleri görünür

---

## Build Pipeline

1. Template klasörü (`./android`) `workspaces/{buildId}/` altına kopyalanır
2. `build.gradle` içinde applicationId, versionCode, versionName güncellenir
3. `strings.xml` dosyalarında uygulama adları güncellenir (EN/TR/ES)
4. Keystore geçici workspace'e yazılır, signing config ayarlanır
5. `./gradlew clean assembleRelease bundleRelease` çalıştırılır
6. APK ve AAB dosyaları `artifacts/` klasörüne kopyalanır

### APK/AAB Nereye Gelir?

```
builder/artifacts/apps/{paketAdi}/builds/{buildId}/
  com.furkan.app(v1.0.1).apk
  com.furkan.app(v1.0.1).aab
  build.log
```

Örnek: `builder/artifacts/apps/com.furkan.app/builds/`

Build tamamlandığında web panelinden de indirme linkleri görünür.

## API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /templates | Taslak listesi |
| POST | /templates | Yeni taslak |
| GET | /templates/:id | Taslak detay |
| PUT | /templates/:id | Taslak güncelle |
| DELETE | /templates/:id | Taslak sil |
| GET | /apps | Uygulama listesi |
| POST | /apps | Yeni uygulama |
| GET | /apps/:id | Uygulama detay |
| PUT | /apps/:id | Uygulama güncelle |
| DELETE | /apps/:id | Uygulama sil |
| POST | /apps/:id/keystore | Keystore yükle |
| POST | /apps/:id/builds | Build başlat |
| GET | /apps/:id/builds | Build geçmişi |
| GET | /builds/:id | Build detay |
| GET | /download?path=... | Dosya indir |
