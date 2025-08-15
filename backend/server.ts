import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import projectsRouter from "./routes/projects.js";
import qaRouter from "./routes/qa.js";
import outlineRouter from "./routes/outline.js";

const app = express();
const PORT = process.env.PORT || 3000;

// --- Your frontend URLs ---
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'https://zthapimodel.vercel.app' // Add your Vercel URL here
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());


/* Mount routes */
app.use("/api/projects", projectsRouter);
app.use("/api/qa", qaRouter);
app.use("/api/outline", outlineRouter);

/* ────────────── HEALTH CHECK ────────────── */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

/* ────────────── STUB ENDPOINTS (Day-2) ────────────── */
app.get("/api/decktype", (req: Request, res: Response) => {
  console.log("✅ Hit: GET /api/decktype with query:", req.query);
  res.status(200).json({ decktypeSlug: "investor-dark" });
});

app.post("/api/slides", (_req: Request, res: Response) => {
  console.log("✅ Hit: POST /api/slides");
  res.status(200).json({ jobId: `job_${Math.random().toString(36).slice(2, 9)}` });
});

app.get("/api/deck/:jobId/status", (req: Request, res: Response) => {
  const { jobId } = req.params;
  console.log(`✅ Hit: GET /api/deck/${jobId}/status`);
  res.status(200).json({
    status: "complete",
    downloadUrl: `https://example.com/decks/${jobId}.pptx`
  });
});

/* ────────────── SERVER STARTUP ────────────── */
app.listen(PORT, () => {
  console.log(`🚀 API server is live on http://localhost:${PORT}`);
});