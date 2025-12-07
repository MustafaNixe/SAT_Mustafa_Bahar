# Backend API Kurulum Rehberi - Baştan Sona

Bu rehber, hiç backend bilgisi olmayanlar için hazırlanmıştır.

## Seçenek 1: Node.js + Express (Önerilen - En Kolay)

### Adım 1: Node.js Kurulumu

1. https://nodejs.org/ adresinden Node.js'i indirin (LTS versiyonu)
2. Kurulumu tamamlayın
3. Terminal/Command Prompt'u açın ve şunu yazın:
```bash
node --version
```
Versiyon görünüyorsa kurulum başarılı!

### Adım 2: Proje Klasörü Oluşturma

1. Masaüstünde veya istediğiniz yerde yeni bir klasör oluşturun: `coin-api`
2. Terminal'de bu klasöre gidin:
```bash
cd Desktop/coin-api
```

### Adım 3: Node.js Projesi Başlatma

Terminal'de şunu yazın:
```bash
npm init -y
```

### Adım 4: Gerekli Paketleri Yükleme

Terminal'de şunu yazın:
```bash
npm install express cors dotenv jsonwebtoken bcryptjs
npm install --save-dev nodemon
```

### Adım 5: Proje Yapısı

Klasörünüzde şu dosyaları oluşturun:

```
coin-api/
├── server.js          (Ana dosya)
├── .env               (Gizli ayarlar)
├── .gitignore         (Git için)
├── package.json       (Otomatik oluşur)
└── users.json         (Kullanıcı veritabanı - basit)
```

### Adım 6: server.js Dosyası

`server.js` dosyasını oluşturun ve şu kodu yapıştırın:

```javascript
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-buraya';

// Middleware
app.use(cors());
app.use(express.json());

// Kullanıcı dosyası yolu
const USERS_FILE = path.join(__dirname, 'users.json');

// Kullanıcıları yükle
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    return [];
  }
}

// Kullanıcıları kaydet
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Token oluştur
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// POST /auth/register - Kayıt
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validasyon
    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı adı en az 3 karakter olmalıdır'
      });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir e-posta adresi giriniz'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Şifre en az 6 karakter olmalıdır'
      });
    }

    // Kullanıcıları yükle
    const users = loadUsers();

    // Kullanıcı adı kontrolü
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Bu kullanıcı adı zaten kullanılıyor'
      });
    }

    // E-posta kontrolü
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Bu e-posta adresi zaten kullanılıyor'
      });
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Yeni kullanıcı oluştur
    const newUser = {
      id: Date.now().toString(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Kullanıcıyı kaydet
    users.push(newUser);
    saveUsers(users);

    // Token oluştur
    const token = generateToken(newUser);

    // Başarılı yanıt
    res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt,
        token: token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Kayıt olurken bir hata oluştu'
    });
  }
});

// POST /auth/login - Giriş
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validasyon
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Kullanıcı adı ve şifre gereklidir'
      });
    }

    // Kullanıcıları yükle
    const users = loadUsers();

    // Kullanıcıyı bul
    const user = users.find(
      u => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Kullanıcı adı veya şifre hatalı'
      });
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Kullanıcı adı veya şifre hatalı'
      });
    }

    // Token oluştur
    const token = generateToken(user);

    // Başarılı yanıt
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        token: token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Giriş yapılırken bir hata oluştu'
    });
  }
});

// POST /auth/logout - Çıkış
app.post('/api/auth/logout', (req, res) => {
  // Token kontrolü (isteğe bağlı)
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz token'
      });
    }
  }

  res.json({
    success: true,
    message: 'Başarıyla çıkış yapıldı'
  });
});

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    message: 'Coin API Server Çalışıyor!',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      logout: 'POST /api/auth/logout'
    }
  });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
  console.log(`📝 Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   POST http://localhost:${PORT}/api/auth/logout`);
});
```

### Adım 7: .env Dosyası

`.env` dosyasını oluşturun:

```env
PORT=3000
JWT_SECRET=gizli-anahtar-buraya-degistirin-12345
```

### Adım 8: .gitignore Dosyası

`.gitignore` dosyasını oluşturun:

```
node_modules/
.env
users.json
*.log
```

### Adım 9: package.json Güncelleme

`package.json` dosyasında `scripts` bölümünü şöyle güncelleyin:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Adım 10: Sunucuyu Başlatma

Terminal'de şunu yazın:
```bash
npm run dev
```

Başarılı olursa şunu göreceksiniz:
```
🚀 Server çalışıyor: http://localhost:3000
```

### Adım 11: Test Etme

Tarayıcıda şu adresi açın:
```
http://localhost:3000
```

"Coin API Server Çalışıyor!" mesajını görmelisiniz.

### Adım 12: Mobil Uygulamayı Bağlama

1. Bilgisayarınızın IP adresini öğrenin:
   - Windows: `ipconfig` yazın, "IPv4 Address" değerini bulun
   - Mac/Linux: `ifconfig` yazın, "inet" değerini bulun
   - Örnek: `192.168.1.100`

2. `.env` dosyasını mobil uygulamada güncelleyin:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
   ```

