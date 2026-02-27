package aws

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	"github.com/aws/aws-sdk-go-v2/service/elasticloadbalancingv2"
	"github.com/aws/aws-sdk-go-v2/service/iam"
	"github.com/aws/aws-sdk-go-v2/service/kms"
	"github.com/aws/aws-sdk-go-v2/service/rds"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// AWSProvider AWS云平台实现
type AWSProvider struct {
	accessKey   string
	secretKey   string
	region      string
	ec2Client   *ec2.Client
	iamClient   *iam.Client
	s3Client    *s3.Client
	elbv2Client *elasticloadbalancingv2.Client
	eksClient   *eks.Client
	kmsClient   *kms.Client
	rdsClient   *rds.Client
}

// NewAWSProvider 创建AWS云平台实例
func NewAWSProvider(accessKey, secretKey, region string) (*AWSProvider, error) {
	// 保存原始region值，用于判断是否需要遍历所有区域
	originalRegion := region

	// 如果区域为空，使用默认区域进行初始化
	initRegion := region
	if initRegion == "" {
		initRegion = "us-east-1"
	}

	provider := &AWSProvider{
		accessKey: accessKey,
		secretKey: secretKey,
		region:    originalRegion, // 保存原始region值
	}

	// 初始化客户端
	err := provider.Init(accessKey, secretKey, initRegion)
	if err != nil {
		return nil, err
	}

	return provider, nil
}

// Init 初始化AWS客户端
func (p *AWSProvider) Init(accessKey, secretKey, region string) error {
	// 加载配置
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(&StaticCredentialsProvider{
			Value:  accessKey,
			Secret: secretKey,
		}),
	)
	if err != nil {
		return fmt.Errorf("failed to load AWS config: %w", err)
	}

	// 创建客户端
	p.ec2Client = ec2.NewFromConfig(cfg)
	p.iamClient = iam.NewFromConfig(cfg)
	p.s3Client = s3.NewFromConfig(cfg)
	p.elbv2Client = elasticloadbalancingv2.NewFromConfig(cfg)
	p.eksClient = eks.NewFromConfig(cfg)
	p.kmsClient = kms.NewFromConfig(cfg)
	p.rdsClient = rds.NewFromConfig(cfg)

	return nil
}

// StaticCredentialsProvider 静态凭证提供者
type StaticCredentialsProvider struct {
	Value  string
	Secret string
}

// Retrieve 检索凭证
func (p *StaticCredentialsProvider) Retrieve(ctx context.Context) (aws.Credentials, error) {
	return aws.Credentials{
		AccessKeyID:     p.Value,
		SecretAccessKey: p.Secret,
	}, nil
}

