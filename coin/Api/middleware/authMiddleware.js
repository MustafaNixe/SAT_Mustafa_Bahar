const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    try {
        // Token'ı header'dan al
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Yetkilendirme token\'ı bulunamadı' 
            });
        }

        // Token'ı doğrula
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();

    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Geçersiz token' 
        });
    }
};

module.exports = authMiddleware;
