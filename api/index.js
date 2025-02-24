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
    console.log('Initializing database with:', process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@')); // Log URL โดยซ่อน password
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    // Test connection
    await pool.query('SELECT NOW()').catch(err => {
        console.error('Database connection failed:', err);
        throw err;
    });
    console.log('Database connected successfully');
    return pool;
}

let dbPromise;

app.use(async (req, res, next) => {
    if (!dbPromise) {
        try {
            dbPromise = initializeDatabase();
        } catch (err) {
            return next(err);
        }
    }
    try {
        req.db = await dbPromise;
        next();
    } catch (err) {
        console.error('Database error in middleware:', err);
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

app.post('/register', async (req, res) => {
    const defaultProfilePicture = './image/large.jpg';
    try {
        console.log('Register request:', req.body);

        const [existingUsers] = (await req.db.query(
            'SELECT email FROM users WHERE email = $1',
            [req.body.email]
        )).rows;
        console.log('Existing users:', existingUsers);
        if (existingUsers.length > 0) {
            return res.json({ status: 'error', message: 'Email is already registered' });
        }

        const [pendingUsers] = (await req.db.query(
            'SELECT email FROM pending_users WHERE email = $1',
            [req.body.email]
        )).rows;
        console.log('Pending users:', pendingUsers);

        const hash = await bcrypt.hash(req.body.password, saltRounds);
        const verificationToken = jwt.sign({ email: req.body.email }, secret, { expiresIn: '24h' });
        console.log('Generated token:', verificationToken);

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
            to: req.body.email
        });
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');

        res.json({ status: 'OK', message: 'Please check your email to verify and complete registration.' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// /verify
app.get('/verify', async (req, res) => {
    try {
        const token = req.query.token;
        const decoded = jwt.verify(token, secret);

        const [pending] = (await req.db.query(
            'SELECT * FROM pending_users WHERE email = $1 AND verification_token = $2',
            [decoded.email, token]
        )).rows;

        if (pending.length === 0) {
            return res.json({ status: 'error', message: 'Invalid or expired verification token' });
        }

        const createdAt = new Date(pending[0].created_at);
        const now = new Date();
        if ((now - createdAt) / (1000 * 60 * 60) > 24) {
            await req.db.query('DELETE FROM pending_users WHERE email = $1', [decoded.email]);
            return res.json({ status: 'error', message: 'Verification link has expired' });
        }

        await req.db.query(
            'INSERT INTO users (name, email, password_hash, profile_picture) VALUES ($1, $2, $3, $4)',
            [pending[0].name, pending[0].email, pending[0].password_hash, defaultProfilePicture]
        );

        await req.db.query('DELETE FROM pending_users WHERE email = $1', [decoded.email]);

        res.json({ status: 'OK', message: 'Email verified and registration completed!' });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.json({ status: 'error', message: 'Verification link has expired' });
        }
        res.json({ status: 'error', message: 'Invalid verification token' });
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