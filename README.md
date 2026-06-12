<div align="center">

<!-- SVG ANIMATION: AI Architecture Banner -->
<svg width="860" height="320" viewBox="0 0 860 320" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;border-radius:16px;display:block;margin:0 auto;">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d1117;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#0f1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d1117;stop-opacity:1" />
    </linearGradient>
    <!-- Glow blue -->
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#4f8ef7;stop-opacity:0.35" />
      <stop offset="100%" style="stop-color:#4f8ef7;stop-opacity:0" />
    </radialGradient>
    <!-- Node glow -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softglow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style>
      .node-label { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 10px; fill: #c9d1d9; }
      .node-sublabel { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 8px; fill: #8b949e; }
      .title-text { font-family: 'Segoe UI', system-ui, sans-serif; font-weight: 700; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="860" height="320" fill="url(#bgGrad)" rx="16"/>

  <!-- Grid lines (subtle) -->
  <g opacity="0.07" stroke="#4f8ef7" stroke-width="0.5">
    <line x1="0" y1="53" x2="860" y2="53"/>
    <line x1="0" y1="106" x2="860" y2="106"/>
    <line x1="0" y1="160" x2="860" y2="160"/>
    <line x1="0" y1="213" x2="860" y2="213"/>
    <line x1="0" y1="267" x2="860" y2="267"/>
    <line x1="86" y1="0" x2="86" y2="320"/>
    <line x1="172" y1="0" x2="172" y2="320"/>
    <line x1="258" y1="0" x2="258" y2="320"/>
    <line x1="344" y1="0" x2="344" y2="320"/>
    <line x1="430" y1="0" x2="430" y2="320"/>
    <line x1="516" y1="0" x2="516" y2="320"/>
    <line x1="602" y1="0" x2="602" y2="320"/>
    <line x1="688" y1="0" x2="688" y2="320"/>
    <line x1="774" y1="0" x2="774" y2="320"/>
  </g>

  <!-- Core glow behind central node -->
  <ellipse cx="430" cy="160" rx="90" ry="90" fill="url(#coreGlow)">
    <animate attributeName="rx" values="80;100;80" dur="3.5s" repeatCount="indefinite"/>
    <animate attributeName="ry" values="80;100;80" dur="3.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.6;1;0.6" dur="3.5s" repeatCount="indefinite"/>
  </ellipse>

  <!-- ───── DATA FLOW LINES (animated dashes) ───── -->

  <!-- Chrome Extension → RAG Engine -->
  <line x1="175" y1="100" x2="340" y2="145" stroke="#4f8ef7" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.55">
    <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.4s" repeatCount="indefinite"/>
  </line>
  <!-- Chrome Extension → RAG Engine (lower) -->
  <line x1="175" y1="118" x2="340" y2="158" stroke="#4f8ef7" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.4">
    <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.8s" repeatCount="indefinite"/>
  </line>

  <!-- RAG Engine → Gemini LLM -->
  <line x1="490" y1="148" x2="635" y2="100" stroke="#a78bfa" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.6">
    <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.2s" repeatCount="indefinite"/>
  </line>
  <!-- RAG Engine → ChromaDB -->
  <line x1="475" y1="182" x2="630" y2="215" stroke="#34d399" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.55">
    <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.6s" repeatCount="indefinite"/>
  </line>
  <!-- RAG Engine → FastAPI -->
  <line x1="430" y1="195" x2="430" y2="248" stroke="#fb923c" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.55">
    <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.5s" repeatCount="indefinite"/>
  </line>
  <!-- FastAPI → PostgreSQL -->
  <line x1="395" y1="268" x2="240" y2="260" stroke="#fb923c" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.45">
    <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite"/>
  </line>
  <!-- Service Worker arc (top) -->
  <path d="M 175 88 Q 300 30 430 130" fill="none" stroke="#60a5fa" stroke-width="1.2" stroke-dasharray="5 5" opacity="0.3">
    <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="2.2s" repeatCount="indefinite"/>
  </path>

  <!-- ───── NODES ───── -->

  <!-- NODE: Chrome Extension (left) -->
  <g filter="url(#glow)">
    <rect x="60" y="72" width="115" height="62" rx="10" fill="#0d1f3c" stroke="#4f8ef7" stroke-width="1.5"/>
    <!-- Pulse ring -->
    <rect x="60" y="72" width="115" height="62" rx="10" fill="none" stroke="#4f8ef7" stroke-width="2.5" opacity="0">
      <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite"/>
      <animate attributeName="stroke-width" values="2;6;2" dur="2.4s" repeatCount="indefinite"/>
    </rect>
    <!-- Icon: puzzle/extension symbol -->
    <text x="83" y="96" font-size="16" fill="#4f8ef7">⚡</text>
    <text x="103" y="96" class="node-label" font-weight="600" fill="#e6edf3">Chrome</text>
    <text x="83" y="110" class="node-label" fill="#e6edf3">Extension</text>
    <text x="83" y="124" class="node-sublabel">React · TypeScript</text>
  </g>

  <!-- NODE: Service Worker (top left) -->
  <g filter="url(#glow)">
    <rect x="58" y="20" width="118" height="38" rx="8" fill="#0d1f3c" stroke="#60a5fa" stroke-width="1.2" opacity="0.85"/>
    <text x="75" y="36" font-size="11" fill="#60a5fa">🔄</text>
    <text x="93" y="36" class="node-label" fill="#c9d1d9">Service Worker</text>
    <text x="75" y="50" class="node-sublabel">CORS Bypass · Retry</text>
  </g>

  <!-- NODE: RAG Engine (CENTER) -->
  <g filter="url(#softglow)">
    <rect x="340" y="120" width="180" height="80" rx="14" fill="#0a1628" stroke="#4f8ef7" stroke-width="2.2"/>
    <rect x="340" y="120" width="180" height="80" rx="14" fill="none" stroke="#4f8ef7" stroke-width="4" opacity="0">
      <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="stroke-width" values="3;9;3" dur="3s" repeatCount="indefinite"/>
    </rect>
    <text x="364" y="148" font-size="18" fill="#4f8ef7">✦</text>
    <text x="389" y="148" class="title-text" font-size="13" fill="#7dd3fc">PagePilot</text>
    <text x="435" y="148" class="title-text" font-size="11" fill="#4f8ef7"> RAG Core</text>
    <text x="364" y="166" class="node-sublabel" fill="#8b949e">LangChain · Embeddings</text>
    <text x="364" y="180" class="node-sublabel" fill="#8b949e">Chunking · Retrieval</text>
    <text x="364" y="192" class="node-sublabel" fill="#60a5fa">Analysis: Fast · Deep · ELI5 · Expert</text>
  </g>

  <!-- NODE: Gemini LLM (right top) -->
  <g filter="url(#glow)">
    <rect x="620" y="66" width="128" height="58" rx="10" fill="#1a0e2e" stroke="#a78bfa" stroke-width="1.5"/>
    <rect x="620" y="66" width="128" height="58" rx="10" fill="none" stroke="#a78bfa" stroke-width="3" opacity="0">
      <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="stroke-width" values="2;7;2" dur="2s" repeatCount="indefinite"/>
    </rect>
    <text x="637" y="90" font-size="15" fill="#a78bfa">◈</text>
    <text x="657" y="90" class="node-label" font-weight="600" fill="#e9d5ff">Gemini LLM</text>
    <text x="637" y="107" class="node-sublabel" fill="#c4b5fd">Google AI · Generative</text>
    <text x="637" y="118" class="node-sublabel" fill="#8b949e">Flash 1.5 / Pro</text>
  </g>

  <!-- NODE: ChromaDB (right middle) -->
  <g filter="url(#glow)">
    <rect x="622" y="188" width="126" height="54" rx="10" fill="#0d2318" stroke="#34d399" stroke-width="1.5"/>
    <rect x="622" y="188" width="126" height="54" rx="10" fill="none" stroke="#34d399" stroke-width="3" opacity="0">
      <animate attributeName="opacity" values="0.5;0;0.5" dur="2.8s" repeatCount="indefinite"/>
    </rect>
    <text x="637" y="210" font-size="14" fill="#34d399">⬡</text>
    <text x="655" y="210" class="node-label" font-weight="600" fill="#a7f3d0">ChromaDB</text>
    <text x="637" y="226" class="node-sublabel" fill="#6ee7b7">Vector Store</text>
    <text x="637" y="236" class="node-sublabel" fill="#8b949e">Embedding Search</text>
  </g>

  <!-- NODE: FastAPI (bottom center) -->
  <g filter="url(#glow)">
    <rect x="352" y="248" width="156" height="54" rx="10" fill="#1e1208" stroke="#fb923c" stroke-width="1.5"/>
    <rect x="352" y="248" width="156" height="54" rx="10" fill="none" stroke="#fb923c" stroke-width="3" opacity="0">
      <animate attributeName="opacity" values="0.5;0;0.5" dur="2.2s" repeatCount="indefinite"/>
    </rect>
    <text x="368" y="270" font-size="14" fill="#fb923c">⚙</text>
    <text x="388" y="270" class="node-label" font-weight="600" fill="#fed7aa">FastAPI Backend</text>
    <text x="368" y="286" class="node-sublabel" fill="#fdba74">Python · REST · Docker</text>
    <text x="368" y="296" class="node-sublabel" fill="#8b949e">JWT Auth · Pydantic</text>
  </g>

  <!-- NODE: PostgreSQL (bottom left) -->
  <g filter="url(#glow)">
    <rect x="120" y="238" width="118" height="52" rx="10" fill="#0d1a2d" stroke="#38bdf8" stroke-width="1.4"/>
    <text x="135" y="260" font-size="13" fill="#38bdf8">🗄</text>
    <text x="153" y="260" class="node-label" font-weight="600" fill="#bae6fd">PostgreSQL</text>
    <text x="135" y="276" class="node-sublabel" fill="#7dd3fc">User Data · Sessions</text>
    <text x="135" y="286" class="node-sublabel" fill="#8b949e">History · Auth</text>
  </g>

  <!-- ───── FLOATING DATA PACKETS ───── -->
  <!-- Packet 1: Extension → RAG -->
  <circle r="4" fill="#4f8ef7" opacity="0.9" filter="url(#glow)">
    <animateMotion dur="1.8s" repeatCount="indefinite" path="M 175 106 L 340 150"/>
    <animate attributeName="opacity" values="0;1;1;0" dur="1.8s" repeatCount="indefinite"/>
  </circle>
  <!-- Packet 2: RAG → Gemini -->
  <circle r="4" fill="#a78bfa" opacity="0.9" filter="url(#glow)">
    <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.3s" path="M 490 148 L 635 100"/>
    <animate attributeName="opacity" values="0;1;1;0" dur="1.5s" repeatCount="indefinite" begin="0.3s"/>
  </circle>
  <!-- Packet 3: RAG → Chroma -->
  <circle r="4" fill="#34d399" opacity="0.9" filter="url(#glow)">
    <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.6s" path="M 475 180 L 632 215"/>
    <animate attributeName="opacity" values="0;1;1;0" dur="1.6s" repeatCount="indefinite" begin="0.6s"/>
  </circle>
  <!-- Packet 4: RAG → FastAPI -->
  <circle r="4" fill="#fb923c" opacity="0.9" filter="url(#glow)">
    <animateMotion dur="1.4s" repeatCount="indefinite" begin="0.9s" path="M 430 200 L 430 248"/>
    <animate attributeName="opacity" values="0;1;1;0" dur="1.4s" repeatCount="indefinite" begin="0.9s"/>
  </circle>

  <!-- ───── TITLE + TAGLINE ───── -->
  <text x="430" y="22" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="20" font-weight="800" fill="#e6edf3" filter="url(#glow)">
    ✦ PagePilot — AI Architecture
  </text>
  <text x="430" y="38" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="10" fill="#8b949e">
    RAG · Gemini · LangChain · ChromaDB · FastAPI · React
  </text>

  <!-- Bottom label -->
  <text x="430" y="314" text-anchor="middle" class="node-sublabel" fill="#30363d">DevChiniwala / -PagePilot</text>
</svg>

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