// api/ai-hint.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const MAX_ATTEMPTS = 10;

export default async function handler(req, res) {
  // CORS headers - allow local development and future GitHub Pages
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://shir-openu.github.io'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userInput, currentStep, problemData, conversationHistory } = req.body;

  // Check attempt limit
  if (conversationHistory && conversationHistory.length >= MAX_ATTEMPTS) {
    return res.status(200).json({
      hint: `הסתיימה מכסת ${MAX_ATTEMPTS} ניסיונות. להלן הפתרון המלא:\n\n` + problemData.fullSolution
    });
  }

  try {
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
- Use LaTeX notation when helpful: \\( ... \\)
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const hint = response.text();

    return res.status(200).json({ hint });

  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({
      error: 'שגיאה בעיבוד הבקשה. נסו שוב.'
    });
  }
}
