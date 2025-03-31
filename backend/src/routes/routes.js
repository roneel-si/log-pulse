const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { parseLogFile } = require("../utils/logParser");
const {
	insertBulkLogEntries,
	queryLogs,
	getStatistics,
} = require("../db/dbOperations");
const winston = require("winston");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Configure logger
const logger = winston.createLogger({
	level: "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json(),
	),
	transports: [new winston.transports.Console()],
});

// Upload and process log file
router.post("/upload", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		const fileContent = fs.readFileSync(req.file.path, "utf8");
		const parseResult = parseLogFile(fileContent);

		if (parseResult.validEntries.length > 0) {
			await insertBulkLogEntries(parseResult.validEntries);
		}

		// Clean up uploaded file
		fs.unlinkSync(req.file.path);

		res.json({
			message: "File processed successfully",
			totalLines: parseResult.totalLines,
			validEntries: parseResult.validCount,
			invalidEntries: parseResult.invalidCount,
		});
	} catch (error) {
		logger.error("Error processing uploaded file:", error);
		res.status(500).json({ error: "Error processing file" });
	}
});

// Query logs with filters and pagination
router.get("/logs", async (req, res) => {
	try {
		const {
			page = 1,
			limit = 100,
			startDate,
			endDate,
			statusCode,
			requestMethod,
			searchTerm,
		} = req.query;

		const filters = {
			startDate,
			endDate,
			statusCode: statusCode ? parseInt(statusCode) : undefined,
			requestMethod,
			searchTerm,
		};

		const result = await queryLogs(
			filters,
			parseInt(page),
			parseInt(limit),
		);
		res.json(result);
	} catch (error) {
		logger.error("Error querying logs:", error);
		res.status(500).json({ error: "Error retrieving logs" });
	}
});

// Get statistics for a time range
router.get("/statistics", async (req, res) => {
	try {
		const { startDate, endDate } = req.query;

		if (!startDate || !endDate) {
			return res
				.status(400)
				.json({ error: "Start date and end date are required" });
		}

		const stats = await getStatistics(startDate, endDate);
		res.json(stats);
	} catch (error) {
		logger.error("Error getting statistics:", error);
		res.status(500).json({ error: "Error retrieving statistics" });
	}
});

// Download logs as CSV
router.get("/download-logs", async (req, res) => {
	try {
		const { startDate, endDate } = req.query;

		if (!startDate || !endDate) {
			return res
				.status(400)
				.json({ error: "Start date and end date are required" });
		}

		const logs = await queryLogs({ startDate, endDate });

		// Set headers for CSV download
		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", "attachment; filename=logs.csv");

		// Create CSV header
		const csvHeader =
			[
				"timestamp",
				"request_method",
				"request_url",
				"elb_status_code",
				"target_status_code",
				"received_bytes",
				"sent_bytes",
				"user_agent",
			].join(",") + "\n";

		// Create CSV rows
		const csvRows = logs.logs.map((log) =>
			[
				log.timestamp,
				log.request_method,
				log.request_url,
				log.elb_status_code,
				log.target_status_code,
				log.received_bytes,
				log.sent_bytes,
				`"${log.user_agent.replace(/"/g, '""')}"`, // Escape quotes in user agent
			].join(","),
		);

		// Send CSV data
		res.write(csvHeader);
		csvRows.forEach((row) => res.write(row + "\n"));
		res.end();
	} catch (error) {
		logger.error("Error downloading logs:", error);
		res.status(500).json({ error: "Error downloading logs" });
	}
});

// Health check endpoint
router.get("/health", (req, res) => {
	res.json({ status: "healthy" });
});

module.exports = router;
