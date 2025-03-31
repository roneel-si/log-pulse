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

const parseLogEntry = (logLine) => {
	try {
		// Split the log line by spaces while preserving quoted strings
		const parts = logLine.match(/(?:[^\s"]+|"[^"]*")+/g);
		if (!parts || parts.length < 2) {
			throw new Error("Invalid log format");
		}

		// Remove quotes from parts
		const cleanParts = parts.map((part) => part.replace(/^"|"$/g, ""));

		// Parse the log entry according to ALB log format
		const logEntry = {
			type: cleanParts[0],
			timestamp: cleanParts[1],
			elb: cleanParts[2],
			client: cleanParts[3],
			target: cleanParts[4],
			request_processing_time: parseFloat(cleanParts[5]),
			target_processing_time: parseFloat(cleanParts[6]),
			response_processing_time: parseFloat(cleanParts[7]),
			elb_status_code: parseInt(cleanParts[8]),
			target_status_code: parseInt(cleanParts[9]),
			received_bytes: parseInt(cleanParts[10]),
			sent_bytes: parseInt(cleanParts[11]),
			request_method: cleanParts[12].split(" ")[0],
			request_url: cleanParts[12].split(" ")[1],
			user_agent: cleanParts[13],
			ssl_cipher: cleanParts[14],
			ssl_protocol: cleanParts[15],
			target_group_arn: cleanParts[16],
			trace_id: cleanParts[17],
			domain_name: cleanParts[18],
			chosen_cert_arn: cleanParts[19],
			matched_rule_priority: cleanParts[20],
			request_creation_time: cleanParts[21],
			actions_executed: cleanParts[22],
			redirect_url: cleanParts[23],
			lambda_error_reason: cleanParts[24],
			target_port_list: cleanParts[25],
			target_status_code_list: cleanParts[26],
			new_field: cleanParts[27] || null,
		};

		return logEntry;
	} catch (error) {
		logger.error("Error parsing log entry:", {
			error: error.message,
			logLine,
		});
		return null;
	}
};

const validateLogEntry = (logEntry) => {
	if (!logEntry) return false;

	const requiredFields = [
		"type",
		"timestamp",
		"elb",
		"client",
		"target",
		"request_processing_time",
		"target_processing_time",
		"response_processing_time",
		"elb_status_code",
		"target_status_code",
		"received_bytes",
		"sent_bytes",
		"request_method",
		"request_url",
	];

	return requiredFields.every((field) => {
		const value = logEntry[field];
		return value !== undefined && value !== null && value !== "";
	});
};

const parseLogFile = (fileContent) => {
	const validEntries = [];
	const invalidEntries = [];

	const lines = fileContent.split("\n").filter((line) => line.trim());

	lines.forEach((line, index) => {
		try {
			const entry = parseLogEntry(line);
			if (entry && validateLogEntry(entry)) {
				validEntries.push(entry);
			} else {
				invalidEntries.push({ line: index + 1, content: line });
			}
		} catch (error) {
			logger.error("Error processing line:", {
				lineNumber: index + 1,
				error: error.message,
			});
			invalidEntries.push({ line: index + 1, content: line });
		}
	});

	return {
		validEntries,
		invalidEntries,
		totalLines: lines.length,
		validCount: validEntries.length,
		invalidCount: invalidEntries.length,
	};
};

module.exports = {
	parseLogEntry,
	validateLogEntry,
	parseLogFile,
};
