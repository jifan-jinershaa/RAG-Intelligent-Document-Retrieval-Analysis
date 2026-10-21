# RAGLab — Intelligent Document Retrieval & Analysis

An advanced, research-oriented Retrieval-Augmented Generation (RAG) platform developed to evaluate and benchmark how different **chunking granularities** and **hybrid retrieval techniques** affect retrieval recall, ranking precision, and end-to-end latency.

---

## 1. Project Title & Research Problem

- **Title:** *Optimizing Retrieval-Augmented Generation Using Chunking Strategies and Hybrid Search*
- **Application Name:** RAGLab — Intelligent Document Retrieval & Analysis
- **Core Research Question:** *How do different chunking strategies and retrieval techniques affect the accuracy, relevance, and efficiency of Retrieval-Augmented Generation systems?*

### The Scientific Challenge
Standard naive RAG implementations discretize text arbitrarily. Fine-grained character slices often sever dependent linguistic context and cause semantic discontinuity. Conversely, coarse-grained chunks preserve surrounding narrative at the cost of injecting extraneous noise into LLM context windows. In parallel, lexical retrieval (BM25) excels at exact entity, symbol, and acronym matching but suffers under synonymy and paraphrasing. Dense vector representations capture semantic context but miss exact token matches. **RAGLab** systematically analyzes all **nine (9)** combinations of chunking algorithms and retrieval methods to discover empirical Pareto frontiers.

---

## 2. Key Features

1. **Document Management Workspace**:
   - Ingests **PDF** and **TXT** files.
   - Text extraction powered by **PyMuPDF**, tracking page numbers, char counts, and character offsets.
   - Scanned PDF detection explaining OCR limitations.
   - Live text preview, duplicate detection, and persistent SQLite tracking.

2. **Chunking Laboratory (3 Core Algorithms)**:
   - **Method 1: Fixed-Size Chunking**: Configurable character window (default 500 chars) with configurable overlap (default 50 chars).
   - **Method 2: Recursive Chunking**: Hierarchical linguistic splitting via `RecursiveCharacterTextSplitter` respecting paragraphs (`\n\n`), newlines (`\n`), sentence punctuation (`. `), and whitespace (` `).
   - **Method 3: Semantic Chunking**: Embedding-based segmentation using `all-MiniLM-L6-v2`. Computes cosine distance between consecutive sentence vectors and splits at topical boundaries based on configurable similarity thresholds.
   - **Interactive Chunk Cards**: Search within chunks, copy text, inspect character/word counts, and visualize chunk-size distribution histograms.
   - **3-Way Side-by-Side Comparison**: Run Fixed, Recursive, and Semantic on the same document simultaneously to inspect boundary differences.

3. **Hybrid Retrieval Engine**:
   - **BM25 Keyword Search**: Probabilistic TF-IDF term matching via `rank-bm25` (BM25Plus).
   - **Dense Vector Search**: 384-dimensional dense semantic vectors using `all-MiniLM-L6-v2` stored in persistent ChromaDB collections with cosine distance metric.
   - **Hybrid Retrieval (Reciprocal Rank Fusion - RRF)**:
     $$\text{RRF}(d) = \sum_{m \in \{\text{BM25}, \text{Vector}\}} \frac{w_m}{k + \text{rank}_m(d)}$$
     with default $k = 60$, configurable weights, and candidate pool sizes.
   - **Retrieval Playground**: Compare BM25, Vector, and Hybrid side-by-side in a 3-column view.

4. **AI Question Answering (RAG)**:
   - LLM generation powered by **Google Gemini API** (`google.genai` SDK) with configurable models (`gemini-2.5-flash`, `gemini-2.0-flash`).
   - Strict document-grounded system instructions preventing hallucination.
   - Detailed source citations (`[Citation X]`) with interactive snippet inspection.
   - Complete latency breakdown: **Retrieval Latency**, **LLM Generation Latency**, and **Total Response Time**.
   - Graceful fallback: If no API key is provided, retrieved evidence remains accessible with clear setup prompts.

5. **Comparison Laboratory (9 Configurations Benchmark)**:
   Exhaustively tests all nine combinations on identical questions:
   - **C1**: Fixed + BM25
   - **C2**: Fixed + Vector
   - **C3**: Fixed + Hybrid
   - **C4**: Recursive + BM25
   - **C5**: Recursive + Vector
   - **C6**: Recursive + Hybrid
   - **C7**: Semantic + BM25
   - **C8**: Semantic + Vector
   - **C9**: Semantic + Hybrid
   - Automatically identifies and highlights the **Fastest Configuration** and the **Most Accurate Configuration**.

