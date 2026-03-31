// src/ai.js
// Claude ile sesli konuşma yönetimi

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Her aktif çağrı için sohbet geçmişini bellekte tut
const conversations = new Map();

function getSystemPrompt() {
  const name = process.env.ASSISTANT_NAME || 'Asistan';
  const company = process.env.COMPANY_NAME || 'Şirket';
  const custom = process.env.ASSISTANT_PROMPT || '';

  return `Sen ${company} adına çalışan ${name} adlı bir müşteri hizmetleri asistanısın.

${custom}

ÖNEMLİ KURALLAR:
- Yanıtların kısa ve net olsun — bu bir telefon görüşmesi, metin okuma yapılacak.
- En fazla 2-3 cümle ile yanıtla.
- Türkçe konuş.
- Eğer bir soruyu cevaplayamazsan, yetkili birinin geri arayacağını söyle.
- Kibarca ve profesyonel ol.`;
}

// Sohbete mesaj ekle ve yanıt al
async function chat(callSid, userMessage) {
  if (!conversations.has(callSid)) {
    conversations.set(callSid, []);
  }

  const history = conversations.get(callSid);
  history.push({ role: 'user', content: userMessage });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: getSystemPrompt(),
      messages: history,
    });

    const assistantMessage = response.content[0].text;
    history.push({ role: 'assistant', content: assistantMessage });

    // Sohbet geçmişini son 10 mesajla sınırla (bellek tasarrufu)
    if (history.length > 10) {
      conversations.set(callSid, history.slice(-10));
    }

    return assistantMessage;
  } catch (error) {
    console.error('Claude API hatası:', error.message);
    return 'Üzgünüm, şu an teknik bir sorun yaşıyorum. Lütfen daha sonra tekrar arayın.';
  }
}

// Çağrı bitince sohbet geçmişini temizle
function clearConversation(callSid) {
  conversations.delete(callSid);
}

module.exports = { chat, clearConversation };
