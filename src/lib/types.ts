// Meal-related types for MealsPage integration

export interface Ingredient {
  item: string;
  quantity: string;
}

export interface Meal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  prepTime: string;
  cookTime: string;
  ingredients: Ingredient[];
  recipe: string[];
  explanation?: string;
}

export interface DailyMealPlan {
  date: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
  totalCalories: number;
}

export interface FoodLog {
  id?: string;
  userId: string;
  mealType: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: string;
}