6. **Empirical Evaluation Dashboard**:
   - Benchmarking against labeled ground-truth datasets.
   - Real, calculated evaluation metrics:
     - **Recall@K**
     - **Precision@K**
     - **Mean Reciprocal Rank (MRR)**
     - **Median Query Latency**
   - 6 Interactive Analytics Charts (Recharts):
     1. Recall@K Comparison
     2. Precision@K Comparison
     3. MRR Comparison
     4. Query Latency Comparison
     5. Chunk Size Distribution
     6. Quality vs. Latency Trade-Off Scatter Plot

7. **Experiment Archive & Export**:
   - Persistent experiment tracking in SQLite.
   - One-click export to **CSV** and **JSON**.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts |
| **Backend** | Python 3.14 / 3.13 / 3.12, FastAPI, Uvicorn, Pydantic v2 |
| **Document Processing** | PyMuPDF (`pymupdf`) |
| **Chunking** | LangChain Text Splitters, Custom Semantic Segmentation |
| **Embedding Model** | Sentence Transformers (`all-MiniLM-L6-v2`) |
| **Vector Database** | ChromaDB (Persistent storage) |
| **Keyword Search** | rank-bm25 (`BM25Plus` / `BM25Okapi`) |
| **Language Model** | Google Gemini API (`google.genai` SDK) |
| **Database** | SQLite3 (Persistent relational metadata, experiments, settings) |

---

## 4. Directory Structure

```
raglab/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI lifespan application entrypoint
│   │   ├── api/                     # Modular REST endpoints
│   │   │   ├── dashboard.py         # Summary statistics & system health
│   │   │   ├── documents.py         # PDF/TXT uploads, metadata & deletion
│   │   │   ├── chunking.py          # Fixed, Recursive, Semantic chunking APIs
│   │   │   ├── retrieval.py         # BM25, Vector, Hybrid & 3-column search
│   │   │   ├── rag.py               # Gemini question answering with citations
│   │   │   ├── experiments.py       # 9-Configuration runner, history, exports
│   │   │   ├── evaluation.py        # Dataset benchmark execution & metrics
│   │   │   └── settings_api.py      # Configuration & Gemini API connectivity
│   │   ├── core/
│   │   │   ├── config.py            # App settings & filesystem paths
│   │   │   └── database.py          # SQLite schema, connections & helpers
│   │   ├── schemas/
│   │   │   └── schemas.py           # Typed Pydantic request & response models
│   │   ├── services/
│   │   │   ├── document_service.py  # PyMuPDF extraction & text normalization
│   │   │   ├── chunking_service.py  # 3 chunking algorithms & distribution stats
│   │   │   ├── embedding_service.py # Sentence Transformers singleton
│   │   │   ├── bm25_service.py      # rank-bm25 implementation
│   │   │   ├── vector_service.py    # Persistent ChromaDB vector collections
│   │   │   ├── hybrid_service.py    # Reciprocal Rank Fusion (RRF) algorithm
│   │   │   ├── rag_service.py       # Google GenAI SDK integration & citations
│   │   │   └── evaluation_service.py# Recall@K, Precision@K, MRR & 9-way runner
│   │   └── utils/
│   │       └── sample_data.py       # Preloaded university research paper & test set
│   ├── tests/
│   │   └── test_raglab.py           # 14 automated backend unit & integration tests
│   ├── requirements.txt             # Python dependencies
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx          # Collapsible 9-module navigation bar
│   │   │   └── Navbar.tsx           # Health indicators & Gemini status pill
│   │   ├── pages/
│   │   │   ├── Overview.tsx         # Executive metrics & interactive pipeline
│   │   │   ├── DocumentWorkspace.tsx# Drag-and-drop upload & text preview modal
│   │   │   ├── ChunkingLaboratory.tsx# Chunk inspection & 3-way comparison
│   │   │   ├── RetrievalPlayground.tsx# 3-column BM25 vs Vector vs Hybrid view
│   │   │   ├── AIQuestionAnswering.tsx# RAG answer synthesis & evidence citations
│   │   │   ├── ComparisonLaboratory.tsx# 9-Configuration matrix & latency chart
│   │   │   ├── EvaluationDashboard.tsx# 6 interactive Recharts & metrics
│   │   │   ├── ExperimentHistory.tsx# Past runs & CSV/JSON export
│   │   │   └── SettingsPage.tsx     # Gemini key setup, test connection, defaults
│   │   ├── services/
│   │   │   └── api.ts               # Typed REST API client
│   │   ├── types/
│   │   │   └── index.ts             # Shared TypeScript schemas
│   │   ├── App.tsx                  # Main application orchestrator
│   │   └── index.css                # Dark theme & Tailwind CSS v4 styling
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.app.json
├── data/
│   ├── uploads/                     # Uploaded PDF and TXT files
│   ├── chroma/                      # Persistent ChromaDB vector indices
│   ├── experiments/                 # Export files and benchmark artifacts
│   ├── sample_docs/                 # Sample research documents
│   └── raglab.db                    # Persistent SQLite database
├── start_backend.ps1                # One-click Windows PowerShell backend launcher
├── start_frontend.ps1               # One-click Windows PowerShell frontend launcher
└── README.md
```

