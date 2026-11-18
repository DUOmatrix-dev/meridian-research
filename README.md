[README-meridian.md](https://github.com/user-attachments/files/35007258/README-meridian.md)
 Meridian Research

An AI-powered market intelligence workbench for researching emerging trends, sizing markets, mapping competitors, scouting technologies, and tracking strategic signals.

 Features

- Generate AI-assisted trend briefs, market maps, opportunity assessments, and technology scouting reports.
- Research with Gemini, Google Search grounding, and URL context.
- Explore TAM, SAM, SOM, CAGR, adoption curves, and market segments.
- Visualize competitor positioning and compare market players.
- Track technology, regulatory, and lifecycle signals with a watchlist.
- Save, archive, and export research briefs as PDF, Markdown, text, or JSON.
- Sign in with Google to sync briefs and watchlists through Firebase.
- Use local browser storage when not signed in.
- Switch between light and dark themes.

 Tech Stack

- React 19 and TypeScript
- Vite and Express
- Google Gemini API (`@google/genai`)
- Firebase Authentication and Cloud Firestore
- Tailwind CSS
- Recharts, Motion, and jsPDF

 Getting Started

 Requirements

- Node.js and npm
- A Gemini API key
- Firebase project configuration for Google sign-in and cloud synchronization

 Install

```bash
git clone https://github.com/YOUR-USERNAME/meridian-research.git
cd meridian-research
npm install
```

Create a `.env` file using `.env.example` and add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

Configure the Firebase settings in `firebase-applet-config.json` and deploy the Firestore security rules from `firestore.rules` to your Firebase project.

 Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Express server and Vite development environment. |
| `npm run build` | Builds the frontend for production. |
| `npm run preview` | Previews the production build. |
| `npm run lint` | Runs the TypeScript checks. |

 Project Structure

```text
meridian-research/
├── src/
│   ├── components/       # Research workspace, charts, watchlist and reports
│   ├── data/             # Example research briefs and watchlist signals
│   ├── lib/              # Firebase integration and report exports
│   ├── types/            # Shared TypeScript data models
│   ├── App.tsx           # Main application and workspace state
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── server.ts             # Express API and Gemini research endpoints
├── firestore.rules       # Firestore access-control rules
├── security_spec.md      # Firestore security requirements
├── .env.example          # Environment variable template
├── package.json
├── vite.config.ts
└── README.md
```

Security Notes

- Keep `.env` and all API keys private. Never commit production secrets.
- Review and deploy `firestore.rules` before enabling cloud data storage.
- Treat AI-generated research, estimates, and forecasts as analysis to be independently verified against cited sources.

 License

No project license is currently specified. Add a license only if you have the rights to distribute the code and included assets.
