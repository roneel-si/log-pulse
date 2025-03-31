import React from "react";
import { DateRangePicker as MuiDateRangePicker } from "@mui/x-date-pickers-pro";
import { TextField } from "@mui/material";
import { Box } from "@mui/material";
import { DateRange } from "@mui/x-date-pickers-pro/DateRangePicker";
import { TextFieldProps } from "@mui/material/TextField";

interface DateRangePickerProps {
	value: DateRange<Date>;
	onChange: (newValue: DateRange<Date>) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
	value,
	onChange,
}) => {
	return (
		<MuiDateRangePicker
			value={value}
			onChange={onChange}
			renderInput={(
				startProps: TextFieldProps,
				endProps: TextFieldProps,
			) => (
				<>
					<TextField {...startProps} />
					<Box sx={{ mx: 2 }}> to </Box>
					<TextField {...endProps} />
				</>
			)}
		/>
	);
};
