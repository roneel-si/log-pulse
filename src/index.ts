#!/usr/bin/env node
import { Command } from "commander";
import inquirer from "inquirer";
import * as dotenv from "dotenv";
import path from "path";
import { S3Service } from "./services/s3.service.js";
import { clients, getClient } from "./config/clients.js";
import { Client, LogQuery, S3Object } from "./types/index.js";
import {
	showTitle,
	showError,
	showSuccess,
	showInfo,
	createSpinner,
	formatLogCount,
	formatClientName,
	formatDate,
	formatLogEntry,
	decorateTable,
	formatClientInfo,
	formatAWSProfile,
} from "./utils/ui.js";
import os from "os";
import chalk from "chalk";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import fs from "fs/promises";
import { existsSync } from "fs";
import {
	getLogsDir,
	ensureLogsDir,
	getRawLogsDir,
	ensureRawLogsDir,
} from "./utils/paths.js";
import { DockerService } from "./services/docker.service.js";
import { LogPreparationService } from "./services/log-preparation.service.js";
import open from "open";

// Load environment variables from .env file if it exists
dotenv.config();

// Define the program
const program = new Command();

// Function to ensure the logs directories are ready
async function ensureLogDirectories(): Promise<{
	compressedDir: string;
	rawDir: string;
}> {
	const compressedDir = await ensureLogsDir();
	const rawDir = await ensureRawLogsDir();

	console.log(`Compressed logs directory: ${compressedDir}`);
	console.log(`Raw logs directory: ${rawDir}`);

	// Create raw logs directory if it doesn't exist
	if (!existsSync(rawDir)) {
		await fs.mkdir(rawDir, { recursive: true });
		console.log(`Created raw logs directory: ${rawDir}`);
	}

	return { compressedDir, rawDir };
}

// Function to clear the raw logs directory (for uncompressed logs)
async function clearRawLogsDirectory(): Promise<void> {
	const rawLogsDir = await ensureRawLogsDir();

	try {
		console.log(`Preparing raw logs directory: ${rawLogsDir}`);

		// Use a more reliable recursive deletion approach
		async function removeContents(dirPath: string) {
			if (!existsSync(dirPath)) {
				console.log(
					`Directory doesn't exist yet, creating: ${dirPath}`,
				);
				await fs.mkdir(dirPath, { recursive: true });
				return;
			}

			const entries = await fs.readdir(dirPath, { withFileTypes: true });
			console.log(`Found ${entries.length} items in raw logs directory`);

			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);

				if (entry.isDirectory()) {
					// First remove contents of subdirectory
					await removeContents(fullPath);
					// Then remove the now-empty directory
					await fs.rmdir(fullPath);
					console.log(`Removed subdirectory: ${entry.name}`);
				} else {
					// Remove file
					await fs.unlink(fullPath);
					console.log(`Removed file: ${entry.name}`);
				}
			}
		}

		if (existsSync(rawLogsDir)) {
			await removeContents(rawLogsDir);
			showInfo("Cleared previous raw log files");
		} else {
			await fs.mkdir(rawLogsDir, { recursive: true });
			showInfo("Created raw logs directory");
		}
	} catch (error) {
		console.error("Error clearing raw logs directory:", error);
		// Create directory if error was due to it not existing
		try {
			if (!existsSync(rawLogsDir)) {
				await fs.mkdir(rawLogsDir, { recursive: true });
				showInfo("Created raw logs directory");
			}
		} catch (mkdirError) {
			console.error("Failed to create raw logs directory:", mkdirError);
		}
	}
}

