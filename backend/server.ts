// backend/server.ts
import express, { Request, Response, NextFunction } from "express"; // Import types
import cors from "cors";
import "dotenv/config";
import projectsRouter from "./routes/projects.js";
import qaRouter from "./routes/qa.js";
import outlineRouter from "./routes/outline.js";
import templateRouter from "./routes/template.js";
import generateDeckRouter from "./routes/generate-deck.js";
import deckRouter from "./routes/deck.js";
import investorMockRoomRouter from "./routes/investor-mockroom.js";

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(express.static('public'));

/* Mount routes */
app.use("/api/projects", projectsRouter);
app.use("/api/qa", qaRouter);
app.use("/api/outline", outlineRouter);
app.use("/api/template", templateRouter);
app.use("/api/generate-deck", generateDeckRouter);
app.use("/api/deck", deckRouter);
app.use("/api/investor-mockroom", investorMockRoomRouter);

/* Health Check Endpoint */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* --- THE FIX: Enhanced Error Handling Middleware --- */
// This middleware ensures that ANY unhandled error in the application
// will still return a clean JSON response.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); // Log the full error for debugging
  res.status(500).json({
    error: 'An unexpected server error occurred.',
    message: err.message // Provide the error message
  });
});

/* Server Startup */
app.listen(PORT, () => {
  console.log(`🚀 API server is live on http://localhost:${PORT}`);
});