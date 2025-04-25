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
        name: "ECN-Global",
        region: "us-east-1",
        s3Bucket: "si-global-elb-logs",
        s3Prefix:
            "elb-ecn/AWSLogs/572143828798/elasticloadbalancing/us-east-1",
        loadBalancerType: "ELB",
        awsProfile: "sportz",
    },
    {
        name: "ECN-Data",
        region: "ap-south-1",
        s3Bucket: "si-global-mumbai-elb-logs",
        s3Prefix:
            "ecn-elb-log/AWSLogs/572143828798/elasticloadbalancing/ap-south-1",
        loadBalancerType: "ELB",
        awsProfile: "sportz",
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
    {
        name: "Knight Club",
        region: "us-east-1",
        s3Bucket: "si-global-elb-logs",
        s3Prefix:
            "elb-waf-kc/AWSLogs/572143828798/elasticloadbalancing/us-east-1",
        loadBalancerType: "ELB",
        awsProfile: "sportz",
    },
    {
        name: "Gujarat titans",
        region: "us-east-1",
        s3Bucket: "si-global-elb-logs",
        s3Prefix:
            "elb-waf-gt/AWSLogs/572143828798/elasticloadbalancing/us-east-1",
        loadBalancerType: "ELB",
        awsProfile: "sportz",
    },
    {
        name: "DC",
        region: "us-east-1",
        s3Bucket: "si-global-elb-logs",
        s3Prefix:
            "elb-waf-delhicapitals/AWSLogs/572143828798/elasticloadbalancing/us-east-1",
        loadBalancerType: "ELB",
        awsProfile: "sportz",
    },
    {
        name: "RR",
        region: "us-east-1",
        s3Bucket: "si-global-elb-logs",
        s3Prefix:
            "elb-RR-logs/AWSLogs/572143828798/elasticloadbalancing/us-east-1",
        loadBalancerType: "ELB",
        awsProfile: "sportz",
    },
    {
        name: "KKR",
        region: "us-east-1",
        s3Bucket: "si-global-elb-logs",
        s3Prefix:
            "elb-waf-kkr/AWSLogs/572143828798/elasticloadbalancing/us-east-1",
        loadBalancerType: "ELB",
        awsProfile: "sportz",
    },
    {
        name: "FIH",
        region: "eu-central-1",
        s3Bucket: "si-euc1-waflogs",
        s3Prefix:
            "alb-fih/AWSLogs/572143828798/elasticloadbalancing/eu-central-1",
        loadBalancerType: "ALB",
        awsProfile: "sportz",
    },
    {
        name: "UWW",
        region: "eu-central-1",
        s3Bucket: "elb-uww-log",
        s3Prefix:
            "lb-log/AWSLogs/572143828798/elasticloadbalancing/eu-central-1",
        loadBalancerType: "ELB",
        awsProfile: "sportz",
    },
    {
        name: "wisden",
        region: "eu-central-1",
        s3Bucket: "si-wisden-prod-logs",
        s3Prefix:
            "lb-log/AWSLogs/471112985144/elasticloadbalancing/eu-central-1",
        loadBalancerType: "ELB",
        awsProfile: "wisden",
    },
    {
        name: "ISL",
        region: "us-east-1",
        s3Bucket: "si-waf-isl-elb-log",
        s3Prefix:
            "AWSLogs/754570185532/elasticloadbalancing/us-east-1",
        loadBalancerType: "ELB",
        awsProfile: "isl",
    },

];

export const getClient = (name: string): Client | undefined => {
	return clients.find((client) => client.name === name);
};
