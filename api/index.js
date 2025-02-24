const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const app = express();
const saltRounds = 10;
const secret = process.env.JWT_SECRET || 'Web10-ProjectV5';

app.use(cors({ origin: 'https://donation-platform-sable.vercel.app' }));
app.use(bodyParser.json());
app.use('/public', express.static('public'));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function initializeDatabase() {
    const dbUrl = process.env.DATABASE_URL;
    console.log('Raw DATABASE_URL:', dbUrl); // Log ค่าเต็มเพื่อ debug
    console.log('DATABASE_URL masked:', dbUrl ? dbUrl.replace(/:([^@]+)@/, ':****@') : 'Not set');
    if (!dbUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
    }
    if (!dbUrl.startsWith('postgresql://')) {
        console.error('Invalid DATABASE_URL format:', dbUrl);
        throw new Error('DATABASE_URL must start with "postgresql://"');
    }
    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('Database connection test successful:', result.rows[0]);
    } catch (err) {
        console.error('Database connection test failed:', err);
        throw err;
    }
    return pool;
}

let dbPromise;

app.use(async (req, res, next) => {
    if (!dbPromise) {
        try {
            dbPromise = initializeDatabase();
        } catch (err) {
            console.error('Failed to initialize database:', err);
            return res.status(500).json({ status: 'error', message: 'Failed to initialize database: ' + err.message });
        }
    }
    try {
        req.db = await dbPromise;
        console.log('Database connection ready for request:', req.method, req.url);
        next();
    } catch (err) {
        console.error('Database error in middleware:', err);
        res.status(500).json({ status: 'error', message: 'Database connection failed: ' + err.message });
    }
});

// /register
app.post('/register', async (req, res) => {
    const defaultProfilePicture = './image/large.jpg';
    try {
        console.log('Register request received:', req.body);

        const existingUsersResult = await req.db.query(
            'SELECT email FROM users WHERE email = $1',
            [req.body.email]
        );
        const existingUsers = existingUsersResult.rows;
        console.log('Existing users:', existingUsers);
        if (existingUsers.length > 0) {
            return res.json({ status: 'error', message: 'Email is already registered' });
        }

        const pendingUsersResult = await req.db.query(
            'SELECT email FROM pending_users WHERE email = $1',
            [req.body.email]
        );
        const pendingUsers = pendingUsersResult.rows;
        console.log('Pending users:', pendingUsers);

        const hash = await bcrypt.hash(req.body.password, saltRounds);
        console.log('Password hashed successfully');
        const verificationToken = jwt.sign({ email: req.body.email }, secret, { expiresIn: '24h' });
        console.log('Verification token generated:', verificationToken);

        if (pendingUsers.length > 0) {
            await req.db.query(
                'UPDATE pending_users SET name = $1, password_hash = $2, verification_token = $3 WHERE email = $4',
                [req.body.name, hash, verificationToken, req.body.email]
            );
            console.log('Updated pending_users');
        } else {
            await req.db.query(
                'INSERT INTO pending_users (name, email, password_hash, verification_token) VALUES ($1, $2, $3, $4)',
                [req.body.name, req.body.email, hash, verificationToken]
            );
            console.log('Inserted into pending_users');
        }

        const verificationLink = `https://donation-platform-sable.vercel.app/verify?token=${verificationToken}&redirect=/thank-you`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: req.body.email,
            subject: 'Verify Your Email',
            html: `<p>คลิกที่นี่เพื่อยืนยันอีเมลของคุณ: <a href="${verificationLink}">ยืนยัน</a></p>`
        };

        console.log('Sending email with:', {
            from: process.env.EMAIL_USER,
            to: req.body.email,
            userSet: !!process.env.EMAIL_USER,
            passSet: !!process.env.EMAIL_PASS
        });
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');

        res.json({ status: 'OK', message: 'Please check your email to verify and complete registration.' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ status: 'error', message: `Registration failed: ${err.message}` });
    }
});

// /verify
app.get('/verify', async (req, res) => {
    try {
        console.log('Verify request received:', req.query);
        const token = req.query.token;
        const decoded = jwt.verify(token, secret);

        const pendingResult = await req.db.query(
            'SELECT * FROM pending_users WHERE email = $1 AND verification_token = $2',
            [decoded.email, token]
        );
        const pending = pendingResult.rows;
        console.log('Pending users found:', pending);

        if (pending.length === 0) {
            return res.json({ status: 'error', message: 'Invalid or expired verification token' });
        }

        const createdAt = new Date(pending[0].created_at);
        const now = new Date();
        if ((now - createdAt) / (1000 * 60 * 60) > 24) {
            await req.db.query('DELETE FROM pending_users WHERE email = $1', [decoded.email]);
            console.log('Expired token deleted from pending_users');
            return res.json({ status: 'error', message: 'Verification link has expired' });
        }

        await req.db.query(
            'INSERT INTO users (name, email, password_hash, profile_picture) VALUES ($1, $2, $3, $4)',
            [pending[0].name, pending[0].email, pending[0].password_hash, defaultProfilePicture]
        );
        console.log('Inserted into users');

        await req.db.query('DELETE FROM pending_users WHERE email = $1', [decoded.email]);
        console.log('Deleted from pending_users');

        res.json({ status: 'OK', message: 'Email verified and registration completed!' });
    } catch (err) {
        console.error('Verify error:', err);
        if (err.name === 'TokenExpiredError') {
            return res.json({ status: 'error', message: 'Verification link has expired' });
        }
        res.json({ status: 'error', message: `Verification failed: ${err.message}` });
    }
});

// /login
app.post('/login', async (req, res) => {
    try {
        const [users] = (await req.db.query(
            'SELECT * FROM users WHERE email = $1',
            [req.body.email]
        )).rows;

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

// /authen
app.post('/authen', (req, res) => {
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

// /user/:email
app.get('/user/:email', async (req, res) => {
    try {
        const email = req.params.email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ status: 'error', message: 'Invalid email format' });
        }

        const [rows] = (await req.db.query(
            'SELECT name, profile_picture, email FROM users WHERE email = $1',
            [email]
        )).rows;

        if (rows.length === 0) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        res.json({ status: 'OK', user: rows[0] });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

// /donationrequests/showRequests
app.get('/donationrequests/showRequests', async (req, res) => {
    try {
        const [rows] = (await req.db.query('SELECT * FROM donationrequests')).rows;
        res.json({ status: 'OK', donationrequests: rows });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

// /check-verification
app.get('/check-verification', async (req, res) => {
    const email = req.query.email;
    try {
        const [users] = (await req.db.query(
            'SELECT email FROM users WHERE email = $1',
            [email]
        )).rows;
        if (users.length > 0) {
            return res.json({ status: 'verified' });
        }
        const [pending] = (await req.db.query(
            'SELECT email FROM pending_users WHERE email = $1',
            [email]
        )).rows;
        if (pending.length > 0) {
            return res.json({ status: 'pending' });
        }
        res.json({ status: 'not_found' });
    } catch (err) {
        res.json({ status: 'error', message: err.message });
    }
});

module.exports = app; // Export สำหรับ Vercel