require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API çalışıyor',
        endpoints: {
            users: 'GET /api/auth/users',
            register: 'POST /api/auth/users veya POST /api/auth/register',
            login: 'POST /api/auth/login'
        }
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint bulunamadı'
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Sunucu hatası',
        error: err.message
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ API sunucusu http://0.0.0.0:${PORT} adresinde çalışıyor`);
    console.log(`✓ Local: http://localhost:${PORT}`);
    console.log(`✓ Android Emulator: http://10.0.2.2:${PORT}`);
    console.log(`✓ Test endpoint: http://localhost:${PORT}/api/auth/users`);
});