3. `store/auth.ts` dosyasında `useAPI: true` yapın

4. Mobil uygulamayı yeniden başlatın

---

## Seçenek 2: Python + Flask (Alternatif)

### Adım 1: Python Kurulumu

**📖 Detaylı kurulum rehberi için `PYTHON_KURULUM_DETAYLI.md` dosyasına bakın!**

**Hızlı Özet:**
1. https://www.python.org/downloads/ adresinden Python'u indirin
2. Kurulum sırasında **"Add Python to PATH"** seçeneğini **MUTLAKA** işaretleyin ✅
3. Kurulumu tamamlayın
4. Terminal'de `python --version` yazarak kontrol edin

**Windows'ta ÖNEMLİ:** "Add Python to PATH" seçeneğini işaretlemezseniz Python çalışmaz!

### Adım 2: Proje Klasörü

**📖 Detaylı rehber için `ADIM_2_PROJE_KLASORU_DETAYLI.md` dosyasına bakın!**

**Hızlı Özet:**

1. **Terminal'i açın** (Command Prompt veya PowerShell)

2. **Masaüstüne gidin:**
   ```bash
   cd Desktop
   ```

3. **Proje klasörünü oluşturun:**
   ```bash
   mkdir coin-api-python
   ```

4. **Klasöre girin:**
   ```bash
   cd coin-api-python
   ```

**Komutların Açıklaması:**
- `mkdir` = Klasör oluştur (make directory)
- `cd` = Klasör değiştir (change directory)
- `coin-api-python` = Proje klasörünüzün adı

**Kontrol:** Terminal'de şu yolu görmelisiniz:
- Windows: `C:\Users\...\Desktop\coin-api-python>`
- Mac/Linux: `.../Desktop/coin-api-python %`

### Adım 3: Gerekli Paketleri Yükleme

```bash
pip install flask flask-cors pyjwt bcrypt python-dotenv
```

### Adım 4: app.py Dosyası

**📖 Detaylı rehber için `ADIM_4_APP_PY_DETAYLI.md` dosyasına bakın!**

**Hızlı Özet:**

1. **Dosyayı oluşturun:**
   - Windows: `type nul > app.py` veya `notepad app.py`
   - Mac/Linux: `touch app.py` veya `nano app.py`
   - Veya görsel editörle: Yeni dosya → `app.py`

2. **Dosyayı açın ve aşağıdaki kodu yazın:**

`app.py` dosyasını oluşturun:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import bcrypt
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

JWT_SECRET = os.getenv('JWT_SECRET', 'gizli-anahtar-buraya')
USERS_FILE = 'users.json'

def load_users():
    try:
        if os.path.exists(USERS_FILE):
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except:
        return []

def save_users(users):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

def generate_token(user):
    return jwt.encode(
        {'id': user['id'], 'username': user['username']},
        JWT_SECRET,
        algorithm='HS256'
    )

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if len(username) < 3:
            return jsonify({
                'success': False,
                'error': 'Kullanıcı adı en az 3 karakter olmalıdır'
            }), 400

        if '@' not in email:
            return jsonify({
                'success': False,
                'error': 'Geçerli bir e-posta adresi giriniz'
            }), 400

        if len(password) < 6:
            return jsonify({
                'success': False,
                'error': 'Şifre en az 6 karakter olmalıdır'
            }), 400

        users = load_users()

        if any(u['username'].lower() == username.lower() for u in users):
            return jsonify({
                'success': False,
                'error': 'Bu kullanıcı adı zaten kullanılıyor'
            }), 400

        if any(u['email'].lower() == email.lower() for u in users):
            return jsonify({
                'success': False,
                'error': 'Bu e-posta adresi zaten kullanılıyor'
            }), 400

        hashed_password = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')

        new_user = {
            'id': str(int(datetime.now().timestamp() * 1000)),
            'username': username,
            'email': email,
            'password': hashed_password,
            'createdAt': datetime.now().isoformat()
        }

        users.append(new_user)
        save_users(users)

        token = generate_token(new_user)

        return jsonify({
            'success': True,
            'user': {
                'id': new_user['id'],
                'username': new_user['username'],
                'email': new_user['email'],
                'createdAt': new_user['createdAt'],
                'token': token
            }
        })
    except Exception as e:
        print(f'Register error: {e}')
        return jsonify({
            'success': False,
            'error': 'Kayıt olurken bir hata oluştu'
        }), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({
                'success': False,
                'error': 'Kullanıcı adı ve şifre gereklidir'
            }), 400

        users = load_users()
        user = next(
            (u for u in users if u['username'].lower() == username.lower()),
            None
        )

        if not user:
            return jsonify({
                'success': False,
                'error': 'Kullanıcı adı veya şifre hatalı'
            }), 401

        if not bcrypt.checkpw(
            password.encode('utf-8'),
            user['password'].encode('utf-8')
        ):
            return jsonify({
                'success': False,
                'error': 'Kullanıcı adı veya şifre hatalı'
            }), 401

        token = generate_token(user)

        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'createdAt': user['createdAt'],
                'token': token
            }
        })
    except Exception as e:
        print(f'Login error: {e}')
        return jsonify({
            'success': False,
            'error': 'Giriş yapılırken bir hata oluştu'
        }), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    return jsonify({
        'success': True,
        'message': 'Başarıyla çıkış yapıldı'
    })

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'message': 'Coin API Server Çalışıyor!',
        'endpoints': {
            'register': 'POST /api/auth/register',
            'login': 'POST /api/auth/login',
            'logout': 'POST /api/auth/logout'
        }
    })

