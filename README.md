[![MseeP.ai Security Assessment Badge](https://mseep.net/mseep-audited.png)](https://mseep.ai/app/srish-ty-mcp-testing-interface-for-llms)

# Memory Context Provider (MCP) Server

A server that manages context for LLM interactions, storing and providing relevant context for each user.

## Features

- In-memory storage of user contexts
- Context management with last 5 prompts
- RESTful API endpoints
- TypeScript support

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### POST /context/:userId
Add a new prompt to user's context and get updated context.

Request body:
```json
{
  "prompt": "Your prompt here"
}
```

Response:
```json
{
  "context": "Combined context from last 5 prompts"
}
```

### GET /context/:userId
Get current context for a user.

Response:
```json
{
  "context": "Current context"
}
```

### DELETE /context/:userId
Clear context for a user.

Response:
```json
{
  "message": "Context cleared"
}
```

## Development

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build TypeScript files
- `npm start`: Run built files 