import React, { useState } from "react";
import { useQuery } from "react-query";
import {
	Box,
	Typography,
	Paper,
	Tabs,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import axios from "axios";
import { format } from "date-fns";

interface TopUrlsProps {
	dateRange: [Date | null, Date | null];
}

interface UrlData {
	request_url: string;
	request_count: number;
	avg_response_time?: number;
	total_input_bytes?: number;
	total_request_bytes?: number;
}

export const TopUrls: React.FC<TopUrlsProps> = ({ dateRange }) => {
	const [tabValue, setTabValue] = useState(0);

	const { data: responseTimeData, isLoading: responseTimeLoading } = useQuery(
		["topUrlsResponseTime", dateRange],
		async () => {
			const [startDate, endDate] = dateRange;
			const params = new URLSearchParams();
			if (startDate)
				params.append(
					"startDate",
					format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
				);
			if (endDate)
				params.append(
					"endDate",
					format(endDate, "yyyy-MM-dd'T'HH:mm:ss"),
				);

			const response = await axios.get(
				`${process.env.REACT_APP_API_URL}/api/stats/top-urls-response-time?${params}`,
			);
			return response.data;
		},
		{ enabled: tabValue === 0 },
	);

	const { data: inputBytesData, isLoading: inputBytesLoading } = useQuery(
		["topUrlsInputBytes", dateRange],
		async () => {
			const [startDate, endDate] = dateRange;
			const params = new URLSearchParams();
			if (startDate)
				params.append(
					"startDate",
					format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
				);
			if (endDate)
				params.append(
					"endDate",
					format(endDate, "yyyy-MM-dd'T'HH:mm:ss"),
				);

			const response = await axios.get(
				`${process.env.REACT_APP_API_URL}/api/stats/top-urls-input-bytes?${params}`,
			);
			return response.data;
		},
		{ enabled: tabValue === 1 },
	);

	const { data: requestBytesData, isLoading: requestBytesLoading } = useQuery(
		["topUrlsRequestBytes", dateRange],
		async () => {
			const [startDate, endDate] = dateRange;
			const params = new URLSearchParams();
			if (startDate)
				params.append(
					"startDate",
					format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
				);
			if (endDate)
				params.append(
					"endDate",
					format(endDate, "yyyy-MM-dd'T'HH:mm:ss"),
				);

			const response = await axios.get(
				`${process.env.REACT_APP_API_URL}/api/stats/top-urls-request-bytes?${params}`,
			);
			return response.data;
		},
		{ enabled: tabValue === 2 },
	);

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
	};

	const renderTable = (data: UrlData[] | undefined, isLoading: boolean) => {
		if (isLoading) return <Typography>Loading...</Typography>;
		if (!data) return <Typography>No data available</Typography>;

		return (
			<TableContainer>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>URL</TableCell>
							<TableCell align="right">Request Count</TableCell>
							{tabValue === 0 && (
								<TableCell align="right">
									Avg Response Time (ms)
								</TableCell>
							)}
							{tabValue === 1 && (
								<TableCell align="right">
									Total Input Bytes
								</TableCell>
							)}
							{tabValue === 2 && (
								<TableCell align="right">
									Total Request Bytes
								</TableCell>
							)}
						</TableRow>
					</TableHead>
					<TableBody>
						{data.map((row, index) => (
							<TableRow key={index}>
								<TableCell component="th" scope="row">
									{row.request_url}
								</TableCell>
								<TableCell align="right">
									{row.request_count.toLocaleString()}
								</TableCell>
								{tabValue === 0 && (
									<TableCell align="right">
										{row.avg_response_time?.toFixed(2)}
									</TableCell>
								)}
								{tabValue === 1 && (
									<TableCell align="right">
										{row.total_input_bytes?.toLocaleString()}
									</TableCell>
								)}
								{tabValue === 2 && (
									<TableCell align="right">
										{row.total_request_bytes?.toLocaleString()}
									</TableCell>
								)}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		);
	};

	return (
		<Paper sx={{ p: 3 }}>
			<Typography variant="h6" gutterBottom>
				Top URLs
			</Typography>
			<Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
				<Tab label="By Response Time" />
				<Tab label="By Input Bytes" />
				<Tab label="By Request Bytes" />
			</Tabs>

			{tabValue === 0 &&
				renderTable(responseTimeData, responseTimeLoading)}
			{tabValue === 1 && renderTable(inputBytesData, inputBytesLoading)}
			{tabValue === 2 &&
				renderTable(requestBytesData, requestBytesLoading)}
		</Paper>
	);
};
