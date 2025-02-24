const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer'); // เพิ่ม Nodemailer
const cron = require('node-cron');
const app = express();
const port = 3000;
const saltRounds = 10;
const secret = 'Web10-ProjectV5';

app.use(cors());
app.use(bodyParser.json());



cron.schedule('0 0 * * *', async () => { // ทุกวันเที่ยงคืน
    await connection.execute(
        'DELETE FROM pending_users WHERE created_at < NOW() - INTERVAL 24 HOUR'
    );
    console.log('Cleared expired pending users');
});

app.use('/public', express.static('public'));
// ตั้งค่า Nodemailer (ใช้ Gmail เป็นตัวอย่าง)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'suriya.b@kkumail.com', // อีเมลของคุณ
        pass: 'yvzt fepn xuub pyen ' // App Password (ต้องสร้างใน Google Account ถ้าใช้ 2FA)
    }
});

async function initializeDatabase() {
    const connection = await mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'Ss1417900005786',
        database: 'donationplatform'
    });
    return connection;
}

initializeDatabase().then((connection) => {
    app.post('/register', async function (req, res) {
        const defaultProfilePicture = './image/large.jpg';
        try {
            const [existingUsers] = await connection.execute(
                'SELECT email FROM users WHERE email = ?',
                [req.body.email]
            );
            if (existingUsers.length > 0) {
                return res.json({ status: 'error', message: 'Email is already registered' });
            }
    
            const [pendingUsers] = await connection.execute(
                'SELECT email FROM pending_users WHERE email = ?',
                [req.body.email]
            );
            if (pendingUsers.length > 0) {
                const hash = await bcrypt.hash(req.body.password, saltRounds);
                const verificationToken = jwt.sign({ email: req.body.email }, secret, { expiresIn: '24h' });
    
                await connection.execute(
                    'UPDATE pending_users SET name = ?, password_hash = ?, verification_token = ? WHERE email = ?',
                    [req.body.name, hash, verificationToken, req.body.email]
                );
    
                const verificationLink = `http://localhost:5173/verify?token=${verificationToken}&redirect=/thank-you`;
                const mailOptions = {
                    from: 'your-email@gmail.com',
                    to: req.body.email,
                    subject: 'Verify Your Email',
                    html: `<p>คลิกที่นี่เพื่อยืนยันอีเมลของคุณ: <a href="${verificationLink}">ยืนยัน</a></p>`
                };
    
                await transporter.sendMail(mailOptions);
                return res.json({ status: 'OK', message: 'Email already pending, new verification link sent.' });
            }
    
            const hash = await bcrypt.hash(req.body.password, saltRounds);
            const verificationToken = jwt.sign({ email: req.body.email }, secret, { expiresIn: '24h' });
    
            await connection.execute(
                'INSERT INTO pending_users (name, email, password_hash, verification_token) VALUES (?, ?, ?, ?)',
                [req.body.name, req.body.email, hash, verificationToken]
            );
    
            const verificationLink = `http://localhost:5173/verify?token=${verificationToken}&redirect=/thank-you`;
            const mailOptions = {
                from: 'your-email@gmail.com',
                to: req.body.email,
                subject: 'Verify Your Email',
                html: `<p>คลิกที่นี่เพื่อยืนยันอีเมลของคุณ: <a href="${verificationLink}">ยืนยัน</a></p>`
            };
    
            await transporter.sendMail(mailOptions);
            res.json({ status: 'OK', message: 'Please check your email to verify and complete registration.' });
        } catch (err) {
            res.json({ status: 'error', message: err.message });
        }
    });

    app.get('/verify', async function (req, res) {
        try {
            const token = req.query.token;
            const decoded = jwt.verify(token, secret);
    
            const [pending] = await connection.execute(
                'SELECT * FROM pending_users WHERE email = ? AND verification_token = ?',
                [decoded.email, token]
            );
    
            if (pending.length === 0) {
                return res.json({ status: 'error', message: 'Invalid or expired verification token' });
            }
    
            const createdAt = new Date(pending[0].created_at);
            const now = new Date();
            if ((now - createdAt) / (1000 * 60 * 60) > 24) {
                await connection.execute('DELETE FROM pending_users WHERE email = ?', [decoded.email]);
                return res.json({ status: 'error', message: 'Verification link has expired' });
            }
    
            await connection.execute(
                'INSERT INTO users (name, email, password_hash, profile_picture) VALUES (?, ?, ?, ?)',
                [pending[0].name, pending[0].email, pending[0].password_hash, './image/large.jpg']
            );
    
            await connection.execute(
                'DELETE FROM pending_users WHERE email = ?',
                [decoded.email]
            );
    
            res.json({ status: 'OK', message: 'Email verified and registration completed!' });
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.json({ status: 'error', message: 'Verification link has expired' });
            }
            res.json({ status: 'error', message: 'Invalid verification token' });
        }
    });

    app.post('/login', async function (req, res) {
        try {
            const [users] = await connection.execute(
                'SELECT * FROM users WHERE email = ?',
                [req.body.email]
            );
    
            if (users.length === 0) {
                return res.json({ status: 'error', message: 'User not found' });
            }
    
            const isLogin = await bcrypt.compare(req.body.password, users[0].password_hash);
            if (isLogin) {
                const token = jwt.sign({ email: users[0].email }, secret, { expiresIn: '1h' });
                res.json({ status: 'OK', message: 'Login success', token: token });
            } else {
                res.json({ status: 'error', message: 'Login failed' });
            }
        } catch (err) {
            res.json({ status: 'error', message: err.message });
        }
    });

    app.post('/authen', function (req, res) {
        try {
            if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
                return res.status(401).json({ status: 'error', message: 'Unauthorized: No token provided' });
            }
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, secret);
            res.json({ status: 'OK', decoded, email: decoded.email });
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ status: 'error', message: 'Token has expired' });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ status: 'error', message: 'Invalid token' });
            } else {
                return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
            }
        }
    });

    app.get('/user/:email', async function (req, res) {
        try {
            const email = req.params.email.toLowerCase().trim();

            // ตรวจสอบรูปแบบของ email ให้แน่ใจว่าเป็น email ที่ถูกต้อง
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ status: 'error', message: 'Invalid email format' });
            }

            const [rows] = await connection.execute(
                'SELECT name, profile_picture, email FROM users WHERE email = ?',
                [email]
            );

            console.log("Raw Result:", rows); // 🔍 ตรวจสอบค่าที่ได้จากฐานข้อมูล

            if (!Array.isArray(rows)) {
                return res.status(500).json({ status: 'error', message: 'Invalid database response format' });
            }

            if (rows.length === 0) {
                return res.status(404).json({ status: 'error', message: 'User not found' });
            }

            res.json({ status: 'OK', user: rows[0] });
        } catch (err) {
            console.error("Database error:", err); // Log ข้อผิดพลาด
            res.status(500).json({ status: 'error', message: 'Internal server error' });
        }
    });

    app.get('/donationrequests/showRequests', async function (req, res) {
        try {
            const [rows] = await connection.execute('SELECT * FROM donationrequests');
            res.json({ status: 'OK', donationrequests: rows });
        } catch (err) {
            console.error("Database error:", err);
            res.status(500).json({ status: 'error', message: 'Internal server error' });
        }
    });
    app.get('/check-verification', async function (req, res) {
        const email = req.query.email;
        try {
            const [users] = await connection.execute(
                'SELECT email FROM users WHERE email = ?',
                [email]
            );
            if (users.length > 0) {
                return res.json({ status: 'verified' });
            }
            const [pending] = await connection.execute(
                'SELECT email FROM pending_users WHERE email = ?',
                [email]
            );
            if (pending.length > 0) {
                return res.json({ status: 'pending' });
            }
            res.json({ status: 'not_found' });
        } catch (err) {
            res.json({ status: 'error', message: err.message });
        }
    });


    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
}).catch((err) => {
    console.error("Failed to initialize database:", err);
});