// api/projects.ts
import express from 'express'
import projectsRouter from '../backend/routes/projects.ts'   // ← your current file

const app = express()
app.use(express.json())      // body-parser
app.use('/', projectsRouter) // router already defines POST '/'

export default app           // Vercel wraps this Express app as a function
