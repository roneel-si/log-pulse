import React from "react";
import { Box, TextField, Button } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import DownloadIcon from "@mui/icons-material/Download";

const DateRangePicker = ({ startDate, endDate, onChange, onDownload }) => {
	const handleStartDateChange = (newDate) => {
		onChange({ startDate: newDate, endDate });
	};

	const handleEndDateChange = (newDate) => {
		onChange({ startDate, endDate: newDate });
	};

	return (
		<Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
			<DateTimePicker
				label="Start Date & Time"
				value={startDate}
				onChange={handleStartDateChange}
				renderInput={(params) => <TextField {...params} />}
				ampm={false}
				views={["year", "month", "day", "hours", "minutes"]}
			/>
			<DateTimePicker
				label="End Date & Time"
				value={endDate}
				onChange={handleEndDateChange}
				renderInput={(params) => <TextField {...params} />}
				ampm={false}
				views={["year", "month", "day", "hours", "minutes"]}
			/>
			<Button
				variant="contained"
				color="primary"
				startIcon={<DownloadIcon />}
				onClick={onDownload}
				sx={{ height: 56 }}
			>
				Download Logs
			</Button>
		</Box>
	);
};

export default DateRangePicker;
