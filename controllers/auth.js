const { Role } = require('@prisma/client');
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Step 1: Validate body
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // Step 2: Check Email in DB already?
        const userExists = await prisma.user.findFirst({
            where: { email },
        });
        if (userExists) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Step 3: Hash Password
        const hashPassword = await bcrypt.hash(password, 10);

        // Step 4: Register
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashPassword,
            },
        });

        res.status(201).json({ message: "Register Success" });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Step 1: Check Email
        const user = await prisma.user.findFirst({
            where: { email },
        });
        if (!user || !user.enabled) {
            return res.status(400).json({ message: "User not found or not enabled" });
        }

        // Step 2: Check Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        // Step 3: Create Payload
        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        // Step 4: Generate Token
        jwt.sign(payload, process.env.SECRET, { expiresIn: '1d' }, (err, token) => {
            if (err) {
                console.error("JWT Error:", err);
                return res.status(500).json({ message: "Token generation failed" });
            }
            res.json({ payload, token });
        });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.currentUser = async (req, res) => {
    try {
        const user = req.user; // Assuming middleware attaches user data to the request
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        res.json({ user });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};