import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simple hash function for passwords (in production, use a proper hashing library)
// This uses a basic hash - for production, consider using convex actions with bcrypt
function hashPassword(password: string): string {
  let hash = 0;
  const salt = "convex_salt_2024";
  const saltedPassword = salt + password + salt;
  for (let i = 0; i < saltedPassword.length; i++) {
    const char = saltedPassword.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Create a more secure-looking hash by combining multiple rounds
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

// Generate a random session token
function generateSessionToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token + "_" + Date.now().toString(36);
}

// Register a new user
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    icNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // Check if email already exists
    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingEmail) {
      throw new Error("Email already registered");
    }

    // Check if IC number already exists
    const existingIC = await ctx.db
      .query("users")
      .withIndex("by_icNumber", (q) => q.eq("icNumber", args.icNumber))
      .first();

    if (existingIC) {
      throw new Error("Identification card number already registered");
    }

    // Validate password strength
    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Validate IC number format (basic validation)
    if (args.icNumber.length < 6) {
      throw new Error("Invalid identification card number");
    }

    // Validate full name
    if (args.fullName.trim().length < 2) {
      throw new Error("Full name is required");
    }

    const now = Date.now();

    // Create new user with patient role (default for new unique IC numbers)
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      password: hashPassword(args.password),
      fullName: args.fullName.trim(),
      icNumber: args.icNumber,
      role: "patient", // Auto-assign patient role for new registrations
      profileComplete: true, // Profile is complete when registering with IC
      createdAt: now,
      updatedAt: now,
    });

    // Create session token for the new user
    const token = generateSessionToken();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days expiry

    await ctx.db.insert("sessionTokens", {
      userId,
      token,
      expiresAt,
      createdAt: now,
    });

    return {
      success: true,
      token,
      user: {
        id: userId,
        email: args.email.toLowerCase(),
        fullName: args.fullName.trim(),
        role: "patient" as const,
      },
    };
  },
});

// Login user
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const hashedPassword = hashPassword(args.password);
    if (user.password !== hashedPassword) {
      throw new Error("Invalid email or password");
    }

    const now = Date.now();

    // Create new session token
    const token = generateSessionToken();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days expiry

    await ctx.db.insert("sessionTokens", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: now,
    });

    return {
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  },
});

// Logout user - invalidate session token
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessionTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Get current user by session token
export const getCurrentUser = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.token) {
      return null;
    }

    // Find session by token
    const session = await ctx.db
      .query("sessionTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      // Session expired - return null (cleanup handled by separate mutation)
      return null;
    }

    // Get user
    const user = await ctx.db.get(session.userId);

    if (!user) {
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      icNumber: user.icNumber,
      role: user.role,
      profileComplete: user.profileComplete ?? true, // Default to true for existing users
      createdAt: user.createdAt,
    };
  },
});

// Clean up expired session (separate mutation for cleanup)
export const cleanupExpiredSession = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessionTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session && session.expiresAt < Date.now()) {
      await ctx.db.delete(session._id);
      return { cleaned: true };
    }

    return { cleaned: false };
  },
});

// Get user by ID (for internal use)
export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      icNumber: user.icNumber,
      role: user.role,
      profileComplete: user.profileComplete ?? true, // Default to true for existing users
      createdAt: user.createdAt,
    };
  },
});

// Check if email exists
export const checkEmailExists = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    return { exists: !!user };
  },
});

// Check if IC number exists
export const checkICExists = query({
  args: {
    icNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_icNumber", (q) => q.eq("icNumber", args.icNumber))
      .first();

    return { exists: !!user };
  },
});

