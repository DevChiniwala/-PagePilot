<div align="center">

<!-- SVG ANIMATION: AI Architecture Banner -->
<img src="architecture.svg" alt="PagePilot Architecture" width="860" />

<br/>

# ✦ PagePilot

### *Turn any webpage into your AI-powered workspace*

[![TypeScript](https://img.shields.io/badge/TypeScript-57.9%25-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-38.4%25-3776ab?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-Google-4285F4?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![LangChain](https://img.shields.io/badge/LangChain-RAG-1C3C3C?style=flat-square&logo=chainlink&logoColor=white)](https://langchain.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

> **PagePilot** is a Chrome Extension that uses Retrieval-Augmented Generation (RAG) to let you summarize, deep-dive, and chat with any webpage — instantly. Paste a URL, choose your analysis depth, and let AI do the heavy lifting.

</div>

---

## 📸 UI Preview

> Dashboard · Analysis Modes · Chat — all from the extension popup.

| Dashboard | Analysis Mode |
|---|---|
| URL input + Analyze button | Fast · Deep · ELI5 · Expert modes |
| Section chunking preview | Real-time scrape + embed + query |
| Chat history sidebar | Per-session conversation memory |

---

## 🗂 Repository Structure

```
-PagePilot/
├── backend/                    # FastAPI Python server
│   ├── app/
│   │   ├── main.py             # Entry point, CORS config, router mounts
│   │   ├── routes/
│   │   │   ├── analyze.py      # POST /analyze — scrape + chunk + embed + query
│   │   │   ├── chat.py         # POST /chat   — conversational RAG
│   │   │   └── auth.py         # JWT login / register
│   │   ├── core/
│   │   │   ├── rag.py          # LangChain pipeline (loader → splitter → retriever)
│   │   │   ├── embeddings.py   # ChromaDB collection manager
│   │   │   └── llm.py          # Gemini model wrapper
│   │   ├── models/             # Pydantic request/response schemas
│   │   └── db/                 # PostgreSQL session & user persistence
│   ├── requirements.txt
│   └── Dockerfile
│
├── extension/                  # Chrome Extension (React + TypeScript)
│   ├── src/
│   │   ├── popup/              # Main React app rendered in extension popup
│   │   │   ├── App.tsx         # Root component, routing (Dashboard/Chat/History)
│   │   │   ├── Dashboard.tsx   # URL input, Analysis mode selector, result preview
│   │   │   ├── Chat.tsx        # Conversational interface with message history
│   │   │   ├── History.tsx     # Past analysis sessions
│   │   │   └── Settings.tsx    # API key, preferences
│   │   ├── background/
│   │   │   └── service-worker.ts  # SW: fetch proxy, port keepalive, retry logic
│   │   └── content/            # Content scripts (DOM access)
│   ├── manifest.json           # MV3 manifest
│   └── vite.config.ts
│
├── docker-compose.yml          # Orchestrates backend + postgres + chromadb
└── .env.example                # Environment variable template
```

---

## ⚙️ Core Architecture & Workflows

### 1. 🔍 Analyze Workflow (Primary Flow)

```
User pastes URL in Dashboard
        │
        ▼
[Chrome Extension: Dashboard.tsx]
  → Sends POST /analyze to backend via Service Worker proxy
        │
        ▼
[Service Worker: service-worker.ts]
  → Intercepts fetch, applies retry-on-network-error logic
  → Routes through SW to bypass CORS restrictions
  → Maintains port keepalive to prevent SW termination
        │
        ▼
[FastAPI: routes/analyze.py]
  → Validates request (Pydantic schema)
  → Calls RAG pipeline
        │
        ▼
[RAG Pipeline: core/rag.py]
  ├─ WebBaseLoader / AsyncChromiumLoader — scrapes page content
  ├─ RecursiveCharacterTextSplitter — chunks text into segments
  ├─ GoogleGenerativeAIEmbeddings — embeds each chunk
  ├─ ChromaDB — stores vectors, returns relevant chunks via similarity search
  └─ Gemini LLM — generates response conditioned on retrieved context
        │
        ▼
[Response]
  → JSON with summary/analysis + section metadata
  → Extension renders result with "N sections" indicator
```

### 2. 💬 Chat Workflow (Conversational RAG)

```
User types message in Chat view
        │
        ▼
[Chat.tsx]
  → Appends user message to local conversation state
  → POST /chat with { message, session_id, history }
        │
        ▼
[FastAPI: routes/chat.py]
  → Loads existing ChromaDB collection for that session
  → Retrieves top-k relevant chunks for the new query
  → Builds ConversationBufferMemory from session history
  → Calls Gemini via LangChain ConversationalRetrievalChain
        │
        ▼
[Gemini]
  → Generates a grounded, context-aware reply
        │
        ▼
[Chat.tsx]
  → Streams/displays response, updates history
```

### 3. 🔐 Auth Workflow

```
[Register / Login → FastAPI /auth routes]
  → Pydantic validation → bcrypt password hashing
  → JWT token issued (HS256)
  → PostgreSQL stores user record + session metadata
  → Token stored in extension storage
  → All subsequent API calls include Bearer token header
```

---

## 🧠 Analysis Modes

| Mode | Description | Behavior |
|------|-------------|----------|
| ⚡ **Fast** | Quick TL;DR summary | Shallow chunk retrieval, concise prompt |
| ◑ **Deep** | Thorough analysis | Full document embedding, expanded context window |
| 💡 **ELI5** | Explain Like I'm 5 | Simplified language system prompt override |
| ◎ **Expert** | Dense technical breakdown | Higher token budget, structured output prompt |

---

## 🔧 Key Technical Methods

### Service Worker: Network Bypass & Resilience
**File:** `extension/src/background/service-worker.ts`

- **Permissive CORS strategy** — all API calls are routed through the Service Worker, which forwards them server-side, eliminating CORS preflight issues in the extension context.
- **Fetch retry on network error** — exponential backoff retry wraps every outbound fetch; transient failures (connection resets, backend cold starts) are retried automatically before surfacing an error.
- **Port keepalive** — a recurring `chrome.runtime.connect` heartbeat prevents MV3 service workers from being terminated mid-session, solving the 5-minute SW idle kill problem.

```typescript
// Simplified retry pattern from service-worker.ts
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 300 * (i + 1)));
    }
  }
}
```

### Backend: CORS & API Routing
**File:** `backend/app/main.py`

```python
# Permissive CORS — extension origin whitelisted
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Tightened in production via env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### RAG Pipeline: LangChain + ChromaDB
**File:** `backend/app/core/rag.py`

```python
# Core RAG chain construction
loader = WebBaseLoader(url)
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
chunks = splitter.split_documents(docs)

embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
vectorstore = Chroma.from_documents(chunks, embeddings, collection_name=session_id)

retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
chain = ConversationalRetrievalChain.from_llm(
    llm=ChatGoogleGenerativeAI(model="gemini-1.5-flash"),
    retriever=retriever,
    memory=ConversationBufferMemory(memory_key="chat_history", return_messages=True)
)
```

---

## 🏗 Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React 18 + TypeScript | Extension popup UI |
| **Build** | Vite + Chrome MV3 | Extension bundling |
| **Service Worker** | TypeScript | CORS proxy, retry, keepalive |
| **Backend** | FastAPI (Python) | REST API, orchestration |
| **LLM** | Google Gemini | Text generation |
| **RAG Framework** | LangChain | Chain, memory, retrieval |
| **Vector DB** | ChromaDB | Embedding storage & search |
| **Relational DB** | PostgreSQL | User accounts, session history |
| **Auth** | JWT (python-jose) | Stateless auth tokens |
| **Container** | Docker + Compose | Local dev orchestration |
| **Validation** | Pydantic v2 | Request/response schemas |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18 + pnpm / npm
- Python ≥ 3.11
- Docker + Docker Compose
- Google Gemini API key

### 1. Clone & configure

```bash
git clone https://github.com/DevChiniwala/-PagePilot.git
cd -PagePilot
cp .env.example .env
# Fill in GEMINI_API_KEY, DATABASE_URL, JWT_SECRET
```

### 2. Start the backend

```bash
docker-compose up --build
# FastAPI available at http://localhost:8000
# PostgreSQL at localhost:5432
# ChromaDB at localhost:8001
```

### 3. Build the extension

```bash
cd extension
npm install
npm run build
# Output: extension/dist/
```

### 4. Load in Chrome

1. Navigate to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select `extension/dist/`
4. Pin PagePilot and click the icon

---

## 🌐 Environment Variables

```env
# Backend (.env)
GEMINI_API_KEY=your_google_ai_key
DATABASE_URL=postgresql://user:pass@localhost:5432/pagepilot
JWT_SECRET=your_jwt_secret_key
CHROMA_HOST=localhost
CHROMA_PORT=8001

# Extension (vite build-time)
VITE_API_BASE_URL=http://localhost:8000
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get JWT token |
| `POST` | `/analyze` | Scrape + embed + analyze URL |
| `POST` | `/chat` | Conversational RAG query |
| `GET` | `/history` | Retrieve past sessions |
| `DELETE` | `/history/{id}` | Remove a session |

---

## 🗺 Roadmap

- [x] Phase 1: Architecture setup, Docker, DB schema
- [x] Phase 2: CORS bypass via Service Worker routing
- [x] Phase 3: Fetch retry + SW keepalive
- [ ] Phase 4: Streaming responses (SSE)
- [ ] Phase 5: PDF & YouTube URL support
- [ ] Phase 6: Capsule export (cross-platform context transfer)
- [ ] Phase 7: Chrome Web Store publish

---

## 👤 Author

**Dev Chiniwala** · [dev.chiniwala@gmail.com](mailto:dev.chiniwala@gmail.com)

Built at LNMIIT · Part of the Tilantra Technologies ecosystem

---

<div align="center">

*PagePilot — because every webpage deserves a co-pilot.*

</div>