---

## 5. Deploying to Render (Cloud Production)

RAGLab is fully configured for deployment on [Render](https://render.com) using either the **Automated Blueprint (`render.yaml`)** or manual dashboard setup.

### Architecture on Render
- **Backend Web Service (`raglab-backend`):** FastAPI Python 3.12 Web Service handling PyMuPDF ingestion, ChromaDB vector indexing, BM25 retrieval, and Gemini inference.
- **Frontend Static Site (`raglab-frontend`):** Vite React Single Page Application served globally with automatic SPA rewrites (`/* -> /index.html`).

---

### Option A: 1-Click Render Blueprint (Recommended)

1. Push your repository changes to GitHub:
   ```bash
   git add .
   git commit -m "Configure RAGLab for Render deployment"
   git push origin main
   ```
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** and select **Blueprint**.
4. Connect your GitHub repository: `RAG-Intelligent-Document-Retrieval-Analysis`.
5. Render detects `render.yaml` automatically and configures:
   - `raglab-backend` (Web Service)
   - `raglab-frontend` (Static Site with automatic URL binding)
6. Enter your `GEMINI_API_KEY` when prompted in the environment variables form.
7. Click **Apply**. Render will deploy both services in dependency order!

---

### Option B: Manual Service Creation in Render

If you prefer to configure each service manually in the Render Dashboard:

#### Step 1: Deploy the Backend Web Service
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name:** `raglab-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Python`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/api/health`
4. Add Environment Variables:
   - `PYTHON_VERSION`: `3.12.8`
   - `DEFAULT_GEMINI_MODEL`: `gemini-2.5-flash`
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key)*
   - `CORS_ORIGINS`: `*`
5. Click **Create Web Service**. Note your backend URL (e.g. `https://raglab-backend.onrender.com`).

#### Step 2: Deploy the Frontend Static Site
1. In Render Dashboard, click **New +** > **Static Site**.
2. Connect the same GitHub repository.
3. Configure settings:
   - **Name:** `raglab-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://raglab-backend.onrender.com` *(Use your actual backend URL from Step 1)*
5. Add Redirects/Rewrites (Under "Redirects / Rewrites"):
   - **Type:** `Rewrite`
   - **Source:** `/*`
   - **Destination:** `/index.html`
6. Click **Create Static Site**.

---

## 6. Getting Started (Local Windows Setup & Execution)

### Prerequisites
- **Python 3.12, 3.13, or 3.14**
- **Node.js 20+** and **npm**

### Step 1: Install Backend Dependencies
In PowerShell:
```powershell
cd C:\Users\USER\.gemini\antigravity\scratch\raglab\backend
python -m pip install -r requirements.txt
```

### Step 2: Install Frontend Dependencies
```powershell
cd C:\Users\USER\.gemini\antigravity\scratch\raglab\frontend
npm install
```

### Step 3: Run the Services

Open two PowerShell windows:

**Terminal 1 — Backend (Port 8000):**
```powershell
cd C:\Users\USER\.gemini\antigravity\scratch\raglab
.\start_backend.ps1
```
*(Or directly: `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload` from `backend`)*

**Terminal 2 — Frontend (Port 5173):**
```powershell
cd C:\Users\USER\.gemini\antigravity\scratch\raglab
.\start_frontend.ps1
```
*(Or directly: `npm run dev` from `frontend`)*

Open your browser to: **http://localhost:5173**

Interactive FastAPI Swagger Documentation is available at: **http://127.0.0.1:8000/docs**

---

## 6. Environment Variables

Configure your credentials via a `.env` file in the `backend/` folder or directly in the UI **Settings** page:

```env
# Optional: Set your Gemini API key here or enter it via the Settings tab
GEMINI_API_KEY=your_gemini_api_key_here

# Supported model choices: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash
DEFAULT_GEMINI_MODEL=gemini-2.5-flash
```

*(Note: If no Gemini API key is configured, all document chunking, BM25 retrieval, vector search, hybrid RRF, 9-configuration comparisons, and evaluation charts will still function completely!)*

---

## 7. Running the Automated Test Suite

A comprehensive test suite with 14 automated tests validates the entire pipeline:
```powershell
cd C:\Users\USER\.gemini\antigravity\scratch\raglab\backend
python -m pytest tests/test_raglab.py -v
```

### Test Coverage Highlights
1. `test_text_cleaning`: Whitespace normalization while preserving paragraph structures.
2. `test_unsupported_file_upload`: Rejection of unsupported file extensions.
3. `test_empty_file_upload`: Detection of empty files.
4. `test_document_upload_and_metadata`: File parsing, page counts, and persistence.
5. `test_fixed_size_chunking`: Character windows and overlap strides.
6. `test_fixed_chunking_invalid_overlap`: Validation preventing overlap $\ge$ chunk size.
7. `test_recursive_chunking`: Paragraph and sentence hierarchy preservation.
8. `test_semantic_chunking`: Topic boundary detection via sentence embedding cosine drops.
9. `test_bm25_retrieval`: Tokenized BM25 ranking and scoring.
10. `test_vector_retrieval`: ChromaDB vector index creation and cosine similarity queries.
11. `test_hybrid_rrf`: Reciprocal Rank Fusion calculation and rank preservation.
12. `test_relevance_matching`: Token-overlap Jaccard and substring alignment.
13. `test_rag_missing_api_key_graceful_fallback`: Safe degradation without hallucinated answers.
14. `test_end_to_end_flow`: Complete Ingestion $\to$ Chunking $\to$ Indexing $\to$ Retrieval $\to$ 9-Config Benchmark $\to$ Deletion.

---

## 8. Live Demonstration Guide

Follow this 7-step workflow during a live technical presentation:

### Demonstration 1: Document Processing
1. Navigate to **Document Workspace**.
2. Notice the preloaded research paper `rag_research_paper.pdf`.
3. Click the **Eye icon** to inspect the extracted text, page boundaries, and character count.
4. Drag and drop any custom PDF or TXT document into the upload dropzone.

### Demonstration 2: Chunking Strategies
1. Navigate to **Chunking Laboratory**.
2. Select **Fixed-Size Chunking** with 500 chars and 50 overlap. Click **Generate Chunks** to view individual cards and the size distribution histogram.
3. Switch to **Recursive Hierarchy**. Notice how paragraph boundaries and complete sentences are maintained.
4. Switch to **Semantic Segmentation**. Notice how chunks group semantically unified sentences based on cosine similarity drops.
5. Switch to the **3-Way Side-by-Side Comparison** tab to display all three strategies on the same document simultaneously.

### Demonstration 3: Retrieval Playground
1. Navigate to **Retrieval Playground**.
2. Ask: *"What is machine learning?"* or *"How does Reciprocal Rank Fusion combine BM25 and vector search?"*
3. Select **Side-by-Side (BM25 vs Vector vs Hybrid)**.
4. Click **Search**.
5. Observe the 3 columns:
   - **BM25**: Highlights exact keyword hits.
   - **Vector Search**: Captures conceptual similarity.
   - **Hybrid RRF**: Shows fused ranks with transparent source rankings.

### Demonstration 4: AI Question Answering (RAG)
1. Navigate to **AI Question Answering**.
2. Ask: *"What is the difference between supervised and unsupervised learning?"*
3. Click **Generate Answer**.
4. Review the grounded answer generated by Gemini.
5. Inspect the citation pills (`[Citation 1]`, `[Citation 2]`) and the latency breakdown (Retrieval vs Generation vs Total).

### Demonstration 5: Nine-Configuration Benchmark
1. Navigate to **Comparison Laboratory**.
2. Run the standardized query across all 9 combinations (C1 through C9).
3. Inspect the comparison table and the real-time latency chart.
4. Identify which configuration achieved the lowest query latency.

### Demonstration 6: Empirical Evaluation Dashboard
1. Navigate to **Evaluation Dashboard**.
2. Select the preloaded **"RAGLab Standard Benchmark"** dataset.
3. Click **Run Dataset Benchmark**.
4. Examine the 6 interactive charts: Recall@K, Precision@K, MRR, Latency, Chunk Distribution, and Quality vs. Latency.
5. Review the summary metrics highlighting the strongest configuration for the dataset.

### Demonstration 7: Exporting Results
1. Navigate to **Experiment History** (or directly in the Evaluation Dashboard).
2. Click **Export CSV** to download the evaluation table for report inclusion or spreadsheet analysis.
3. Click **Export JSON** to export the structured machine-readable experimental log.

---

## 9. Limitations & Future Research

- **Scanned Document OCR**: Current PDF processing relies on PyMuPDF text layers. Scanned bitmap PDFs without OCR layers are identified and rejected with an explicit notice. Future work could integrate Tesseract or a vision encoder.
- **Reranking Models**: Adding cross-encoder neural rerankers (e.g., `bge-reranker-large`) on top of the initial RRF candidate pool.
- **Contextual Chunk Compression**: Dynamic summarization of retrieved passages before LLM prompt injection.
