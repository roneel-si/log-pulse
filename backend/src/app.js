const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const winston = require("winston");
const routes = require("./routes/routes");
const { initDb } = require("./db/schema");
const { ingestLogs } = require("./scripts/ingest");

// Configure logger
const logger = winston.createLogger({
	level: "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json(),
	),
	transports: [new winston.transports.Console()],
});

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

// Initialize database and ingest logs
try {
	initDb();
	logger.info("Database initialized successfully");

	// Ingest logs from the mounted volume
	ingestLogs("/logs/output.log");
	logger.info("Log ingestion completed");
} catch (error) {
	logger.error("Error during initialization:", error);
	process.exit(1);
}

// Routes
app.use("/api", routes);

// Error handling middleware
app.use((err, req, res, next) => {
	logger.error("Unhandled error:", err);
	res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	logger.info(`Server is running on port ${PORT}`);
});

module.exports = app;