// Function to clear the compressed logs directory (load-balancer-logs)
async function clearLogsDirectory(): Promise<void> {
	const logsDir = await ensureLogsDir();

	try {
		console.log(`Clearing logs directory: ${logsDir}`);

		// Use a more reliable recursive deletion approach
		async function removeContents(dirPath: string) {
			if (!existsSync(dirPath)) {
				console.log(
					`Directory doesn't exist yet, creating: ${dirPath}`,
				);
				await fs.mkdir(dirPath, { recursive: true });
				return;
			}

			const entries = await fs.readdir(dirPath, { withFileTypes: true });
			console.log(`Found ${entries.length} items in logs directory`);

			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);

				if (entry.isDirectory()) {
					// First remove contents of subdirectory
					await removeContents(fullPath);
					// Then remove the now-empty directory
					await fs.rmdir(fullPath);
					console.log(`Removed subdirectory: ${entry.name}`);
				} else {
					// Remove file
					await fs.unlink(fullPath);
					console.log(`Removed file: ${entry.name}`);
				}
			}
		}

		if (existsSync(logsDir)) {
			await removeContents(logsDir);
			showInfo("Cleared previous compressed log files");
		} else {
			await fs.mkdir(logsDir, { recursive: true });
			showInfo("Created logs directory");
		}
	} catch (error) {
		console.error("Error clearing logs directory:", error);
		// Create directory if error was due to it not existing
		try {
			if (!existsSync(logsDir)) {
				await fs.mkdir(logsDir, { recursive: true });
				showInfo("Created logs directory");
			}
		} catch (mkdirError) {
			console.error("Failed to create logs directory:", mkdirError);
		}
	}
}

