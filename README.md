# LogPulse

A beautiful CLI tool for monitoring AWS ALB and ELB logs stored in S3 buckets.

## Features

-   🚀 Fast and efficient log exploration
-   🔍 Search and filter logs from multiple AWS accounts and load balancers
-   🌈 Beautiful, modern CLI interface
-   📊 Support for ALB and ELB log formats
-   🔄 Easy integration with monitoring tools like Grafana, Loki, and Promtail
-   🔑 Support for multiple AWS profiles to access logs across accounts

## Installation

### Local Installation

```bash
# Clone the repository
git clone https://github.com/your-username/log-pulse.git
cd log-pulse

# Install dependencies
npm install

# Build the project
npm run build
```

### Global Installation

To make the `log-pulse` command available anywhere in your system:

```bash
# Option 1: Install globally from the project directory
npm run global

# Option 2: Install globally from anywhere
npm install -g /path/to/log-pulse

# Option 3: Create manual global symlink
npm link
```

After global installation, you can run the command from anywhere:

```bash
log-pulse list-clients
log-pulse view
```

## Usage

### View logs

```bash
# View logs with interactive prompts
log-pulse view

# Specify client and date
log-pulse view --client client1 --date 2023-01-01
```

### List available clients

```bash
log-pulse list-clients
```

## Troubleshooting

### If `log-pulse` Commands Stop Working

If the `log-pulse` commands stop working, try the following steps:

1. Reinstall the global command:

```bash
# From the project directory
npm run fix-global
```

2. If that doesn't work, try manually uninstalling and reinstalling:

```bash
npm uninstall -g log-pulse
cd /path/to/log-pulse
npm run build
npm install -g .
```

3. Check permissions on the executable:

```bash
chmod +x dist/index.js
npm install -g .
```

4. Verify the installation location:

```bash
which log-pulse
ls -la $(which log-pulse)
```

5. If using nvm, ensure you're in the correct Node.js environment:

```bash
nvm use <version>
npm run fix-global
```

## Configuration

### AWS Profiles

LogPulse uses AWS profiles to authenticate with different AWS accounts. By default, it uses a profile named "sportz", but you can configure client-specific profiles.

1. Make sure your AWS profiles are configured in `~/.aws/credentials`:

```
[sportz]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
region = us-east-1

[client2-profile]
aws_access_key_id = CLIENT2_ACCESS_KEY
aws_secret_access_key = CLIENT2_SECRET_KEY
region = us-west-2
```

2. Configure your clients in `src/config/clients.ts`:

```typescript
export const clients: Client[] = [
	{
		name: "client1",
		region: "us-east-1",
		s3Bucket: "your-alb-logs-bucket",
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
	// Add more clients...
];
```

## AWS Credentials

This tool uses the AWS SDK and follows its default credential chain. You can:

1. Set AWS credentials in environment variables
2. Use AWS profiles in `~/.aws/credentials`
3. Use IAM roles when running on EC2 or Lambda

## Development

```bash
# Run in development mode
npm run dev

# Run development with specific command
npm run dev -- view --client client1 --date 2023-01-01
```

## License

ISC
