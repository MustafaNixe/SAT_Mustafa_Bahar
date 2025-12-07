# Adım 5: .env Dosyası - Detaylı Açıklama

## 🔐 .env Dosyası Nedir?

`.env` dosyası, uygulamanızın **gizli ayarlarını** sakladığınız dosyadır. Şifreler, API anahtarları, gizli token'lar gibi hassas bilgiler burada tutulur.

---

## 🎯 Neden .env Dosyası Kullanılır?

### ❌ Kötü Yöntem (Güvensiz):
```python
# app.py içinde direkt yazmak
JWT_SECRET = "gizli-anahtar-12345"  # ❌ GÜVENSİZ!
```

**Sorunlar:**
- Kod Git'e yüklenirse herkes görebilir
- Kod paylaşıldığında gizli bilgiler açığa çıkar
- Her ortam için farklı ayarlar kullanamazsınız

### ✅ İyi Yöntem (Güvenli):
```python
# app.py içinde
JWT_SECRET = os.getenv('JWT_SECRET')  # ✅ GÜVENLİ!
```

```env
# .env dosyasında (Git'e eklenmez)
JWT_SECRET=gizli-anahtar-12345
```

**Avantajlar:**
- Gizli bilgiler kodun dışında
- Git'e yüklenmez (güvenlik)
- Her ortam için farklı ayarlar

---

## 📝 .env Dosyasının İçeriği

### Temel Yapı

```env
JWT_SECRET=gizli-anahtar-buraya-degistirin-12345
```

**Açıklama:**
- `JWT_SECRET` = Değişken adı (büyük harfle yazılır)
- `=` = Eşittir işareti (boşluk olmadan)
- `gizli-anahtar-buraya-degistirin-12345` = Değer

### Kurallar:

1. **Boşluk kullanmayın:**
   ```env
   ❌ JWT_SECRET = gizli-anahtar  # Yanlış
   ✅ JWT_SECRET=gizli-anahtar    # Doğru
   ```

2. **Tırnak işareti gerekmez:**
   ```env
   ❌ JWT_SECRET="gizli-anahtar"  # Gereksiz
   ✅ JWT_SECRET=gizli-anahtar    # Doğru
   ```

3. **Her satırda bir değişken:**
   ```env
   ✅ JWT_SECRET=gizli-anahtar
   ✅ PORT=3000
   ✅ DEBUG=true
   ```

4. **Yorum satırı için # kullanın:**
   ```env
   # Bu bir yorum satırı
   JWT_SECRET=gizli-anahtar
   ```

---

## 🔑 JWT_SECRET Nedir?

### JWT (JSON Web Token) Nedir?

**Basit Açıklama:**
- Kullanıcı giriş yaptığında bir "token" (jeton) alır
- Bu token, kullanıcının kimliğini kanıtlar
- Her API isteğinde token gönderilir
- Sunucu token'ı kontrol eder, geçerliyse işlem yapar

**Örnek Token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1IiwidXNlcm5hbWUiOiJkZW1vIn0.abc123xyz...
```

### JWT_SECRET Ne İşe Yarar?

**Açıklama:**
- Token'ları **imzalamak** (sign) için kullanılır
- Token'ları **doğrulamak** (verify) için kullanılır
- Güvenlik için çok önemli!

**Nasıl Çalışır:**

1. **Token Oluşturma (Kayıt/Giriş):**
   ```python
   token = jwt.encode(
       {'id': user_id, 'username': username},
       JWT_SECRET,  # ← Bu gizli anahtarla imzalanır
       algorithm='HS256'
   )
   ```

2. **Token Doğrulama (Her İstekte):**
   ```python
   decoded = jwt.verify(
       token,
       JWT_SECRET,  # ← Aynı gizli anahtarla doğrulanır
       algorithm='HS256'
   )
   ```

### Neden Gizli Olmalı?

**Eğer JWT_SECRET çalınırsa:**
- Saldırganlar sahte token oluşturabilir
- Başka kullanıcıların hesaplarına girebilir
- Tüm sistem güvenliği çöker!

**Bu yüzden:**
- ✅ `.env` dosyasında saklanır
- ✅ Git'e eklenmez
- ✅ Her ortam için farklı olmalı

---

## 🎲 Güçlü JWT_SECRET Nasıl Oluşturulur?

### Yöntem 1: Rastgele String (Manuel)

**Basit:**
```
gizli-anahtar-buraya-degistirin-12345
```

**Daha Güçlü:**
```
aB3$kL9#mN2@pQ7&rT5*wX1!yZ4%cV8
```

**En Güçlü (Önerilen):**
```
k9Jm2#pL5$nR8&qT3*wY6!zA1%bC4@dE7
```

### Yöntem 2: Online Generator

1. https://randomkeygen.com/ adresine gidin
2. "CodeIgniter Encryption Keys" bölümünden birini kopyalayın
3. `.env` dosyasına yapıştırın

### Yöntem 3: Python ile Oluşturma

Terminal'de:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Örnek Çıktı:**
```
xK9mP2qL5nR8tY3wZ6aB1cD4eF7gH0jK2
```

---

## 📂 .env Dosyası Nerede Olmalı?

### Doğru Konum:
```
coin-api-python/
├── app.py
├── .env          ← BURADA!
├── users.json
└── ...
```

### Yanlış Konum:
```
coin-api-python/
├── app.py
└── config/
    └── .env      ← YANLIŞ! (app.py bulamaz)
