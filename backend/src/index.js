const express = require("express");
const cors = require("cors");
const { db, initDb } = require("./db/schema");
const { ingestLogs } = require("./scripts/ingest");
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

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database and ingest logs
initDb();
ingestLogs("/logs/output.log");

// API endpoints
app.get("/api/logs/stats", (req, res) => {
	try {
		// Get total requests count
		const totalRequests = db
			.prepare("SELECT COUNT(*) as count FROM lb_logs")
			.get().count;

		// Get status code distribution
		const statusCodes = db
			.prepare(
				`
      SELECT elb_status_code as code, COUNT(*) as count 
      FROM lb_logs 
      GROUP BY elb_status_code
    `,
			)
			.all();

		// Get user agent distribution
		const userAgents = db
			.prepare(
				`
      SELECT user_agent as agent, COUNT(*) as count 
      FROM lb_logs 
      GROUP BY user_agent
    `,
			)
			.all();

		// Get top 10 URLs by response time
		const topUrlsResponseTime = db
			.prepare(
				`
      SELECT request_url as url, AVG(request_processing_time) as avg_time 
      FROM lb_logs 
      GROUP BY request_url 
      ORDER BY avg_time DESC 
      LIMIT 10
    `,
			)
			.all();

		// Get top 10 URLs by input bytes
		const topUrlsInputBytes = db
			.prepare(
				`
      SELECT request_url as url, SUM(received_bytes) as total_bytes 
      FROM lb_logs 
      GROUP BY request_url 
      ORDER BY total_bytes DESC 
      LIMIT 10
    `,
			)
			.all();

		// Get top 10 URLs by request bytes
		const topUrlsRequestBytes = db
			.prepare(
				`
      SELECT request_url as url, SUM(sent_bytes) as total_bytes 
      FROM lb_logs 
      GROUP BY request_url 
      ORDER BY total_bytes DESC 
      LIMIT 10
    `,
			)
			.all();

		res.json({
			total_requests: totalRequests,
			status_codes: statusCodes,
			user_agents: userAgents,
			top_urls_response_time: topUrlsResponseTime,
			top_urls_input_bytes: topUrlsInputBytes,
			top_urls_request_bytes: topUrlsRequestBytes,
		});
	} catch (error) {
		logger.error("Error getting stats:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/api/logs/export", (req, res) => {
	try {
		const { start_date, end_date } = req.query;
		let query = "SELECT * FROM lb_logs";
		const params = [];

		if (start_date || end_date) {
			query += " WHERE 1=1";
			if (start_date) {
				query += " AND timestamp >= ?";
				params.push(start_date);
			}
			if (end_date) {
				query += " AND timestamp <= ?";
				params.push(end_date);
			}
		}

		const logs = db.prepare(query).all(...params);

		// Convert to CSV
		const header = Object.keys(logs[0] || {}).join(",") + "\n";
		const rows = logs.map((log) => Object.values(log).join(",")).join("\n");
		const csv = header + rows;

		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", "attachment; filename=logs.csv");
		res.send(csv);
	} catch (error) {
		logger.error("Error exporting logs:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/api/logs/status-distribution", (req, res) => {
	try {
		const statusCodes = db
			.prepare(
				`
      SELECT elb_status_code as code, COUNT(*) as count 
      FROM lb_logs 
      GROUP BY elb_status_code
    `,
			)
			.all();
		res.json(statusCodes);
	} catch (error) {
		logger.error("Error getting status distribution:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/api/logs/user-agents", (req, res) => {
	try {
		const userAgents = db
			.prepare(
				`
      SELECT user_agent as agent, COUNT(*) as count 
      FROM lb_logs 
      GROUP BY user_agent
    `,
			)
			.all();
		res.json(userAgents);
	} catch (error) {
		logger.error("Error getting user agents:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/api/logs/top-urls", (req, res) => {
	try {
		const { metric = "response_time", limit = 10 } = req.query;
		let query;

		switch (metric) {
			case "response_time":
				query = `
          SELECT request_url as url, AVG(request_processing_time) as value 
          FROM lb_logs 
          GROUP BY request_url 
          ORDER BY value DESC 
          LIMIT ?
        `;
				break;
			case "input_bytes":
				query = `
          SELECT request_url as url, SUM(received_bytes) as value 
          FROM lb_logs 
          GROUP BY request_url 
          ORDER BY value DESC 
          LIMIT ?
        `;
				break;
			case "request_bytes":
				query = `
          SELECT request_url as url, SUM(sent_bytes) as value 
          FROM lb_logs 
          GROUP BY request_url 
          ORDER BY value DESC 
          LIMIT ?
        `;
				break;
			default:
				return res.status(400).json({ error: "Invalid metric" });
		}

		const results = db.prepare(query).all(limit);
		res.json(results);
	} catch (error) {
		logger.error("Error getting top URLs:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	logger.info(`Server is running on port ${PORT}`);
});
