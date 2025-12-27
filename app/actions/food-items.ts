// app/actions/food-items.ts
"use server";

import { prisma } from "@/lib/prisma";
import { foodItemSchema, type FoodItemInput } from "@/lib/validations/booking";
import { revalidatePath } from "next/cache";

// Get all available food items (for customers)
export async function getAvailableFoodItems() {
  try {
    const items = await prisma.foodItem.findMany({
      where: { isAvailable: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("Get food items error:", error);
    return { success: false, error: "Failed to fetch food items" };
  }
}

// Get all food items (for admin)
export async function getAllFoodItems() {
  try {
    const items = await prisma.foodItem.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("Get all food items error:", error);
    return { success: false, error: "Failed to fetch food items" };
  }
}

// Get food items by category
export async function getFoodItemsByCategory(category: string) {
  try {
    const items = await prisma.foodItem.findMany({
      where: {
        category,
        isAvailable: true,
      },
      orderBy: { name: "asc" },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("Get food by category error:", error);
    return { success: false, error: "Failed to fetch food items" };
  }
}

// Create food item (admin only)
export async function createFoodItem(input: FoodItemInput) {
  try {
    const validated = foodItemSchema.parse(input);

    const item = await prisma.foodItem.create({
      data: validated,
    });

    revalidatePath("/admin/food-items");
    revalidatePath("/booking");

    return { success: true, data: item };
  } catch (error) {
    console.error("Create food item error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create food item" };
  }
}

// Update food item (admin only)
export async function updateFoodItem(
  id: string,
  input: Partial<FoodItemInput>
) {
  try {
    const validated = foodItemSchema.partial().parse(input);

    const item = await prisma.foodItem.update({
      where: { id },
      data: validated,
    });

    revalidatePath("/admin/food-items");
    revalidatePath("/booking");

    return { success: true, data: item };
  } catch (error) {
    console.error("Update food item error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update food item" };
  }
}

// Delete food item (admin only)
export async function deleteFoodItem(id: string) {
  try {
    await prisma.foodItem.delete({
      where: { id },
    });

    revalidatePath("/admin/food-items");
    revalidatePath("/booking");

    return { success: true, message: "Food item deleted successfully" };
  } catch (error) {
    console.error("Delete food item error:", error);
    return { success: false, error: "Failed to delete food item" };
  }
}

// Toggle food item availability
export async function toggleFoodItemAvailability(id: string) {
  try {
    const item = await prisma.foodItem.findUnique({ where: { id } });

    if (!item) {
      return { success: false, error: "Food item not found" };
    }

    const updated = await prisma.foodItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });

    revalidatePath("/admin/food-items");
    revalidatePath("/booking");

    return { success: true, data: updated };
  } catch (error) {
    console.error("Toggle availability error:", error);
    return { success: false, error: "Failed to update availability" };
  }
}
