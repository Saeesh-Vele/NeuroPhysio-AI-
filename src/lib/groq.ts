import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function generateMealPlan(context: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a certified nutrition AI. Return ONLY valid JSON. No markdown, no explanation, no code fences.",
        },
        {
          role: "user",
          content: `Generate a complete daily meal plan based on this user profile:

${context}

Return ONLY valid JSON with this exact structure:
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
    "ingredients": [{"item": "Ingredient 1", "quantity": "100g"}],
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
- Do NOT use any special characters or line breaks inside string values`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes("rate_limit")) {
      throw new Error("AI is busy. Please try again in a moment.");
    }
    throw err;
  }
}

export async function regenerateSingleMeal(
  mealType: string,
  context: string,
  currentPlan: string
): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a certified nutrition AI. Return ONLY valid JSON. No markdown, no explanation, no code fences.",
        },
        {
          role: "user",
          content: `The user wants to swap their ${mealType} meal.

User profile: ${context}

Current meal plan: ${currentPlan}

Generate ONLY a replacement ${mealType} in valid JSON:
{
  "name": "Meal name",
  "calories": 500,
  "protein": 25,
  "carbs": 60,
  "fats": 15,
  "prepTime": "10 min",
  "cookTime": "15 min",
  "ingredients": [{"item": "Ingredient", "quantity": "100g"}],
  "recipe": ["Step 1: Do something"],
  "explanation": "Why this replacement is better"
}

Make it different from the current ${mealType} but keep similar calorie range.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes("rate_limit")) {
      throw new Error("AI is busy. Please try again in a moment.");
    }
    throw err;
  }
}
