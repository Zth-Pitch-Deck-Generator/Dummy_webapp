// backend/server.ts
import express from "express";
import cors from "cors";
import "dotenv/config";
import projectsRouter from "./routes/projects.js";
import qaRouter from "./routes/qa.js";
import outlineRouter from "./routes/outline.js";
import templateRouter from "./routes/template.js";
import generateDeckRouter from "./routes/generate-deck.js"; // Import the new router

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: '*', 
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from the 'public' directory, including our temp decks
app.use(express.static('public'));

/* Mount routes */
app.use("/api/projects", projectsRouter);
app.use("/api/qa", qaRouter);
app.use("/api/outline", outlineRouter);
app.use("/api/template", templateRouter);
app.use("/api/generate-deck", generateDeckRouter); // Use the new deck generation router

/* Health Check Endpoint */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* Server Startup */
app.listen(PORT, () => {
  console.log(`🚀 API server is live on http://localhost:${PORT}`);
});
