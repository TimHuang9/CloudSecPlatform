package cloud

import (
	"github.com/redteamsec/backend/internal/cloud/aws"
	"github.com/redteamsec/backend/internal/cloud/aliyun"
	"github.com/redteamsec/backend/internal/cloud/gcp"
	// "github.com/redteamsec/backend/internal/cloud/azure"
)

// CloudProvider 云平台接口
type CloudProvider interface {
	// 初始化云平台客户端
	Init(accessKey, secretKey, region string) error

	// 资源枚举
	EnumerateResources(resourceType string) (map[string]interface{}, error)

	// 权限提升
	EscalatePrivileges() (map[string]interface{}, error)

	// 资源操作
	OperateResource(resourceType, action, resourceID string, params map[string]interface{}) (map[string]interface{}, error)

	// 平台接管
	Takeover() (map[string]interface{}, error)

	// 获取权限信息
	GetPermissions() (map[string]interface{}, error)

	// 验证凭证
	ValidateCredentials() (bool, error)
}

// NewCloudProvider 创建云平台实例
func NewCloudProvider(providerType, accessKey, secretKey, region string) (CloudProvider, error) {
	switch providerType {
	case "AWS":
		return aws.NewAWSProvider(accessKey, secretKey, region)
	case "阿里云":
		return aliyun.NewAliyunProvider(accessKey, secretKey, region)
	case "GCP":
		return gcp.NewGCPProvider(accessKey, secretKey, region)
	// case "Azure":
	// 	return azure.NewAzureProvider(accessKey, secretKey, region)
	// case "腾讯云":
	// 	return NewTencentProvider(accessKey, secretKey, region)
	default:
		return nil, nil
	}
}