```

**Neden?**
- `app.py` dosyası `.env` dosyasını aynı klasörde arar
- Farklı klasörde olursa bulamaz

---

## 🔒 .env Dosyası Güvenliği

### 1. Git'e Eklenmemeli

**`.gitignore` dosyasına ekleyin:**
```
.env
```

**Neden?**
- Git'e yüklenirse herkes görebilir
- GitHub'da public olursa gizli bilgiler açığa çıkar

### 2. Her Ortam İçin Farklı

**Geliştirme (Local):**
```env
JWT_SECRET=dev-secret-key-123
```

**Production (Canlı):**
```env
JWT_SECRET=super-secret-production-key-xyz
```

### 3. Paylaşmayın!

- ❌ E-posta ile göndermeyin
- ❌ Mesajlaşma uygulamasında paylaşmayın
- ❌ Ekran görüntüsü çekmeyin
- ✅ Sadece güvenilir kişilerle paylaşın

---

## 💻 Python'da .env Dosyasını Okuma

### Kod İçinde Nasıl Kullanılır?

```python
import os
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# Değişkeni oku
JWT_SECRET = os.getenv('JWT_SECRET')

# Varsayılan değer ile
JWT_SECRET = os.getenv('JWT_SECRET', 'varsayilan-deger')
```

**Açıklama:**
- `load_dotenv()` = `.env` dosyasını yükler
- `os.getenv('JWT_SECRET')` = Değişkeni okur
- İkinci parametre = Eğer bulamazsa varsayılan değer

---

## 📋 .env Dosyası Örnekleri

### Basit Örnek:
```env
JWT_SECRET=gizli-anahtar-12345
```

### Gelişmiş Örnek:
```env
# JWT Token İmzalama Anahtarı
JWT_SECRET=k9Jm2#pL5$nR8&qT3*wY6!zA1%bC4@dE7

# Sunucu Portu
PORT=3000

# Debug Modu (true/false)
DEBUG=true

# Veritabanı URL'i (ileride kullanılabilir)
DATABASE_URL=sqlite:///users.db
```

### Production Örneği:
```env
JWT_SECRET=super-secret-production-key-change-this-immediately
PORT=3000
DEBUG=false
NODE_ENV=production
```

---

## ✅ Kontrol Listesi

.env dosyası hazır olduğunda:

- [ ] Dosya adı tam olarak `.env` (`.env.txt` değil!)
- [ ] Dosya `coin-api-python` klasöründe
- [ ] `JWT_SECRET=` yazıyor
- [ ] Eşittir işaretinden sonra değer var
- [ ] Boşluk yok (JWT_SECRET=gizli-anahtar)
- [ ] Tırnak işareti yok
- [ ] Güçlü bir gizli anahtar seçildi
- [ ] `.gitignore` dosyasına eklendi

---

## 🔍 Sorun Giderme

### Problem 1: "JWT_SECRET is None"

**Sebep:** `.env` dosyası bulunamadı veya değişken yok

**Çözüm:**
1. Dosyanın adının `.env` olduğundan emin olun
2. Dosyanın `app.py` ile aynı klasörde olduğundan emin olun
3. `load_dotenv()` çağrıldığından emin olun

### Problem 2: "Module 'dotenv' has no attribute 'load_dotenv'"

**Sebep:** `python-dotenv` paketi yüklü değil

**Çözüm:**
```bash
pip install python-dotenv
```

### Problem 3: Değişiklikler algılanmıyor

**Sebep:** Python uygulaması çalışırken `.env` dosyası değiştirildi

**Çözüm:**
- Uygulamayı durdurun (`Ctrl+C`)
- Yeniden başlatın (`python app.py`)

---

## 🎓 Öğrenilen Kavramlar

### 1. Environment Variables (Ortam Değişkenleri)
- Uygulama ayarlarını saklamak için
- Gizli bilgileri kodun dışında tutmak için

### 2. .env Dosyası
- Gizli ayarları saklamak için
- Git'e eklenmez (güvenlik)

### 3. JWT_SECRET
- Token'ları imzalamak için
- Güvenlik için çok önemli
- Her ortam için farklı olmalı

### 4. dotenv Kütüphanesi
- `.env` dosyasını okumak için
- `load_dotenv()` ile yüklenir

---

## 🚀 Sonraki Adım

.env dosyası hazır olduktan sonra:

**BACKEND_API_REHBER.md** dosyasındaki **Adım 6: Sunucuyu Başlatma** bölümüne geçin.

---

## 💡 İpuçları

1. **Güçlü gizli anahtar kullanın:**
   - En az 32 karakter
   - Harf, rakam, özel karakter karışık

2. **Her ortam için farklı:**
   - Local: `dev-secret`
   - Production: `super-secret-production-key`

3. **Dosya adına dikkat:**
   - ✅ `.env`
   - ❌ `.env.txt`
   - ❌ `env`
   - ❌ `.env file`

4. **Git'e eklemeyin:**
   - `.gitignore` dosyasına mutlaka ekleyin

5. **Yedek alın:**
   - Güvenli bir yerde saklayın
   - Unutursanız tüm token'lar geçersiz olur!

Başarılar! 🎉

