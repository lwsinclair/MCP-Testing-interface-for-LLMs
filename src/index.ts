import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Context } from './models/Context';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Add context
app.post('/context/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    let context = await Context.findOne({ userId });
    
    if (!context) {
      context = new Context({
        userId,
        prompts: [prompt]
      });
    } else {
      context.prompts.push(prompt);
      if (context.prompts.length > 5) {
        context.prompts = context.prompts.slice(-5);
      }
    }
    
    await context.save();
    res.json({ success: true, prompts: context.prompts });
  } catch (error) {
    console.error('Error adding context:', error);
    res.status(500).json({ error: 'Failed to add context' });
  }
});

// Get context
app.get('/context/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    console.log('Fetching context for userId:', userId);
    const context = await Context.findOne({ userId });
    console.log('Found context:', context);
    res.json({ prompts: context ? context.prompts : [] });
  } catch (error) {
    console.error('Error getting context:', error);
    res.status(500).json({ error: 'Failed to get context' });
  }
});

// Clear context
app.delete('/context/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    await Context.findOneAndDelete({ userId });
    res.json({ success: true, message: 'Context cleared' });
  } catch (error) {
    console.error('Error clearing context:', error);
    res.status(500).json({ error: 'Failed to clear context' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 