// app/actions/themes.ts
"use server";

import { prisma } from "@/lib/prisma";
import { themeSchema, type ThemeInput } from "@/lib/validations/booking";
import { revalidatePath } from "next/cache";

// Get all available themes (for customers)
export async function getAvailableThemes() {
  try {
    const themes = await prisma.theme.findMany({
      where: { isAvailable: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: themes };
  } catch (error) {
    console.error("Get themes error:", error);
    return { success: false, error: "Failed to fetch themes" };
  }
}

// Get all themes (for admin)
export async function getAllThemes() {
  try {
    const themes = await prisma.theme.findMany({
      orderBy: { name: "asc" },
    });
    return { success: true, data: themes };
  } catch (error) {
    console.error("Get all themes error:", error);
    return { success: false, error: "Failed to fetch themes" };
  }
}

// Get theme by ID
export async function getThemeById(id: string) {
  try {
    const theme = await prisma.theme.findUnique({
      where: { id },
    });

    if (!theme) {
      return { success: false, error: "Theme not found" };
    }

    return { success: true, data: theme };
  } catch (error) {
    console.error("Get theme error:", error);
    return { success: false, error: "Failed to fetch theme" };
  }
}

// Create theme (admin only)
export async function createTheme(input: ThemeInput) {
  try {
    const validated = themeSchema.parse(input);

    const theme = await prisma.theme.create({
      data: validated,
    });

    revalidatePath("/admin/themes");
    revalidatePath("/booking");

    return { success: true, data: theme };
  } catch (error) {
    console.error("Create theme error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create theme" };
  }
}

// Update theme (admin only)
export async function updateTheme(id: string, input: Partial<ThemeInput>) {
  try {
    const validated = themeSchema.partial().parse(input);

    const theme = await prisma.theme.update({
      where: { id },
      data: validated,
    });

    revalidatePath("/admin/themes");
    revalidatePath("/booking");

    return { success: true, data: theme };
  } catch (error) {
    console.error("Update theme error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update theme" };
  }
}

// Delete theme (admin only)
export async function deleteTheme(id: string) {
  try {
    await prisma.theme.delete({
      where: { id },
    });

    revalidatePath("/admin/themes");
    revalidatePath("/booking");

    return { success: true, message: "Theme deleted successfully" };
  } catch (error) {
    console.error("Delete theme error:", error);
    return { success: false, error: "Failed to delete theme" };
  }
}

// Toggle theme availability
export async function toggleThemeAvailability(id: string) {
  try {
    const theme = await prisma.theme.findUnique({ where: { id } });

    if (!theme) {
      return { success: false, error: "Theme not found" };
    }

    const updated = await prisma.theme.update({
      where: { id },
      data: { isAvailable: !theme.isAvailable },
    });

    revalidatePath("/admin/themes");
    revalidatePath("/booking");

    return { success: true, data: updated };
  } catch (error) {
    console.error("Toggle availability error:", error);
    return { success: false, error: "Failed to update availability" };
  }
}
