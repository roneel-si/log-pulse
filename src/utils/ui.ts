import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import ora from "ora";
import { Client } from "../types/index.js";

export const showTitle = (): void => {
	const title = figlet.textSync("LogPulse", {
		font: "Big",
		horizontalLayout: "default",
		verticalLayout: "default",
	});

	const gradientColors = gradient(["#12c2e9", "#c471ed", "#f64f59"]);
	console.log(gradientColors(title));
	console.log(chalk.cyan("AWS Load Balancer Log Viewer\n"));
};

export const showError = (message: string): void => {
	console.log(`\n${chalk.red("✖")} ${chalk.red.bold("Error:")} ${message}\n`);
};

export const showSuccess = (message: string): void => {
	console.log(
		`\n${chalk.green("✓")} ${chalk.green.bold("Success:")} ${message}\n`,
	);
};

export const showInfo = (message: string): void => {
	console.log(
		`\n${chalk.blue("ℹ")} ${chalk.blue.bold("Info:")} ${message}\n`,
	);
};

export const createSpinner = (text: string) => {
	return ora({
		text,
		spinner: "dots",
		color: "cyan",
	});
};

export const formatLogCount = (count: number): string => {
	return chalk.yellow.bold(`${count.toLocaleString()} logs`);
};

export const formatClientName = (name: string): string => {
	return chalk.magenta.bold(name);
};

export const formatAWSProfile = (profile: string): string => {
	return chalk.blue.bold(profile);
};

export const formatClientInfo = (client: Client): string => {
	const profile = client.awsProfile || "sportz";
	return `${formatClientName(client.name)} - ${chalk.yellow(
		client.loadBalancerType,
	)} (${chalk.green(client.region)}) [Profile: ${formatAWSProfile(profile)}]`;
};

export const formatDate = (date: string): string => {
	return chalk.cyan.bold(date);
};

export const formatLogEntry = (log: any): string => {
	const timestamp = chalk.gray(log.timestamp);
	const client = chalk.yellow(`${log.client_ip}:${log.client_port}`);
	const request = chalk.green(log.request);

	return `${timestamp} ${client} ${request}`;
};

export const decorateTable = (table: string): string => {
	return `\n${chalk.cyan("─".repeat(80))}\n${table}\n${chalk.cyan(
		"─".repeat(80),
	)}\n`;
};
