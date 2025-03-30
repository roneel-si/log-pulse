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
import { getLogsDir, ensureLogsDir } from "./utils/paths.js";

// Load environment variables from .env file if it exists
dotenv.config();

// Define the program
const program = new Command();

// Function to clear the logs directory
async function clearLogsDirectory(): Promise<void> {
	const logsDir = await ensureLogsDir();

	try {
		console.log(`Preparing logs directory: ${logsDir}`);

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
			showInfo("Cleared previous log files");
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
	// Clear logs directory on startup
	await clearLogsDirectory();

	showTitle();

	program
		.name("log-pulse")
		.description("AWS Load Balancer Log Viewer")
		.version("1.0.0");

	program
		.command("view")
		.description("View logs for a specific client and date")
		.option("-c, --client <name>", "Client name")
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
