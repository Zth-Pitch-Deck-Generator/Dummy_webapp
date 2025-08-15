// api/projects.ts  (wrapper)
import express from 'express';
import projectsRouter from '../backend/routes/projects.ts';

const app = express();
app.use(express.json());
app.use('/', projectsRouter);

// ── fallback so the client never gets HTML ──
interface ErrorResponse {
    error: string;
    message: string;
}

interface ExpressErrorHandler {
    (err: unknown, req: express.Request, res: express.Response<ErrorResponse>, next: express.NextFunction): void;
}

const errorHandler: ExpressErrorHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', message: `${err}` });
};

app.use(errorHandler);

export default app;
