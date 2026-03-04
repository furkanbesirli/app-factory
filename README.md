# Uhmingle App

React Native WebView projesi - Android için

## Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

veya

```bash
yarn install
```

### 2. Metro Bundler'ı Başlatın

Terminal 1'de:
```bash
npm start
```

veya

```bash
yarn start
```

### 3. Android Uygulamasını Çalıştırın

Terminal 2'de (yeni bir terminal açın):
```bash
npm run android
```

veya

```bash
yarn android
```

### Alternatif: Tek Komutla Çalıştırma

```bash
npm start & npm run android
```

## Gereksinimler

- **Node.js 18+** - [İndir](https://nodejs.org/)
- **Android Studio** - [İndir](https://developer.android.com/studio)
- **Android SDK** - Android Studio ile birlikte gelir
- **Java JDK 11+** - Android Studio ile birlikte gelir

## İlk Kurulum (Sadece İlk Kez)

### Android Studio Kurulumu

1. Android Studio'yu indirin ve kurun
2. Android Studio'yu açın ve SDK'yı kurun
3. Android SDK Platform-Tools'u kurun

### Android Emülatör Kurulumu (Opsiyonel)

1. Android Studio'da **Tools > Device Manager**
2. **Create Device** butonuna tıklayın
3. Bir cihaz seçin (örn: Pixel 5)
4. Bir sistem görüntüsü seçin (API 33+ önerilir)
5. **Finish** butonuna tıklayın

### Fiziksel Cihaz Kullanımı

1. Android cihazınızda **Geliştirici Seçenekleri**'ni açın:
   - Ayarlar > Telefon Hakkında > Yapı Numarası'na 7 kez tıklayın
2. **USB Debugging**'i açın:
   - Ayarlar > Geliştirici Seçenekleri > USB Debugging
3. Cihazı USB ile bilgisayara bağlayın
4. "USB Debugging izin ver" uyarısını onaylayın

## Sorun Giderme

### Metro Bundler Başlamıyor

```bash
# Cache'i temizle
npm start -- --reset-cache
```

### Android Build Hatası

```bash
# Gradle cache'i temizle
cd android
./gradlew clean
cd ..
```

### Node Modules Sorunu

```bash
# node_modules'ü sil ve yeniden yükle
rm -rf node_modules
npm install
```

### Port Zaten Kullanılıyor

```bash
# Port 8081'i kullanan process'i bul ve öldür
lsof -ti:8081 | xargs kill -9
```

## Proje Yapısı

- `src/` - Kaynak kodlar
- `android/` - Android native kodları
- `apps.json.example` - Uygulama ayarları örnek JSON dosyası

## Apps.json Yapısı

Next.js projenizin `/public/apps.json` dosyası şu formatta olmalı:

```json
[
  {
    "packageName": "com.umingleapp",
    "settings": {
      "googleSignInEnabled": true,
      "googleSignInCountries": ["US", "GB"],
      "botsApiUrl": "https://umingle.com/data/bots.json",
      "botOnlyMode": false,
      ...
    }
  }
]
```

Her uygulama kendi paket adına göre ayarlarını çeker.
