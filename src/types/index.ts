export interface Client {
	name: string;
	awsProfile?: string; // Will default to "sportz" if not specified
	region: string;
	s3Bucket: string;
	s3Prefix: string;
	loadBalancerType: "ALB" | "ELB";
}

export interface LogQuery {
	clientName: string;
	date: string;
	client: Client;
}

export interface S3Object {
	key: string;
	size: number;
	lastModified?: Date;
}

export interface LogLine {
	timestamp: string;
	elb: string;
	client_ip: string;
	client_port: number;
	target_ip?: string;
	target_port?: number;
	request_processing_time?: number;
	target_processing_time?: number;
	response_processing_time?: number;
	elb_status_code?: number;
	target_status_code?: number;
	received_bytes?: number;
	sent_bytes?: number;
	request: string;
	user_agent?: string;
	ssl_cipher?: string;
	ssl_protocol?: string;
	target_group_arn?: string;
	trace_id?: string;
	raw: string;
}
