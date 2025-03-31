import fs from "fs/promises";
import { createReadStream, createWriteStream, existsSync } from "fs";
import path from "path";
import { createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import { getLogsDir, getRawLogsDir, ensureRawLogsDir } from "../utils/paths.js";

export class LogPreparationService {
	/**
	 * Prepare logs for visualization by ensuring all logs are properly decompressed
	 */
	async prepareLogsForVisualization(): Promise<{
		success: boolean;
		decompressedCount: number;
		errorCount: number;
	}> {
		try {
			// Get logs directory (compressed logs)
			const logsDir = await getLogsDir();
			// Get raw logs directory (uncompressed logs)
			const rawLogsDir = await ensureRawLogsDir();

			console.log(`Preparing logs from directory: ${logsDir}`);
			console.log(`Decompressing to directory: ${rawLogsDir}`);

			// Check if logs directory exists
			if (!existsSync(logsDir)) {
				await fs.mkdir(logsDir, { recursive: true });
				console.log(`Created logs directory: ${logsDir}`);
				return { success: true, decompressedCount: 0, errorCount: 0 };
			}

			// Get all files in the logs directory
			const files = await fs.readdir(logsDir);
			console.log(`Found ${files.length} files in logs directory`);

			let decompressedCount = 0;
			let errorCount = 0;
			const decompressedFiles: string[] = [];

			// Process each file
			for (const file of files) {
				const filePath = path.join(logsDir, file);
				const stats = await fs.stat(filePath);

				if (stats.isFile()) {
					// Decompress gzip files
					if (file.endsWith(".gz")) {
						try {
							const decompressedPath = path.join(
								rawLogsDir,
								file.replace(/\.gz$/, ".log"),
							);
							console.log(
								`Decompressing ${file} to ${path.basename(
									decompressedPath,
								)}`,
							);

							const readStream = createReadStream(filePath);
							const gunzip = createGunzip();
							const writeStream =
								createWriteStream(decompressedPath);

							await pipeline(readStream, gunzip, writeStream);
							decompressedCount++;
							decompressedFiles.push(decompressedPath);
							console.log(
								`Added ${decompressedPath} to decompressedFiles array (count: ${decompressedFiles.length})`,
							);

							// We keep the compressed file for backup
							console.log(`Keeping compressed file: ${file}`);
						} catch (error) {
							console.error(
								`Error decompressing ${file}:`,
								error,
							);
							errorCount++;
						}
					} else if (file.endsWith(".log")) {
						// Copy log files that are already uncompressed to the raw logs directory
						try {
							const destPath = path.join(rawLogsDir, file);
							await fs.copyFile(filePath, destPath);
							console.log(
								`Copied log file: ${file} to raw logs directory`,
							);
							decompressedCount++;
							decompressedFiles.push(destPath);
							console.log(
								`Added ${destPath} to decompressedFiles array (count: ${decompressedFiles.length})`,
							);
						} catch (error) {
							console.error(`Error copying ${file}:`, error);
							errorCount++;
						}
					}
				}
			}

			// Combine all decompressed logs into a single output.log file
			console.log(
				`Total decompressed files to combine: ${decompressedFiles.length}`,
			);

			if (decompressedFiles.length > 0) {
				console.log(
					"Combining all logs into a single output.log file...",
				);
				const outputPath = path.join(rawLogsDir, "output.log");
				console.log(`Output path: ${outputPath}`);

				try {
					// Sort files by timestamp if possible to ensure chronological order
					decompressedFiles.sort();
					console.log("Sorted decompressed files");

					// Create output file and write directly with fs.writeFile
					let combinedContent = "";

					for (const filePath of decompressedFiles) {
						console.log(
							`Reading ${path.basename(filePath)} for output.log`,
						);
						try {
							const fileContent = await fs.readFile(
								filePath,
								"utf8",
							);
							console.log(
								`Read ${
									fileContent.length
								} bytes from ${path.basename(filePath)}`,
							);

							// Filter out empty lines before writing to output
							const nonEmptyLines = fileContent
								.split("\n")
								.filter((line) => line.trim() !== "")
								.join("\n");

							if (nonEmptyLines.length > 0) {
								combinedContent += nonEmptyLines + "\n";
								console.log(
									`Added ${nonEmptyLines.length} bytes to combined content`,
								);
							}
						} catch (readError) {
							console.error(
								`Error reading ${filePath}:`,
								readError,
							);
						}
					}

					console.log(
						`Writing ${combinedContent.length} bytes to ${outputPath}`,
					);
					await fs.writeFile(outputPath, combinedContent);

					console.log(
						`Created consolidated log file: output.log with content from ${decompressedFiles.length} files`,
					);

					// Delete the individual log files after successfully creating the combined file
					console.log("Cleaning up individual log files...");
					for (const filePath of decompressedFiles) {
						await fs.unlink(filePath);
						console.log(`Removed file: ${path.basename(filePath)}`);
					}
					console.log(
						"Cleanup complete. Only output.log remains in the raw logs directory.",
					);
				} catch (error) {
					console.error("Error combining log files:", error);
					errorCount++;
				}
			} else {
				console.log("No files to combine into output.log");
			}

			return { success: true, decompressedCount, errorCount };
		} catch (error) {
			console.error("Error preparing logs:", error);
			return { success: false, decompressedCount: 0, errorCount: 1 };
		}
	}

	/**
	 * Check if there are any log files available for visualization
	 */
	async checkForLogFiles(): Promise<{ available: boolean; count: number }> {
		try {
			const rawLogsDir = await getRawLogsDir();

			if (!existsSync(rawLogsDir)) {
				return { available: false, count: 0 };
			}

			const files = await fs.readdir(rawLogsDir);
			const logFiles = files.filter((file) => file.endsWith(".log"));

			return {
				available: logFiles.length > 0,
				count: logFiles.length,
			};
		} catch (error) {
			console.error("Error checking for log files:", error);
			return { available: false, count: 0 };
		}
	}
}
