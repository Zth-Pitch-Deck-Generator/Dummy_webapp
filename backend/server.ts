// backend/server.ts
import express, { Request, Response, NextFunction } from "express"; 
import cors from "cors";
import "dotenv/config";
import projectsRouter from "./routes/projects.js";
import qaRouter from "./routes/qa.js";
import outlineRouter from "./routes/outline.js";
import templateRouter from "./routes/template.js";
import generateDeckRouter from "./routes/generate-deck.js";
import notesFeedbackRouter from "./routes/notes-feedback.js";
import investorMockRoomRouter from "./routes/investor-mockroom.js";
import slidesRouter from './routes/slides.js';
import compileDeckRouter from './routes/compile-deck.js';
import { requestLogger } from "./middleware/requestLogger.js";

const app = express();
const PORT = process.env.PORT || 3000;

// --- CORS CONFIGURATION ---
// Allow common local frontend ports dynamically
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
  process.env.FRONTEND_URL // Allow the production URL if set
].filter(Boolean);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true
};

app.use(cors(corsOptions));

// Request logging middleware
app.use(requestLogger);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(express.static('public'));

/* Mount routes */
app.use("/api/projects", projectsRouter);
app.use("/api/qa", qaRouter);
app.use("/api/outline", outlineRouter);
app.use("/api/template", templateRouter);
app.use("/api/generate-deck", generateDeckRouter);
app.use("/api/notes-feedback", notesFeedbackRouter);
app.use("/api/investor-mockroom", investorMockRoomRouter);
app.use('/api/slides', slidesRouter);
app.use('/api/compile-deck', compileDeckRouter);

/* Health Check Endpoint */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* Error Handling Middleware */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack); 
  res.status(500).json({
    error: 'An unexpected server error occurred.',
    message: err.message 
  });
});

/* Server Startup */
app.listen(PORT, () => {
  console.log(`🚀 API server is live on http://localhost:${PORT}`);
});