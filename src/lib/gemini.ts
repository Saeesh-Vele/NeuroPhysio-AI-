// Gemini-powered meal plan generation
// Uses the existing VITE_GEMINI_API_KEY from the project

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

async function callGemini(prompt: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) {
      if (res.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (res.status === 429) {
        throw new Error("AI is busy. Please try again in a moment.");
      }
      throw new Error(`Gemini API error: ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  return "";
}

export async function generateMealPlan(context: string): Promise<string> {
  const prompt = `You are a certified nutritionist AI. Generate a complete daily meal plan based on this user profile:

${context}

Return ONLY valid JSON (no markdown, no explanation, no code fences) with this exact structure. Every meal (breakfast, lunch, dinner, snack) MUST have ALL the listed fields:

{
  "date": "YYYY-MM-DD",
  "totalCalories": 2000,
  "breakfast": {
    "name": "Meal name",
    "calories": 500,
    "protein": 25,
    "carbs": 60,
    "fats": 15,
    "prepTime": "10 min",
    "cookTime": "15 min",
    "ingredients": [{"item": "Ingredient 1", "quantity": "100g"}, {"item": "Ingredient 2", "quantity": "50g"}],
    "recipe": ["Step 1: Do something", "Step 2: Do something else"],
    "explanation": "Why this meal suits the user"
  },
  "lunch": {
    "name": "Meal name",
    "calories": 600,
    "protein": 30,
    "carbs": 70,
    "fats": 20,
    "prepTime": "10 min",
    "cookTime": "20 min",
    "ingredients": [{"item": "Ingredient 1", "quantity": "100g"}],
    "recipe": ["Step 1: Do something"],
    "explanation": "Why this meal suits the user"
  },
  "dinner": {
    "name": "Meal name",
    "calories": 600,
    "protein": 30,
    "carbs": 65,
    "fats": 20,
    "prepTime": "15 min",
    "cookTime": "25 min",
    "ingredients": [{"item": "Ingredient 1", "quantity": "100g"}],
    "recipe": ["Step 1: Do something"],
    "explanation": "Why this meal suits the user"
  },
  "snack": {
    "name": "Snack name",
    "calories": 200,
    "protein": 10,
    "carbs": 25,
    "fats": 8,
    "prepTime": "5 min",
    "cookTime": "0 min",
    "ingredients": [{"item": "Ingredient 1", "quantity": "50g"}],
    "recipe": ["Step 1: Do something"],
    "explanation": "Why this snack suits the user"
  }
}

Rules:
- All values must be realistic and nutritionally balanced
- Match the user's dietary preferences, allergies, and cuisine choice
- Keep within their calorie goals based on BMI and activity level
- Include prep/cook times matching their preferred cooking time
- Make recipes practical and easy to follow
- Do NOT use any special characters or line breaks inside string values`;

  return callGemini(prompt);
}

export async function regenerateSingleMeal(
  mealType: string,
  context: string,
  currentPlan: string
): Promise<string> {
  const prompt = `You are a certified nutritionist AI. The user wants to swap their ${mealType} meal.

User profile: ${context}

Current meal plan: ${currentPlan}

Generate ONLY a replacement ${mealType} in valid JSON format (no markdown):
{
  "name": "...",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fats": number,
  "prepTime": "X min",
  "cookTime": "X min",
  "ingredients": [{"item": "...", "quantity": "..."}],
  "recipe": ["Step 1...", "Step 2..."],
  "explanation": "Why this replacement is better"
}

Make it different from the current ${mealType} but keep similar calorie range.`;

  return callGemini(prompt);
}
