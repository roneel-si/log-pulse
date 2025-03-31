import axios from "axios";

const API_BASE_URL = "http://localhost:3001/api";

export const fetchStatistics = async (startDate, endDate) => {
	try {
		const response = await axios.get(`${API_BASE_URL}/statistics`, {
			params: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		});
		return response.data;
	} catch (error) {
		throw new Error("Failed to fetch statistics");
	}
};
