# MMN-13-Q-4: Digital Friend for ODE Exercise

This project adds an AI-powered "Digital Friend" to help students solve a system of differential equations using the substitution method.

## Project Structure

```
mmn-13-Q-4/
├── api/
│   └── ai-hint.js      # Serverless function for Gemini AI
├── .env                 # API key (DO NOT commit to git!)
├── .gitignore          # Excludes .env and node_modules
├── index.html          # Main exercise page with DF button
├── package.json        # Node.js dependencies
├── vercel.json         # Vercel configuration
└── README.md           # This file
```

## Local Development

### Prerequisites
- Node.js (version 18 or higher)
- npm (comes with Node.js)

### Setup Steps

1. **Open terminal/command prompt in the project folder**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run locally:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   - Go to: http://localhost:3000

### Testing the Digital Friend
1. Enter values in the input fields
2. Click the "Digital Friend" button (🧐)
3. The AI will analyze your answer and provide guidance

## Deployment to Vercel

1. Push to GitHub (make sure .env is in .gitignore!)
2. Import project in Vercel
3. Add environment variable: `GOOGLE_API_KEY` = your API key
4. Deploy

## The Exercise

Solve the triangular ODE system:
- dx/dt = 5x + 2y
- dy/dt = 5y + e^(5t)
- dz/dt = 3y + 5z

Using the substitution method (solve y first, then substitute).