// Initialize the CLI
async function init() {
	// Ensure log directories exist
	await ensureLogDirectories();
	// Don't clear raw logs directory on startup to preserve output.log
	// Comment out the following line to preserve existing log files
	// await clearRawLogsDirectory();

	showTitle();

	program
		.name("log-pulse")
		.description("AWS Load Balancer Log Viewer")
		.version("1.0.0");

	program
		.command("view")
		.description("View logs for a specific client and date")
		.option("-c, --client <n>", "Client name")
		.option("-d, --date <date>", "Date in YYYY-MM-DD format")
		.action(async (options) => {
			try {
				const query = await promptMissingOptions(options);
				await viewLogs(query);
			} catch (error) {
				if (error instanceof Error) {
					showError(error.message);
				} else {
					showError("An unknown error occurred");
				}
				process.exit(1);
			}
		});

	program
		.command("list-clients")
		.description("List available clients")
		.action(() => {
			showInfo("Available Clients:");
			clients.forEach((client) => {
				const profile = client.awsProfile || "sportz";
				console.log(formatClientInfo(client));
			});
		});

	program
		.command("prepare-logs")
		.description("Prepare logs for visualization by decompressing them")
		.action(async () => {
			try {
				// Ensure raw logs directory is empty before processing
				await clearRawLogsDirectory();

				const logPreparationService = new LogPreparationService();
				const spinner = createSpinner(
					"Preparing logs for visualization...",
				);
				spinner.start();

				const result =
					await logPreparationService.prepareLogsForVisualization();

				if (result.success) {
					spinner.succeed(`Prepared logs for visualization`);
					showSuccess(
						`Decompressed ${result.decompressedCount} log files`,
					);

					if (result.errorCount > 0) {
						showError(
							`Failed to decompress ${result.errorCount} log files`,
						);
					}

					// Check if logs are available
					const { available, count } =
						await logPreparationService.checkForLogFiles();

					if (available) {
						showSuccess(
							`${count} log files are ready for visualization`,
						);

						// Ask if user wants to start visualization
						const { startVisualization } = await inquirer.prompt([
							{
								type: "confirm",
								name: "startVisualization",
								message:
									"Do you want to start the visualization dashboard now?",
								default: true,
							},
						]);

						if (startVisualization) {
							// Start Docker containers for visualization
							const dockerService = new DockerService();

							// Check Docker availability
							const dockerAvailable =
								await dockerService.checkDockerAvailability();
							if (!dockerAvailable) {
								showError(
									"Docker is not available. Please install Docker and try again.",
								);
								return;
							}

							// Check Docker Compose availability
							const dockerComposeAvailable =
								await dockerService.checkDockerComposeAvailability();
							if (!dockerComposeAvailable) {
								showError(
									"Docker Compose is not available. Please install Docker Compose and try again.",
								);
								return;
							}

							// Start visualization
							const startSpinner = createSpinner(
								"Starting visualization dashboard...",
							);
							startSpinner.start();

							const visualizationStarted =
								await dockerService.startVisualization();

							if (visualizationStarted) {
								startSpinner.succeed(
									"Visualization dashboard started",
								);

								// Get status with URL
								const status =
									await dockerService.getVisualizationStatus();
								if (status.running && status.grafanaUrl) {
									showSuccess(
										`Grafana dashboard is available at: ${chalk.bold(
											status.grafanaUrl,
										)}`,
									);
									showInfo(
										"Default login: username: admin, password: admin",
									);

									// Ask if user wants to open in browser
									const { openBrowser } =
										await inquirer.prompt([
											{
												type: "confirm",
												name: "openBrowser",
												message:
													"Do you want to open the dashboard in your browser?",
												default: true,
											},
										]);

									if (openBrowser) {
										await open(status.grafanaUrl);
									}
								}
							} else {
								startSpinner.fail(
									"Failed to start visualization dashboard",
								);
							}
						}
					} else {
						showInfo(
							"No log files available for visualization. Please download logs first.",
						);
					}
				} else {
					spinner.fail("Failed to prepare logs for visualization");
				}
			} catch (error) {
				showError(`Error preparing logs: ${error}`);
			}
		});

	program
		.command("visualize")
		.description("Start or stop visualization dashboard")
		.option("-s, --stop", "Stop the visualization dashboard")
		.option(
			"-p, --preserve",
			"Preserve existing log files (default: true)",
			true,
		)
		.action(async (options) => {
			try {
				const dockerService = new DockerService();

				// Check Docker availability
				const dockerAvailable =
					await dockerService.checkDockerAvailability();
				if (!dockerAvailable) {
					showError(
						"Docker is not available. Please install Docker and try again.",
					);
					return;
				}

				// Check Docker Compose availability
				const dockerComposeAvailable =
					await dockerService.checkDockerComposeAvailability();
				if (!dockerComposeAvailable) {
					showError(
						"Docker Compose is not available. Please install Docker Compose and try again.",
					);
					return;
				}

				// Check if we should stop or start
				if (options.stop) {
					const spinner = createSpinner(
						"Stopping visualization dashboard...",
					);
					spinner.start();

					const stopped = await dockerService.stopVisualization();

					if (stopped) {
						spinner.succeed("Visualization dashboard stopped");
					} else {
						spinner.fail("Failed to stop visualization dashboard");
					}
					return;
				}

				// Check visualization status
				const status = await dockerService.getVisualizationStatus();

				if (status.running) {
					showInfo("Visualization dashboard is already running");

					if (status.grafanaUrl) {
						showSuccess(
							`Grafana dashboard is available at: ${chalk.bold(
								status.grafanaUrl,
							)}`,
						);
						showInfo(
							"Default login: username: admin, password: admin",
						);

						// Ask if user wants to open in browser
						const { openBrowser } = await inquirer.prompt([
							{
								type: "confirm",
								name: "openBrowser",
								message:
									"Do you want to open the dashboard in your browser?",
								default: true,
							},
						]);

						if (openBrowser) {
							await open(status.grafanaUrl);
						}
					}
					return;
				}

				// Check if logs are available
				const logPreparationService = new LogPreparationService();
				const { available, count } =
					await logPreparationService.checkForLogFiles();

				if (!available) {
					showInfo(
						"No log files available for visualization. Would you like to download logs first?",
					);

					const { action } = await inquirer.prompt([
						{
							type: "list",
							name: "action",
							message: "What would you like to do?",
							choices: [
								{ name: "Go back", value: "back" },
								{
									name: "Start visualization anyway",
									value: "start",
								},
								{
									name: "Download logs first",
									value: "download",
								},
							],
						},
					]);

					if (action === "back") {
						return;
					} else if (action === "download") {
						// Prompt for client and date
						const query = await promptMissingOptions({});
						await viewLogs(query);
						return;
					}
					// For "start", continue with visualization
				} else {
					showSuccess(
						`${count} log files are ready for visualization`,
					);
				}

				// Start visualization
				const spinner = createSpinner(
					"Starting visualization dashboard...",
				);
				spinner.start();

				const started = await dockerService.startVisualization();

				if (started) {
					spinner.succeed("Visualization dashboard started");

					// Give a moment for containers to initialize
					await new Promise((resolve) => setTimeout(resolve, 3000));

					// Get status with URL
					const updatedStatus =
						await dockerService.getVisualizationStatus();
					if (updatedStatus.running && updatedStatus.grafanaUrl) {
						showSuccess(
							`Grafana dashboard is available at: ${chalk.bold(
								updatedStatus.grafanaUrl,
							)}`,
						);
						showInfo(
							"Default login: username: admin, password: admin",
						);

						// Ask if user wants to open in browser
						const { openBrowser } = await inquirer.prompt([
							{
								type: "confirm",
								name: "openBrowser",
								message:
									"Do you want to open the dashboard in your browser?",
								default: true,
							},
						]);

						if (openBrowser) {
							await open(updatedStatus.grafanaUrl);
						}
					}
				} else {
					spinner.fail("Failed to start visualization dashboard");
				}
			} catch (error) {
				showError(`Error with visualization: ${error}`);
			}
		});

	// Parse command line arguments
	program.parse();

	// If no arguments passed, show help
	if (process.argv.length <= 2) {
		program.help();
	}
}

