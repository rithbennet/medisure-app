import { mutation } from "./_generated/server";

// Hash password function (same as in users.ts)
function hashPassword(password: string): string {
  let hash = 0;
  const salt = "convex_salt_2024";
  const saltedPassword = salt + password + salt;
  for (let i = 0; i < saltedPassword.length; i++) {
    const char = saltedPassword.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  let result = Math.abs(hash).toString(16);
  for (let round = 0; round < 3; round++) {
    let roundHash = 0;
    const roundInput = result + salt + round;
    for (let i = 0; i < roundInput.length; i++) {
      const char = roundInput.charCodeAt(i);
      roundHash = ((roundHash << 5) - roundHash + char) | 0;
    }
    result += Math.abs(roundHash).toString(16);
  }
  return result;
}

// Seed test users for all roles except patient
export const seedTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const createdUsers: Array<{ email: string; role: string; password: string }> = [];

    // Test users data
    const testUsers = [
      {
        email: "coordinator@test.com",
        password: "test123",
        fullName: "Admin Coordinator",
        icNumber: "COORD001",
        role: "coordinator" as const,
      },
      {
        email: "doctor@test.com",
        password: "test123",
        fullName: "Dr. Test Doctor",
        icNumber: "DOC001",
        role: "doctor" as const,
      },
      {
        email: "agent@test.com",
        password: "test123",
        fullName: "Insurance Agent Test",
        icNumber: "AGENT001",
        role: "insurance_agent" as const,
      },
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", userData.email))
        .first();

      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Create the user
      await ctx.db.insert("users", {
        email: userData.email,
        password: hashPassword(userData.password),
        fullName: userData.fullName,
        icNumber: userData.icNumber,
        role: userData.role,
        profileComplete: true,
        createdAt: now,
        updatedAt: now,
      });

      createdUsers.push({
        email: userData.email,
        role: userData.role,
        password: userData.password,
      });

      console.log(`Created ${userData.role}: ${userData.email}`);
    }

    return {
      success: true,
      message: `Created ${createdUsers.length} test users`,
      users: createdUsers,
    };
  },
});

