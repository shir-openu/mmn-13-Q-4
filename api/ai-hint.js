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
# CRITICAL INSTRUCTIONS
1. Respond in HEBREW only
2. Be PRACTICAL and SPECIFIC - give concrete mathematical guidance
3. Keep responses 2-4 sentences
4. Use gender-neutral language (plural forms)
5. NEVER give the complete final answer until ${MAX_ATTEMPTS} attempts exhausted
6. NEVER repeat the same hint - check conversation history and progress

---

# The Exercise: Triangular ODE System - Substitution Method

## The System:
dx/dt = 5x + 2y
dy/dt = 5y + e^{5t}  ← Start here (depends only on y)
dz/dt = 3y + 5z

## COMPLETE SOLUTIONS (your reference):

**Step 1 - Solve y(t):**
- Equation: y' - 5y = e^{5t} (first-order linear)
- Integrating factor: μ = e^{-5t}
- Multiply both sides: e^{-5t}y' - 5e^{-5t}y = 1
- Left side is derivative: (e^{-5t}y)' = 1
- Integrate: e^{-5t}y = t + B
- ANSWER: y(t) = te^{5t} + Be^{5t} = (t+B)e^{5t}

**Step 2 - Solve x(t):**
- Substitute y: x' - 5x = 2y = 2te^{5t} + 2Be^{5t}
- Integrating factor: μ = e^{-5t}
- (e^{-5t}x)' = 2t + 2B
- Integrate: e^{-5t}x = t² + 2Bt + A
- ANSWER: x(t) = t²e^{5t} + 2Bte^{5t} + Ae^{5t}

**Step 3 - Solve z(t):**
- Substitute y: z' - 5z = 3y = 3te^{5t} + 3Be^{5t}
- Integrating factor: μ = e^{-5t}
- (e^{-5t}z)' = 3t + 3B
- Integrate: e^{-5t}z = (3/2)t² + 3Bt + C
- ANSWER: z(t) = (3/2)t²e^{5t} + 3Bte^{5t} + Ce^{5t}

---

## Current Step: ${currentStep}
## Expected Answer: ${problemData.correctAnswer}
## Student Input: ${userInput}

${conversationText ? `## Previous Conversation:\n${conversationText}` : ''}

---

# SPECIFIC HINTS BY STEP (give progressively):

## If Step 1 (solving y):
- Hint 1: "המשוואה y' - 5y = e^{5t} היא מד״ר מסדר ראשון לינארית. השתמשו בשיטת הגורם האינטגרלי."
- Hint 2: "הגורם האינטגרלי הוא μ = e^{-5t}. הכפילו את שני האגפים בגורם זה."
- Hint 3: "לאחר ההכפלה, האגף השמאלי הופך לנגזרת: (e^{-5t}·y)' = 1"
- Hint 4: "אינטגרו את שני האגפים: e^{-5t}·y = t + B. כעת בודדו את y."

## If Step 2 (solving x):
- Hint 1: "הציבו את y שמצאתם במשוואה הראשונה. תקבלו: x' - 5x = 2y = 2(t+B)e^{5t}"
- Hint 2: "זו שוב מד״ר לינארית עם אותו גורם אינטגרלי: μ = e^{-5t}"
- Hint 3: "לאחר הכפלה: (e^{-5t}·x)' = 2t + 2B"
- Hint 4: "אינטגרו: e^{-5t}·x = t² + 2Bt + A. בודדו את x."

## If Step 3 (solving z):
- Hint 1: "הציבו את y במשוואה השלישית. תקבלו: z' - 5z = 3y = 3(t+B)e^{5t}"
- Hint 2: "שוב, הגורם האינטגרלי הוא μ = e^{-5t}"
- Hint 3: "לאחר הכפלה: (e^{-5t}·z)' = 3t + 3B"
- Hint 4: "אינטגרו: e^{-5t}·z = (3/2)t² + 3Bt + C. בודדו את z."

# COMMON ERRORS TO CHECK:
- Missing the constant of integration (B, A, or C)
- Wrong coefficient (should be 2 for x, 3 for z)
- Missing e^{5t} factor
- Wrong sign
- Forgot to substitute y correctly

# YOUR RESPONSE:
1. If CORRECT: "נכון! [brief confirmation]" and encourage next step
2. If INCORRECT: Identify the specific error and give the appropriate hint from above
3. If student asks for help/hint: Give the next hint in progression
4. After 3+ attempts: Give more explicit guidance, show intermediate steps
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
