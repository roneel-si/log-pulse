import { Client } from "../types/index.js";

export const clients: Client[] = [
	{
		name: "client1",
		region: "us-east-1",
		s3Bucket: "client1-alb-logs",
		s3Prefix: "alb-logs",
		loadBalancerType: "ALB",
	},
	{
		name: "client2",
		region: "us-west-2",
		s3Bucket: "client2-elb-logs",
		s3Prefix: "elb-logs",
		loadBalancerType: "ELB",
		awsProfile: "client2-profile",
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
