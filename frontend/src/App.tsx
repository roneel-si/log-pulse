import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box, Container, Tab, Tabs } from "@mui/material";
import { DateRangePicker } from "./components/DateRangePicker";
import { TotalRequests } from "./components/TotalRequests";
import { StatusCodes } from "./components/StatusCodes";
import { UserAgents } from "./components/UserAgents";
import { TopUrls } from "./components/TopUrls";
import { ExportButton } from "./components/ExportButton";

const queryClient = new QueryClient();
const theme = createTheme({
	palette: {
		mode: "light",
	},
});

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`simple-tabpanel-${index}`}
			aria-labelledby={`simple-tab-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ p: 3 }}>{children}</Box>}
		</div>
	);
}

function App() {
	const [value, setValue] = React.useState(0);
	const [dateRange, setDateRange] = React.useState<
		[Date | null, Date | null]
	>([null, null]);

	const handleChange = (event: React.SyntheticEvent, newValue: number) => {
		setValue(newValue);
	};

	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider theme={theme}>
				<LocalizationProvider dateAdapter={AdapterDateFns}>
					<CssBaseline />
					<Container maxWidth="xl">
						<Box sx={{ width: "100%", mt: 4 }}>
							<Box
								sx={{
									display: "flex",
									justifyContent: "space-between",
									mb: 3,
								}}
							>
								<DateRangePicker
									value={dateRange}
									onChange={setDateRange}
								/>
								<ExportButton dateRange={dateRange} />
							</Box>

							<Box
								sx={{ borderBottom: 1, borderColor: "divider" }}
							>
								<Tabs value={value} onChange={handleChange}>
									<Tab label="Total Requests" />
									<Tab label="Status Codes" />
									<Tab label="User Agents" />
									<Tab label="Top URLs" />
								</Tabs>
							</Box>

							<TabPanel value={value} index={0}>
								<TotalRequests dateRange={dateRange} />
							</TabPanel>
							<TabPanel value={value} index={1}>
								<StatusCodes dateRange={dateRange} />
							</TabPanel>
							<TabPanel value={value} index={2}>
								<UserAgents dateRange={dateRange} />
							</TabPanel>
							<TabPanel value={value} index={3}>
								<TopUrls dateRange={dateRange} />
							</TabPanel>
						</Box>
					</Container>
				</LocalizationProvider>
			</ThemeProvider>
		</QueryClientProvider>
	);
}

export default App;
