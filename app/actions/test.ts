// app/actions/test.ts
"use server";

import { prisma } from "@/lib/prisma";

export async function createTestHall() {
  const hall = await prisma.hall.create({
    data: {
      name: "Grand Ballroom",
      description: "Spacious hall for 500+ guests",
      capacity: 500,
      basePrice: 50000,
      images: [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ],
      amenities: ["AC", "Parking", "Stage", "Sound System"],
      isActive: true,
    },
  });

  console.log("Created hall:", hall);
  return hall;
}

export async function getAllHalls() {
  const halls = await prisma.hall.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return halls;
}
