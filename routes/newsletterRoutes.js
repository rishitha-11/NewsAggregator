import express from 'express';
import Subscriber from '../models/Subscriber.js';
import nodemailer from 'nodemailer';

const router = express.Router();

router.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Check if already subscribed
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({ message: 'Already subscribed' });
    }

    // Save email to database
    const newSubscriber = new Subscriber({ email });
    await newSubscriber.save();

    // Send Confirmation Email
    await sendConfirmationEmail(email);

    res.status(201).json({ message: 'Subscribed successfully!' });
  } catch (error) {
    console.error('Error subscribing:', error); 
    res.status(500).json({ message: 'Subscription failed. Try again.' });
  }
});

router.get('/unsubscribe', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send('Invalid request: Email is required.');
  }

  try {
    const subscriber = await Subscriber.findOne({ email });

    if (!subscriber) {
      return res.status(404).send('Email not found in subscriber list.');
    }

    // Simple HTML response with confirmation popup
    res.send(`
      <html>
      <body style="font-family: Arial; text-align: center; margin-top: 100px;">
        <h2>Are you sure you want to unsubscribe?</h2>
        <button style="background-color: red; color: white; border: none; padding: 10px 20px; font-size: 16px; cursor: pointer; border-radius: 5px;" onclick="confirmUnsubscribe()">Yes, Unsubscribe</button>
        <script>
        function confirmUnsubscribe() {
          fetch('/api/newsletter/confirm-unsubscribe?email=${encodeURIComponent(email)}')
          .then(res => res.text())
          .then(msg => document.body.innerHTML = '<h3>' + msg + '</h3>')
          .catch(() => alert('Unsubscribe failed. Please try again later.'));
        }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error showing unsubscribe confirmation:', error);
    res.status(500).send('Server error.');
  }
});

router.get('/confirm-unsubscribe', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send('Invalid request');
  }

  try {
    await Subscriber.deleteOne({ email });
    res.send('You have successfully unsubscribed from our newsletter.');
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send('Failed to unsubscribe. Please try again.');
  }
});

// Function to send confirmation email
async function sendConfirmationEmail(email) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASS, // Your app password (not personal password)
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Subscription Confirmed!',
    text: 'Hello from Newsverse!!! \n Thank you for subscribing to our newsletter. Stay tuned for updates!\n You will recieve Weekly updates through the mail.',
  };

  await transporter.sendMail(mailOptions);
}

export default router;
