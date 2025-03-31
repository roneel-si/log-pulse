import React from "react";
import { useQuery } from "react-query";
import { Box, Typography, Paper, Grid } from "@mui/material";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import axios from "axios";
import { format } from "date-fns";

interface StatusCodesProps {
	dateRange: [Date | null, Date | null];
}

interface StatusCodeData {
	elb_status_code: number;
	count: number;
}

export const StatusCodes: React.FC<StatusCodesProps> = ({ dateRange }) => {
	const { data, isLoading, error } = useQuery(
		["statusCodes", dateRange],
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
				`${process.env.REACT_APP_API_URL}/api/stats/status-codes?${params}`,
			);
			return response.data;
		},
		{
			enabled: true,
		},
	);

	if (isLoading) return <Typography>Loading...</Typography>;
	if (error) return <Typography color="error">Error loading data</Typography>;

	const statusCodeGroups = {
		"2XX":
			data?.filter(
				(d: StatusCodeData) =>
					d.elb_status_code >= 200 && d.elb_status_code < 300,
			) || [],
		"3XX":
			data?.filter(
				(d: StatusCodeData) =>
					d.elb_status_code >= 300 && d.elb_status_code < 400,
			) || [],
		"4XX":
			data?.filter(
				(d: StatusCodeData) =>
					d.elb_status_code >= 400 && d.elb_status_code < 500,
			) || [],
		"5XX":
			data?.filter((d: StatusCodeData) => d.elb_status_code >= 500) || [],
	};

	return (
		<Grid container spacing={3}>
			<Grid item xs={12}>
				<Paper sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>
						Status Code Distribution
					</Typography>
					<Box sx={{ height: 400 }}>
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="elb_status_code" />
								<YAxis />
								<Tooltip />
								<Bar dataKey="count" fill="#8884d8" />
							</BarChart>
						</ResponsiveContainer>
					</Box>
				</Paper>
			</Grid>

			{Object.entries(statusCodeGroups).map(([group, codes]) => (
				<Grid item xs={12} sm={6} md={3} key={group}>
					<Paper sx={{ p: 3 }}>
						<Typography variant="h6" gutterBottom>
							{group} Status Codes
						</Typography>
						<Typography variant="h4">
							{codes
								.reduce(
									(sum: number, code: StatusCodeData) =>
										sum + code.count,
									0,
								)
								.toLocaleString()}
						</Typography>
					</Paper>
				</Grid>
			))}
		</Grid>
	);
};
