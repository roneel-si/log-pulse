import React from "react";
import {
	Grid,
	Paper,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import RGL, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactGridLayout = WidthProvider(RGL);

const StatCard = ({ title, value }) => (
	<Paper sx={{ p: 2, height: "100%" }}>
		<Typography variant="h6" gutterBottom>
			{title}
		</Typography>
		<Typography variant="h4">{value}</Typography>
	</Paper>
);

const DataTable = ({ title, data, columns }) => (
	<Paper sx={{ p: 2, height: "100%", overflow: "auto" }}>
		<Typography variant="h6" gutterBottom>
			{title}
		</Typography>
		<TableContainer>
			<Table size="small">
				<TableHead>
					<TableRow>
						{columns.map((column) => (
							<TableCell key={column.key}>
								{column.label}
							</TableCell>
						))}
					</TableRow>
				</TableHead>
				<TableBody>
					{data.map((row, index) => (
						<TableRow key={index}>
							{columns.map((column) => (
								<TableCell key={column.key}>
									{column.key === "count" ||
									column.key === "total_bytes"
										? row[column.key].toLocaleString()
										: row[column.key]}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	</Paper>
);

const Dashboard = ({ statistics }) => {
	const layout = [
		{ i: "totalRequests", x: 0, y: 0, w: 3, h: 2 },
		{ i: "statusCodes", x: 3, y: 0, w: 9, h: 3 },
		{ i: "requestMethods", x: 0, y: 2, w: 6, h: 3 },
		{ i: "topUrls", x: 6, y: 2, w: 6, h: 3 },
		{ i: "topUrls4xx", x: 0, y: 5, w: 6, h: 3 },
		{ i: "topUrls5xx", x: 6, y: 5, w: 6, h: 3 },
		{ i: "topUserAgents", x: 0, y: 8, w: 6, h: 3 },
		{ i: "topUrlsByInBytes", x: 6, y: 8, w: 6, h: 3 },
		{ i: "topUrlsByOutBytes", x: 0, y: 11, w: 12, h: 3 },
	];

	return (
		<ReactGridLayout
			className="layout"
			layout={layout}
			cols={12}
			rowHeight={100}
			isDraggable
			isResizable
		>
			<div key="totalRequests">
				<StatCard
					title="Total Requests"
					value={statistics.totalRequests.toLocaleString()}
				/>
			</div>
			<div key="statusCodes">
				<DataTable
					title="Status Code Distribution"
					data={statistics.statusCodeDistribution}
					columns={[
						{ key: "elb_status_code", label: "Status Code" },
						{ key: "count", label: "Count" },
					]}
				/>
			</div>
			<div key="requestMethods">
				<DataTable
					title="Request Method Distribution"
					data={statistics.requestMethodDistribution}
					columns={[
						{ key: "request_method", label: "Method" },
						{ key: "count", label: "Count" },
					]}
				/>
			</div>
			<div key="topUrls">
				<DataTable
					title="Top URLs"
					data={statistics.topUrls}
					columns={[
						{ key: "request_url", label: "URL" },
						{ key: "count", label: "Count" },
					]}
				/>
			</div>
			<div key="topUrls4xx">
				<DataTable
					title="Top URLs with 4xx Status"
					data={statistics.topUrls4xx}
					columns={[
						{ key: "request_url", label: "URL" },
						{ key: "count", label: "Count" },
					]}
				/>
			</div>
			<div key="topUrls5xx">
				<DataTable
					title="Top URLs with 5xx Status"
					data={statistics.topUrls5xx}
					columns={[
						{ key: "request_url", label: "URL" },
						{ key: "count", label: "Count" },
					]}
				/>
			</div>
			<div key="topUserAgents">
				<DataTable
					title="Top User Agents"
					data={statistics.topUserAgents}
					columns={[
						{ key: "user_agent", label: "User Agent" },
						{ key: "count", label: "Count" },
					]}
				/>
			</div>
			<div key="topUrlsByInBytes">
				<DataTable
					title="Top URLs by Received Bytes"
					data={statistics.topUrlsByInBytes}
					columns={[
						{ key: "request_url", label: "URL" },
						{ key: "total_bytes", label: "Total Bytes" },
						{ key: "request_count", label: "Request Count" },
					]}
				/>
			</div>
			<div key="topUrlsByOutBytes">
				<DataTable
					title="Top URLs by Sent Bytes"
					data={statistics.topUrlsByOutBytes}
					columns={[
						{ key: "request_url", label: "URL" },
						{ key: "total_bytes", label: "Total Bytes" },
						{ key: "request_count", label: "Request Count" },
					]}
				/>
			</div>
		</ReactGridLayout>
	);
};

export default Dashboard;
