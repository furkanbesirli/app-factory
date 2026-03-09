# Keystore Dosyaları

Her uygulama için keystore bu dizinde tutulur. **Çakışma olmaz** — her uygulama kendi paket adıyla ayrı klasörde.

```
builder/keys/
  com.example.app1/      ← Uygulama 1
    key.jks
    keystore.properties
  com.example.app2/      ← Uygulama 2
    key.jks
    keystore.properties
```

## Key.jks Oluşturma

**Proje kökünden** (`com-umingleapp-aab/`) çalıştır, `builder/` içinden değil:

```bash
mkdir -p builder/keys/com.furkan.app
keytool -genkeypair -v -keystore builder/keys/com.thundr.app/key.jks -alias furkankey -keyalg RSA -keysize 2048 -validity 10000 -storepass furkankey -keypass furkankey -dname "CN=thundr, OU=Dev, O=App, L=Newcastle, ST=Newcastle, C=UK"

## Manuel Yerleştirme

Panelden yükleme yerine, dosyaları elle de koyabilirsin:

1. `builder/keys/{paketAdi}/` klasörünü oluştur (örn: `com.example.app`)
2. `key.jks` dosyasını bu klasöre kopyala
3. `keystore.properties` oluştur:

```
storePassword=furkankey
keyAlias=furkankey
keyPassword=furkankey
```

## Varsayılan Şifre (Lokal Test)

Tüm uygulamalar için aynı şifre kullanıyorsan örnek:

```
storePassword=furkankey
keyAlias=furkankey
keyPassword=furkankey
```
