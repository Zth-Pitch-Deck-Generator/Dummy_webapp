
import express, { Request, Response } from 'express';
import cors from 'cors'; // For allowing cross-origin requests
import 'dotenv/config'; // To load variables from .env file

// --- INITIALIZATION ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
// Enable Cross-Origin Resource Sharing for your frontend (e.g., from localhost:8080)
app.use(cors());
// Enable the express server to parse JSON request bodies
app.use(express.json());

// --- HEALTH CHECK ---
// A simple route to confirm the server is running
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// =======================================================
// --- API STUBS (DUMMY ENDPOINTS FOR DAY 2) ---
// These routes simulate your real API, allowing the frontend to be built in parallel.
// =======================================================

// POST /api/qa - Simulates an AI chat turn and the final outline/SWOT generation
app.post('/api/qa', (req: Request, res: Response) => {
  console.log('✅ Hit: POST /api/qa');
  // Simulate network delay to feel more realistic
  setTimeout(() => {
    res.status(200).json({
      reply: "That's a fantastic starting point! What makes your solution unique?",
      outline: [
        { id: 1, title: 'Problem', bullets: ['The current market solutions are slow and expensive.'] },
        { id: 2, title: 'Solution', bullets: ['Our product is 10x faster and 50% cheaper.'] }
      ],
      swot: {
        strengths: ['Experienced team', 'Proprietary technology'],
        weaknesses: ['New brand, low awareness'],
        opportunities: ['Untapped international markets'],
        threats: ['Potential for new regulations']
      }
    });
  }, 1000); // 1-second delay
});

// GET /api/template - Simulates recommending a template
app.get('/api/template', (req: Request, res: Response) => {
  console.log(`✅ Hit: GET /api/template with query:`, req.query);
  res.status(200).json({ templateSlug: 'investor-dark' });
});

// POST /api/slides - Simulates starting the deck generation job
app.post('/api/slides', (_req: Request, res: Response) => {
  console.log('✅ Hit: POST /api/slides');
  res.status(200).json({ jobId: `job_${Math.random().toString(36).substr(2, 9)}` });
});

// GET /api/deck/:jobId/status - Simulates checking the job status
app.get('/api/deck/:jobId/status', (req: Request, res: Response) => {
  const { jobId } = req.params;
  console.log(`✅ Hit: GET /api/deck/${jobId}/status`);
  res.status(200).json({
    status: 'complete',
    downloadUrl: `https://example.com/decks/${jobId}.pptx`
  });
});


// --- SERVER STARTUP ---
app.listen(PORT, () => {
  console.log(`🚀 API server is live and running on http://localhost:${PORT}`);
});
