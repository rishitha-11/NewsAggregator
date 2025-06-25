import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import User from "../models/User.js";
import mongoose from "mongoose";  
import getRecommendationsBasedOnAge from "../controllers/recommendationController.js";


dotenv.config();

const router = express.Router();

const NEWS_API_KEY = process.env.NEWS_API_KEY;

router.get('/search', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ message: 'Query parameter is required' });
    }

    console.log(`🔍 Search Query Received: ${query}`);

    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: query,
                apiKey: NEWS_API_KEY,
                language: 'en',
                sortBy: 'publishedAt',
            }
        });

        console.log(`✅ Fetched ${response.data.articles.length} articles for "${query}"`);
        res.json(response.data.articles);
    } catch (error) {
        console.error('❌ Error fetching news from NewsAPI:', error?.response?.data || error.message);
        res.status(500).json({
            message: 'Failed to fetch articles',
            error: error?.response?.data || error.message,
        });
    }
});

router.get("/liked", async (req, res) => {
  try {
    const userId = req.query.userId; // Get user ID from query params
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.likedArticles); // Return liked articles
  } catch (error) {
    console.error("Error fetching liked articles:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/saved", async (req, res) => {
  try {
    const userId = req.query.userId; // Get user ID from query params
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.savedArticles); // Return saved articles
  } catch (error) {
    console.error("Error fetching saved articles:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/like", async (req, res) => {
  const { userId, articleId, title, imageUrl, description } = req.body;

  if (!userId || !articleId) {
    return res.status(400).json({ error: "User ID and Article ID are required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const updatedLikes = await user.toggleLikeArticle({ articleId, title, imageUrl, description });

    res.json({ message: "Like status updated successfully.", likedArticles: updatedLikes });
  } catch (error) {
    console.error("❌ Error updating like status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/save", async (req, res) => {
  const { userId, articleId, title, imageUrl, description } = req.body;

  if (!userId || !articleId) {
    return res.status(400).json({ error: "User ID and Article ID are required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const updatedSaves = await user.toggleSaveArticle({ articleId, title, imageUrl, description });

    res.json({ message: "Save status updated successfully.", savedArticles: updatedSaves });
  } catch (error) {
    console.error("❌ Error updating save status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/status/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID format." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    res.json({
      likedArticles: user.likedArticles.map(a => a.articleId),
      savedArticles: user.savedArticles.map(a => a.articleId),
    });
  } catch (error) {
    console.error("❌ Error fetching like/save status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to explicitly unlike an article
router.delete("/like", async (req, res) => {
  const { userId, articleId } = req.body;

  if (!userId || !articleId) {
    return res.status(400).json({ error: "User ID and Article ID are required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    user.likedArticles = user.likedArticles.filter(
      (article) => article.articleId !== articleId
    );

    await user.save();

    res.json({ message: "Article unliked successfully." });
  } catch (error) {
    console.error("❌ Error unliking article:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to explicitly unsave an article
router.delete("/save", async (req, res) => {
  const { userId, articleId } = req.body;

  if (!userId || !articleId) {
    return res.status(400).json({ error: "User ID and Article ID are required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    user.savedArticles = user.savedArticles.filter(
      (article) => article.articleId !== articleId
    );

    await user.save();

    res.json({ message: "Article unsaved successfully." });
  } catch (error) {
    console.error("❌ Error unsaving article:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recommendations/:userId", getRecommendationsBasedOnAge);


export default router;
