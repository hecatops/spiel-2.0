# Spiel

A cozy pixel-art RPG adventure game. You write the premise, the story writes itself.

**Stack:** React + Vite (Vercel) · FastAPI (Render) · Groq (Llama 3.1 8b Instruct)

---

## Project Structure

```
spiel/
├── backend/
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── index.css
    │   └── components/
    │       ├── Intro.jsx / .module.css
    │       ├── StoryView.jsx / .module.css
    │       ├── DialogueBox.jsx / .module.css
    │       ├── PixelScene.jsx
    │       ├── SunsetEnding.jsx
    │       └── useTypewriter.js
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
export GROQ_API_KEY=your_key_here
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp .env.example .env # Edit VITE_APP_URL with backend serivce URL
npm install
npm run dev
```

## How the Story Works

- Turns 1–3: World-building and setup
- Turns 4–7: Rising stakes and adventure
- Turns 8–10: Climax
- Turn 11+: Story concludes, sunset animation plays

Each segment is 60–90 words, written in second person, with 3 meaningfully different choices at each turn.
