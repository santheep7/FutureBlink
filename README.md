# AI Flow Runner

A MERN stack app where you can type a prompt, hit run, and see the AI response — all visualized as a flow chart using React Flow. Built with Node/Express on the backend, MongoDB to store runs, and OpenRouter to call the AI model.

## Stack

- React + TypeScript (Vite)
- React Flow
- Node.js + Express
- MongoDB + Mongoose
- OpenRouter API

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- OpenRouter API key — get one free at https://openrouter.ai

### Installation

```bash
# clone the repo and install deps
cd server && npm install
cd ../client && npm install
```

### Environment

Create `server/.env`:

```
MONGODB_URI=your_mongodb_connection_string
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=google/gemma-3-27b-it:free
PORT=4000
```

### Running locally

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

App will be at `http://localhost:5173`.

## How it works

1. Type a prompt in the left node
2. Click **Run Flow** — the backend sends it to OpenRouter and returns the response
3. The answer shows up in the right node
4. Click **Save** to store the prompt + response in MongoDB

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/ask-ai` | Send prompt, get AI response |
| POST | `/api/save` | Save prompt + response to DB |
