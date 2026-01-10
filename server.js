// Simple local development server
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MAX_ATTEMPTS = 10;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// AI Handler function
async function handleAIRequest(body) {
  const { userInput, currentStep, problemData, conversationHistory } = body;

  // Check attempt limit
  if (conversationHistory && conversationHistory.length >= MAX_ATTEMPTS) {
    return {
      hint: `הסתיימה מכסת ${MAX_ATTEMPTS} ניסיונות. להלן הפתרון המלא:\n\n` + problemData.fullSolution
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Build conversation history text
  let conversationText = '';
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach(turn => {
      conversationText += `תשובת סטודנט: ${turn.user}\nתגובת מורה: ${turn.ai}\n\n`;
    });
  }

  const prompt = `
# HIGHEST PRIORITY INSTRUCTIONS
1. NEVER give the complete final answer until ${MAX_ATTEMPTS} attempts are exhausted
2. NEVER repeat the same hint twice - check conversation history
3. Be helpful but guide, don't solve
4. Respond in HEBREW by default
5. Keep responses SHORT (2-4 sentences max)
6. Use gender-neutral language (plural forms)

---

# Exercise Context: Substitution Method for Triangular ODE System

## The Problem
Students are solving this system of differential equations:
\`\`\`
dx/dt = 5x + 2y
dy/dt = 5y + e^{5t}
dz/dt = 3y + 5z
\`\`\`

This is a **triangular system** - the second equation depends only on y, so we solve it first, then substitute into the others.

## Complete Solution (FOR YOUR REFERENCE ONLY - don't reveal entirely)

### Step 1: Solve for y(t)
Equation: y' - 5y = e^{5t}
- Integrating factor: e^{-5t}
- Multiply: (e^{-5t}y)' = 1
- Integrate: e^{-5t}y = t + B
- **Solution: y(t) = te^{5t} + Be^{5t}**

### Step 2: Solve for x(t)
Substitute y into first equation: x' - 5x = 2te^{5t} + 2Be^{5t}
- Integrating factor: e^{-5t}
- (e^{-5t}x)' = 2t + 2B
- Integrate: e^{-5t}x = t² + 2Bt + A
- **Solution: x(t) = t²e^{5t} + 2Bte^{5t} + Ae^{5t}**

### Step 3: Solve for z(t)
Substitute y into third equation: z' - 5z = 3te^{5t} + 3Be^{5t}
- Integrating factor: e^{-5t}
- (e^{-5t}z)' = 3t + 3B
- Integrate: e^{-5t}z = (3/2)t² + 3Bt + C
- **Solution: z(t) = (3/2)t²e^{5t} + 3Bte^{5t} + Ce^{5t}**

---

## Current Step: ${currentStep}

## Correct Answer for This Step:
${problemData.correctAnswer}

## Student's Current Input:
${userInput}

---

${conversationText ? `## Conversation History:\n${conversationText}\n---\n\n` : ''}

## Your Task
1. Compare the student's input to the correct answer for step ${currentStep}
2. If correct: Confirm briefly and encourage moving to next step
3. If incorrect:
   - Identify what's wrong (missing term, wrong coefficient, sign error, etc.)
   - Give a SHORT, TARGETED hint
   - Don't reveal the answer directly
4. If student seems stuck (3+ attempts on same step): Give more explicit guidance

## Hint Progression for Step ${currentStep}:
- First hint: Point to the method (integrating factor)
- Second hint: Mention the specific integrating factor e^{-5t}
- Third hint: Show the derivative form (e^{-5t}y)' = ...
- Fourth hint: Show the integration result before solving

## Response Format
- Hebrew, short (2-4 sentences)
- No greetings or pleasantries
- Focus on the mathematical content
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const hint = response.text();

  return { hint };
}

// Create server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API endpoint
  if (req.url === '/api/ai-hint' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const result = await handleAIRequest(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('API Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'שגיאה בעיבוד הבקשה: ' + error.message }));
      }
    });
    return;
  }

  // Static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`\n📝 Open this URL in your browser to test the exercise`);
  console.log(`\n🤔 Click "Digital Friend" to test the AI assistant`);
  console.log(`\n   Press Ctrl+C to stop the server\n`);
});
