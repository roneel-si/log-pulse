import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { existsSync } from "fs";

// Get the application's base directory regardless of where it's called from
function getAppBaseDir(): string {
	try {
		// When running as a global npm package
		const globalNodeModules =
			process.env.NODE_PATH ||
			path.join(process.execPath, "..", "..", "lib", "node_modules");

		const possiblePaths = [
			// When running from source directory
			path.join(process.cwd(), "package.json"),
			// When running as a global package
			path.join(globalNodeModules, "log-pulse", "package.json"),
			// Using npm prefix (where npm would install global packages)
			path.join(
				process.env.npm_config_prefix || "",
				"lib",
				"node_modules",
				"log-pulse",
				"package.json",
			),
		];

		for (const pkgPath of possiblePaths) {
			if (existsSync(pkgPath)) {
				return path.dirname(pkgPath);
			}
		}

		// Fallback to user's home directory if we can't find the package
		return path.join(
			process.env.HOME || process.env.USERPROFILE || "",
			".log-pulse",
		);
	} catch (error) {
		console.error("Error determining app directory:", error);
		// Final fallback - use the user's home directory
		return path.join(
			process.env.HOME || process.env.USERPROFILE || "",
			".log-pulse",
		);
	}
}

// Get the fixed logs directory path
export function getLogsDir(): string {
	const baseDir = getAppBaseDir();
	return path.join(baseDir, "load-balancer-logs");
}

// Ensure the logs directory exists
export async function ensureLogsDir(): Promise<string> {
	const logsDir = getLogsDir();
	try {
		await fs.mkdir(logsDir, { recursive: true });
	} catch (error) {
		console.error("Error creating logs directory:", error);
	}
	return logsDir;
}

// Get path to store logs for a specific client and date (optional)
export function getClientLogsPath(clientName: string, date: string): string {
	// Return the main logs directory without creating a client/date subfolder
	// This ensures all logs are stored directly in the load-balancer-logs folder
	return getLogsDir();
}
