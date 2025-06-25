import User from '../models/User.js';
import axios from 'axios';

// Map age ranges to categories
const ageRangeToCategories = {
  '13-17': ['sports', 'entertainment'],
  '18-24': ['technology', 'business'],
  '25-34': ['health', 'world'],
  '35-50': ['politics', 'science'],
  '50+': ['health', 'science'], // optional fallback if used
};

// Main function
export default async function getRecommendationsBasedOnAge(req, res) {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user || !user.age) {
      return res.status(404).json({ message: 'User or age not found' });
    }

    const ageRange = user.age.trim(); // e.g., "25-34"
    const preferredCategories = ageRangeToCategories[ageRange] || ['health']; // fallback

    const response = await axios.get(
      `https://gnews.io/api/v4/top-headlines?country=in&lang=en&token=${process.env.GNEWS_API_KEY}`
    );

    let articles = response.data.articles || [];

    // Filter based on keywords in title/description
    articles = articles.filter(article => {
      const content = (article.title + " " + article.description).toLowerCase();
      return preferredCategories.some(cat => content.includes(cat.toLowerCase()));
    });

    // Remove duplicates
    const seen = new Set();
    const uniqueNews = articles.filter(article => {
      const key = article.title || article.url;
      return seen.has(key) ? false : seen.add(key);
    });

    res.json({ recommendedArticles: uniqueNews.slice(0, 20) });
  } catch (err) {
    console.error('Recommendation Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch recommendations' });
  }
}
