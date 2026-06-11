import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seeding.");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("Starting seed...");

  // Hash password for all users
  const passwordHash = await bcrypt.hash("12345678", 12);

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: "demo-workspace-id" },
    update: {},
    create: {
      id: "demo-workspace-id",
      name: "PulseIQ Demo Restaurant",
      workspaceType: "DEMO",
      billingStatus: "inactive",
      subscriptionStatus: "DEMO",
      onboardingCompleted: true,
    },
  });

  console.log("Workspace created:", workspace.name);

  // Create restaurants (branches/outlets) with proper UUIDs
  const mumbaiCentralId = "11111111-1111-4111-8111-111111111111";
  const naviMumbaiId = "22222222-2222-4222-8222-222222222222";
  const puneBranchId = "33333333-3333-4333-8333-333333333333";

  const mumbaiCentral = await prisma.restaurant.upsert({
    where: { id: mumbaiCentralId },
    update: {},
    create: {
      id: mumbaiCentralId,
      name: "Mumbai Central",
      city: "Mumbai",
      restaurantType: "Fine Dining",
      priceTier: "Premium",
      cuisineFocus: "Indian",
      openingDate: new Date("2020-01-01"),
      seatingCapacity: 100,
      aggregatorDependencyScore: 0.5,
      dineInPreferenceScore: 0.6,
      operationalEfficiencyScore: 0.7,
      premiumScore: 0.8,
      trafficMultiplier: 1.2,
      createdAt: new Date("2020-01-01"),
    },
  });

  const naviMumbai = await prisma.restaurant.upsert({
    where: { id: naviMumbaiId },
    update: {},
    create: {
      id: naviMumbaiId,
      name: "Navi Mumbai",
      city: "Navi Mumbai",
      restaurantType: "Casual Dining",
      priceTier: "Mid-range",
      cuisineFocus: "Multi-cuisine",
      openingDate: new Date("2021-01-01"),
      seatingCapacity: 80,
      aggregatorDependencyScore: 0.6,
      dineInPreferenceScore: 0.5,
      operationalEfficiencyScore: 0.75,
      premiumScore: 0.7,
      trafficMultiplier: 1.0,
      createdAt: new Date("2021-01-01"),
    },
  });

  const puneBranch = await prisma.restaurant.upsert({
    where: { id: puneBranchId },
    update: {},
    create: {
      id: puneBranchId,
      name: "Pune Branch",
      city: "Pune",
      restaurantType: "Quick Service",
      priceTier: "Budget",
      cuisineFocus: "Fast Food",
      openingDate: new Date("2022-01-01"),
      seatingCapacity: 60,
      aggregatorDependencyScore: 0.7,
      dineInPreferenceScore: 0.4,
      operationalEfficiencyScore: 0.8,
      premiumScore: 0.6,
      trafficMultiplier: 0.9,
      createdAt: new Date("2022-01-01"),
    },
  });

  console.log("Restaurants created:", mumbaiCentral.name, naviMumbai.name, puneBranch.name);

  // Link restaurants to workspace
  await prisma.workspaceOutlet.upsert({
    where: {
      workspaceId_restaurantId: {
        workspaceId: workspace.id,
        restaurantId: mumbaiCentral.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      restaurantId: mumbaiCentral.id,
    },
  });

  await prisma.workspaceOutlet.upsert({
    where: {
      workspaceId_restaurantId: {
        workspaceId: workspace.id,
        restaurantId: naviMumbai.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      restaurantId: naviMumbai.id,
    },
  });

  await prisma.workspaceOutlet.upsert({
    where: {
      workspaceId_restaurantId: {
        workspaceId: workspace.id,
        restaurantId: puneBranch.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      restaurantId: puneBranch.id,
    },
  });

  console.log("Workspace outlets linked");

  // Create users with proper UUIDs
  const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const adminId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const managerId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const analystId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const viewerId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

  const owner = await prisma.user.upsert({
    where: { email: "owner@pulseiq.com" },
    update: {},
    create: {
      id: ownerId,
      firstName: "Owner",
      lastName: "User",
      email: "owner@pulseiq.com",
      phone: "+919876543210",
      password: passwordHash,
      isVerified: true,
      role: "WORKSPACE_OWNER",
      workspaceId: workspace.id,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@pulseiq.com" },
    update: {},
    create: {
      id: adminId,
      firstName: "Admin",
      lastName: "User",
      email: "admin@pulseiq.com",
      phone: "+919876543211",
      password: passwordHash,
      isVerified: true,
      role: "ADMIN",
      workspaceId: workspace.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@pulseiq.com" },
    update: {},
    create: {
      id: managerId,
      firstName: "Manager",
      lastName: "User",
      email: "manager@pulseiq.com",
      phone: "+919876543212",
      password: passwordHash,
      isVerified: true,
      role: "MANAGER",
      workspaceId: workspace.id,
    },
  });

  const analyst = await prisma.user.upsert({
    where: { email: "analyst@pulseiq.com" },
    update: {},
    create: {
      id: analystId,
      firstName: "Analyst",
      lastName: "User",
      email: "analyst@pulseiq.com",
      phone: "+919876543213",
      password: passwordHash,
      isVerified: true,
      role: "ANALYST",
      workspaceId: workspace.id,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@pulseiq.com" },
    update: {},
    create: {
      id: viewerId,
      firstName: "Viewer",
      lastName: "User",
      email: "viewer@pulseiq.com",
      phone: "+919876543214",
      password: passwordHash,
      isVerified: true,
      role: "VIEWER",
      workspaceId: workspace.id,
    },
  });

  console.log(
    "Users created:",
    owner.email,
    admin.email,
    manager.email,
    analyst.email,
    viewer.email,
  );

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
