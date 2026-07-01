# Personalized Networking Assistant

This project has a FastAPI backend and a Vite/React frontend.

## Tech Stack

- Backend: FastAPI, SQLAlchemy, SQLite
- Frontend: React, Vite
- AI services: Transformers-based theme extraction and topic generation
- Testing: pytest
- Containers: Docker, Docker Compose

## Project Structure

```text
networking-assistant/
├── app/
│   ├── main.py
│   ├── routes/
│   └── services/
├── frontend-react/
│   ├── public/
│   ├── src/
│   └── .env.example
├── tests/
├── data/
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

## Local Setup

Requirements:

- Python 3.10+ (3.11 recommended)
- Node.js 20+

1. Create and activate a Python virtual environment.

   ```bash
   python -m venv .venv

   # Windows
   .venv\Scripts\activate
   ```

2. Install backend dependencies.

   ```bash
   pip install -r requirements.txt
   ```

3. Copy backend environment variables.

   ```bash
   cp .env.example .env
   ```

4. Copy frontend environment variables.

   ```bash
   cp frontend-react/.env.example frontend-react/.env
   ```

5. Install frontend dependencies.

   ```bash
   cd frontend-react
   npm install
   ```

## Running Locally

Backend:

```bash
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs

Frontend:

```bash
cd frontend-react
npm run dev
```

- Frontend dev server: http://127.0.0.1:5173
- The frontend uses `VITE_BACKEND_URL`, which defaults to `http://127.0.0.1:8000`

## Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:5174
- Backend: http://localhost:8000
- Docs: http://localhost:8000/docs

Stop containers:

```bash
docker compose down
```

## Tests

```bash
pytest
```
