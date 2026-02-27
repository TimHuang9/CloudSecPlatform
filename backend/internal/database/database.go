package database

import (
	"context"

	"github.com/redis/go-redis/v9"
	"github.com/redteamsec/backend/config"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// InitDB 初始化数据库连接
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	// 使用SQLite数据库
	db, err := gorm.Open(sqlite.Open("redteamsec.db"), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// 自动迁移数据库表结构
	if err := db.AutoMigrate(
		&User{},
		&CloudCredential{},
		&Task{},
		&TaskResult{},
	); err != nil {
		return nil, err
	}

	// 检查并创建默认管理员用户
	var adminUser User
	result := db.Where("username = ?", "admin").First(&adminUser)
	if result.Error == gorm.ErrRecordNotFound {
		// 创建默认管理员用户
		adminUser = User{
			Username: "admin",
			Password: "admin", // 实际应用中应该加密存储
			Email:    "admin@example.com",
			Role:     "admin",
		}
		if err := db.Create(&adminUser).Error; err != nil {
			return nil, err
		}
	}

	return db, nil
}

// InitRedis 初始化 Redis 连接
func InitRedis(cfg *config.Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr: cfg.RedisAddr,
	})

	// 测试连接
	ctx := context.Background()
	_, err := client.Ping(ctx).Result()
	if err != nil {
		return nil, err
	}

	return client, nil
}

// 数据库模型

// User 用户模型
type User struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Username string `gorm:"uniqueIndex;size:255" json:"username"`
	Password string `gorm:"size:255" json:"-"`
	Email    string `gorm:"uniqueIndex;size:255" json:"email"`
	Role     string `gorm:"size:50" json:"role"`
}

// CloudCredential 云平台凭证模型
type CloudCredential struct {
	ID            uint   `gorm:"primaryKey" json:"id"`
	UserID        uint   `json:"user_id"`
	CloudProvider string `gorm:"size:50" json:"cloud_provider"`
	AccessKey     string `gorm:"size:255" json:"access_key"`
	SecretKey     string `gorm:"size:255" json:"-"`
	Region        string `gorm:"size:50" json:"region"`
	Name          string `gorm:"size:255" json:"name"`
	Description   string `gorm:"size:255" json:"description"`
}

// Task 任务模型
type Task struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	UserID       uint   `json:"userId"`
	CredentialID uint   `json:"credentialId"`
	TaskType     string `gorm:"size:50" json:"taskType"`
	Status       string `gorm:"size:50" json:"status"`
	Parameters   string `gorm:"type:jsonb" json:"parameters"`
	StartTime    string `json:"startTime"`
	EndTime      string `json:"endTime"`
}

// TaskResult 任务结果模型
type TaskResult struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	TaskID    uint   `json:"taskId"`
	Result    string `gorm:"type:jsonb" json:"result"`
	Error     string `gorm:"size:255" json:"error"`
	Timestamp string `json:"timestamp"`
}