// Prompt for missing options
async function promptMissingOptions(options: any): Promise<LogQuery> {
	const questions: any[] = [];

	if (!options.client) {
		questions.push({
			type: "list",
			name: "clientName",
			message: "Which client do you want to view logs for?",
			choices: clients.map((client) => ({
				name: formatClientInfo(client),
				value: client.name,
			})),
		});
	}

	if (!options.date) {
		questions.push({
			type: "input",
			name: "date",
			message: "Enter date (YYYY-MM-DD):",
			default: new Date().toISOString().split("T")[0],
			validate: (input: string) => {
				const pattern = /^\d{4}-\d{2}-\d{2}$/;
				if (!pattern.test(input)) {
					return "Please enter a valid date in YYYY-MM-DD format";
				}

				// Extract month and validate it's between 01-12
				const month = parseInt(input.split("-")[1]);
				if (month < 1 || month > 12) {
					return "Invalid month. Month must be between 01-12";
				}

				return true;
			},
		});
	}

	const answers =
		questions.length > 0 ? await inquirer.prompt(questions) : {};

	const clientName = options.client || answers.clientName;
	const client = getClient(clientName);

	if (!client) {
		throw new Error(`Client "${clientName}" not found`);
	}

	return {
		clientName,
		date: options.date || answers.date,
		client,
	};
}

