// contacts/db.js
// Rehber yönetimi - JSON dosyası tabanlı (production'da PostgreSQL kullanın)

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'contacts.json');

// Başlangıç verisi yoksa oluştur
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({
    contacts: [
      // Örnek kayıtlar - kendi numaralarınızı buraya ekleyin
      // { "phone": "+905551234567", "name": "Ahmet Yılmaz" },
      // { "phone": "+905559876543", "name": "Ayşe Kaya" }
    ]
  }, null, 2));
}

function loadContacts() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data).contacts;
  } catch (e) {
    return [];
  }
}

function saveContacts(contacts) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ contacts }, null, 2));
}

// Numara rehberde kayıtlı mı?
function isKnownContact(phoneNumber) {
  const contacts = loadContacts();
  const normalized = normalizePhone(phoneNumber);
  return contacts.some(c => normalizePhone(c.phone) === normalized);
}

// Rehberdeki kişinin adını getir
function getContactName(phoneNumber) {
  const contacts = loadContacts();
  const normalized = normalizePhone(phoneNumber);
  const contact = contacts.find(c => normalizePhone(c.phone) === normalized);
  return contact ? contact.name : null;
}

// Rehbere yeni numara ekle
function addContact(phoneNumber, name) {
  const contacts = loadContacts();
  const normalized = normalizePhone(phoneNumber);
  if (!contacts.some(c => normalizePhone(c.phone) === normalized)) {
    contacts.push({ phone: normalized, name: name || 'Bilinmeyen' });
    saveContacts(contacts);
    return true;
  }
  return false;
}

// Tüm kişileri listele
function listContacts() {
  return loadContacts();
}

// +90 5xx xxx xx xx -> +905xxxxxxxxx gibi normalleştir
function normalizePhone(phone) {
  return phone.replace(/[\s\-\(\)]/g, '');
}

module.exports = { isKnownContact, getContactName, addContact, listContacts };
