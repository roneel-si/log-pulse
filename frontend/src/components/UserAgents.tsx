import React from "react";
import { useQuery } from "react-query";
import { Box, Typography, Paper } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import axios from "axios";
import { format } from "date-fns";

interface UserAgentsProps {
	dateRange: [Date | null, Date | null];
}

interface UserAgentData {
	user_agent: string;
	count: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export const UserAgents: React.FC<UserAgentsProps> = ({ dateRange }) => {
	const { data, isLoading, error } = useQuery(
		["userAgents", dateRange],
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
				`${process.env.REACT_APP_API_URL}/api/stats/user-agents?${params}`,
			);
			return response.data;
		},
		{
			enabled: true,
		},
	);

	if (isLoading) return <Typography>Loading...</Typography>;
	if (error) return <Typography color="error">Error loading data</Typography>;

	// Take top 5 user agents for the pie chart
	const topUserAgents = data?.slice(0, 5) || [];
	const others = data?.slice(5) || [];
	const othersCount = others.reduce(
		(sum: number, ua: UserAgentData) => sum + ua.count,
		0,
	);

	const chartData = [
		...topUserAgents,
		...(othersCount > 0
			? [{ user_agent: "Others", count: othersCount }]
			: []),
	];

	return (
		<Paper sx={{ p: 3 }}>
			<Typography variant="h6" gutterBottom>
				User Agent Distribution
			</Typography>
			<Box sx={{ height: 400 }}>
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={chartData}
							dataKey="count"
							nameKey="user_agent"
							cx="50%"
							cy="50%"
							outerRadius={150}
							label
						>
							{chartData.map((entry, index) => (
								<Cell
									key={`cell-${index}`}
									fill={COLORS[index % COLORS.length]}
								/>
							))}
						</Pie>
						<Tooltip />
					</PieChart>
				</ResponsiveContainer>
			</Box>
		</Paper>
	);
};
