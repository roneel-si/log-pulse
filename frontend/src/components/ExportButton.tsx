import React from "react";
import { Button } from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import { format } from "date-fns";

interface ExportButtonProps {
	dateRange: [Date | null, Date | null];
}

export const ExportButton: React.FC<ExportButtonProps> = ({ dateRange }) => {
	const handleExport = async () => {
		try {
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

			const response = await fetch(
				`${process.env.REACT_APP_API_URL}/api/export?${params}`,
			);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `logs_${format(
				new Date(),
				"yyyy-MM-dd_HH-mm-ss",
			)}.csv`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Error exporting data:", error);
		}
	};

	return (
		<Button
			variant="contained"
			color="primary"
			startIcon={<DownloadIcon />}
			onClick={handleExport}
		>
			Export CSV
		</Button>
	);
};
