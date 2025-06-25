import mongoose from 'mongoose';
import crypto from "crypto";
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, 
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },

  age: {
    type: String,
    required: false,
  },

  preferences: {
    type: [String], 
    default: [],
  },

  readingTime: {
    type: String,
    default: 'Any',
  },
  notifications: {
    type: Boolean,
    default: false,
  },
  
  resetPasswordToken: { type: String, default: null },  // Hashed token
  resetPasswordExpires: { type: Date, default: null },   // Expiration time
  likedArticles: [
    {
      articleId: String,
      title: String, // Optional, can store more details
      imageUrl: String,
      description: String,// Optional, for reference
    }
  ],
  savedArticles: [
    {
      articleId: String,
      title: String,
      imageUrl: String,
      description: String, 
    }
  ],
});

userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex"); // Random token
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex"); // Hash token
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // Token expires in 10 minutes

  return resetToken; // Return unhashed token for sending in email
};


// Method to like/unlike an article
userSchema.methods.toggleLikeArticle = async function (article) {
  const existingIndex = this.likedArticles.findIndex(a => a.articleId === article.articleId);

  if (existingIndex !== -1) {
    this.likedArticles.splice(existingIndex, 1); // Remove like if already liked
  } else {
    this.likedArticles.push(article); // Add like
  }

  await this.save();
  return this.likedArticles;
};

// Method to save/unsave an article
userSchema.methods.toggleSaveArticle = async function (article) {
  const existingIndex = this.savedArticles.findIndex(a => a.articleId === article.articleId);

  if (existingIndex !== -1) {
    this.savedArticles.splice(existingIndex, 1); // Remove save if already saved
  } else {
    this.savedArticles.push(article); // Add save
  }

  await this.save();
  return this.savedArticles;
};


const User = mongoose.model('User', userSchema);

// Use named export
export default User ;
