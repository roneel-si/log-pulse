import {
	S3Client,
	ListObjectsV2Command,
	GetObjectCommand,
} from "@aws-sdk/client-s3";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { createGunzip } from "zlib";
import { Client, S3Object, LogLine } from "../types/index.js";
import { createInterface } from "readline";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

const execPromise = promisify(exec);

export class S3Service {
	private s3Client: S3Client;
	private client: Client;

	constructor(client: Client) {
		this.client = client;

		const config: any = {
			region: client.region,
		};

		// Use client-specific profile if available, otherwise use "sportz" as default
		const awsProfile = client.awsProfile || "sportz";

		// Set AWS profile using credential provider
		process.env.AWS_PROFILE = awsProfile;
		console.log(`Using AWS profile: ${awsProfile}`);

		this.s3Client = new S3Client(config);
	}

	async listLogFiles(date: string): Promise<S3Object[]> {
		let prefix: string;

		// Extract year, month, day from the date
		const [year, month, day] = date.split("-");

		// Handle different S3 path structures based on client
		if (this.client.s3Prefix.includes("AWSLogs")) {
			// For AWS ELB logs with format like: elb-washington/AWSLogs/572143828798/elasticloadbalancing/us-east-1/2025/03/30/
			prefix = `${this.client.s3Prefix}/${year}/${month}/${day}/`;
		} else {
			// For standard format: alb-logs/2023/06/01/
			const datePrefix = date.replace(/-/g, "/");
			prefix = `${this.client.s3Prefix}/${datePrefix}/`;
		}

		console.log("Using S3 prefix:", prefix);
		console.log("S3 Bucket:", this.client.s3Bucket);

		try {
			const command = new ListObjectsV2Command({
				Bucket: this.client.s3Bucket,
				Prefix: prefix,
			});

			const response = await this.s3Client.send(command);

			if (!response.Contents || response.Contents.length === 0) {
				return [];
			}

			return response.Contents.map((item) => ({
				key: item.Key || "",
				size: item.Size || 0,
				lastModified: item.LastModified,
			})).filter(
				(obj) => obj.key.endsWith(".gz") || obj.key.endsWith(".zip"),
			);
		} catch (error) {
			console.error("Error listing S3 objects:", error);
			throw error;
		}
	}

