import express, { Request, Response, NextFunction } from "express"; // Added NextFunction for the logger
import cors from "cors";
import "dotenv/config";
import projectsRouter from "./routes/projects";
import qaRouter from "./routes/qa"; // Import from qa.ts (adjust path if needed)
import outlineRouter from "./routes/outline";

const app = express();
const PORT = process.env.PORT || 3000;

/* ──────────────  MIDDLEWARE  ────────────── */
// This is now more specific to allow requests only from your frontend's origin
app.use(cors({
  origin: "http://localhost:8080"
}));
app.use(express.json());

// This is the new logger middleware to help debug 404 errors.
// It will print every incoming request to your backend terminal.
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  next(); // This passes the request to the next handler
});


/* Mount routes */
app.use("/api/projects", projectsRouter);
app.use("/api/qa", qaRouter); // Now correctly mounts qa.ts router
app.use("/api/outline", outlineRouter);

/* ──────────────  HEALTH CHECK  ────────────── */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

/* ──────────────  STUB ENDPOINTS  (Day-2) ────────────── */
// Remove the stub app.post("/api/qa", ...) since real qaRouter handles it

/* GET /api/decktype  – simulated deck-type recommendation */
app.get("/api/decktype", (req: Request, res: Response) => {
  console.log("✅ Hit: GET /api/decktype with query:", req.query);
  res.status(200).json({ decktypeSlug: "investor-dark" });
});

/* POST /api/slides  – start fake deck-generation job */
app.post("/api/slides", (_req: Request, res: Response) => {
  console.log("✅ Hit: POST /api/slides");
  res.status(200).json({ jobId: `job_${Math.random().toString(36).slice(2, 9)}` });
});

/* GET /api/deck/:jobId/status  – poll job status */
app.get("/api/deck/:jobId/status", (req: Request, res: Response) => {
  const { jobId } = req.params;
  console.log(`✅ Hit: GET /api/deck/${jobId}/status`);
  res.status(200).json({
    status: "complete",
    downloadUrl: `https://example.com/decks/${jobId}.pptx`
  });
});

/* ──────────────  SERVER STARTUP  ────────────── */
app.listen(PORT, () => {
  console.log(`🚀 API server is live on http://localhost:${PORT}`);
});