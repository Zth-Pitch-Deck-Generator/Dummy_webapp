# ZTH - Pitch Deck Builder

A full-stack web application for creating professional pitch decks using AI-powered content generation. The application provides an intuitive interface for building investor-ready presentations with smart templates and interactive Q&A capabilities.

## Features

- **AI-Powered Content Generation**: Automatic slide content creation using Google's Gemini AI
- **Professional Templates**: Pre-built templates optimized for different industries and funding stages
- **Interactive Q&A System**: Practice pitch sessions with AI-generated investor questions
- **Real-time Collaboration**: Multi-step form interface for structured deck creation
- **Export Functionality**: Generate PowerPoint presentations from created decks
- **Responsive Design**: Mobile-friendly interface built with modern UI components

## Screenshots

> **Note:** The screenshots shown below are for reference and demonstration purposes only. They may not represent the final version of the user interface, as the application is under active development and the UI is subject to ongoing updates and improvements. Please consider these as examples of the application's functionality rather than the definitive visual design.


![Screenshot 1](/screenshots/Screenshot1.png)

![Screenshot 2](/screenshots/Screenshot2.png)

![Screenshot 3](/screenshots/Screenshot3.png)

![Screenshot 4](/screenshots/Screenshot4.png)

## Color Palette

The application uses a professional blue-based color scheme designed to maintain trust and credibility while providing excellent readability and accessibility.

### Primary Colors
- **Bright Blue (Buttons, Highlights)**: `#2563eb` - Used for primary actions, brand elements, and highlights
- **Dark Navy (Primary Text)**: `#1e293b` - Main text color for headings and important content
- **Deep Navy (Secondary Text)**: `#182436` - Secondary text and darker variations

### Background Colors
- **Pure White**: `#ffffff` - Main background color
- **Light Blue Gradients**: Used for subtle background variations
  - `#f8fbff` - Very light blue for backgrounds
  - `#f0f7ff` - Light blue tint for surfaces
  - `#f6faff` - Subtle blue background
  - `#f2f8ff` - Card backgrounds
  - `#f4f9ff` - Input backgrounds
  - `#f7fbff` - Elevated surfaces
  - `#f6f9fd` - Alternative background

### Neutral Colors
- **Light Gray (Borders, Subtle Backgrounds)**: `#f4f5f7` - Border colors and subtle backgrounds
- **Soft Gray**: `#f5f6f8` - Muted backgrounds and disabled states
- **Near White**: `#fcfcfc` - Very light backgrounds

### CSS Custom Properties
The colors are implemented using CSS custom properties in `src/index.css` for easy maintenance and dark mode support:

```css
:root {
  --brand: 214 88% 58%;           /* #2563eb */
  --text-primary: 222 47% 11%;    /* #1e293b */
  --text-secondary: 221 39% 11%;  /* #1e293b variation */
  --background: 0 0% 100%;        /* #ffffff */
  --surface: 210 100% 99%;        /* #f8fbff */
  /* ... additional properties */
}
```

### Usage Guidelines
- Use **Bright Blue** for primary actions (buttons, links, active states)
- Use **Dark Navy** for main content and headings
- Use **Light Blue Gradients** for backgrounds and subtle accents
- Use **Neutral Grays** for borders, dividers, and secondary content
- Maintain proper contrast ratios for accessibility (minimum 4.5:1 for normal text)

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and dev server
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Radix UI** primitives
- **React Router DOM** for navigation
- **React Hook Form** with Zod validation
- **Framer Motion** for animations

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Supabase** for database operations
- **Google Generative AI** (Gemini) for content generation
- **PPTXGenJS** for PowerPoint file generation
- **CORS** enabled for cross-origin requests

## Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- Supabase account and project
- Google AI API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**

   Create a `.env` file in the root directory with the following variables:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Google AI Configuration
   GOOGLE_AI_API_KEY=your_google_ai_api_key

   # Server Configuration
   PORT=3000
   ```

4. **Database Setup**

   Set up your Supabase database with the required tables. The application expects tables for:
   - Projects
   - Outlines
   - Templates
   - Q&A sessions

## Development

### Start the development server

Run both frontend and backend simultaneously:
```bash
npm run dev
```

This command runs:
- Frontend on `http://localhost:5173`
- Backend API on `http://localhost:3000`

### Individual development servers

**Frontend only:**
```bash
npm run dev:ui
```

**Backend only:**
```bash
npm run dev:api
```

## Build and Deployment

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Development Build
```bash
npm run build:dev
```

## Project Structure

```
├── backend/
│   ├── routes/           # API route handlers
│   ├── lib/             # Utility functions and AI integration
│   ├── qa-configs/      # Q&A configuration templates
│   ├── server.ts        # Express server setup
│   └── supabase.ts      # Database configuration
├── src/
│   ├── components/      # Reusable React components
│   │   ├── ui/         # shadcn/ui components
│   │   └── ...         # Custom components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Frontend utilities
│   ├── pages/          # Page components
│   └── main.tsx        # Application entry point
├── public/             # Static assets
└── ...                 # Configuration files
```

## API Endpoints

The backend provides the following API endpoints:

- `POST /api/projects` - Create and manage projects
- `POST /api/outline` - Generate deck outlines
- `GET /api/template` - Fetch available templates
- `POST /api/qa` - Handle Q&A sessions
- `POST /api/generate-deck` - Generate PowerPoint files
- `GET /api/deck/:id` - Retrieve generated deck files

## Configuration Files

- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `nodemon.json` - Backend development server configuration
- `components.json` - shadcn/ui component configuration

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOi...` |
| `GOOGLE_AI_API_KEY` | Google AI API key | `AIzaSy...` |
| `PORT` | Backend server port | `3000` |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is private and proprietary. All rights reserved.

## Support

For issues and questions, please create an issue in the repository or contact the development team.

