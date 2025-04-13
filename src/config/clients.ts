import { Client } from "../types/index.js";

export const clients: Client[] = [
	{
		name: "Punjab Kings",
		region: "us-east-1",
		s3Bucket: "si-global-elb-logs",
		s3Prefix:
			"elb-waf-punjabkings/AWSLogs/572143828798/elasticloadbalancing/us-east-1",
		loadBalancerType: "ALB",
		awsProfile: "sportz",
	},
	{
		name: "Bcci-Wplt20",
		region: "us-east-1",
		s3Bucket: "si-wplt20-logs",
		s3Prefix: "elb/AWSLogs/747701828668/elasticloadbalancing/us-east-1",
		loadBalancerType: "ELB",
		awsProfile: "bcci",
	},
	{
		name: "client3",
		awsProfile: "client3-profile",
		region: "eu-west-1",
		s3Bucket: "client3-alb-logs",
		s3Prefix: "alb-logs",
		loadBalancerType: "ALB",
	},
	{
		name: "Washington Freedom Web",
		region: "us-east-1",
		s3Bucket: "si-global-elb-logs",
		s3Prefix:
			"elb-washington/AWSLogs/572143828798/elasticloadbalancing/us-east-1",
		loadBalancerType: "ELB",
		awsProfile: "sportz",
	},
];

export const getClient = (name: string): Client | undefined => {
	return clients.find((client) => client.name === name);
};