// View logs for a client and date
async function viewLogs(query: LogQuery): Promise<void> {
	const { client, date } = query;

	showInfo(
		`Fetching logs for ${formatClientName(client.name)} on ${formatDate(
			date,
		)} using AWS profile: ${formatAWSProfile(
			client.awsProfile || "sportz",
		)}`,
	);

	// Ensure logs directory is ready, clear raw logs but keep compressed logs
	await clearRawLogsDirectory();

	const s3Service = new S3Service(client);

	// List log files
	const spinner = createSpinner("Searching for log files...");
	spinner.start();

	try {
		const logFiles = await s3Service.listLogFiles(date);
		spinner.succeed(`Found ${logFiles.length} log files`);

		if (logFiles.length === 0) {
			showInfo("No log files found for the specified date.");
			return;
		}

		// Get a sample of log entries
		const sampleLogSpinner = createSpinner("Processing logs...");
		sampleLogSpinner.start();

		// Get the first log file
		const firstLogFile = logFiles[0];
		const localFilePath = await s3Service.downloadLogFile(firstLogFile);
		const logEntries = await s3Service.parseLogFile(localFilePath);

		// Clean up the temporary file
		await s3Service.cleanup(localFilePath);

		sampleLogSpinner.succeed(
			`Processed ${formatLogCount(
				logEntries.length,
			)} from ${path.basename(firstLogFile.key)}`,
		);

		if (logEntries.length === 0) {
			showInfo("No log entries found in the sample file.");
			return;
		}

		// Show sample log entries
		showInfo("Sample Log Entries:");

		// Display the first 10 log entries
		const sampleCount = Math.min(10, logEntries.length);
		for (let i = 0; i < sampleCount; i++) {
			console.log(formatLogEntry(logEntries[i]));
		}

		showSuccess(
			`Successfully fetched logs for ${formatClientName(
				client.name,
			)} on ${formatDate(date)}`,
		);
		showInfo(`Total log files available: ${logFiles.length}`);

		// Additional options
		const { action } = await inquirer.prompt([
			{
				type: "list",
				name: "action",
				message: "What would you like to do next?",
				choices: [
					{ name: "Exit", value: "exit" },
					{
						name: "Download all logs for this date",
						value: "download",
					},
					{ name: "View another date", value: "view-another" },
				],
			},
		]);

		if (action === "download") {
			await downloadAllLogs(client, date, logFiles, s3Service);

			// STEP 1: Ask if user wants to prepare raw logs from the compressed files
			const { prepareRawLogs } = await inquirer.prompt([
				{
					type: "confirm",
					name: "prepareRawLogs",
					message:
						"Do you want to extract raw logs from the compressed files?",
					default: true,
				},
			]);

			if (prepareRawLogs) {
				// Run prepare-logs command
				const logPreparationService = new LogPreparationService();
				const prepareSpinner = createSpinner(
					"Preparing logs for visualization...",
				);
				prepareSpinner.start();

				const result =
					await logPreparationService.prepareLogsForVisualization();

				if (result.success) {
					prepareSpinner.succeed(`Prepared logs for visualization`);
					showSuccess(
						`Decompressed ${result.decompressedCount} log files ready for visualization`,
					);

					// STEP 2: Ask if user wants to visualize the logs
					const { visualize } = await inquirer.prompt([
						{
							type: "confirm",
							name: "visualize",
							message:
								"Do you want to start the visualization dashboard?",
							default: true,
						},
					]);

					if (visualize) {
						// Start Docker containers for visualization
						const dockerService = new DockerService();

						// Check Docker availability
						const dockerAvailable =
							await dockerService.checkDockerAvailability();
						if (!dockerAvailable) {
							showError(
								"Docker is not available. Please install Docker and try again.",
							);
							return;
						}

						// Check Docker Compose availability
						const dockerComposeAvailable =
							await dockerService.checkDockerComposeAvailability();
						if (!dockerComposeAvailable) {
							showError(
								"Docker Compose is not available. Please install Docker Compose and try again.",
							);
							return;
						}

						// Check if containers are already running
						const status =
							await dockerService.getVisualizationStatus();
						if (status.running) {
							showInfo(
								"Visualization dashboard is already running",
							);
							if (status.grafanaUrl) {
								showSuccess(
									`Grafana dashboard is available at: ${chalk.bold(
										status.grafanaUrl,
									)}`,
								);
								showInfo(
									"Default login: username: admin, password: admin",
								);

								// Ask if user wants to open in browser
								const { openBrowser } = await inquirer.prompt([
									{
										type: "confirm",
										name: "openBrowser",
										message:
											"Do you want to open the dashboard in your browser?",
										default: true,
									},
								]);

								if (openBrowser) {
									await open(status.grafanaUrl);
								}
							}
							return;
						}

						// Start visualization
						const startSpinner = createSpinner(
							"Starting visualization dashboard...",
						);
						startSpinner.start();

						const visualizationStarted =
							await dockerService.startVisualization();

						if (visualizationStarted) {
							startSpinner.succeed(
								"Visualization dashboard started",
							);

							// Give a moment for containers to initialize
							await new Promise((resolve) =>
								setTimeout(resolve, 3000),
							);

							// Get status with URL
							const updatedStatus =
								await dockerService.getVisualizationStatus();
							if (
								updatedStatus.running &&
								updatedStatus.grafanaUrl
							) {
								showSuccess(
									`Grafana dashboard is available at: ${chalk.bold(
										updatedStatus.grafanaUrl,
									)}`,
								);
								showInfo(
									"Default login: username: admin, password: admin",
								);

								// Ask if user wants to open in browser
								const { openBrowser } = await inquirer.prompt([
									{
										type: "confirm",
										name: "openBrowser",
										message:
											"Do you want to open the dashboard in your browser?",
										default: true,
									},
								]);

								if (openBrowser) {
									await open(updatedStatus.grafanaUrl);
								}
							}
						} else {
							startSpinner.fail(
								"Failed to start visualization dashboard",
							);
						}
					}
				} else {
					prepareSpinner.fail(
						"Failed to prepare logs for visualization",
					);
				}
			}
		} else if (action === "view-another") {
			// Prompt for a new date
			const { newDate } = await inquirer.prompt([
				{
					type: "input",
					name: "newDate",
					message: "Enter date (YYYY-MM-DD):",
					default: new Date().toISOString().split("T")[0],
					validate: (input: string) => {
						const pattern = /^\d{4}-\d{2}-\d{2}$/;
						if (!pattern.test(input)) {
							return "Please enter a valid date in YYYY-MM-DD format";
						}

						// Extract month and validate it's between 01-12
						const month = parseInt(input.split("-")[1]);
						if (month < 1 || month > 12) {
							return "Invalid month. Month must be between 01-12";
						}

						return true;
					},
				},
			]);

			await viewLogs({
				clientName: client.name,
				date: newDate,
				client,
			});
		}
	} catch (error) {
		spinner.fail("Error fetching logs");
		if (error instanceof Error) {
			showError(error.message);
		} else {
			showError("An unknown error occurred");
		}
	}
}

