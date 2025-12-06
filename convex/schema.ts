import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - stores registered user data
  users: defineTable({
    email: v.string(), // Email address
    password: v.optional(v.string()), // Hashed password (optional for WorkOS users)
    fullName: v.string(), // User's full name
    icNumber: v.optional(v.string()), // Identification card number (optional until profile complete)
    role: v.union(
      v.literal("coordinator"), // Admin role
      v.literal("patient"),
      v.literal("doctor"),
      v.literal("insurance_agent")
    ),
    workosId: v.optional(v.string()), // WorkOS user ID for OAuth users
    profileComplete: v.optional(v.boolean()), // Whether the user has completed their profile (added IC) - defaults to true for existing users
    createdAt: v.number(), // Timestamp
    updatedAt: v.number(), // Timestamp
  })
    .index("by_email", ["email"])
    .index("by_icNumber", ["icNumber"])
    .index("by_workosId", ["workosId"]),

  // Session tokens table - stores active sessions
  sessionTokens: defineTable({
    userId: v.id("users"), // Reference to user
    token: v.string(), // Session token
    expiresAt: v.number(), // Expiration timestamp
    createdAt: v.number(), // Timestamp
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),
});

