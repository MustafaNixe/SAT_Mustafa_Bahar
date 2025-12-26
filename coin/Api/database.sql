-- API için veritabanı oluşturma
CREATE DATABASE ApiDatabase;
GO

USE ApiDatabase;
GO

-- Users tablosu
CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(100) NOT NULL UNIQUE,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL
);
GO


-- Örnek kullanıcı ekleme (opsiyonel - test için)
-- Şifre: Test123
-- INSERT INTO Users (Username, Email, Password, CreatedAt)
-- VALUES ('testuser', 'test@example.com', '$2b$10$YourHashedPasswordHere', GETDATE());