	async downloadLogFile(s3Object: S3Object): Promise<string> {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "log-pulse-"));
		const fileName = path.basename(s3Object.key);
		const outputPath = path.join(tempDir, fileName);
		const decompressedPath = outputPath.replace(/\.(gz|zip)$/, ".log");

		try {
			const command = new GetObjectCommand({
				Bucket: this.client.s3Bucket,
				Key: s3Object.key,
			});

			const response = await this.s3Client.send(command);

			if (!response.Body) {
				throw new Error("No data returned from S3");
			}

			// Download the compressed file
			const writeStream = createWriteStream(outputPath);
			// @ts-ignore - TypeScript doesn't recognize Body as a stream
			await pipeline(response.Body, writeStream);

			// Decompress if it's a gzip file
			if (s3Object.key.endsWith(".gz")) {
				const readStream = createReadStream(outputPath);
				const gunzip = createGunzip();
				const writeDecompressedStream =
					createWriteStream(decompressedPath);
				await pipeline(readStream, gunzip, writeDecompressedStream);
			} else {
				// Handle zip files if needed
				// This would use a zip library
			}

			return decompressedPath;
		} catch (error) {
			console.error("Error downloading file:", error);
			throw error;
		}
	}

	async downloadAllLogFiles(
		logFiles: S3Object[],
		outputDir: string,
	): Promise<string[]> {
		// Create output directory if it doesn't exist
		try {
			await fs.mkdir(outputDir, { recursive: true });
			console.log(`Ensuring output directory exists: ${outputDir}`);
		} catch (error) {
			console.error("Error creating output directory:", error);
			throw error;
		}

		// Generate the S3 prefix based on client configuration and date
		const s3Prefix = logFiles[0].key.substring(
			0,
			logFiles[0].key.lastIndexOf("/") + 1,
		);
		const s3Uri = `s3://${this.client.s3Bucket}/${s3Prefix}`;
		const awsProfile = this.client.awsProfile || "sportz";

		try {
			// Create a temporary folder for the download
			const tempDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "log-pulse-download-"),
			);
			console.log(`Created temporary directory: ${tempDir}`);

			// Use AWS CLI for faster downloads - download to temp dir first
			const command = `aws s3 cp ${s3Uri} ${tempDir} --profile ${awsProfile} --recursive`;
			console.log(`Executing: ${command}`);

			const { stdout, stderr } = await execPromise(command);
			if (stderr && !stderr.includes("download")) {
				console.warn("AWS CLI warnings:", stderr);
			}

			// Move files from the temp directory to the output directory
			await this.moveFilesFromTempToOutput(tempDir, outputDir);

			// Get a list of all downloaded files
			const downloadedFiles: string[] = [];
			const files = await fs.readdir(outputDir);
			for (const file of files) {
				downloadedFiles.push(path.join(outputDir, file));
			}

			return downloadedFiles;
		} catch (error) {
			console.error("Error downloading log files:", error);
			throw error;
		}
	}

	// Helper method to move files from temp directory to output directory
	private async moveFilesFromTempToOutput(
		tempDir: string,
		outputDir: string,
	): Promise<void> {
		try {
			const files = await fs.readdir(tempDir);
			console.log(`Found ${files.length} files in temp directory`);

			// Move each file to the output directory
			for (const file of files) {
				const sourcePath = path.join(tempDir, file);
				const targetPath = path.join(outputDir, file);
				const stats = await fs.stat(sourcePath);

				if (stats.isFile()) {
					// Keep the original file extension (.gz)
					await fs.copyFile(sourcePath, targetPath);
					console.log(`Copied file: ${file} to output directory`);
				} else if (stats.isDirectory()) {
					// Create the directory in the output location
					await fs.mkdir(targetPath, { recursive: true });

					// Recursively move files from this subdirectory
					await this.moveFilesFromTempToOutput(
						sourcePath,
						targetPath,
					);
				}
			}

			// Clean up the temp directory after moving all files
			await fs.rm(tempDir, { recursive: true, force: true });
			console.log(`Removed temporary directory: ${tempDir}`);
		} catch (error) {
			console.error("Error moving files from temp directory:", error);
			throw error;
		}
	}

	async parseLogFile(filePath: string): Promise<LogLine[]> {
		const logLines: LogLine[] = [];
		const fileStream = createReadStream(filePath);
		const rl = createInterface({
			input: fileStream,
			crlfDelay: Infinity,
		});

		for await (const line of rl) {
			if (line.trim()) {
				const parsedLine = this.parseLogLine(line);
				if (parsedLine) {
					logLines.push(parsedLine);
				}
			}
		}

		return logLines;
	}

	private parseLogLine(line: string): LogLine | null {
		try {
			// This parser is specific to ALB/ELB log formats
			// Sample format for ALB:
			// http://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
			const fields = line.split(" ");

			if (this.client.loadBalancerType === "ALB") {
				// ALB format parsing
				// This is simplified and would need to be extended
				return {
					timestamp: fields[0],
					elb: fields[1],
					client_ip: fields[2].split(":")[0],
					client_port: parseInt(fields[2].split(":")[1]),
					request: fields[12],
					raw: line,
				};
			} else {
				// ELB format parsing
				// Also simplified
				return {
					timestamp: fields[0],
					elb: fields[1],
					client_ip: fields[2].split(":")[0],
					client_port: parseInt(fields[2].split(":")[1]),
					request: fields[12],
					raw: line,
				};
			}
		} catch (error) {
			console.warn("Error parsing log line:", error);
			return null;
		}
	}

	async cleanup(filePath: string): Promise<void> {
		try {
			await fs.unlink(filePath);
			const tempDir = path.dirname(filePath);
			const files = await fs.readdir(tempDir);
			if (files.length === 0) {
				await fs.rmdir(tempDir);
			}
		} catch (error) {
			console.error("Error cleaning up:", error);
		}
	}
}
