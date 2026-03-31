// src/index.js
// Ana uygulama — Twilio webhook endpoint'leri

require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const { isKnownContact, getContactName, addContact, listContacts } = require('../contacts/db');
const { chat, clearConversation } = require('./ai');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const VoiceResponse = twilio.twiml.VoiceResponse;

// ─── Twilio imza doğrulaması (production'da etkinleştirin) ───────────────────
// const validateTwilio = twilio.webhook({ validate: true });
// Geliştirme ortamında kapalı, production'da açın:
const validateTwilio = (req, res, next) => next();

// ─── ANA WEBHOOK: Gelen arama ────────────────────────────────────────────────
app.post('/incoming-call', validateTwilio, (req, res) => {
  const callerNumber = req.body.From;
  const callSid = req.body.CallSid;
  const twiml = new VoiceResponse();

  console.log(`📞 Gelen arama: ${callerNumber} (${callSid})`);

  if (isKnownContact(callerNumber)) {
    // Rehberde kayıtlı → sizi arasın
    const name = getContactName(callerNumber);
    console.log(`✅ Tanınan kişi: ${name} — yönlendiriliyor`);

    twiml.dial(process.env.YOUR_PHONE_NUMBER);
  } else {
    // Bilinmeyen numara → AI asistana yönlendir
    console.log(`🤖 Bilinmeyen numara → AI asistanına bağlanıyor`);

    twiml.say({
      language: 'tr-TR',
      voice: 'Polly.Filiz',
    }, `Merhaba, ${process.env.COMPANY_NAME || 'şirketimize'} hoş geldiniz. Size nasıl yardımcı olabilirim?`);

    // Kullanıcının sesini al
    twiml.gather({
      input: 'speech',
      language: 'tr-TR',
      speechTimeout: 'auto',
      action: `/process-speech?callSid=${callSid}`,
      method: 'POST',
    });

    // Yanıt gelmezse tekrar sor
    twiml.say({
      language: 'tr-TR',
      voice: 'Polly.Filiz',
    }, 'Sizi duyamadım. Lütfen tekrar söyleyin.');

    twiml.redirect('/incoming-call');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── SES İŞLEME: Kullanıcının konuşmasını al, Claude'a gönder ───────────────
app.post('/process-speech', validateTwilio, async (req, res) => {
  const callSid = req.query.callSid || req.body.CallSid;
  const userSpeech = req.body.SpeechResult;
  const confidence = req.body.Confidence;
  const twiml = new VoiceResponse();

  console.log(`🎤 Kullanıcı dedi: "${userSpeech}" (güven: ${confidence})`);

  if (!userSpeech || userSpeech.trim() === '') {
    twiml.say({
      language: 'tr-TR',
      voice: 'Polly.Filiz',
    }, 'Sizi anlayamadım. Lütfen tekrar söyleyin.');

    twiml.gather({
      input: 'speech',
      language: 'tr-TR',
      speechTimeout: 'auto',
      action: `/process-speech?callSid=${callSid}`,
      method: 'POST',
    });
  } else {
    // Claude'dan yanıt al
    const aiResponse = await chat(callSid, userSpeech);
    console.log(`🤖 AI yanıtı: "${aiResponse}"`);

    twiml.say({
      language: 'tr-TR',
      voice: 'Polly.Filiz',
    }, aiResponse);

    // Sohbeti devam ettir
    twiml.gather({
      input: 'speech',
      language: 'tr-TR',
      speechTimeout: 'auto',
      action: `/process-speech?callSid=${callSid}`,
      method: 'POST',
    });

    // Sessizlik durumunda
    twiml.say({
      language: 'tr-TR',
      voice: 'Polly.Filiz',
    }, 'Başka bir sorunuz var mı?');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ─── ÇAĞRI BİTTİ: Geçmişi temizle ──────────────────────────────────────────
app.post('/call-status', (req, res) => {
  const callSid = req.body.CallSid;
  const status = req.body.CallStatus;
  console.log(`📵 Çağrı bitti: ${callSid} — Durum: ${status}`);
  clearConversation(callSid);
  res.sendStatus(200);
});

// ─── YÖNETİM API'si: Rehber işlemleri ───────────────────────────────────────

// Tüm kişileri listele
app.get('/contacts', (req, res) => {
  res.json({ contacts: listContacts() });
});

// Yeni kişi ekle
app.post('/contacts', (req, res) => {
  const { phone, name } = req.body;
  if (!phone) return res.status(400).json({ error: 'Telefon numarası gerekli' });

  const added = addContact(phone, name);
  if (added) {
    res.json({ success: true, message: `${name || phone} rehbere eklendi` });
  } else {
    res.status(409).json({ error: 'Bu numara zaten rehberde var' });
  }
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      company: process.env.COMPANY_NAME || '(ayarlanmamış)',
      twilioNumber: process.env.TWILIO_PHONE_NUMBER || '(ayarlanmamış)',
      baseUrl: process.env.BASE_URL || '(ayarlanmamış)',
    }
  });
});

// ─── SUNUCUYU BAŞLAT ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`\nTwilio webhook URL'leri:`);
  console.log(`  Gelen arama  → ${process.env.BASE_URL}/incoming-call`);
  console.log(`  Çağrı durumu → ${process.env.BASE_URL}/call-status`);
  console.log(`\nYönetim:`);
  console.log(`  Rehber       → GET  /contacts`);
  console.log(`  Kişi ekle    → POST /contacts`);
  console.log(`  Sağlık       → GET  /health\n`);
});
