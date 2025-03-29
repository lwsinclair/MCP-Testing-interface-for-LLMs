import { MCPServer, Tool } from '@anthropic-ai/mcp-sdk';
import mongoose from 'mongoose';
import { Context } from './models/Context';

// Initialize MCP Server
const mcp = new MCPServer({
  name: 'context-provider',
  description: 'A server that provides conversation context for LLMs',
  version: '1.0.0'
});

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI is not defined');
}
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define MCP Tools
const addContextTool = new Tool({
  name: 'add_context',
  description: 'Add a new prompt to the user\'s context and get responses',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'Unique identifier for the user' },
      prompt: { type: 'string', description: 'The prompt to add to context' }
    },
    required: ['userId', 'prompt']
  },
  handler: async ({ userId, prompt }) => {
    try {
      let context = await Context.findOne({ userId });
      
      // Get normal response (without context)
      const normalResponse = await getClaudeResponse(prompt);
      
      // Get MCP response (with context)
      const contextString = context ? context.prompts.join('\n\n') : '';
      const mcpResponse = await getClaudeResponse(prompt, contextString);
      
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
      return { 
        success: true, 
        prompts: context.prompts,
        responses_normal: context.responses_normal,
        responses_mcp: context.responses_mcp
      };
    } catch (error) {
      console.error('Error:', error);
      throw new Error('Failed to process request');
    }
  }
});

const getContextTool = new Tool({
  name: 'get_context',
  description: 'Get the current context and responses for a user',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'Unique identifier for the user' }
    },
    required: ['userId']
  },
  handler: async ({ userId: any }) => {
    try {
      const context = await Context.findOne({ userId });
      return { 
        prompts: context ? context.prompts : [],
        responses_normal: context ? context.responses_normal : [],
        responses_mcp: context ? context.responses_mcp : []
      };
    } catch (error) {
      console.error('Error getting context:', error);
      throw new Error('Failed to get context');
    }
  }
});

const clearContextTool = new Tool({
  name: 'clear_context',
  description: 'Clear the context for a user',
  parameters: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: 'Unique identifier for the user' }
    },
    required: ['userId']
  },
  handler: async ({ userId }) => {
    try {
      await Context.findOneAndDelete({ userId });
      return { success: true, message: 'Context cleared' };
    } catch (error) {
      console.error('Error clearing context:', error);
      throw new Error('Failed to clear context');
    }
  }
});

// Register tools with MCP server
mcp.registerTool(addContextTool);
mcp.registerTool(getContextTool);
mcp.registerTool(clearContextTool);

// Function to get response from Claude
async function getClaudeResponse(prompt: string, context?: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not defined');
  }

  const messages = [];
  if (context) {
    messages.push({ role: 'system', content: context });
  }
  messages.push({ role: 'user', content: prompt });

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
      messages: messages
    })
  });

  if (!response.ok) {
    throw new Error('Failed to get response from Claude');
  }

  const data = await response.json();
  return data.content[0].text;
}

// Start MCP server
mcp.start().then(() => {
  console.log('MCP Server started');
}).catch(err => {
  console.error('Failed to start MCP server:', err);
}); 