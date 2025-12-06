import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Update user role (only coordinators/admins can do this)
export const updateUserRole = mutation({
	args: {
		token: v.string(), // Admin's session token
		targetUserId: v.id("users"),
		newRole: v.union(
			v.literal("coordinator"),
			v.literal("patient"),
			v.literal("doctor"),
			v.literal("insurance_agent"),
		),
	},
	handler: async (ctx, args) => {
		// Verify admin session
		const session = await ctx.db
			.query("sessionTokens")
			.withIndex("by_token", (q) => q.eq("token", args.token))
			.first();

		if (!session || session.expiresAt < Date.now()) {
			throw new Error("Invalid or expired session");
		}

		// Get admin user
		const admin = await ctx.db.get(session.userId);
		if (!admin || admin.role !== "coordinator") {
			throw new Error("Only coordinators can update user roles");
		}

		// Get target user
		const targetUser = await ctx.db.get(args.targetUserId);
		if (!targetUser) {
			throw new Error("User not found");
		}

		// Update user role
		await ctx.db.patch(args.targetUserId, {
			role: args.newRole,
			updatedAt: Date.now(),
		});

		return {
			success: true,
			message: `User role updated to ${args.newRole}`,
		};
	},
});

// Get all users (only coordinators/admins can see this)
export const getAllUsers = query({
	args: {
		token: v.string(),
	},
	handler: async (ctx, args) => {
		// Verify admin session
		const session = await ctx.db
			.query("sessionTokens")
			.withIndex("by_token", (q) => q.eq("token", args.token))
			.first();

		if (!session || session.expiresAt < Date.now()) {
			throw new Error("Invalid or expired session");
		}

		// Get admin user
		const admin = await ctx.db.get(session.userId);
		if (!admin || admin.role !== "coordinator") {
			throw new Error("Only coordinators can view all users");
		}

		// Get all users
		const users = await ctx.db.query("users").collect();

		return users.map((user) => ({
			id: user._id,
			email: user.email,
			fullName: user.fullName,
			icNumber: user.icNumber,
			role: user.role,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		}));
	},
});

// Get users by role
export const getUsersByRole = query({
	args: {
		token: v.string(),
		role: v.union(
			v.literal("coordinator"),
			v.literal("patient"),
			v.literal("doctor"),
			v.literal("insurance_agent"),
		),
	},
	handler: async (ctx, args) => {
		// Verify session
		const session = await ctx.db
			.query("sessionTokens")
			.withIndex("by_token", (q) => q.eq("token", args.token))
			.first();

		if (!session || session.expiresAt < Date.now()) {
			throw new Error("Invalid or expired session");
		}

		// Get requesting user
		const requestingUser = await ctx.db.get(session.userId);
		if (!requestingUser) {
			throw new Error("User not found");
		}

		// Only coordinators, doctors, and insurance agents can query users by role
		if (
			!["coordinator", "doctor", "insurance_agent"].includes(
				requestingUser.role,
			)
		) {
			throw new Error("Insufficient permissions");
		}

		// Get all users and filter by role
		const allUsers = await ctx.db.query("users").collect();
		const filteredUsers = allUsers.filter((user) => user.role === args.role);

		return filteredUsers.map((user) => ({
			id: user._id,
			email: user.email,
			fullName: user.fullName,
			icNumber: user.icNumber,
			role: user.role,
			createdAt: user.createdAt,
		}));
	},
});

// Delete user (only coordinators can do this)
export const deleteUser = mutation({
	args: {
		token: v.string(),
		targetUserId: v.id("users"),
	},
	handler: async (ctx, args) => {
		// Verify admin session
		const session = await ctx.db
			.query("sessionTokens")
			.withIndex("by_token", (q) => q.eq("token", args.token))
			.first();

		if (!session || session.expiresAt < Date.now()) {
			throw new Error("Invalid or expired session");
		}

		// Get admin user
		const admin = await ctx.db.get(session.userId);
		if (!admin || admin.role !== "coordinator") {
			throw new Error("Only coordinators can delete users");
		}

		// Prevent deleting self
		if (session.userId === args.targetUserId) {
			throw new Error("Cannot delete your own account");
		}

		// Get target user
		const targetUser = await ctx.db.get(args.targetUserId);
		if (!targetUser) {
			throw new Error("User not found");
		}

		// Delete all session tokens for this user
		const userSessions = await ctx.db
			.query("sessionTokens")
			.withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
			.collect();

		for (const userSession of userSessions) {
			await ctx.db.delete(userSession._id);
		}

		// Delete the user
		await ctx.db.delete(args.targetUserId);

		return {
			success: true,
			message: "User deleted successfully",
		};
	},
});

// Create a coordinator account (first user or by existing coordinator)
export const createCoordinator = mutation({
	args: {
		email: v.string(),
		password: v.string(),
		fullName: v.string(),
		icNumber: v.string(),
		adminToken: v.optional(v.string()), // Optional: required if coordinators exist
	},
	handler: async (ctx, args) => {
		// Check if any coordinators exist
		const allUsers = await ctx.db.query("users").collect();
		const coordinators = allUsers.filter((u) => u.role === "coordinator");

		// If coordinators exist, require admin token
		if (coordinators.length > 0) {
			if (!args.adminToken) {
				throw new Error("Admin token required to create new coordinator");
			}

			const adminToken = args.adminToken;
			const session = await ctx.db
				.query("sessionTokens")
				.withIndex("by_token", (q) => q.eq("token", adminToken))
				.first();

			if (!session || session.expiresAt < Date.now()) {
				throw new Error("Invalid or expired admin session");
			}

			const admin = await ctx.db.get(session.userId);
			if (!admin || admin.role !== "coordinator") {
				throw new Error("Only coordinators can create new coordinators");
			}
		}

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

		// Hash password (same function as in users.ts)
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

		const now = Date.now();

		// Create coordinator account
		const userId = await ctx.db.insert("users", {
			email: args.email.toLowerCase(),
			password: hashPassword(args.password),
			fullName: args.fullName.trim(),
			icNumber: args.icNumber,
			role: "coordinator",
			profileComplete: true,
			createdAt: now,
			updatedAt: now,
		});

		return {
			success: true,
			message: "Coordinator account created successfully",
			userId,
		};
	},
});

// Get dashboard statistics (for coordinators)
export const getDashboardStats = query({
	args: {
		token: v.string(),
	},
	handler: async (ctx, args) => {
		// Verify admin session
		const session = await ctx.db
			.query("sessionTokens")
			.withIndex("by_token", (q) => q.eq("token", args.token))
			.first();

		if (!session || session.expiresAt < Date.now()) {
			throw new Error("Invalid or expired session");
		}

		// Get admin user
		const admin = await ctx.db.get(session.userId);
		if (!admin || admin.role !== "coordinator") {
			throw new Error("Only coordinators can view dashboard statistics");
		}

		// Get all users
		const allUsers = await ctx.db.query("users").collect();

		// Count by role
		const roleCounts = {
			coordinator: 0,
			patient: 0,
			doctor: 0,
			insurance_agent: 0,
		};

		for (const user of allUsers) {
			roleCounts[user.role]++;
		}

		// Get active sessions count
		const activeSessions = await ctx.db.query("sessionTokens").collect();
		const activeSessionCount = activeSessions.filter(
			(s) => s.expiresAt > Date.now(),
		).length;

		return {
			totalUsers: allUsers.length,
			roleCounts,
			activeSessions: activeSessionCount,
		};
	},
});
