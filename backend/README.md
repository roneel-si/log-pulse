# LogPulse Backend

This is the backend service for LogPulse, an Application Load Balancer (ALB) log analyzer. It provides APIs for uploading, parsing, and analyzing ALB logs.

## Features

-   Upload and parse ALB log files
-   Store log entries in SQLite database
-   Query logs with filters and pagination
-   Generate statistics and analytics
-   RESTful API endpoints

## Prerequisites

-   Node.js (v14 or higher)
-   npm (v6 or higher)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd log-pulse/backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a data directory for the SQLite database:

```bash
mkdir data
```

## Configuration

The application uses the following environment variables:

-   `PORT`: Server port (default: 3000)

## Running the Application

### Development Mode

```bash
npm run dev
```

This will start the server with nodemon for automatic reloading during development.

### Production Mode

```bash
npm start
```

## API Endpoints

### Upload Log File

-   **POST** `/api/upload`
-   Accepts multipart form data with a file field
-   Returns processing results including valid and invalid entry counts

### Query Logs

-   **GET** `/api/logs`
-   Query Parameters:
    -   `page`: Page number (default: 1)
    -   `limit`: Items per page (default: 100)
    -   `startDate`: Filter by start date
    -   `endDate`: Filter by end date
    -   `statusCode`: Filter by status code
    -   `requestMethod`: Filter by HTTP method
    -   `searchTerm`: Search in URLs and user agents

### Get Statistics

-   **GET** `/api/statistics`
-   Query Parameters:
    -   `startDate`: Start date for statistics
    -   `endDate`: End date for statistics
-   Returns various statistics about the logs in the specified time range

### Health Check

-   **GET** `/api/health`
-   Returns the service health status

## Database Schema

The application uses SQLite with the following main table:

### lb_logs

-   `id`: INTEGER PRIMARY KEY
-   `type`: TEXT
-   `timestamp`: TEXT
-   `elb`: TEXT
-   `client`: TEXT
-   `target`: TEXT
-   `request_processing_time`: REAL
-   `target_processing_time`: REAL
-   `response_processing_time`: REAL
-   `elb_status_code`: INTEGER
-   `target_status_code`: INTEGER
-   `received_bytes`: INTEGER
-   `sent_bytes`: INTEGER
-   `request_method`: TEXT
-   `request_url`: TEXT
-   And more fields for comprehensive log data

## Error Handling

The application includes comprehensive error handling and logging using Winston. All errors are logged and appropriate error responses are sent to the client.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