if __name__ == '__main__':
    print('🚀 Server çalışıyor: http://localhost:3000')
    app.run(host='0.0.0.0', port=3000, debug=True)
```

### Adım 5: .env Dosyası

**📖 Detaylı açıklama için `ADIM_5_ENV_DOSYASI_DETAYLI.md` dosyasına bakın!**

**Hızlı Özet:**

`.env` dosyası, uygulamanızın **gizli ayarlarını** sakladığınız dosyadır.

**İçerik:**
```env
JWT_SECRET=gizli-anahtar-buraya-degistirin-12345
```

**Açıklama:**
- `JWT_SECRET` = Token'ları imzalamak için gizli anahtar
- Bu anahtar çok önemli! Güçlü bir değer seçin
- Git'e eklenmemeli (güvenlik)

**Nasıl Oluşturulur:**
1. Proje klasöründe (`coin-api-python/`) `.env` dosyası oluşturun
2. İçine yukarıdaki satırı yazın
3. `gizli-anahtar-buraya-degistirin-12345` kısmını değiştirin
4. Güçlü bir gizli anahtar kullanın (en az 32 karakter)

**Örnek Güçlü Anahtar:**
```
k9Jm2#pL5$nR8&qT3*wY6!zA1%bC4@dE7
```

### Adım 6: Sunucuyu Başlatma

```bash
python app.py
```

---

## Seçenek 3: Ücretsiz Hosting (Heroku, Render, Railway)

### Render.com (Önerilen - Ücretsiz)

1. https://render.com adresine gidin ve kayıt olun
2. "New +" butonuna tıklayın
3. "Web Service" seçin
4. GitHub repo'nuzu bağlayın veya direkt deploy edin
5. Ayarlar:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `JWT_SECRET`: Rastgele bir değer
     - `PORT`: 3000

### Railway.app

1. https://railway.app adresine gidin
2. "New Project" oluşturun
3. GitHub repo'nuzu bağlayın
4. Otomatik deploy edilir

---

## Test Etme (Postman veya Tarayıcı)

### Kayıt Testi

**URL:** `POST http://localhost:3000/api/auth/register`

**Body (JSON):**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "123456"
}
```

### Giriş Testi

**URL:** `POST http://localhost:3000/api/auth/login`

**Body (JSON):**
```json
{
  "username": "testuser",
  "password": "123456"
}
```

---

## Sorun Giderme

### Port zaten kullanılıyor
`.env` dosyasında `PORT=3001` yapın

### CORS hatası
`server.js` dosyasında `cors()` middleware'inin olduğundan emin olun

### Token hatası
`.env` dosyasında `JWT_SECRET` değerinin olduğundan emin olun

### Mobil uygulama bağlanamıyor
1. Bilgisayar ve telefon aynı WiFi'de olmalı
2. Firewall'u kontrol edin
3. IP adresini doğru yazdığınızdan emin olun

---

## Güvenlik Notları

1. **Production'da mutlaka:**
   - Güçlü bir `JWT_SECRET` kullanın
   - HTTPS kullanın
   - Gerçek bir veritabanı kullanın (MongoDB, PostgreSQL)
   - Rate limiting ekleyin
   - Input validation'ı güçlendirin

2. **Şu anki kod:**
   - Sadece geliştirme/test için
   - Production'a uygun değil
   - Güvenlik açıkları olabilir

---

## Sonraki Adımlar

1. ✅ Backend API'yi çalıştırın
2. ✅ Mobil uygulamada `.env` dosyasını güncelleyin
3. ✅ `store/auth.ts` dosyasında `useAPI: true` yapın
4. ✅ Test edin!

Başarılar! 🚀

