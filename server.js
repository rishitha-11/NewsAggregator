import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import newsRoutes from './routes/newsRoutes.js'; 
import passwordRoutes from './routes/passwordRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import cron from 'node-cron';
import sendNewsletter from './cronJobs/sendNewsletter.js';
import recommendationRoutes from './routes/recommendation.js'


dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',

  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 20 seconds timeout
}).then(() => {
  console.log(' Connected to MongoDB');
  

  const PORT = process.env.PORT || 3006;
  app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1); 
});

// Routes
app.use('/api/user', userRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/user', passwordRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use("/api", recommendationRoutes);

cron.schedule('52 7 * * 4', async () => {
  console.log('Running weekly newsletter job...');
  await sendNewsletter();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});
