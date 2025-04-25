const { db } = require("./schema");
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

const insertLogEntry = (logEntry) => {
	try {
		const stmt = db.prepare(`
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

		const result = stmt.run(logEntry);
		return result.lastInsertRowid;
	} catch (error) {
		logger.error("Error inserting log entry:", error);
		throw error;
	}
};

const insertBulkLogEntries = (logEntries) => {
	try {
		const stmt = db.prepare(`
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

		const insertMany = db.transaction((entries) => {
			for (const entry of entries) {
				stmt.run(entry);
			}
		});

		insertMany(logEntries);
		return true;
	} catch (error) {
		logger.error("Error inserting bulk log entries:", error);
		throw error;
	}
};

const queryLogs = (filters = {}, page = 1, limit = 100) => {
	try {
		let query = "SELECT * FROM lb_logs WHERE 1=1";
		const params = {};
		const offset = (page - 1) * limit;

		if (filters.startDate) {
			query += " AND timestamp >= @startDate";
			params.startDate = filters.startDate;
		}

		if (filters.endDate) {
			query += " AND timestamp <= @endDate";
			params.endDate = filters.endDate;
		}

		if (filters.statusCode) {
			query += " AND elb_status_code = @statusCode";
			params.statusCode = filters.statusCode;
		}

		if (filters.requestMethod) {
			query += " AND request_method = @requestMethod";
			params.requestMethod = filters.requestMethod;
		}

		if (filters.searchTerm) {
			query +=
				" AND (request_url LIKE @searchTerm OR user_agent LIKE @searchTerm)";
			params.searchTerm = `%${filters.searchTerm}%`;
		}

		// Add pagination
		query += " ORDER BY timestamp DESC LIMIT @limit OFFSET @offset";
		params.limit = limit;
		params.offset = offset;

		const stmt = db.prepare(query);
		const results = stmt.all(params);

		// Get total count for pagination
		let countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
		countQuery = countQuery.split("LIMIT")[0]; // Remove LIMIT clause
		const countStmt = db.prepare(countQuery);
		const { count } = countStmt.get(params);

		return {
			logs: results,
			pagination: {
				total: count,
				page,
				limit,
				totalPages: Math.ceil(count / limit),
			},
		};
	} catch (error) {
		logger.error("Error querying logs:", error);
		throw error;
	}
};

const getStatistics = (startDate, endDate) => {
	try {
		const params = { startDate, endDate };

		// Get total request count
		const totalRequests = db
			.prepare(
				`
      SELECT COUNT(*) as total_count
      FROM lb_logs
      WHERE timestamp BETWEEN @startDate AND @endDate
    `,
			)
			.get(params);

		// Get status code distribution
		const statusCodeStats = db
			.prepare(
				`
      SELECT elb_status_code, COUNT(*) as count
      FROM lb_logs
      WHERE timestamp BETWEEN @startDate AND @endDate
      GROUP BY elb_status_code
      ORDER BY count DESC
    `,
			)
			.all(params);

		// Get request method distribution
		const requestMethods = db
			.prepare(
				`
      SELECT request_method, COUNT(*) as count
      FROM lb_logs
      WHERE timestamp BETWEEN @startDate AND @endDate
      GROUP BY request_method
      ORDER BY count DESC
    `,
			)
			.all(params);

		// Get top URLs by request count
		const topUrls = db
			.prepare(
				`
      SELECT request_url, COUNT(*) as count
      FROM lb_logs
      WHERE timestamp BETWEEN @startDate AND @endDate
      GROUP BY request_url
      ORDER BY count DESC
      LIMIT 10
    `,
			)
			.all(params);

		// Get top URLs by received bytes (inbytes)
		const topUrlsByInBytes = db
			.prepare(
				`
      SELECT request_url, SUM(received_bytes) as total_bytes, COUNT(*) as request_count
      FROM lb_logs
      WHERE timestamp BETWEEN @startDate AND @endDate
      GROUP BY request_url
      ORDER BY total_bytes DESC
      LIMIT 5
    `,
			)
			.all(params);

		// Get top URLs by sent bytes (outbytes)
		const topUrlsByOutBytes = db
			.prepare(
				`
      SELECT request_url, SUM(sent_bytes) as total_bytes, COUNT(*) as request_count
      FROM lb_logs
      WHERE timestamp BETWEEN @startDate AND @endDate
      GROUP BY request_url
      ORDER BY total_bytes DESC
      LIMIT 5
    `,
			)
			.all(params);

		// Get top URLs with 4xx status codes
		const topUrls4xx = db
			.prepare(
				`
      SELECT request_url, COUNT(*) as count
      FROM lb_logs
      WHERE timestamp BETWEEN @startDate AND @endDate
      AND elb_status_code >= 400 AND elb_status_code < 500
      GROUP BY request_url
      ORDER BY count DESC
      LIMIT 10
    `,
			)
			.all(params);

		// Get top URLs with 5xx status codes
		const topUrls5xx = db
			.prepare(
				`
      SELECT request_url, COUNT(*) as count
      FROM lb_logs
      WHERE timestamp BETWEEN @startDate AND @endDate
      AND elb_status_code >= 500
      GROUP BY request_url
      ORDER BY count DESC
      LIMIT 10
    `,
			)
			.all(params);

	// Get top URLs with 5xx status codes
	const topUrlsTargetResponseTimeout = db
	.prepare(
		`
	SELECT request_url, COUNT(*) as count
	FROM lb_logs
	WHERE timestamp BETWEEN @startDate AND @endDate
	AND elb_status_code >= 500
	GROUP BY request_url
	ORDER BY count DESC
	LIMIT 10
	`,
			)
			.all(params);


		// Get top user agents by request count
		const topUserAgents = db
			.prepare(
				`
      SELECT user_agent, COUNT(*) as count
      FROM lb_logs
      WHERE timestamp BETWEEN @startDate AND @endDate
      GROUP BY user_agent
      ORDER BY count DESC
      LIMIT 5
    `,
			)
			.all(params);

		return {
			totalRequests: totalRequests.total_count,
			statusCodeDistribution: statusCodeStats,
			requestMethodDistribution: requestMethods,
			topUrls,
			topUrlsByInBytes,
			topUrlsByOutBytes,
			topUrls4xx,
			topUrls5xx,
			topUrlsTargetResponseTimeout,
			topUserAgents,
		};
	} catch (error) {
		logger.error("Error getting statistics:", error);
		throw error;
	}
};

module.exports = {
	insertLogEntry,
	insertBulkLogEntries,
	queryLogs,
	getStatistics,
};
