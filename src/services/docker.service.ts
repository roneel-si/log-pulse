import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { getLogsDir } from "../utils/paths.js";

const execPromise = promisify(exec);

export class DockerService {
	private dockerDir: string;

	constructor() {
		// Docker files are located in the docker directory relative to the application root
		const appRoot = path.resolve(
			path.dirname(new URL(import.meta.url).pathname),
			"../../",
		);
		this.dockerDir = path.join(appRoot, "docker");

		console.log(
			`DockerService initialized with dockerDir: ${this.dockerDir}`,
		);
		// Check if the docker directory exists
		if (!existsSync(this.dockerDir)) {
			console.error(`Docker directory does not exist: ${this.dockerDir}`);
		}
	}

	/**
	 * Check if Docker is installed and running
	 */
	async checkDockerAvailability(): Promise<boolean> {
		try {
			console.log("Checking Docker availability...");
			const { stdout, stderr } = await execPromise("docker version");
			console.log("Docker is available.");
			return true;
		} catch (error) {
			console.error("Docker not available:", error);
			return false;
		}
	}

	/**
	 * Check if Docker Compose is installed
	 */
	async checkDockerComposeAvailability(): Promise<boolean> {
		try {
			console.log("Checking Docker Compose availability...");
			const { stdout, stderr } = await execPromise(
				"docker compose version",
			);
			console.log("Docker Compose is available.");
			return true;
		} catch (error) {
			console.error("Docker Compose not available:", error);
			return false;
		}
	}

	/**
	 * Start the visualization containers
	 */
	async startVisualization(): Promise<boolean> {
		try {
			console.log("Starting visualization containers...");
			console.log(`Docker directory: ${this.dockerDir}`);

			// Update the volume path in docker-compose.yml to point to the absolute logs directory
			const logsDir = await getLogsDir();
			console.log(`Logs directory: ${logsDir}`);

			// Start the containers
			const cmd = `cd "${this.dockerDir}" && docker compose up -d`;
			console.log(`Executing command: ${cmd}`);
			const { stdout, stderr } = await execPromise(cmd);

			console.log("Command output:", stdout);
			if (stderr) {
				console.log("Command stderr:", stderr);
			}

			if (
				stderr &&
				!stderr.includes("Creating") &&
				!stderr.includes("Starting") &&
				!stderr.includes("already exists") &&
				!stderr.includes("is up-to-date")
			) {
				console.error("Error starting containers:", stderr);
				return false;
			}

			console.log("Containers started successfully");
			return true;
		} catch (error) {
			console.error("Error starting visualization:", error);
			return false;
		}
	}

	/**
	 * Stop the visualization containers
	 */
	async stopVisualization(): Promise<boolean> {
		try {
			console.log("Stopping visualization containers...");
			const { stdout, stderr } = await execPromise(
				`cd "${this.dockerDir}" && docker compose down`,
			);

			if (
				stderr &&
				!stderr.includes("Stopping") &&
				!stderr.includes("Removing")
			) {
				console.error("Error stopping containers:", stderr);
				return false;
			}

			console.log("Containers stopped successfully");
			return true;
		} catch (error) {
			console.error("Error stopping visualization:", error);
			return false;
		}
	}

	/**
	 * Get the status of the visualization containers
	 */
	async getVisualizationStatus({
		forceStop = false,
	}: {
		forceStop?: boolean;
	}): Promise<{
		running: boolean;
		grafanaUrl?: string;
	}> {
		try {
			console.log("Checking visualization status...");
			const cmd = `cd "${this.dockerDir}" && docker compose ps`;
			console.log(`Executing command: ${cmd}`);
			const { stdout } = await execPromise(cmd);

			console.log("Command output:", stdout);

			// Check if Visualization Dashboard is running
			if (
				stdout.includes("visualization-dashboard") &&
				stdout.includes(" Up ")
			) {
				console.log(
					"Visualization Dashboard container is running. Stopping it...",
				);
				if (forceStop) {
					// Stop the containers
					await this.stopVisualization();
					console.log(
						"Visualization Dashboard container stopped successfully",
					);
					return {
						running: false,
					};
				} else {
					return {
						running: true,
						grafanaUrl: "http://localhost:3000",
					};
				}
			} else if (stdout.trim() && !stdout.includes("Exit")) {
				// Some containers running but not Visualization Dashboard
				console.log(
					"Some containers are running, but not the visualization dashboard",
				);
				return { running: false };
			}

			console.log("No containers are running");
			return { running: false };
		} catch (error) {
			console.error("Error checking visualization status:", error);
			return { running: false };
		}
	}
}
