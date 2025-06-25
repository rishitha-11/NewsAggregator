import mongoose from "mongoose";

const likedArticleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  articleId: { type: String, required: true },
  title: { type: String, required: true },
  imageUrl: { type: String },
  description: { type: String },
}, { timestamps: true });

const LikedArticle = mongoose.model("LikedArticle", likedArticleSchema);

export default LikedArticle;
