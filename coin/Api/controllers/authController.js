const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getConnection, sql } = require('../config/database');

const getUsers = async (req, res) => {
    try {
        const pool = await getConnection();
        
        const result = await pool.request()
            .query(`
                SELECT Id, Username, Email, CreatedAt, UpdatedAt 
                FROM Users 
                ORDER BY CreatedAt DESC
            `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            users: result.recordset
        });

    } catch (error) {
        console.error('Kullanıcıları getirme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Kullanıcılar getirilirken bir hata oluştu',
            error: error.message 
        });
    }
};

const register = async (req, res) => {
    try {
        console.log('Register isteği alındı:', { 
            username: req.body.username, 
            email: req.body.email,
            hasPassword: !!req.body.password 
        });
        
        const { username, email, password, passwordConfirm } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kullanıcı adı, email ve şifre gereklidir' 
            });
        }

        if (passwordConfirm && password !== passwordConfirm) {
            return res.status(400).json({ 
                success: false, 
                message: 'Şifreler eşleşmiyor' 
            });
        }

        if (username.length < 3) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kullanıcı adı en az 3 karakter olmalıdır' 
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Geçerli bir email adresi giriniz' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Şifre en az 6 karakter olmalıdır' 
            });
        }

        const pool = await getConnection();

        const checkEmail = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Users WHERE Email = @email');

        if (checkEmail.recordset.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Bu email adresi zaten kullanılıyor' 
            });
        }

        const checkUsername = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT * FROM Users WHERE Username = @username');

        if (checkUsername.recordset.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: 'Bu kullanıcı adı zaten kullanılıyor' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, hashedPassword)
            .query(`
                INSERT INTO Users (Username, Email, Password, CreatedAt) 
                OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.Email
                VALUES (@username, @email, @password, GETDATE())
            `);

        const user = result.recordset[0];

        const token = jwt.sign(
            { userId: user.Id, username: user.Username, email: user.Email },
            process.env.JWT_SECRET || 'default-secret-key',
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            message: 'Kayıt başarılı',
            token,
            user: {
                Id: user.Id,
                id: user.Id,
                Username: user.Username,
                username: user.Username,
                Email: user.Email,
                email: user.Email,
                CreatedAt: new Date().toISOString()
            },
            users: [{
                Id: user.Id,
                id: user.Id,
                Username: user.Username,
                username: user.Username,
                Email: user.Email,
                email: user.Email,
                CreatedAt: new Date().toISOString()
            }]
        });

    } catch (error) {
        console.error('Kayıt hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sunucu hatası', 
            error: error.message 
        });
    }
};

const login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kullanıcı adı/Email ve şifre gereklidir' 
            });
        }

        const pool = await getConnection();

        const result = await pool.request()
            .input('emailOrUsername', sql.VarChar, emailOrUsername)
            .query('SELECT * FROM Users WHERE Email = @emailOrUsername OR Username = @emailOrUsername');

        if (result.recordset.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email veya şifre hatalı' 
            });
        }

        const user = result.recordset[0];

        const isPasswordValid = await bcrypt.compare(password, user.Password);

        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email veya şifre hatalı' 
            });
        }

        const token = jwt.sign(
            { userId: user.Id, email: user.Email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            message: 'Giriş başarılı',
            token,
            user: {
                id: user.Id,
                username: user.Username,
                email: user.Email
            }
        });

    } catch (error) {
        console.error('Giriş hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sunucu hatası', 
            error: error.message 
        });
    }
};

module.exports = { register, login, getUsers };
