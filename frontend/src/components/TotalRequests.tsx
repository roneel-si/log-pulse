import React from "react";
import { useQuery } from "react-query";
import { Box, Typography, Paper } from "@mui/material";
import axios from "axios";
import { format } from "date-fns";

interface TotalRequestsProps {
	dateRange: [Date | null, Date | null];
}

export const TotalRequests: React.FC<TotalRequestsProps> = ({ dateRange }) => {
	const { data, isLoading, error } = useQuery(
		["totalRequests", dateRange],
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
				`${process.env.REACT_APP_API_URL}/api/stats/total-requests?${params}`,
			);
			return response.data;
		},
		{
			enabled: true,
		},
	);

	if (isLoading) return <Typography>Loading...</Typography>;
	if (error) return <Typography color="error">Error loading data</Typography>;

	return (
		<Paper sx={{ p: 3 }}>
			<Typography variant="h6" gutterBottom>
				Total Requests
			</Typography>
			<Typography variant="h3">
				{data?.count?.toLocaleString() || 0}
			</Typography>
		</Paper>
	);
};
