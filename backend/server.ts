import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";

import projectsRouter from "./routes/projects";

const app  = express();
const PORT = process.env.PORT || 3000;

/* ──────────────  MIDDLEWARE  ────────────── */
app.use(cors());
app.use(express.json());

/* Mount project CRUD routes just once */
app.use("/api/projects", projectsRouter);

/* ──────────────  HEALTH CHECK  ────────────── */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

/* ──────────────  STUB ENDPOINTS  (Day-2) ────────────── */

/* POST /api/qa  – simulated chat turn */
app.post("/api/qa", (_req: Request, res: Response) => {
  console.log("✅ Hit: POST /api/qa");
  setTimeout(() => {
    res.status(200).json({
      reply:   "That's a fantastic starting point! What makes your solution unique?",
      outline: [
        { id: 1, title: "Problem",  bullets: ["The current market solutions are slow and expensive."] },
        { id: 2, title: "Solution", bullets: ["Our product is 10× faster and 50 % cheaper."] }
      ],
      swot: {
        strengths:    ["Experienced team", "Proprietary technology"],
        weaknesses:   ["New brand, low awareness"],
        opportunities:["Untapped international markets"],
        threats:      ["Potential for new regulations"]
      }
    });
  }, 1_000);
});

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
    status:      "complete",
    downloadUrl: `https://example.com/decks/${jobId}.pptx`
  });
});

/* ──────────────  SERVER STARTUP  ────────────── */
app.listen(PORT, () => {
  console.log(`🚀 API server is live on http://localhost:${PORT}`);
});
