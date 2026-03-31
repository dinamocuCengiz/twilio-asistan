# Twilio AI Müşteri Hizmetleri Asistanı

Bilinmeyen numaralar AI asistana, rehberdeki numaralar doğrudan size bağlanır.

## Kurulum

### 1. Bağımlılıkları yükleyin
```bash
npm install
```

### 2. Ortam değişkenlerini ayarlayın
```bash
cp .env.example .env
```
`.env` dosyasını açın ve şu alanları doldurun:
- `TWILIO_ACCOUNT_SID` ve `TWILIO_AUTH_TOKEN` → twilio.com/console
- `TWILIO_PHONE_NUMBER` → Twilio'dan kiraladığınız numara
- `YOUR_PHONE_NUMBER` → Sizin gerçek telefon numaranız
- `ANTHROPIC_API_KEY` → console.anthropic.com

### 3. Sunucuyu başlatın
```bash
# Geliştirme
npm run dev

# Production
npm start
```

### 4. ngrok ile internete açın (geliştirme için)
```bash
ngrok http 3000
```
Çıktıdaki HTTPS URL'yi `.env` dosyasındaki `BASE_URL`'ye yapıştırın.

### 5. Twilio webhook'larını ayarlayın
Twilio Console → Phone Numbers → Active Numbers → numaranıza tıklayın:

- **A call comes in** → `https://YOUR_URL/incoming-call` (HTTP POST)
- **Call status changes** → `https://YOUR_URL/call-status` (HTTP POST)

## Rehber Yönetimi

```bash
# Kişileri listele
curl http://localhost:3000/contacts

# Yeni kişi ekle (bu numara artık doğrudan size bağlanır)
curl -X POST http://localhost:3000/contacts \
  -H "Content-Type: application/json" \
  -d '{"phone": "+905551234567", "name": "Ahmet Yılmaz"}'
```

## AI Asistanı Özelleştirme

`.env` dosyasında:
```
ASSISTANT_NAME=Asistan
COMPANY_NAME=Benim Şirketim
ASSISTANT_PROMPT=Sen bir restoran rezervasyon asistanısın. Masa rezervasyonu al, menü hakkında bilgi ver.
```

## Proje Yapısı

```
├── src/
│   ├── index.js      # Express sunucu, Twilio webhook'ları
│   └── ai.js         # Claude entegrasyonu, sohbet yönetimi
├── contacts/
│   ├── db.js         # Rehber işlemleri
│   └── contacts.json # Rehber verisi (otomatik oluşur)
├── .env.example      # Örnek ortam değişkenleri
└── package.json
```

## Production'a Geçiş

1. **Veritabanı**: `contacts/db.js` içindeki JSON'u PostgreSQL ile değiştirin
2. **Güvenlik**: `index.js` içindeki Twilio imza doğrulamasını etkinleştirin
3. **TTS Kalitesi**: ElevenLabs API entegrasyonu ekleyerek daha doğal ses elde edin
4. **Loglama**: Çağrı kayıtları için bir logging servisi ekleyin
