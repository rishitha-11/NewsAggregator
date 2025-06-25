import mongoose from 'mongoose';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import axios from 'axios'; // To fetch news from an API
import Subscriber from '../models/Subscriber.js';

dotenv.config(); 
mongoose.connect(process.env.MONGO_URI);

export default async function sendNewsletter() {
  // Fetch subscribers
  const subscribers = await Subscriber.find();

  if (subscribers.length === 0) {
    console.log('No subscribers to send newsletter.');
    return;
  }

  // Fetch latest news
  const newsArticles = await fetchLatestNews();
  if (!newsArticles || newsArticles.length === 0) {
    console.log('No news articles to send.');
    return;
  }

  // Create email transporter using Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Loop through subscribers and send newsletter
  for (const subscriber of subscribers) {
    // Construct newsletter body with the latest news
    const newsContent = newsArticles
      .map(article => {
        return `<p><strong>${article.title}</strong><br />${article.description}<br /><a href="${article.url}" target="_blank">Read more</a></p>`;
      })
      .join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: subscriber.email,
      subject: 'Weekly Newsletter - Latest News Updates!',
      html: `
        <h1>Weekly News Updates</h1>
        <p>Here’s your weekly news update!</p>
        ${newsContent}
        <hr />
        <p style="font-size: 12px;">
          If you no longer wish to receive these emails, 
          <a href="http://localhost:3006/api/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}" target="_blank">click here to unsubscribe</a>.
        </p>
      `,

    };

    // Send email
    await transporter.sendMail(mailOptions);
  }

  console.log('Newsletter sent to all subscribers.');
}

// Function to fetch the latest news articles
async function fetchLatestNews() {
  try {
    const API_KEY = '0edbfb920e8348019d84eb2e832de091';
    const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${API_KEY}`);
    const articles = response.data.articles;

    // Optionally, return only the first 5 articles
    return articles.slice(0, 5);
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}
