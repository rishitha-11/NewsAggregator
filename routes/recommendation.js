import express from "express";
import User from '../models/User.js'


const router = express.Router();
// Map age ranges to preferred categories
const ageCategoryMap = {
    teen: ["entertainment", "sports"],
    youth: ["technology", "science", "business"],
    adult: ["business", "health", "nation"],
    senior: ["health", "nation"]
  };
  

// Get age group
function getAgeGroup(ageRange) {
    switch (ageRange) {
      case "13-17":
        return "teen";
      case "18-24":
        return "youth";
      case "25-34":
      case "35-44":
        return "adult";
      case "45-54":
      case "55+":
        return "senior";
      default:
        return "youth"; // default fallback
    }
  }
  

router.get("/recommendations", async (req, res) => {
  try {
    const userId = req.query.userId;
    const user = await User.findById(userId);
    if (!user || !user.age) return res.status(400).json({ message: "Age not found" });

    const ageGroup = getAgeGroup(user.age);
    const categories = ageCategoryMap[ageGroup];

    res.json({ recommendedCategories: categories });
  } catch (err) {
    console.error("Error getting recommendations:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
