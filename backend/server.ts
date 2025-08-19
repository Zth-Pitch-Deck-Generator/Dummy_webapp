// backend/server.ts
import express from "express";
import cors from "cors";
import "dotenv/config";
import projectsRouter from "./routes/projects.js";
import qaRouter from "./routes/qa.js";
import outlineRouter from "./routes/outline.js";
import templateRouter from "./routes/template.js";
import slidesRouter from "./routes/slides.js"; // Import the new slides router

const app = express();
const PORT = process.env.PORT || 3000;

// A basic CORS setup for development
const corsOptions = {
  origin: '*', // Allow all origins for simplicity in this example
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());


/* Mount routes */
app.use("/api/projects", projectsRouter);
app.use("/api/qa", qaRouter);
app.use("/api/outline", outlineRouter);
app.use("/api/template", templateRouter);
app.use("/api/slides", slidesRouter); // This line delegates /api/slides requests to slidesRouter

/* Health Check Endpoint */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* Server Startup */
app.listen(PORT, () => {
  console.log(`🚀 API server is live on http://localhost:${PORT}`);
});