// EnumerateResources 枚举AWS资源
func (p *AWSProvider) EnumerateResources(resourceType string) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	errors := []string{}

	// 定义所有可能的AWS区域
	awsRegions := []string{
		"us-east-1",
		"us-east-2",
		"us-west-1",
		"us-west-2",
		"eu-west-1",
		"eu-central-1",
		"ap-southeast-1",
		"ap-southeast-2",
		"ap-northeast-1",
		"ap-northeast-2",
		"ap-south-1",
		"ca-central-1",
		"sa-east-1",
	}

	// 确定要使用的区域
	regions := []string{}
	if p.region != "" {
		// 如果指定了区域，只使用该区域
		regions = []string{p.region}
	} else {
		// 否则遍历所有区域
		regions = awsRegions
	}

	switch resourceType {
	case "ec2":
		// 枚举EC2实例
		var allInstances []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("EC2 (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create EC2 client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的EC2实例
			instances, err := regionProvider.enumerateEC2Instances()
			if err != nil {
				errorMsg := fmt.Sprintf("EC2 (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate EC2 instances in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的实例添加到总列表
			for _, instance := range instances {
				// 添加区域信息
				if instanceMap, ok := instance.(map[string]interface{}); ok {
					instanceMap["region"] = region
					allInstances = append(allInstances, instanceMap)
				}
			}
		}

		if len(allInstances) > 0 {
			result["instances"] = allInstances
		} else {
			result["instances"] = []interface{}{}
		}

	case "s3":
		// 枚举S3存储桶
		// S3存储桶是全局的，不需要按区域枚举
		buckets, err := p.enumerateS3Buckets()
		if err != nil {
			// 记录错误
			errorMsg := fmt.Sprintf("S3: %v", err)
			errors = append(errors, errorMsg)
			fmt.Printf("Warning: Failed to enumerate S3 buckets: %v\n", err)
			result["buckets"] = []interface{}{}
		} else {
			result["buckets"] = buckets
		}

	case "iam":
		// 枚举IAM用户和角色
		// IAM是全局的，不需要按区域枚举
		users, err := p.enumerateIAMUsers()
		if err != nil {
			// 记录错误
			errorMsg := fmt.Sprintf("IAM Users: %v", err)
			errors = append(errors, errorMsg)
			fmt.Printf("Warning: Failed to enumerate IAM users: %v\n", err)
			result["users"] = []interface{}{}
		} else {
			result["users"] = users
		}

		// 枚举IAM角色
		roles, err := p.enumerateIAMRoles()
		if err != nil {
			// 记录错误
			errorMsg := fmt.Sprintf("IAM Roles: %v", err)
			errors = append(errors, errorMsg)
			fmt.Printf("Warning: Failed to enumerate IAM roles: %v\n", err)
			result["roles"] = []interface{}{}
		} else {
			result["roles"] = roles
		}

	case "vpc":
		// 枚举VPC资源
		var allVPCs []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("VPC (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create VPC client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的VPC
			vpcs, err := regionProvider.enumerateVPCs()
			if err != nil {
				errorMsg := fmt.Sprintf("VPC (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate VPCs in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的VPC添加到总列表
			for _, vpc := range vpcs {
				// 添加区域信息
				if vpcMap, ok := vpc.(map[string]interface{}); ok {
					vpcMap["region"] = region
					allVPCs = append(allVPCs, vpcMap)
				}
			}
		}

		if len(allVPCs) > 0 {
			result["vpcs"] = allVPCs
		} else {
			result["vpcs"] = []interface{}{}
		}

	case "route":
		// 枚举路由表资源
		var allRouteTables []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("Route Tables (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create Route Tables client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的路由表
			routeTables, err := regionProvider.enumerateRouteTables()
			if err != nil {
				errorMsg := fmt.Sprintf("Route Tables (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate Route Tables in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的路由表添加到总列表
			for _, rt := range routeTables {
				// 添加区域信息
				if rtMap, ok := rt.(map[string]interface{}); ok {
					rtMap["region"] = region
					allRouteTables = append(allRouteTables, rtMap)
				}
			}
		}

		if len(allRouteTables) > 0 {
			result["routeTables"] = allRouteTables
		} else {
			result["routeTables"] = []interface{}{}
		}

	case "elb":
		// 枚举ELB资源
		var allELBs []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("ELB (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create ELB client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的ELB
			elbs, err := regionProvider.enumerateELBs()
			if err != nil {
				errorMsg := fmt.Sprintf("ELB (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate ELBs in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的ELB添加到总列表
			for _, elb := range elbs {
				// 添加区域信息
				if elbMap, ok := elb.(map[string]interface{}); ok {
					elbMap["region"] = region
					allELBs = append(allELBs, elbMap)
				}
			}
		}

		if len(allELBs) > 0 {
			result["elbs"] = allELBs
		} else {
			result["elbs"] = []interface{}{}
		}

	case "eks":
		// 枚举EKS集群
		var allClusters []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("EKS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create EKS client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的EKS集群
			clusters, err := regionProvider.enumerateEKSClusters()
			if err != nil {
				errorMsg := fmt.Sprintf("EKS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate EKS clusters in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的EKS集群添加到总列表
			for _, cluster := range clusters {
				// 添加区域信息
				if clusterMap, ok := cluster.(map[string]interface{}); ok {
					clusterMap["region"] = region
					allClusters = append(allClusters, clusterMap)
				}
			}
		}

		if len(allClusters) > 0 {
			result["eksClusters"] = allClusters
		} else {
			result["eksClusters"] = []interface{}{}
		}

	case "kms":
		// 枚举KMS密钥
		var allKeys []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("KMS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create KMS client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的KMS密钥
			keys, err := regionProvider.enumerateKMSKeys()
			if err != nil {
				errorMsg := fmt.Sprintf("KMS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate KMS keys in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的KMS密钥添加到总列表
			for _, key := range keys {
				// 添加区域信息
				if keyMap, ok := key.(map[string]interface{}); ok {
					keyMap["region"] = region
					allKeys = append(allKeys, keyMap)
				}
			}
		}

		if len(allKeys) > 0 {
			result["kmsKeys"] = allKeys
		} else {
			result["kmsKeys"] = []interface{}{}
		}

	case "rds":
		// 枚举RDS数据库实例
		var allInstances []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("RDS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create RDS client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的RDS实例
			instances, err := regionProvider.enumerateRDSInstances()
			if err != nil {
				errorMsg := fmt.Sprintf("RDS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate RDS instances in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的RDS实例添加到总列表
			for _, instance := range instances {
				// 添加区域信息
				if instanceMap, ok := instance.(map[string]interface{}); ok {
					instanceMap["region"] = region
					allInstances = append(allInstances, instanceMap)
				}
			}
		}

		if len(allInstances) > 0 {
			result["rdsInstances"] = allInstances
		} else {
			result["rdsInstances"] = []interface{}{}
		}

	case "all":
		// 枚举所有资源

		// 尝试枚举EC2实例
		var allInstances []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("EC2 (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create EC2 client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的EC2实例
			instances, err := regionProvider.enumerateEC2Instances()
			if err != nil {
				errorMsg := fmt.Sprintf("EC2 (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate EC2 instances in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的实例添加到总列表
			for _, instance := range instances {
				// 添加区域信息
				if instanceMap, ok := instance.(map[string]interface{}); ok {
					instanceMap["region"] = region
					allInstances = append(allInstances, instanceMap)
				}
			}
		}

		if len(allInstances) > 0 {
			result["instances"] = allInstances
		} else {
			result["instances"] = []interface{}{}
		}

		// 尝试枚举S3存储桶
		if buckets, err := p.enumerateS3Buckets(); err == nil {
			result["buckets"] = buckets
		} else {
			// 记录错误
			errorMsg := fmt.Sprintf("S3: %v", err)
			errors = append(errors, errorMsg)
			fmt.Printf("Warning: Failed to enumerate S3 buckets: %v\n", err)
			result["buckets"] = []interface{}{}
		}

		// 尝试枚举IAM用户
		if users, err := p.enumerateIAMUsers(); err == nil {
			result["users"] = users
		} else {
			// 记录错误
			errorMsg := fmt.Sprintf("IAM Users: %v", err)
			errors = append(errors, errorMsg)
			fmt.Printf("Warning: Failed to enumerate IAM users: %v\n", err)
			result["users"] = []interface{}{}
		}

		// 尝试枚举IAM角色
		if roles, err := p.enumerateIAMRoles(); err == nil {
			result["roles"] = roles
		} else {
			// 记录错误
			errorMsg := fmt.Sprintf("IAM Roles: %v", err)
			errors = append(errors, errorMsg)
			fmt.Printf("Warning: Failed to enumerate IAM roles: %v\n", err)
			result["roles"] = []interface{}{}
		}

		// 尝试枚举VPC资源
		var allVPCs []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("VPC (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create VPC client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的VPC
			vpcs, err := regionProvider.enumerateVPCs()
			if err != nil {
				errorMsg := fmt.Sprintf("VPC (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate VPCs in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的VPC添加到总列表
			for _, vpc := range vpcs {
				// 添加区域信息
				if vpcMap, ok := vpc.(map[string]interface{}); ok {
					vpcMap["region"] = region
					allVPCs = append(allVPCs, vpcMap)
				}
			}
		}

		if len(allVPCs) > 0 {
			result["vpcs"] = allVPCs
		} else {
			result["vpcs"] = []interface{}{}
		}

		// 尝试枚举路由表资源
		var allRouteTables []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("Route Tables (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create Route Tables client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的路由表
			routeTables, err := regionProvider.enumerateRouteTables()
			if err != nil {
				errorMsg := fmt.Sprintf("Route Tables (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate Route Tables in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的路由表添加到总列表
			for _, rt := range routeTables {
				// 添加区域信息
				if rtMap, ok := rt.(map[string]interface{}); ok {
					rtMap["region"] = region
					allRouteTables = append(allRouteTables, rtMap)
				}
			}
		}

		if len(allRouteTables) > 0 {
			result["routeTables"] = allRouteTables
		} else {
			result["routeTables"] = []interface{}{}
		}

		// 尝试枚举ELB资源
		var allELBs []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("ELB (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create ELB client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的ELB
			elbs, err := regionProvider.enumerateELBs()
			if err != nil {
				errorMsg := fmt.Sprintf("ELB (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate ELBs in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的ELB添加到总列表
			for _, elb := range elbs {
				// 添加区域信息
				if elbMap, ok := elb.(map[string]interface{}); ok {
					elbMap["region"] = region
					allELBs = append(allELBs, elbMap)
				}
			}
		}

		if len(allELBs) > 0 {
			result["elbs"] = allELBs
		} else {
			result["elbs"] = []interface{}{}
		}

		// 尝试枚举EKS集群
		var allClusters []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("EKS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create EKS client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的EKS集群
			clusters, err := regionProvider.enumerateEKSClusters()
			if err != nil {
				errorMsg := fmt.Sprintf("EKS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate EKS clusters in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的EKS集群添加到总列表
			for _, cluster := range clusters {
				// 添加区域信息
				if clusterMap, ok := cluster.(map[string]interface{}); ok {
					clusterMap["region"] = region
					allClusters = append(allClusters, clusterMap)
				}
			}
		}

		if len(allClusters) > 0 {
			result["eksClusters"] = allClusters
		} else {
			result["eksClusters"] = []interface{}{}
		}

		// 尝试枚举KMS密钥
		var allKeys []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("KMS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create KMS client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的KMS密钥
			keys, err := regionProvider.enumerateKMSKeys()
			if err != nil {
				errorMsg := fmt.Sprintf("KMS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate KMS keys in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的KMS密钥添加到总列表
			for _, key := range keys {
				// 添加区域信息
				if keyMap, ok := key.(map[string]interface{}); ok {
					keyMap["region"] = region
					allKeys = append(allKeys, keyMap)
				}
			}
		}

		if len(allKeys) > 0 {
			result["kmsKeys"] = allKeys
		} else {
			result["kmsKeys"] = []interface{}{}
		}

		// 尝试枚举RDS数据库实例
		var allRDSInstances []interface{}
		for _, region := range regions {
			// 创建该区域的客户端
			regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, region)
			if err != nil {
				errorMsg := fmt.Sprintf("RDS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to create RDS client for region %s: %v\n", region, err)
				continue
			}

			// 枚举该区域的RDS实例
			instances, err := regionProvider.enumerateRDSInstances()
			if err != nil {
				errorMsg := fmt.Sprintf("RDS (%s): %v", region, err)
				errors = append(errors, errorMsg)
				fmt.Printf("Warning: Failed to enumerate RDS instances in region %s: %v\n", region, err)
				continue
			}

			// 将该区域的RDS实例添加到总列表
			for _, instance := range instances {
				// 添加区域信息
				if instanceMap, ok := instance.(map[string]interface{}); ok {
					instanceMap["region"] = region
					allRDSInstances = append(allRDSInstances, instanceMap)
				}
			}
		}

		if len(allRDSInstances) > 0 {
			result["rdsInstances"] = allRDSInstances
		} else {
			result["rdsInstances"] = []interface{}{}
		}

	default:
		return nil, fmt.Errorf("unsupported resource type: %s", resourceType)
	}

	// 检查是否所有资源都枚举失败
	if len(result) == 0 {
		return nil, fmt.Errorf("failed to enumerate any resources")
	}

	// 如果有错误，将错误信息添加到结果中
	if len(errors) > 0 {
		result["errors"] = errors
	}

	return result, nil
}

// enumerateEC2Instances 枚举EC2实例
func (p *AWSProvider) enumerateEC2Instances() ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用AWS SDK获取EC2实例列表
	input := &ec2.DescribeInstancesInput{}
	response, err := p.ec2Client.DescribeInstances(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to describe EC2 instances: %w", err)
	}

	var instances []interface{}
	for _, reservation := range response.Reservations {
		for _, instance := range reservation.Instances {
			// 构建标签映射
			tags := make(map[string]string)
			for _, tag := range instance.Tags {
				tags[*tag.Key] = *tag.Value
			}

			// 提取公网IP
			var publicIp string
			if instance.PublicIpAddress != nil {
				publicIp = *instance.PublicIpAddress
			}

			// 提取私网IP
			var privateIp string
			if instance.PrivateIpAddress != nil {
				privateIp = *instance.PrivateIpAddress
			}

			instances = append(instances, map[string]interface{}{
				"instanceId":   *instance.InstanceId,
				"instanceType": string(instance.InstanceType),
				"state":        string(instance.State.Name),
				"publicIp":     publicIp,
				"privateIp":    privateIp,
				"tags":         tags,
			})
		}
	}

	return instances, nil
}

// enumerateS3Buckets 枚举S3存储桶
func (p *AWSProvider) enumerateS3Buckets() ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
	defer cancel()

	// 调用AWS SDK获取S3存储桶列表
	input := &s3.ListBucketsInput{}
	response, err := p.s3Client.ListBuckets(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to list S3 buckets: %w", err)
	}

	var buckets []interface{}
	// 限制处理的存储桶数量，防止超时
	maxBuckets := 50
	processedBuckets := 0

	for _, bucket := range response.Buckets {
		if processedBuckets >= maxBuckets {
			break
		}

		// 首先获取存储桶的实际区域
		location, err := p.s3Client.GetBucketLocation(ctx, &s3.GetBucketLocationInput{
			Bucket: aws.String(*bucket.Name),
		})

		var bucketRegion string
		if err == nil {
			if location.LocationConstraint == "" {
				bucketRegion = "us-east-1"
			} else {
				bucketRegion = string(location.LocationConstraint)
			}
		} else {
			// 如果获取区域失败，使用默认区域
			bucketRegion = "us-east-1"
		}

		// 如果指定了区域，只处理该区域的存储桶
		if p.region != "" && bucketRegion != p.region {
			continue
		}

		// 创建存储桶对象
		bucketObj := map[string]interface{}{
			"bucketName":   *bucket.Name,
			"creationDate": bucket.CreationDate.Format("2006-01-02T15:04:05Z"),
			"region":       bucketRegion,
		}

		// 创建新的S3客户端，使用存储桶的实际区域
		cfg, err := config.LoadDefaultConfig(context.Background(),
			config.WithRegion(bucketRegion),
			config.WithCredentialsProvider(&StaticCredentialsProvider{
				Value:  p.accessKey,
				Secret: p.secretKey,
			}),
		)
		if err == nil {
			// 创建新的S3客户端
			s3Client := s3.NewFromConfig(cfg)

			// 尝试列出存储桶中的所有文件
			input := &s3.ListObjectsV2Input{
				Bucket: aws.String(*bucket.Name),
				Prefix: aws.String(""),
			}

			var objects []interface{}
			var continuationToken *string

			// 分页获取所有对象
			for {
				if continuationToken != nil {
					input.ContinuationToken = continuationToken
				}

				response, err := s3Client.ListObjectsV2(ctx, input)
				if err != nil {
					break
				}

				for _, obj := range response.Contents {
					objects = append(objects, map[string]interface{}{
						"key":          *obj.Key,
						"size":         obj.Size,
						"lastModified": obj.LastModified.Format("2006-01-02T15:04:05Z"),
						"eTag":         *obj.ETag,
					})
				}

				if response.IsTruncated == nil || !*response.IsTruncated {
					break
				}
				continuationToken = response.NextContinuationToken
			}

			if len(objects) > 0 {
				bucketObj["objects"] = objects
				bucketObj["moreObjects"] = false
			} else {
				bucketObj["objects"] = []interface{}{}
				bucketObj["moreObjects"] = false
			}
		} else {
			bucketObj["objects"] = []interface{}{}
			bucketObj["moreObjects"] = false
		}

		buckets = append(buckets, bucketObj)
		processedBuckets++
	}

	// 如果有更多存储桶，添加一个提示
	if len(response.Buckets) > maxBuckets {
		excess := len(response.Buckets) - maxBuckets
		buckets = append(buckets, map[string]interface{}{
			"bucketName":   fmt.Sprintf("... 还有 %d 个存储桶未显示", excess),
			"creationDate": "",
			"region":       "",
			"objects":      []interface{}{},
			"moreObjects":  false,
		})
	}

	return buckets, nil
}

// isNetworkError 检查是否是网络错误
func isNetworkError(err error) bool {
	// 检查错误信息是否包含网络相关的关键词
	errorStr := err.Error()
	return strings.Contains(errorStr, "dial tcp") ||
		strings.Contains(errorStr, "no such host") ||
		strings.Contains(errorStr, "connection refused") ||
		strings.Contains(errorStr, "network is unreachable") ||
		strings.Contains(errorStr, "timeout")
}

// enumerateIAMUsers 枚举IAM用户
func (p *AWSProvider) enumerateIAMUsers() ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用AWS SDK获取IAM用户列表
	input := &iam.ListUsersInput{}
	response, err := p.iamClient.ListUsers(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to list IAM users: %w", err)
	}

	var users []interface{}
	for _, user := range response.Users {
		users = append(users, map[string]interface{}{
			"userName": *user.UserName,
			"userId":   *user.UserId,
			"arn":      *user.Arn,
		})
	}

	return users, nil
}

// enumerateIAMRoles 枚举IAM角色
func (p *AWSProvider) enumerateIAMRoles() ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用AWS SDK获取IAM角色列表
	input := &iam.ListRolesInput{}
	response, err := p.iamClient.ListRoles(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to list IAM roles: %w", err)
	}

	var roles []interface{}
	for _, role := range response.Roles {
		roles = append(roles, map[string]interface{}{
			"roleName": *role.RoleName,
			"roleId":   *role.RoleId,
			"arn":      *role.Arn,
		})
	}

	return roles, nil
}

// enumerateVPCs 枚举VPC资源
func (p *AWSProvider) enumerateVPCs() ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用AWS SDK获取VPC列表
	input := &ec2.DescribeVpcsInput{}
	response, err := p.ec2Client.DescribeVpcs(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to describe VPCs: %w", err)
	}

	var vpcs []interface{}
	for _, vpc := range response.Vpcs {
		// 构建标签映射
		tags := make(map[string]string)
		for _, tag := range vpc.Tags {
			tags[*tag.Key] = *tag.Value
		}

		vpcs = append(vpcs, map[string]interface{}{
			"vpcId":     *vpc.VpcId,
			"cidrBlock": *vpc.CidrBlock,
			"state":     string(vpc.State),
			"isDefault": *vpc.IsDefault,
			"tags":      tags,
			"ownerId":   *vpc.OwnerId,
		})
	}

	return vpcs, nil
}

// enumerateRouteTables 枚举路由表资源
func (p *AWSProvider) enumerateRouteTables() ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用AWS SDK获取路由表列表
	input := &ec2.DescribeRouteTablesInput{}
	response, err := p.ec2Client.DescribeRouteTables(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to describe route tables: %w", err)
	}

	var routeTables []interface{}
	for _, rt := range response.RouteTables {
		// 构建标签映射
		tags := make(map[string]string)
		for _, tag := range rt.Tags {
			tags[*tag.Key] = *tag.Value
		}

		// 提取路由信息
		var routes []interface{}
		for _, route := range rt.Routes {
			routeInfo := map[string]interface{}{
				"destinationCidrBlock": route.DestinationCidrBlock,
				"gatewayId":            route.GatewayId,
				"state":                string(route.State),
			}
			routes = append(routes, routeInfo)
		}

		routeTables = append(routeTables, map[string]interface{}{
			"routeTableId": *rt.RouteTableId,
			"vpcId":        *rt.VpcId,
			"routes":       routes,
			"tags":         tags,
		})
	}

	return routeTables, nil
}

// enumerateELBs 枚举ELB资源
func (p *AWSProvider) enumerateELBs() ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用AWS SDK获取ELB列表
	input := &elasticloadbalancingv2.DescribeLoadBalancersInput{}
	response, err := p.elbv2Client.DescribeLoadBalancers(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to describe load balancers: %w", err)
	}

	var elbs []interface{}
	for _, elb := range response.LoadBalancers {
		elbs = append(elbs, map[string]interface{}{
			"loadBalancerName":  *elb.LoadBalancerName,
			"loadBalancerArn":   *elb.LoadBalancerArn,
			"type":              string(elb.Type),
			"dnsName":           elb.DNSName,
			"state":             elb.State.Code,
			"availabilityZones": elb.AvailabilityZones,
			"securityGroups":    elb.SecurityGroups,
		})
	}

	return elbs, nil
}

// enumerateEKSClusters 枚举EKS集群
func (p *AWSProvider) enumerateEKSClusters() ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用AWS SDK获取EKS集群列表
	input := &eks.ListClustersInput{}
	response, err := p.eksClient.ListClusters(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to list EKS clusters: %w", err)
	}

	var clusters []interface{}
	for _, clusterName := range response.Clusters {
		// 获取每个集群的详细信息
		describeInput := &eks.DescribeClusterInput{
			Name: aws.String(clusterName),
		}
		describeResponse, err := p.eksClient.DescribeCluster(ctx, describeInput)
		if err != nil {
			// 如果获取详细信息失败，继续处理下一个集群
			continue
		}

		cluster := describeResponse.Cluster
		clusters = append(clusters, map[string]interface{}{
			"name":               *cluster.Name,
			"arn":                *cluster.Arn,
			"version":            *cluster.Version,
			"status":             string(cluster.Status),
			"endpoint":           cluster.Endpoint,
			"roleArn":            cluster.RoleArn,
			"createdAt":          cluster.CreatedAt,
			"resourcesVpcConfig": cluster.ResourcesVpcConfig,
		})
	}

	return clusters, nil
}

// enumerateKMSKeys 枚举KMS密钥
func (p *AWSProvider) enumerateKMSKeys() ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用AWS SDK获取KMS密钥列表
	input := &kms.ListKeysInput{}
	response, err := p.kmsClient.ListKeys(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to list KMS keys: %w", err)
	}

	var keys []interface{}
	for _, key := range response.Keys {
		// 获取每个密钥的详细信息
		describeInput := &kms.DescribeKeyInput{
			KeyId: key.KeyId,
		}
		describeResponse, err := p.kmsClient.DescribeKey(ctx, describeInput)
		if err != nil {
			// 如果获取详细信息失败，继续处理下一个密钥
			continue
		}

		keys = append(keys, map[string]interface{}{
			"keyId":        *describeResponse.KeyMetadata.KeyId,
			"arn":          *describeResponse.KeyMetadata.Arn,
			"creationDate": describeResponse.KeyMetadata.CreationDate,
			"description":  describeResponse.KeyMetadata.Description,
			"keyState":     string(describeResponse.KeyMetadata.KeyState),
			"keyUsage":     string(describeResponse.KeyMetadata.KeyUsage),
		})
	}

	return keys, nil
}

// enumerateRDSInstances 枚举RDS数据库实例
func (p *AWSProvider) enumerateRDSInstances() ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用AWS SDK获取RDS实例列表
	input := &rds.DescribeDBInstancesInput{}
	response, err := p.rdsClient.DescribeDBInstances(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to describe RDS instances: %w", err)
	}

	var instances []interface{}
	for _, instance := range response.DBInstances {
		instances = append(instances, map[string]interface{}{
			"dbInstanceIdentifier":  *instance.DBInstanceIdentifier,
			"dbInstanceArn":         *instance.DBInstanceArn,
			"dbInstanceClass":       *instance.DBInstanceClass,
			"engine":                *instance.Engine,
			"engineVersion":         *instance.EngineVersion,
			"status":                *instance.DBInstanceStatus,
			"endpoint":              instance.Endpoint,
			"allocatedStorage":      instance.AllocatedStorage,
			"multiAZ":               *instance.MultiAZ,
			"backupRetentionPeriod": instance.BackupRetentionPeriod,
			"vpcSecurityGroups":     instance.VpcSecurityGroups,
		})
	}

	return instances, nil
}

// EscalatePrivileges 权限提升
func (p *AWSProvider) EscalatePrivileges() (map[string]interface{}, error) {
	// 这里应该实现AWS权限提升逻辑
	// 暂时返回模拟数据
	return map[string]interface{}{
		"message": "Privilege escalation attempted",
		"actions": []string{
			"Checked IAM policies",
			"Checked EC2 instance profiles",
			"Checked S3 bucket policies",
		},
	}, nil
}

// OperateResource 资源操作
func (p *AWSProvider) OperateResource(resourceType, action, resourceID string, params map[string]interface{}) (map[string]interface{}, error) {
	// 处理控制台接管操作
	if action == "takeover_console" {
		// 生成AWS控制台登录URL
		// 注意：这只是一个模拟实现，实际接管需要更复杂的逻辑
		consoleURL := fmt.Sprintf("https://console.aws.amazon.com/?region=%s", p.region)
		return map[string]interface{}{
			"message":     "Console takeover attempted",
			"console_url": consoleURL,
			"region":      p.region,
			"access_key":  p.accessKey,
		}, nil
	}

	// 处理S3存储桶操作
	if resourceType == "s3" {
		switch action {
		case "list_objects":
			// 遍历存储桶文件
			prefix, ok := params["prefix"].(string)
			if !ok {
				prefix = ""
			}
			objects, err := p.listS3Objects(resourceID, prefix)
			if err != nil {
				return nil, fmt.Errorf("failed to list S3 objects: %w", err)
			}
			return map[string]interface{}{
				"message": "S3 objects listed successfully",
				"bucket":  resourceID,
				"objects": objects,
			}, nil
		case "download":
			// 下载文件
			key, ok := params["key"].(string)
			if !ok {
				return nil, fmt.Errorf("key is required")
			}

			// 获取存储桶的实际区域
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			location, err := p.s3Client.GetBucketLocation(ctx, &s3.GetBucketLocationInput{
				Bucket: aws.String(resourceID),
			})

			var bucketRegion string
			if err == nil {
				if location.LocationConstraint == "" {
					bucketRegion = "us-east-1"
				} else {
					bucketRegion = string(location.LocationConstraint)
				}
			} else {
				// 如果获取区域失败，使用默认区域
				bucketRegion = "us-east-1"
			}

			// 创建使用存储桶实际区域的S3客户端
			cfg, err := config.LoadDefaultConfig(context.Background(),
				config.WithRegion(bucketRegion),
				config.WithCredentialsProvider(&StaticCredentialsProvider{
					Value:  p.accessKey,
					Secret: p.secretKey,
				}),
			)
			if err != nil {
				return nil, fmt.Errorf("failed to create S3 client for bucket region: %w", err)
			}

			s3Client := s3.NewFromConfig(cfg)

			// 生成预签名的S3 URL
			presignClient := s3.NewPresignClient(s3Client)
			getObjectInput := &s3.GetObjectInput{
				Bucket: aws.String(resourceID),
				Key:    aws.String(key),
			}
			presignedURL, err := presignClient.PresignGetObject(context.Background(), getObjectInput, s3.WithPresignExpires(15*time.Minute))
			if err != nil {
				return nil, fmt.Errorf("failed to generate presigned URL: %w", err)
			}
			// 返回下载URL
			return map[string]interface{}{
				"message":      "Download URL generated",
				"bucket":       resourceID,
				"key":          key,
				"region":       bucketRegion,
				"download_url": presignedURL.URL,
			}, nil
		}
	}

	// 其他资源操作
	return map[string]interface{}{
		"message":      "Resource operation attempted",
		"resourceType": resourceType,
		"action":       action,
		"resourceID":   resourceID,
		"params":       params,
	}, nil
}

// listS3Objects 列出S3存储桶中的对象
func (p *AWSProvider) listS3Objects(bucketName, prefix string) ([]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 获取存储桶的实际区域
	location, err := p.s3Client.GetBucketLocation(ctx, &s3.GetBucketLocationInput{
		Bucket: aws.String(bucketName),
	})

	var bucketRegion string
	if err == nil {
		if location.LocationConstraint == "" {
			bucketRegion = "us-east-1"
		} else {
			bucketRegion = string(location.LocationConstraint)
		}
	} else {
		// 如果获取区域失败，使用默认区域
		bucketRegion = "us-east-1"
	}

	// 创建使用存储桶实际区域的S3客户端
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(bucketRegion),
		config.WithCredentialsProvider(&StaticCredentialsProvider{
			Value:  p.accessKey,
			Secret: p.secretKey,
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create S3 client for bucket region: %w", err)
	}

	s3Client := s3.NewFromConfig(cfg)

	// 调用AWS SDK获取S3对象列表
	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(bucketName),
		Prefix: aws.String(prefix),
	}

	var objects []interface{}
	var continuationToken *string

	// 分页获取所有对象
	for {
		if continuationToken != nil {
			input.ContinuationToken = continuationToken
		}

		response, err := s3Client.ListObjectsV2(ctx, input)
		if err != nil {
			return nil, fmt.Errorf("failed to list S3 objects: %w", err)
		}

		for _, obj := range response.Contents {
			objects = append(objects, map[string]interface{}{
				"key":          *obj.Key,
				"size":         obj.Size,
				"lastModified": obj.LastModified.Format("2006-01-02T15:04:05Z"),
				"eTag":         *obj.ETag,
			})
		}

		if response.IsTruncated == nil || !*response.IsTruncated {
			break
		}
		continuationToken = response.NextContinuationToken
	}

	return objects, nil
}

// Takeover 平台接管
func (p *AWSProvider) Takeover() (map[string]interface{}, error) {
	// 这里应该实现AWS平台接管逻辑
	// 暂时返回模拟数据
	return map[string]interface{}{
		"message": "Cloud platform takeover attempted",
		"actions": []string{
			"Created IAM user with admin privileges",
			"Created access keys for persistence",
			"Configured backdoor access",
		},
	}, nil
}

// GetPermissions 获取权限信息
func (p *AWSProvider) GetPermissions() (map[string]interface{}, error) {
	// 这里应该实现获取AWS权限信息逻辑
	// 暂时返回模拟数据
	return map[string]interface{}{
		"message": "Permissions retrieved",
		"permissions": []string{
			"ec2:DescribeInstances",
			"s3:ListBuckets",
			"iam:ListUsers",
		},
	}, nil
}

// ValidateCredentials 验证凭证
func (p *AWSProvider) ValidateCredentials() (bool, error) {
	// 这里应该实现AWS凭证验证逻辑
	// 暂时返回模拟数据
	return true, nil
}
