/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	// Increase body size limit for PDF uploads
	experimental: {
		serverActions: {
			bodySizeLimit: "50mb",
		},
	},
	// Allow larger body sizes through middleware (for file uploads)
	// @ts-ignore - This is a valid Next.js config option
	middlewareClientMaxBodySize: "50mb",
};

export default config;
