import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import nodemailer from 'nodemailer';
import sendEmail from "../utils/sendEmail.js";
import dotenv from "dotenv";
import crypto from "crypto";
import Subscriber from "../models/Subscriber.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

/**
 * @desc Utility function to generate JWT token
 */
const generateToken = (id, name) => {
  return jwt.sign({ id, name }, JWT_SECRET, { expiresIn: '1h' });
};

/**
 * @desc Signup a new user
 * @route POST /api/user/signup
 */
export const signup = async (req, res) => {
  const { name, email, password, age, preferences = [] , readingTime, notifications} = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, age, preferences, readingTime, notifications });
    await newUser.save();

    // Add to Subscriber list if notifications is true
    if (notifications === true) {
      const alreadySubscribed = await Subscriber.findOne({ email });
      if (!alreadySubscribed) {
        await Subscriber.create({ email });
      }
    }
    

    const token = generateToken(newUser._id, newUser.name);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email,age: newUser.age, preferences: newUser.preferences,readingTime: newUser.readingTime,
        notifications: newUser.notifications},
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Error signing up', error: error.message });
  }
};

/**
 * @desc Login user
 * @route POST /api/user/login
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.name);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, preferences: user.preferences },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

/**
 * @desc Request password reset (generate token and send email)
 * @route POST /api/user/request-reset
 */
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save(); // Save hashed token in DB

    // Construct reset link
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

    // Send email with the reset link
    await sendEmail(user.email, "Password Reset Request", `Click here to reset your password: ${resetLink}`);

    res.json({ message: "Password reset link sent to email" });
  } catch (error) {
    console.error("Request Password Reset Error:", error);
    res.status(500).json({ message: "Error requesting password reset" });
  }
};

/**
 * @desc Reset user password
 * @route POST /api/user/reset-password
 */
export const resetPassword = async (req, res) => {
  console.log("🔹 Received Request Body:", req.body); // Debugging

  const { token, newPassword } = req.body; // ✅ Get token from body

  if (!token || !newPassword) {
    console.log("❌ Missing token or password");
    return res.status(400).json({ message: "Token and new password are required" });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
};

/**
 * @desc Update user preferences
 * @route POST /api/user/preferences
 * @access Private
 */
export const updatePreferences = async (req, res) => {
  const userId = req.user.id; // coming from the auth middleware
  const { preferences } = req.body; // full preferences object (age, interests, etc.)

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update preferences fields
    user.preferences = preferences.interests || user.preferences;
    user.age = preferences.age || user.age;
    user.readingTime = preferences.readingTime || user.readingTime;
    user.notifications = preferences.notifications ?? user.notifications;

    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: {
        interests: user.preferences,
        age: user.age,
        readingTime: user.readingTime,
        notifications: user.notifications,
      }
    });
  } catch (error) {
    console.error('Update Preferences Error:', error);
    res.status(500).json({ message: 'Error updating preferences' });
  }
};
