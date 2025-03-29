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
  throw new Error('MONGODB_URI is not defined');
}
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Function to get response from Claude
async function getClaudeResponse(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not defined');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to get response from Claude');
  }

  const data = await response.json();
  return data.content[0].text;
}

// Store responses
app.post('/responses/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { prompt, mcpResponse } = req.body;

  if (!prompt || !mcpResponse) {
    return res.status(400).json({ error: 'Prompt and MCP response are required' });
  }

  try {
    // Get normal response from Claude
    const normalResponse = await getClaudeResponse(prompt);
    
    let context = await Context.findOne({ userId });
    
    if (!context) {
      context = new Context({
        userId,
        prompts: [prompt],
        responses_normal: [normalResponse],
        responses_mcp: [mcpResponse]
      });
    } else {
      context.prompts.push(prompt);
      context.responses_normal.push(normalResponse);
      context.responses_mcp.push(mcpResponse);
      
      // Keep only last 5 entries
      if (context.prompts.length > 5) {
        context.prompts = context.prompts.slice(-5);
        context.responses_normal = context.responses_normal.slice(-5);
        context.responses_mcp = context.responses_mcp.slice(-5);
      }
    }
    
    await context.save();
    res.json({ 
      success: true, 
      prompts: context.prompts,
      responses_normal: context.responses_normal,
      responses_mcp: context.responses_mcp
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Get stored responses
app.get('/responses/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const context = await Context.findOne({ userId });
    res.json({ 
      prompts: context ? context.prompts : [],
      responses_normal: context ? context.responses_normal : [],
      responses_mcp: context ? context.responses_mcp : []
    });
  } catch (error) {
    console.error('Error getting responses:', error);
    res.status(500).json({ error: 'Failed to get responses' });
  }
});

// Clear responses
app.delete('/responses/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    await Context.findOneAndDelete({ userId });
    res.json({ success: true, message: 'Responses cleared' });
  } catch (error) {
    console.error('Error clearing responses:', error);
    res.status(500).json({ error: 'Failed to clear responses' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 