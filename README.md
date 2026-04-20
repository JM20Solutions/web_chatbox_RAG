# JM20 Agentic Solutions — Chat Widget

AI-powered customer support chat widget with Pinecone RAG + Claude, deployable to Netlify.

## Stack
- **Frontend**: Plain HTML / CSS / JS (no framework)
- **Backend**: Netlify Functions (serverless)
- **AI**: Anthropic Claude (`claude-sonnet-4-20250514`)
- **Vector DB**: Pinecone (RAG retrieval)
- **Booking**: Tally form embedded inline in chat

## Setup

### 1. Clone & configure
```bash
git clone https://github.com/JM20Solutions/web_chatbox_RAG.git
cd web_chatbox_RAG
cp .env.example .env
# Edit .env and fill in your API keys
```

### 2. Create Pinecone index
In [app.pinecone.io](https://app.pinecone.io):
- Create index → **Serverless**
- Model: `multilingual-e5-large`
- Dimensions: `1024`
- Copy the **Index Host** URL → paste into `.env`

### 3. Index your knowledge base
```bash
node scripts/pinecone-indexer.mjs
```

### 4. Deploy to Netlify
Push to GitHub, then in [app.netlify.com](https://app.netlify.com):
- New site → Import from GitHub → select this repo
- **Environment Variables** → add all 4 keys from `.env`
- Deploy!

## Environment Variables
| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `PINECONE_API_KEY` | [app.pinecone.io](https://app.pinecone.io) → API Keys |
| `PINECONE_INDEX_HOST` | Pinecone → your index → Host URL |
| `TALLY_FORM_URL` | Tally → your form → Share → Embed → copy `src` URL |

## How it works
1. Visitor types a message
2. `chat.js` POSTs to `/.netlify/functions/chat`
3. The function embeds the query via Pinecone Inference API
4. Queries the Pinecone index for the top 4 matching knowledge chunks
5. Passes chunks + conversation history to Claude
6. Claude returns a reply (+ `[SHOW_BOOKING_FORM]` tag if booking intent detected)
7. Frontend renders the reply — and embeds the Tally form inline if booking was requested
