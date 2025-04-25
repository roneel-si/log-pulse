import React, { useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
	Container,
	Box,
	Paper,
	Typography,
	Snackbar,
	Alert,
} from "@mui/material";
import DateRangePicker from "./components/DateRangePicker";
import Dashboard from "./components/Dashboard";
import { fetchStatistics } from "./services/api";

const darkTheme = createTheme({
	palette: {
		mode: "dark",
	},
});

function App() {
	const [dateRange, setDateRange] = useState({
		startDate: new Date(),
		endDate: new Date(),
	});
	const [statistics, setStatistics] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [snackbar, setSnackbar] = useState({
		open: false,
		message: "",
		severity: "success",
	});

	const handleDateRangeChange = (newDateRange) => {
		setDateRange(newDateRange);
	};

	const handleDownload = async () => {
		try {
			const startDateStr = dateRange.startDate.toISOString();
			const endDateStr = dateRange.endDate.toISOString();

			// Create URL with query parameters
			const url = `http://localhost:3001/api/download-logs?startDate=${startDateStr}&endDate=${endDateStr}`;

			// Create a temporary link element
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", "logs.csv");
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			setSnackbar({
				open: true,
				message: "Download started successfully",
				severity: "success",
			});
		} catch (error) {
			console.error("Error downloading logs:", error);
			setSnackbar({
				open: true,
				message: "Failed to download logs",
				severity: "error",
			});
		}
	};

	const handleCloseSnackbar = () => {
		setSnackbar({ ...snackbar, open: false });
	};

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			setError(null);
			try {
				const data = await fetchStatistics(
					dateRange.startDate,
					dateRange.endDate,
				);
				console.log("===load ===", data);
				
				setStatistics(data);
			} catch (err) {
				setError("Failed to fetch statistics");
				console.error("Error fetching statistics:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [dateRange]);

	return (
		<ThemeProvider theme={darkTheme}>
			<CssBaseline />
			<LocalizationProvider dateAdapter={AdapterDateFns}>
				<Container maxWidth="xl">
					<Box sx={{ my: 4 }}>
						<Typography variant="h4" component="h1" gutterBottom>
							Log Pulse Dashboard
						</Typography>
						<Paper sx={{ p: 2, mb: 3 }}>
							<DateRangePicker
								startDate={dateRange.startDate}
								endDate={dateRange.endDate}
								onChange={handleDateRangeChange}
								onDownload={handleDownload}
							/>
						</Paper>
						{error && (
							<Typography color="error" gutterBottom>
								{error}
							</Typography>
						)}
						{loading ? (
							<Typography>Loading...</Typography>
						) : (
							statistics && <Dashboard statistics={statistics} />
						)}
					</Box>
					<Snackbar
						open={snackbar.open}
						autoHideDuration={6000}
						onClose={handleCloseSnackbar}
						anchorOrigin={{
							vertical: "bottom",
							horizontal: "right",
						}}
					>
						<Alert
							onClose={handleCloseSnackbar}
							severity={snackbar.severity}
						>
							{snackbar.message}
						</Alert>
					</Snackbar>
				</Container>
			</LocalizationProvider>
		</ThemeProvider>
	);
}

export default App;
