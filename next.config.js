/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	// Increase body size limit for PDF uploads (default is 1mb, increase to 10mb)
	experimental: {
		serverActions: {
			bodySizeLimit: "10mb",
		},
	},
};

export default config;
