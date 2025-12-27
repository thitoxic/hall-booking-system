// app/actions/halls.ts
"use server";

import { prisma } from "@/lib/prisma";
import { hallSchema, type HallInput } from "@/lib/validations/booking";
import { revalidatePath } from "next/cache";

// Get all active halls (for customers)
export async function getActiveHalls() {
  try {
    const halls = await prisma.hall.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: halls };
  } catch (error) {
    console.error("Get halls error:", error);
    return { success: false, error: "Failed to fetch halls" };
  }
}

// Get single hall by ID
export async function getHallById(id: string) {
  try {
    const hall = await prisma.hall.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "PENDING"] },
          },
          select: {
            eventDate: true,
            timeSlot: true,
          },
        },
      },
    });

    if (!hall) {
      return { success: false, error: "Hall not found" };
    }

    return { success: true, data: hall };
  } catch (error) {
    console.error("Get hall error:", error);
    return { success: false, error: "Failed to fetch hall details" };
  }
}

// Get all halls (for admin - includes inactive)
export async function getAllHalls() {
  try {
    const halls = await prisma.hall.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: halls };
  } catch (error) {
    console.error("Get all halls error:", error);
    return { success: false, error: "Failed to fetch halls" };
  }
}

// Create new hall (admin only)
export async function createHall(input: HallInput) {
  try {
    // Validate input
    const validated = hallSchema.parse(input);

    const hall = await prisma.hall.create({
      data: validated,
    });

    revalidatePath("/admin/halls");
    revalidatePath("/halls");

    return { success: true, data: hall };
  } catch (error) {
    console.error("Create hall error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create hall" };
  }
}

// Update hall (admin only)
export async function updateHall(id: string, input: Partial<HallInput>) {
  try {
    // Validate input
    const validated = hallSchema.partial().parse(input);

    const hall = await prisma.hall.update({
      where: { id },
      data: validated,
    });

    revalidatePath("/admin/halls");
    revalidatePath("/halls");
    revalidatePath(`/halls/${id}`);

    return { success: true, data: hall };
  } catch (error) {
    console.error("Update hall error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update hall" };
  }
}

// Delete hall (admin only)
export async function deleteHall(id: string) {
  try {
    // Check if hall has any bookings
    const bookingsCount = await prisma.booking.count({
      where: {
        hallId: id,
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    });

    if (bookingsCount > 0) {
      return {
        success: false,
        error:
          "Cannot delete hall with active bookings. Mark as inactive instead.",
      };
    }

    await prisma.hall.delete({
      where: { id },
    });

    revalidatePath("/admin/halls");
    revalidatePath("/halls");

    return { success: true, message: "Hall deleted successfully" };
  } catch (error) {
    console.error("Delete hall error:", error);
    return { success: false, error: "Failed to delete hall" };
  }
}

// Toggle hall active status (soft delete)
export async function toggleHallStatus(id: string) {
  try {
    const hall = await prisma.hall.findUnique({ where: { id } });

    if (!hall) {
      return { success: false, error: "Hall not found" };
    }

    const updated = await prisma.hall.update({
      where: { id },
      data: { isActive: !hall.isActive },
    });

    revalidatePath("/admin/halls");
    revalidatePath("/halls");

    return { success: true, data: updated };
  } catch (error) {
    console.error("Toggle hall status error:", error);
    return { success: false, error: "Failed to update hall status" };
  }
}

// Check hall availability for a specific date and time slot
export async function checkHallAvailability(
  hallId: string,
  eventDate: Date,
  timeSlot: string
) {
  try {
    const startOfDay = new Date(eventDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(eventDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if there's already a booking for this date and slot
    const existingBooking = await prisma.booking.findFirst({
      where: {
        hallId,
        eventDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: ["CONFIRMED", "PENDING"] },
        OR: [
          { timeSlot: timeSlot },
          { timeSlot: "Full Day" },
          ...(timeSlot === "Full Day"
            ? [{ timeSlot: "Morning" }, { timeSlot: "Evening" }]
            : []),
        ],
      },
    });

    return {
      success: true,
      isAvailable: !existingBooking,
      message: existingBooking
        ? "Hall is already booked for this date and time"
        : "Hall is available",
    };
  } catch (error) {
    console.error("Check availability error:", error);
    return { success: false, error: "Failed to check availability" };
  }
}
