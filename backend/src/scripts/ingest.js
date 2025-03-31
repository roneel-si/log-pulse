const fs = require("fs");
const path = require("path");
const { db, initDb } = require("../db/schema");
const winston = require("winston");

// Configure logger
const logger = winston.createLogger({
	level: "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json(),
	),
	transports: [new winston.transports.Console()],
});

const parseTimestamp = (timestampStr) => {
	try {
		return new Date(timestampStr).toISOString();
	} catch (error) {
		return null;
	}
};

const safeNumber = (value) => {
	if (value === "-") return null;
	const num = Number(value);
	return isNaN(num) ? null : num;
};

const parseLogLine = (line) => {
	try {
		const parts = line.trim().split(" ");
		if (parts.length < 30) {
			logger.warn(`Invalid line format (not enough parts): ${line}`);
			return null;
		}

		return {
			type: parts[0],
			timestamp: parseTimestamp(parts[1]),
			elb: parts[2],
			client: parts[3],
			target: parts[4],
			request_processing_time: safeNumber(parts[5]),
			target_processing_time: safeNumber(parts[6]),
			response_processing_time: safeNumber(parts[7]),
			elb_status_code: safeNumber(parts[8]),
			target_status_code: safeNumber(parts[9]),
			received_bytes: safeNumber(parts[10]),
			sent_bytes: safeNumber(parts[11]),
			request_method: parts[12].replace(/"/g, ""),
			request_url: parts[13].replace(/"/g, ""),
			user_agent: parts.slice(14, -15).join(" ").replace(/"/g, ""),
			ssl_cipher: parts[parts.length - 15],
			ssl_protocol: parts[parts.length - 14],
			target_group_arn: parts[parts.length - 13],
			trace_id: parts[parts.length - 12].replace(/"/g, ""),
			domain_name: parts[parts.length - 11].replace(/"/g, ""),
			chosen_cert_arn: parts[parts.length - 10],
			matched_rule_priority: parts[parts.length - 9],
			request_creation_time: parts[parts.length - 8],
			actions_executed: parts[parts.length - 7].replace(/"/g, ""),
			redirect_url: parts[parts.length - 6].replace(/"/g, ""),
			lambda_error_reason: parts[parts.length - 5].replace(/"/g, ""),
			target_port_list: parts[parts.length - 4].replace(/"/g, ""),
			target_status_code_list: parts[parts.length - 3].replace(/"/g, ""),
			new_field: parts[parts.length - 2].replace(/"/g, ""),
		};
	} catch (error) {
		logger.error(`Error parsing line: ${error.message}`);
		logger.error(`Line content: ${line}`);
		return null;
	}
};

const ingestLogs = (logFilePath) => {
	logger.info(`Starting log ingestion from ${logFilePath}`);

	// Initialize database
	logger.info("Initializing database...");
	initDb();
	logger.info("Database initialized");

	try {
		// Clear existing data
		logger.info("Clearing existing data...");
		db.prepare("DELETE FROM lb_logs").run();
		logger.info("Existing data cleared");

		// Prepare insert statement
		const insertStmt = db.prepare(`
      INSERT INTO lb_logs (
        type, timestamp, elb, client, target,
        request_processing_time, target_processing_time, response_processing_time,
        elb_status_code, target_status_code, received_bytes, sent_bytes,
        request_method, request_url, user_agent, ssl_cipher, ssl_protocol,
        target_group_arn, trace_id, domain_name, chosen_cert_arn,
        matched_rule_priority, request_creation_time, actions_executed,
        redirect_url, lambda_error_reason, target_port_list,
        target_status_code_list, new_field
      ) VALUES (
        @type, @timestamp, @elb, @client, @target,
        @request_processing_time, @target_processing_time, @response_processing_time,
        @elb_status_code, @target_status_code, @received_bytes, @sent_bytes,
        @request_method, @request_url, @user_agent, @ssl_cipher, @ssl_protocol,
        @target_group_arn, @trace_id, @domain_name, @chosen_cert_arn,
        @matched_rule_priority, @request_creation_time, @actions_executed,
        @redirect_url, @lambda_error_reason, @target_port_list,
        @target_status_code_list, @new_field
      )
    `);

		// Begin transaction
		const transaction = db.transaction((logs) => {
			for (const log of logs) {
				insertStmt.run(log);
			}
		});

		logger.info("Reading log file...");
		const fileContent = fs.readFileSync(logFilePath, "utf8");
		const lines = fileContent.split("\n");

		let batch = [];
		let lineCount = 0;
		let successCount = 0;

		for (const line of lines) {
			lineCount++;
			if (!line.trim()) continue;

			const parsedLog = parseLogLine(line);
			if (parsedLog) {
				batch.push(parsedLog);
				successCount++;

				// Process in batches of 100
				if (batch.length >= 100) {
					logger.info(`Saving batch of ${batch.length} records...`);
					transaction(batch);
					batch = [];
				}
			}
		}

		// Save any remaining entries
		if (batch.length > 0) {
			logger.info(`Saving final batch of ${batch.length} records...`);
			transaction(batch);
		}

		logger.info("Log ingestion completed successfully");
		logger.info(`Processed ${lineCount} lines`);
		logger.info(`Successfully ingested ${successCount} records`);
	} catch (error) {
		logger.error("Error during log ingestion:", error);
		throw error;
	}
};

// If running directly (not imported as a module)
if (require.main === module) {
	const logFilePath = "/logs/output.log";
	ingestLogs(logFilePath);
}

module.exports = { ingestLogs };
