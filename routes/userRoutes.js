import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js'; 
import { requestPasswordReset, resetPassword } from "../controllers/userController.js";
import Subscriber from '../models/Subscriber.js';


const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token.split(' ')[1], SECRET_KEY, (err, user) => {
    if (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }
        return res.status(403).json({ message: 'Invalid token.' });
    }
    req.user = user;
    next();
});

};

//  Authentication Middleware (Extract user ID from JWT)
const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");
  
  console.log("Auth Header:", authHeader); 

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1]; 

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; 
    console.log("Decoded User ID:", decoded.id); 
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};
router.post("/signup", async (req, res) => {
  const { name, email, password, preferences = [] } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword, preferences });

    await newUser.save();

 
    const token = jwt.sign(
      { id: newUser._id, name: newUser.name }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, preferences: newUser.preferences },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Error signing up", error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    console.log("Login attempt for:", email);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found:", email);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Stored hashed password:", user.password);
    console.log("Entered password:", password);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Password matched! Generating token...");
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
});

router.post("/preferences", authMiddleware, async (req, res) => {
  const userId = req.userId;

  console.log("Fetching user with ID:", userId); 

  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.preferences = req.body.preferences;
    await user.save();

    res.json({
      message: "User preferences updated successfully",
      user: { id: user._id, email: user.email, preferences: user.preferences },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating preferences", error: error.message });
  }
});


router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId; 
    console.log("Fetching profile for user ID:", userId);

    const user = await User.findById(userId).select("name email preferences");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/preferences", authMiddleware, async (req, res) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { preferences, age, readingTime, notifications } = req.body;

    user.preferences = preferences || user.preferences;
    user.age = age || user.age;
    user.readingTime = readingTime || user.readingTime;
    user.notifications = notifications ?? user.notifications;

    await user.save();

    if (notifications === true) {
      const alreadySubscribed = await Subscriber.findOne({ email: user.email });
      if (!alreadySubscribed) {
        await Subscriber.create({ email: user.email });
        console.log("✅ User added to Subscriber collection:", user.email);
      }
    }
    

    res.json({
      message: "User preferences updated successfully",
      user: {
        id: user._id,
        email: user.email,
        preferences: user.preferences,
        age: user.age,
        readingTime: user.readingTime,
        notifications: user.notifications,
      },
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ message: "Error updating preferences", error: error.message });
  }
});



router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;
