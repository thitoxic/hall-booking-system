// lib/validations/booking.ts
import { z as zod } from "zod";

// Hall validation
export const hallSchema = zod.object({
  name: zod.string().min(3, "Name must be at least 3 characters"),
  description: zod.string().optional(),
  capacity: zod.number().min(50, "Capacity must be at least 50"),
  basePrice: zod.number().min(1000, "Price must be at least ₹1000"),
  images: zod.array(zod.string().url()).min(1, "At least one image required"),
  amenities: zod.array(zod.string()).default([]),
  isActive: zod.boolean().default(true),
});

// Food item validation
export const foodItemSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  category: zod.enum(["Appetizer", "Main Course", "Dessert", "Beverage"]),
  price: zod.number().min(1, "Price must be positive"),
  isVeg: zod.boolean().default(true),
  description: zod.string().optional(),
  image: zod.string().url().optional(),
  isAvailable: zod.boolean().default(true),
});

// Theme validation
export const themeSchema = zod.object({
  name: zod.string().min(3, "Name must be at least 3 characters"),
  description: zod.string().optional(),
  price: zod.number().min(1000, "Price must be at least ₹1000"),
  images: zod.array(zod.string().url()).min(1, "At least one image required"),
  isAvailable: zod.boolean().default(true),
});

// Booking validation
export const bookingSchema = zod.object({
  hallId: zod.string().min(1, "Hall selection required"),
  eventDate: zod.date().min(new Date(), "Event date must be in future"),
  timeSlot: zod.enum(["Morning", "Evening", "Full Day"]),
  guestCount: zod.number().min(10, "Minimum 10 guests").max(2000),
  eventType: zod.string().min(2, "Event type required"),
  selectedFoods: zod
    .array(
      zod.object({
        id: zod.string(),
        name: zod.string(),
        quantity: zod.number().min(1),
        price: zod.number(),
      })
    )
    .min(1, "Select at least one food item"),
  selectedTheme: zod
    .object({
      id: zod.string(),
      name: zod.string(),
      price: zod.number(),
    })
    .optional(),
  customerDetails: zod.object({
    name: zod.string().min(2),
    email: zod.string().email(),
    phone: zod.string().min(10).max(15),
    address: zod.string().min(10),
  }),
  specialRequests: zod.string().optional(),
});

// Types inferred from schemas
export type HallInput = zod.infer<typeof hallSchema>;
export type FoodItemInput = zod.infer<typeof foodItemSchema>;
export type ThemeInput = zod.infer<typeof themeSchema>;
export type BookingInput = zod.infer<typeof bookingSchema>;
