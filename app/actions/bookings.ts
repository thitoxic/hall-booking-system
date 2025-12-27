// app/actions/bookings.ts
"use server";

import { prisma } from "@/lib/prisma";
import { bookingSchema, type BookingInput } from "@/lib/validations/booking";
import { revalidatePath } from "next/cache";

// Helper function to generate unique booking number
function generateBookingNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `BK${year}${month}${day}${random}`;
}

// Helper function to calculate total amount
function calculateTotalAmount(
  hallBasePrice: number,
  selectedFoods: Array<{ quantity: number; price: number }>,
  selectedTheme?: { price: number }
): number {
  const foodTotal = selectedFoods.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const themePrice = selectedTheme?.price || 0;
  return hallBasePrice + foodTotal + themePrice;
}

// Create booking (customer)
export async function createBooking(userId: string, input: BookingInput) {
  try {
    // Validate input
    const validated = bookingSchema.parse(input);

    // Check hall availability
    const availability = await prisma.booking.findFirst({
      where: {
        hallId: validated.hallId,
        eventDate: {
          gte: new Date(validated.eventDate.setHours(0, 0, 0, 0)),
          lte: new Date(validated.eventDate.setHours(23, 59, 59, 999)),
        },
        status: { in: ["CONFIRMED", "PENDING"] },
        OR: [
          { timeSlot: validated.timeSlot },
          { timeSlot: "Full Day" },
          ...(validated.timeSlot === "Full Day"
            ? [{ timeSlot: "Morning" }, { timeSlot: "Evening" }]
            : []),
        ],
      },
    });

    if (availability) {
      return {
        success: false,
        error: "Hall is not available for selected date and time",
      };
    }

    // Get hall details for pricing
    const hall = await prisma.hall.findUnique({
      where: { id: validated.hallId },
    });

    if (!hall) {
      return { success: false, error: "Hall not found" };
    }

    // Calculate total amount
    const totalAmount = calculateTotalAmount(
      hall.basePrice,
      validated.selectedFoods,
      validated.selectedTheme
    );

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        bookingNumber: generateBookingNumber(),
        userId,
        hallId: validated.hallId,
        eventDate: validated.eventDate,
        timeSlot: validated.timeSlot,
        guestCount: validated.guestCount,
        eventType: validated.eventType,
        selectedFoods: validated.selectedFoods,
        selectedTheme: validated.selectedTheme || null,
        totalAmount,
        customerDetails: validated.customerDetails,
        specialRequests: validated.specialRequests,
        status: "PENDING",
        paymentStatus: "PENDING",
      },
      include: {
        hall: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath("/my-bookings");
    revalidatePath("/admin/bookings");

    return { success: true, data: booking };
  } catch (error) {
    console.error("Create booking error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create booking" };
  }
}

// Get user's bookings
export async function getMyBookings(userId: string) {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        hall: {
          select: {
            name: true,
            images: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: bookings };
  } catch (error) {
    console.error("Get my bookings error:", error);
    return { success: false, error: "Failed to fetch bookings" };
  }
}

// Get single booking
export async function getBookingById(id: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        hall: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    return { success: true, data: booking };
  } catch (error) {
    console.error("Get booking error:", error);
    return { success: false, error: "Failed to fetch booking" };
  }
}

// Get all bookings (admin)
export async function getAllBookings() {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        hall: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: bookings };
  } catch (error) {
    console.error("Get all bookings error:", error);
    return { success: false, error: "Failed to fetch bookings" };
  }
}

// Update booking status (admin)
export async function updateBookingStatus(
  id: string,
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
) {
  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/my-bookings");

    return { success: true, data: booking };
  } catch (error) {
    console.error("Update booking status error:", error);
    return { success: false, error: "Failed to update booking status" };
  }
}

// Update payment status (after payment)
export async function updatePaymentStatus(
  id: string,
  paymentStatus: "PENDING" | "PAID" | "PARTIAL" | "FAILED" | "REFUNDED",
  paymentId?: string
) {
  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        paymentStatus,
        paymentId,
        ...(paymentStatus === "PAID" && { status: "CONFIRMED" }),
      },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/my-bookings");

    return { success: true, data: booking };
  } catch (error) {
    console.error("Update payment status error:", error);
    return { success: false, error: "Failed to update payment status" };
  }
}

// Cancel booking
export async function cancelBooking(id: string, reason?: string) {
  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        specialRequests: reason
          ? `${reason} (Cancellation reason)`
          : "Cancelled by user",
      },
    });

    revalidatePath("/admin/bookings");
    revalidatePath("/my-bookings");

    return { success: true, data: booking };
  } catch (error) {
    console.error("Cancel booking error:", error);
    return { success: false, error: "Failed to cancel booking" };
  }
}

// Get booking statistics (admin dashboard)
export async function getBookingStats() {
  try {
    const [totalBookings, confirmedBookings, pendingBookings, totalRevenue] =
      await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({ where: { status: "CONFIRMED" } }),
        prisma.booking.count({ where: { status: "PENDING" } }),
        prisma.booking.aggregate({
          where: { paymentStatus: "PAID" },
          _sum: { totalAmount: true },
        }),
      ]);

    return {
      success: true,
      data: {
        totalBookings,
        confirmedBookings,
        pendingBookings,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      },
    };
  } catch (error) {
    console.error("Get booking stats error:", error);
    return { success: false, error: "Failed to fetch statistics" };
  }
}
