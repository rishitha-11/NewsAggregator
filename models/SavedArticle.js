import mongoose from "mongoose";

const savedArticleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  articleId: { type: String, required: true },
  title: { type: String, required: true },
  imageUrl: { type: String },
  description: { type: String },
}, { timestamps: true });

const SavedArticle = mongoose.model("SavedArticle", savedArticleSchema);

export default SavedArticle;
