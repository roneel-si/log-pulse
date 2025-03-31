# Log Pulse Visualization

This directory contains the Docker configuration files for visualizing AWS Load Balancer logs using Grafana, Loki, and Promtail.

## Components

-   **Grafana**: Web-based visualization dashboard
-   **Loki**: Log aggregation system
-   **Promtail**: Log collector that sends logs to Loki

## Features

-   **Status Code Analysis**: View distribution of 2xx, 3xx, 4xx, and 5xx responses
-   **Traffic Analysis**: See request patterns over time
-   **Top URLs**: Identify most frequently accessed endpoints
-   **User Agents**: Analyze client applications/browsers
-   **Client IPs**: Monitor traffic sources
-   **Bytes Transferred**: Track bandwidth usage

## Requirements

-   Docker
-   Docker Compose

## Manual Usage

While the log-pulse CLI provides commands to manage the visualization, you can also manually control the visualization:

1. Start the containers:

    ```
    cd docker
    docker compose up -d
    ```

2. Access Grafana:

    - Open http://localhost:3000 in your browser
    - Login with username: admin, password: admin

3. Stop the containers:
    ```
    cd docker
    docker compose down
    ```

## Persistent Data

All data is stored in Docker volumes to ensure persistence between container restarts:

-   **grafana-data**: Grafana dashboards and configurations
-   **loki-data**: Log data and indices

## Customization

-   **Grafana Dashboards**: Edit files in `grafana/dashboards/`
-   **Promtail Configuration**: Edit `promtail-config.yml` to adjust log parsing
-   **Loki Configuration**: Edit `loki-config.yml` to adjust log storage
