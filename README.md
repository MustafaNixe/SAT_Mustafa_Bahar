<img width="500" height="500" alt="png" src="https://github.com/user-attachments/assets/87afa700-cac0-4410-b052-bc4c375201e7" />

💰 Proje Hakkında

Bahar Coin, kullanıcıların kripto para yatırımlarını kolayca takip edebilmesi, portföylerini yönetebilmesi ve kar-zarar durumlarını anlık olarak görüntüleyebilmesi için geliştirilmiş modern ve kullanıcı dostu bir mobil uygulamadır.

Bu proje, mobil uygulama geliştirme dersi kapsamında hazırlanmıştır.

🎯 Proje Amacı

Kullanıcılara sade, şık ve anlaşılır bir arayüz sunarak, kripto varlıklarını tek bir ekrandan yönetebilme kolaylığı sağlamaktır.
Uygulama, yatırımcıların portföy değerlerini, günlük değişim oranlarını ve toplam kazançlarını takip edebilmelerine olanak tanır.

 ⚙️ Geliştirici Bilgileri

Öğrenci Adı: (Mustafa Bahar)

Öğrenci No: (36504124036)

Bölüm: (Bilgisayar Programcılığı)

Ders: (Sistem Analizi ve Tasarımı)

Dönem: (2025-2026 Güz Dönemi)

# 📱 Coin Portfolio Mobile App

![React Native](https://img.shields.io/badge/React%20Native-0.81-blue)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-black)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![Database](https://img.shields.io/badge/Database-MSSQL-red)
![License](https://img.shields.io/badge/License-Education-lightgrey)


---

## 🚀 Temel Özellikler

- 🔴 Binance WebSocket ile **gerçek zamanlı fiyat verileri**
- 📊 **Canlı ve interaktif grafikler** (Line, Candlestick, Bar)
- 💼 **Coin portföy yönetimi**
- 📈 Kar / zarar hesaplama
- 🔐 **JWT tabanlı authentication**
- 🌙 Dark / Light tema desteği
- 📱 Tam responsive mobil tasarım
- ⚡ API rate-limit sorunu olmadan canlı veri

---

## 🧱 Kullanılan Teknolojiler

### Frontend
- React Native
- Expo (SDK 54)
- TypeScript
- Zustand (State Management)
- Expo Router (File-based navigation)
- Axios
- WebSocket

### Backend
- Node.js
- Express.js
- SQL Server (MSSQL)
- JWT (jsonwebtoken)
- bcrypt

### Dış Servisler
- Binance REST API
- Binance WebSocket API

---

## 📂 Proje Dosya Yapısı


coin/
├── Api/
│ ├── server.js
│ ├── routes/
│ │ └── authRoutes.js
│ ├── controllers/
│ │ └── authController.js
│ ├── config/
│ │ └── database.js
│ ├── middleware/
│ │ └── authMiddleware.js
│ └── database.sql
│
├── app/
│ ├── _layout.tsx
│ ├── login.tsx
│ ├── register.tsx
│ ├── (tabs)/
│ │ ├── index.tsx
│ │ ├── explore.tsx
│ │ ├── portfolio.tsx
│ │ └── settings.tsx
│ └── coin/
│ └── [symbol].tsx
│
└── src/
├── services/
│ ├── binance.ts
│ ├── realtime.ts
│ └── market-config.ts
├── store/
│ ├── auth.ts
│ ├── portfolio.ts
│ └── settings.ts
├── components/
│ ├── charts/
│ └── ui/
└── hooks/


---

## 🔌 API Yapısı

### Backend API (Kendi Sunucumuz)

**Base URL**
http://localhost:3001/api/auth


Kodu kopyala

| Method | Endpoint | Açıklama |
|------|---------|---------|
| POST | /users | Kullanıcı kayıt |
| POST | /login | Kullanıcı giriş |
| GET  | /users | Kullanıcı listesi |

---

### Binance API

**REST API**
https://api.binance.com/api/v3




Kullanılan endpointler:
- `/ticker/price`
- `/ticker/24hr`
- `/klines`
- `/exchangeInfo`

**WebSocket**
wss://stream.binance.com:9443/ws




---

## 📊 Grafik Sistemi

- Line Chart
- Candlestick Chart
- Portfolio Bar Chart
- Zoom & Pan desteği
- Gerçek zamanlı güncelleme

**Grafik Dosyaları**
src/components/charts/
├── simple-chart.tsx
├── candlestick-chart.tsx
├── portfolio-chart.tsx
└── sparkline.tsx



---

## 🔐 Authentication Sistemi

- JWT token tabanlı yapı
- bcrypt ile şifre hashleme
- AsyncStorage ile token saklama
- Otomatik oturum kontrolü

**İlgili Dosyalar**
- `Api/controllers/authController.js`
- `src/store/auth.ts`

---

## ⚙️ Kurulum ve Çalıştırma

### Backend Kurulumu
```bash
cd Api
npm install
npm start
.env örneği:

ini
Kodu kopyala
PORT=3001
JWT_SECRET=secret_key
DB_HOST=localhost
DB_USER=sa
DB_PASSWORD=******
DB_NAME=CoinApp
Frontend Kurulumu
bash
Kodu kopyala
npm install
npx expo start
Android Emulator

📝 Önemli Notlar
Binance WebSocket kullanıldığı için rate limit sorunu yok

Tek backend bağlantısı ile çoklu kullanıcı desteği

Canlı grafikler anlık güncellenir

Mobil-first geliştirme yaklaşımı

Eğitim ve geliştirme amaçlı hazırlanmıştır

📌 Lisans
Bu proje eğitim amaçlıdır.
Ticari kullanım için ek düzenlemeler gerektirir.

👨‍💻 Geliştirici
Mustafa
Bilgisayar Programcılığı
React Native • Node.js • API • Mobile Development