// Get or create user from WorkOS (called after OAuth login)
export const getOrCreateWorkosUser = mutation({
  args: {
    workosId: v.string(),
    email: v.string(),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists by WorkOS ID
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", args.workosId))
      .first();

    if (existingUser) {
      return {
        user: {
          id: existingUser._id,
          email: existingUser.email,
          fullName: existingUser.fullName,
          icNumber: existingUser.icNumber,
          role: existingUser.role,
          profileComplete: existingUser.profileComplete ?? true, // Default to true for existing users
        },
        isNew: false,
      };
    }

    // Check if user exists by email (might have registered with password before)
    const existingEmailUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingEmailUser) {
      // Link WorkOS ID to existing user
      await ctx.db.patch(existingEmailUser._id, {
        workosId: args.workosId,
        updatedAt: Date.now(),
      });

      return {
        user: {
          id: existingEmailUser._id,
          email: existingEmailUser.email,
          fullName: existingEmailUser.fullName,
          icNumber: existingEmailUser.icNumber,
          role: existingEmailUser.role,
          profileComplete: existingEmailUser.profileComplete ?? true, // Default to true for existing users
        },
        isNew: false,
      };
    }

    // Create new user with default patient role
    // profileComplete is false until they add IC number
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      fullName: args.fullName,
      workosId: args.workosId,
      role: "patient", // Default role
      profileComplete: false, // Needs to add IC number
      createdAt: now,
      updatedAt: now,
    });

    return {
      user: {
        id: userId,
        email: args.email.toLowerCase(),
        fullName: args.fullName,
        icNumber: undefined,
        role: "patient" as const,
        profileComplete: false, // New WorkOS users need to complete profile
      },
      isNew: true,
    };
  },
});

// Create or update WorkOS session in Convex
export const createWorkosSession = mutation({
  args: {
    userId: v.id("users"),
    workosSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days expiry

    // Check if a session with this workosSessionId already exists for this user
    // Look for tokens that start with "workos_{workosSessionId}_"
    const existingSessions = await ctx.db
      .query("sessionTokens")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Check if there's a recent session (within last 5 minutes) for this workosSessionId
    const tokenPrefix = `workos_${args.workosSessionId}_`;
    const recentSession = existingSessions.find(
      (session) =>
        session.token.startsWith(tokenPrefix) &&
        session.expiresAt > now &&
        session.createdAt > now - 5 * 60 * 1000 // Created within last 5 minutes
    );

    if (recentSession) {
      // Session already exists and is recent, return it
      return { success: true, token: recentSession.token, existing: true };
    }

    // Create new session token entry for tracking
    const token = `workos_${args.workosSessionId}_${now}`;
    await ctx.db.insert("sessionTokens", {
      userId: args.userId,
      token,
      expiresAt,
      createdAt: now,
    });

    return { success: true, token, existing: false };
  },
});

// Get user by WorkOS ID
export const getUserByWorkosId = query({
  args: {
    workosId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", args.workosId))
      .first();

    if (!user) {
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      icNumber: user.icNumber,
      role: user.role,
      profileComplete: user.profileComplete ?? false, // Default to false for new users
      createdAt: user.createdAt,
    };
  },
});

// Complete user profile (add IC number)
export const completeProfile = mutation({
  args: {
    workosId: v.string(),
    icNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate IC number
    if (args.icNumber.length < 6) {
      throw new Error("IC number must be at least 6 characters");
    }

    // Check if IC number already exists
    const existingIC = await ctx.db
      .query("users")
      .withIndex("by_icNumber", (q) => q.eq("icNumber", args.icNumber))
      .first();

    if (existingIC) {
      throw new Error("This identification card number is already registered");
    }

    // Find user by WorkOS ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", args.workosId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Update user with IC number
    await ctx.db.patch(user._id, {
      icNumber: args.icNumber,
      profileComplete: true,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        icNumber: args.icNumber,
        role: user.role,
        profileComplete: true,
      },
    };
  },
});

// Migrate existing users to have profileComplete field
export const migrateUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    let migrated = 0;

    for (const user of allUsers) {
      if (user.profileComplete === undefined) {
        // If user has IC number, profile is complete; otherwise incomplete
        const isComplete = !!user.icNumber;
        await ctx.db.patch(user._id, {
          profileComplete: isComplete,
        });
        migrated++;
      }
    }

    return { migrated, total: allUsers.length };
  },
});