// Function to handle downloading all logs
async function downloadAllLogs(
	client: Client,
	date: string,
	logFiles: S3Object[],
	s3Service: S3Service,
): Promise<void> {
	// First, clear the logs directory before downloading new logs
	await clearLogsDirectory();

	// Use the fixed logs directory path from the utility
	const downloadDir = await ensureLogsDir();

	const downloadSpinner = createSpinner(
		`Downloading ${logFiles.length} log files to logs directory...`,
	);
	downloadSpinner.start();

	try {
		const downloadedFiles = await s3Service.downloadAllLogFiles(
			logFiles,
			downloadDir,
		);
		downloadSpinner.succeed(
			`Downloaded ${downloadedFiles.length} log files`,
		);

		if (downloadedFiles.length > 0) {
			showSuccess(`Logs have been saved to ${chalk.bold(downloadDir)}`);

			// Count total lines in all files
			const countSpinner = createSpinner("Counting log entries...");
			countSpinner.start();

			let totalLines = 0;
			for (const file of downloadedFiles) {
				// Only count the decompressed log files
				if (file.endsWith(".log")) {
					const fileStream = createReadStream(file);
					const rl = createInterface({
						input: fileStream,
						crlfDelay: Infinity,
					});

					let fileLines = 0;
					for await (const _ of rl) {
						fileLines++;
					}
					totalLines += fileLines;
				}
			}

			countSpinner.succeed(
				`Total log entries: ${formatLogCount(totalLines)}`,
			);
		} else {
			showError("No files were downloaded successfully.");
		}
	} catch (error) {
		downloadSpinner.fail("Error downloading log files");
		if (error instanceof Error) {
			showError(error.message);
		} else {
			showError("An unknown error occurred during download");
		}
	}
}

// Start the CLI
init().catch((error) => {
	console.error("Error initializing CLI:", error);
	process.exit(1);
});
