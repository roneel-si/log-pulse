const Database = require("better-sqlite3");
const path = require("path");
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

const dbPath = path.join(__dirname, "../../data/logs.db");
logger.info(`Using database at: ${dbPath}`);

const db = new Database(dbPath);

const createTable = () => {
	logger.info("Creating database tables...");
	db.exec(`
    CREATE TABLE IF NOT EXISTS lb_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      timestamp TEXT,
      elb TEXT,
      client TEXT,
      target TEXT,
      request_processing_time REAL,
      target_processing_time REAL,
      response_processing_time REAL,
      elb_status_code INTEGER,
      target_status_code INTEGER,
      received_bytes INTEGER,
      sent_bytes INTEGER,
      request_method TEXT,
      request_url TEXT,
      user_agent TEXT,
      ssl_cipher TEXT,
      ssl_protocol TEXT,
      target_group_arn TEXT,
      trace_id TEXT,
      domain_name TEXT,
      chosen_cert_arn TEXT,
      matched_rule_priority TEXT,
      request_creation_time TEXT,
      actions_executed TEXT,
      redirect_url TEXT,
      lambda_error_reason TEXT,
      target_port_list TEXT,
      target_status_code_list TEXT,
      new_field TEXT
    )
  `);
	logger.info("Database tables created successfully");
};

const createIndexes = () => {
	logger.info("Creating database indexes...");
	const indexes = [
		"CREATE INDEX IF NOT EXISTS idx_timestamp ON lb_logs(timestamp)",
		"CREATE INDEX IF NOT EXISTS idx_elb_status_code ON lb_logs(elb_status_code)",
		"CREATE INDEX IF NOT EXISTS idx_request_url ON lb_logs(request_url)",
		"CREATE INDEX IF NOT EXISTS idx_user_agent ON lb_logs(user_agent)",
	];

	indexes.forEach((index) => {
		db.exec(index);
	});
	logger.info("Database indexes created successfully");
};

const initDb = () => {
	try {
		createTable();
		createIndexes();
		logger.info("Database initialized successfully");
	} catch (error) {
		logger.error("Error initializing database:", error);
		throw error;
	}
};

module.exports = { db, initDb };
