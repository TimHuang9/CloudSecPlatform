package api

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/redteamsec/backend/config"
	"github.com/redteamsec/backend/internal/auth"
	"github.com/redteamsec/backend/internal/cloud"
	"github.com/redteamsec/backend/internal/database"
	"gorm.io/gorm"
)

// SetupRouter 设置路由
func SetupRouter(db *gorm.DB, redisClient *redis.Client, cfg *config.Config) *gin.Engine {
	// 创建路由
	router := gin.Default()

	// 配置CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 创建API组
	api := router.Group("/api")

	// 公开路由
	api.POST("/auth/register", registerHandler(db, cfg))
	api.POST("/auth/login", loginHandler(db, cfg))

	// 需要认证的路由
	authGroup := api.Group("/")
	authGroup.Use(authMiddleware(cfg))
	{
		// 用户相关
		authGroup.GET("/user/profile", getUserProfileHandler(db))
		authGroup.PUT("/user/profile", updateUserProfileHandler(db))

		// 云平台凭证管理
		authGroup.GET("/credentials", listCredentialsHandler(db))
		authGroup.POST("/credentials", createCredentialHandler(db))
		authGroup.GET("/credentials/:id", getCredentialHandler(db))
		authGroup.PUT("/credentials/:id", updateCredentialHandler(db))
		authGroup.DELETE("/credentials/:id", deleteCredentialHandler(db))

		// 任务管理
		authGroup.GET("/tasks", listTasksHandler(db))
		authGroup.POST("/tasks", createTaskHandler(db, redisClient))
		authGroup.GET("/tasks/:id", getTaskHandler(db))
		authGroup.GET("/tasks/:id/results", getTaskResultsHandler(db))

		// 云平台操作
			authGroup.POST("/cloud/enumerate", enumerateResourcesHandler(db))
			authGroup.POST("/cloud/escalate", escalatePrivilegesHandler(db))
			authGroup.POST("/cloud/operate", operateResourceHandler(db))
			authGroup.POST("/cloud/takeover", takeoverCloudHandler(db))
			authGroup.POST("/cloud/resources", getResourcesFromDatabaseHandler(db))

			// 结果分析
			authGroup.GET("/analysis/task-stats", getTaskStatsHandler(db))
			authGroup.GET("/analysis/vulnerability-stats", getVulnerabilityStatsHandler(db))
			authGroup.GET("/analysis/resource-stats", getResourceStatsHandler(db))
			authGroup.GET("/analysis/recent-findings", getRecentFindingsHandler(db))
	}

	return router
}

// 认证中间件
func authMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从请求头获取token
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(401, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// 验证token
		claims, err := auth.ValidateToken(tokenString, cfg)
		if err != nil {
			c.JSON(401, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// 将用户信息存储到上下文
		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// 路由处理函数
func registerHandler(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Username string `json:"username" binding:"required"`
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required,min=6"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// 检查用户名是否已存在
		var existingUser database.User
		if result := db.Where("username = ?", input.Username).First(&existingUser); result.Error == nil {
			c.JSON(400, gin.H{"error": "Username already exists"})
			return
		}

		// 检查邮箱是否已存在
		if result := db.Where("email = ?", input.Email).First(&existingUser); result.Error == nil {
			c.JSON(400, gin.H{"error": "Email already exists"})
			return
		}

		// 创建新用户
		user := database.User{
			Username: input.Username,
			Email:    input.Email,
			Password: input.Password, // 实际应用中应该加密存储
			Role:     "user",
		}

		if result := db.Create(&user); result.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to create user"})
			return
		}

		// 生成JWT令牌
		token, err := auth.GenerateToken(user.ID, user.Username, user.Role, cfg)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(201, gin.H{
			"message": "User created successfully",
			"user": gin.H{
				"id":       user.ID,
				"username": user.Username,
				"email":    user.Email,
				"role":     user.Role,
			},
			"token": token,
		})
	}
}

func loginHandler(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Username string `json:"username" binding:"required"`
			Password string `json:"password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// 查找用户
		var user database.User
		if result := db.Where("username = ?", input.Username).First(&user); result.Error != nil {
			c.JSON(401, gin.H{"error": "Invalid username or password"})
			return
		}

		// 验证密码（实际应用中应该使用加密验证）
		if user.Password != input.Password {
			c.JSON(401, gin.H{"error": "Invalid username or password"})
			return
		}

		// 生成JWT令牌
		token, err := auth.GenerateToken(user.ID, user.Username, user.Role, cfg)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(200, gin.H{
			"message": "Login successful",
			"user": gin.H{
				"id":       user.ID,
				"username": user.Username,
				"email":    user.Email,
				"role":     user.Role,
			},
			"token": token,
		})
	}
}

func getUserProfileHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var user database.User
		if result := db.First(&user, userID); result.Error != nil {
			c.JSON(404, gin.H{"error": "User not found"})
			return
		}

		c.JSON(200, gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
		})
	}
}

func updateUserProfileHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var input struct {
			Username string `json:"username"`
			Email    string `json:"email"`
			Password string `json:"password"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		var user database.User
		if result := db.First(&user, userID); result.Error != nil {
			c.JSON(404, gin.H{"error": "User not found"})
			return
		}

		// 更新用户信息
		if input.Username != "" {
			user.Username = input.Username
		}
		if input.Email != "" {
			user.Email = input.Email
		}
		if input.Password != "" {
			user.Password = input.Password // 实际应用中应该加密存储
		}

		if result := db.Save(&user); result.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to update user"})
			return
		}

		c.JSON(200, gin.H{
			"message": "User updated successfully",
			"user": gin.H{
				"id":       user.ID,
				"username": user.Username,
				"email":    user.Email,
				"role":     user.Role,
			},
		})
	}
}

func listCredentialsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var credentials []database.CloudCredential
		if result := db.Where("user_id = ?", userID).Find(&credentials); result.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch credentials"})
			return
		}

		c.JSON(200, credentials)
	}
}

func createCredentialHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var input struct {
			CloudProvider string `json:"cloud_provider" binding:"required"`
			AccessKey     string `json:"access_key" binding:"required"`
			SecretKey     string `json:"secret_key" binding:"required"`
			Name          string `json:"name" binding:"required"`
			Description   string `json:"description"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		credential := database.CloudCredential{
			UserID:        userID.(uint),
			CloudProvider: input.CloudProvider,
			AccessKey:     input.AccessKey,
			SecretKey:     input.SecretKey, // 实际应用中应该加密存储
			Region:        "", // 不再收集区域信息，设为空字符串
			Name:          input.Name,
			Description:   input.Description,
		}

		if result := db.Create(&credential); result.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to create credential"})
			return
		}

		c.JSON(201, credential)
	}
}

func getCredentialHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		id := c.Param("id")
		var credential database.CloudCredential
		if result := db.Where("id = ? AND user_id = ?", id, userID).First(&credential); result.Error != nil {
			c.JSON(404, gin.H{"error": "Credential not found"})
			return
		}

		c.JSON(200, credential)
	}
}

func updateCredentialHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		id := c.Param("id")
		var credential database.CloudCredential
		if result := db.Where("id = ? AND user_id = ?", id, userID).First(&credential); result.Error != nil {
			c.JSON(404, gin.H{"error": "Credential not found"})
			return
		}

		var input struct {
			CloudProvider string `json:"cloud_provider"`
			AccessKey     string `json:"access_key"`
			SecretKey     string `json:"secret_key"`
			Name          string `json:"name"`
			Description   string `json:"description"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// 更新凭证信息
		if input.CloudProvider != "" {
			credential.CloudProvider = input.CloudProvider
		}
		if input.AccessKey != "" {
			credential.AccessKey = input.AccessKey
		}
		if input.SecretKey != "" {
			credential.SecretKey = input.SecretKey // 实际应用中应该加密存储
		}
		if input.Name != "" {
			credential.Name = input.Name
		}
		if input.Description != "" {
			credential.Description = input.Description
		}

		if result := db.Save(&credential); result.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to update credential"})
			return
		}

		c.JSON(200, credential)
	}
}

func deleteCredentialHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		id := c.Param("id")
		var credential database.CloudCredential
		if result := db.Where("id = ? AND user_id = ?", id, userID).First(&credential); result.Error != nil {
			c.JSON(404, gin.H{"error": "Credential not found"})
			return
		}

		if result := db.Delete(&credential); result.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to delete credential"})
			return
		}

		c.JSON(200, gin.H{"message": "Credential deleted successfully"})
	}
}

func listTasksHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var tasks []database.Task
		if result := db.Where("user_id = ?", userID).Find(&tasks); result.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch tasks"})
			return
		}

		c.JSON(200, tasks)
	}
}

func createTaskHandler(db *gorm.DB, redisClient *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var input struct {
			CredentialID uint   `json:"credential_id" binding:"required"`
			TaskType     string `json:"task_type" binding:"required"`
			Parameters   string `json:"parameters" binding:"required"`
			Name         string `json:"name" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// 验证凭证是否属于该用户
		var credential database.CloudCredential
		if result := db.Where("id = ? AND user_id = ?", input.CredentialID, userID).First(&credential); result.Error != nil {
			c.JSON(404, gin.H{"error": "Credential not found"})
			return
		}

		task := database.Task{
			UserID:        userID.(uint),
			CredentialID:  input.CredentialID,
			TaskType:      input.TaskType,
			Status:        "pending",
			Parameters:    input.Parameters,
			StartTime:     "",
			EndTime:       "",
		}

		if result := db.Create(&task); result.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to create task"})
			return
		}

		// 将任务ID添加到Redis队列
		if redisClient != nil {
			if err := redisClient.LPush(c, "task_queue", task.ID).Err(); err != nil {
				c.JSON(500, gin.H{"error": "Failed to add task to queue"})
				return
			}
		} else {
			// 如果Redis不可用，直接处理任务
			fmt.Printf("Redis not available, processing task %d directly\n", task.ID)
			// 这里可以添加直接处理任务的代码
		}

		c.JSON(201, task)
	}
}

func getTaskHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		id := c.Param("id")
		var task database.Task
		if result := db.Where("id = ? AND user_id = ?", id, userID).First(&task); result.Error != nil {
			c.JSON(404, gin.H{"error": "Task not found"})
			return
		}

		c.JSON(200, task)
	}
}

func getTaskResultsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		id := c.Param("id")
		var task database.Task
		if result := db.Where("id = ? AND user_id = ?", id, userID).First(&task); result.Error != nil {
			c.JSON(404, gin.H{"error": "Task not found"})
			return
		}

		var results []database.TaskResult
		if result := db.Where("task_id = ?", id).Find(&results); result.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch task results"})
			return
		}

		c.JSON(200, results)
	}
}

func enumerateResourcesHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var input struct {
			CredentialID uint   `json:"credential_id" binding:"required"`
			ResourceType string `json:"resource_type" binding:"required"`
			Region       string `json:"region"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// 验证凭证是否属于该用户
		var credential database.CloudCredential
		if result := db.Where("id = ? AND user_id = ?", input.CredentialID, userID).First(&credential); result.Error != nil {
			c.JSON(404, gin.H{"error": "Credential not found"})
			return
		}

		// 确定使用的区域：优先使用输入的region，否则使用凭证的region
		region := credential.Region
		if input.Region != "" {
			region = input.Region
		}

		// 创建云平台实例
		provider, err := cloud.NewCloudProvider(credential.CloudProvider, credential.AccessKey, credential.SecretKey, region)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create cloud provider: " + err.Error()})
			return
		}

		// 枚举资源
		result, err := provider.EnumerateResources(input.ResourceType)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to enumerate resources: " + err.Error()})
			return
		}

		// 将结果保存到数据库
		// 创建任务记录
		parameters, _ := json.Marshal(map[string]interface{}{
			"resource_type": input.ResourceType,
			"region":       region,
		})

		task := database.Task{
			UserID:        userID.(uint),
			CredentialID:  input.CredentialID,
			TaskType:      "enumerate",
			Status:        "completed",
			Parameters:    string(parameters),
			StartTime:     time.Now().Format(time.RFC3339),
			EndTime:       time.Now().Format(time.RFC3339),
		}

		if err := db.Create(&task).Error; err != nil {
			// 记录错误但不影响返回结果
			fmt.Printf("Failed to create task: %v\n", err)
		}

		// 创建任务结果记录
		resultJSON, _ := json.Marshal(result)
		taskResult := database.TaskResult{
			TaskID:    task.ID,
			Result:    string(resultJSON),
			Error:     "",
			Timestamp: time.Now().Format(time.RFC3339),
		}

		if err := db.Create(&taskResult).Error; err != nil {
			// 记录错误但不影响返回结果
			fmt.Printf("Failed to create task result: %v\n", err)
		}

		c.JSON(200, gin.H{
			"message": "Resource enumeration completed",
			"credential": credential.Name,
			"resource_type": input.ResourceType,
			"result": result,
			"task_id": task.ID,
		})
	}
}

func escalatePrivilegesHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var input struct {
			CredentialID uint `json:"credential_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// 验证凭证是否属于该用户
		var credential database.CloudCredential
		if result := db.Where("id = ? AND user_id = ?", input.CredentialID, userID).First(&credential); result.Error != nil {
			c.JSON(404, gin.H{"error": "Credential not found"})
			return
		}

		// 创建云平台实例
		provider, err := cloud.NewCloudProvider(credential.CloudProvider, credential.AccessKey, credential.SecretKey, credential.Region)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create cloud provider: " + err.Error()})
			return
		}

		// 权限提升
		result, err := provider.EscalatePrivileges()
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to escalate privileges: " + err.Error()})
			return
		}

		c.JSON(200, gin.H{
			"message": "Privilege escalation completed",
			"credential": credential.Name,
			"result": result,
		})
	}
}

func operateResourceHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var input struct {
			CredentialID uint                   `json:"credential_id" binding:"required"`
			ResourceType string                 `json:"resource_type" binding:"required"`
			Action       string                 `json:"action" binding:"required"`
			ResourceID   string                 `json:"resource_id" binding:"required"`
			Params       map[string]interface{} `json:"params"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// 验证凭证是否属于该用户
		var credential database.CloudCredential
		if result := db.Where("id = ? AND user_id = ?", input.CredentialID, userID).First(&credential); result.Error != nil {
			c.JSON(404, gin.H{"error": "Credential not found"})
			return
		}

		// 创建云平台实例
		provider, err := cloud.NewCloudProvider(credential.CloudProvider, credential.AccessKey, credential.SecretKey, credential.Region)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create cloud provider: " + err.Error()})
			return
		}

		// 资源操作
		result, err := provider.OperateResource(input.ResourceType, input.Action, input.ResourceID, input.Params)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to operate resource: " + err.Error()})
			return
		}

		c.JSON(200, gin.H{
			"message": "Resource operation completed",
			"credential": credential.Name,
			"resource_type": input.ResourceType,
			"action": input.Action,
			"resource_id": input.ResourceID,
			"result": result,
		})
	}
}

func takeoverCloudHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var input struct {
			CredentialID uint `json:"credential_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// 验证凭证是否属于该用户
		var credential database.CloudCredential
		if result := db.Where("id = ? AND user_id = ?", input.CredentialID, userID).First(&credential); result.Error != nil {
			c.JSON(404, gin.H{"error": "Credential not found"})
			return
		}

		// 创建云平台实例
		provider, err := cloud.NewCloudProvider(credential.CloudProvider, credential.AccessKey, credential.SecretKey, credential.Region)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create cloud provider: " + err.Error()})
			return
		}

		// 平台接管
		result, err := provider.Takeover()
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to takeover cloud platform: " + err.Error()})
			return
		}

		c.JSON(200, gin.H{
			"message": "Cloud platform takeover completed",
			"credential": credential.Name,
			"result": result,
		})
	}
}

// 从数据库获取资源数据
func getResourcesFromDatabaseHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		var input struct {
			CredentialID uint `json:"credential_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// 验证凭证是否属于该用户
		var credential database.CloudCredential
		if result := db.Where("id = ? AND user_id = ?", input.CredentialID, userID).First(&credential); result.Error != nil {
			c.JSON(404, gin.H{"error": "Credential not found"})
			return
		}

		// 查找最新的枚举任务
		var task database.Task
		if result := db.Where("user_id = ? AND credential_id = ? AND task_type = ? AND status = ?", userID, input.CredentialID, "enumerate", "completed").Order("end_time DESC").First(&task); result.Error != nil {
			c.JSON(404, gin.H{"error": "No enumeration task found"})
			return
		}

		// 查找任务结果
		var taskResult database.TaskResult
		if result := db.Where("task_id = ?", task.ID).First(&taskResult); result.Error != nil {
			c.JSON(404, gin.H{"error": "Task result not found"})
			return
		}

		// 解析结果JSON
		var result map[string]interface{}
		if err := json.Unmarshal([]byte(taskResult.Result), &result); err != nil {
			c.JSON(500, gin.H{"error": "Failed to parse task result"})
			return
		}

		c.JSON(200, gin.H{
			"message": "Resources fetched from database",
			"credential": credential.Name,
			"result": result,
			"task_id": task.ID,
			"timestamp": task.EndTime,
		})
	}
}

// 结果分析相关处理函数
func getTaskStatsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		// 统计任务数量
		var total, success, failed, running int64
		db.Model(&database.Task{}).Where("user_id = ?", userID).Count(&total)
		db.Model(&database.Task{}).Where("user_id = ? AND status = ?", userID, "completed").Count(&success)
		db.Model(&database.Task{}).Where("user_id = ? AND status = ?", userID, "failed").Count(&failed)
		db.Model(&database.Task{}).Where("user_id = ? AND status = ?", userID, "running").Count(&running)

		successRate := float64(0)
		if total > 0 {
			successRate = float64(success) / float64(total) * 100
		}

		c.JSON(200, gin.H{
			"total": total,
			"success": success,
			"failed": failed,
			"running": running,
			"successRate": successRate,
		})
	}
}

func getVulnerabilityStatsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		_, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		// 模拟数据 - 实际应用中应该从任务结果中分析
		vulnerabilityStats := []map[string]interface{}{
			{
				"name": "AWS",
				"critical": 2,
				"high": 5,
				"medium": 8,
				"low": 12,
			},
			{
				"name": "阿里云",
				"critical": 1,
				"high": 3,
				"medium": 6,
				"low": 9,
			},
			{
				"name": "GCP",
				"critical": 0,
				"high": 2,
				"medium": 4,
				"low": 7,
			},
			{
				"name": "Azure",
				"critical": 1,
				"high": 2,
				"medium": 3,
				"low": 5,
			},
			{
				"name": "腾讯云",
				"critical": 0,
				"high": 1,
				"medium": 2,
				"low": 4,
			},
		}

		c.JSON(200, vulnerabilityStats)
	}
}

func getResourceStatsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		_, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		// 模拟数据 - 实际应用中应该从任务结果中分析
		resourceStats := []map[string]interface{}{
			{
				"resource": "EC2 实例",
				"count": 150,
				"vulnerable": 25,
				"percentage": 16.7,
			},
			{
				"resource": "S3 存储桶",
				"count": 85,
				"vulnerable": 30,
				"percentage": 35.3,
			},
			{
				"resource": "IAM 用户",
				"count": 45,
				"vulnerable": 12,
				"percentage": 26.7,
			},
			{
				"resource": "数据库实例",
				"count": 25,
				"vulnerable": 5,
				"percentage": 20,
			},
		}

		c.JSON(200, resourceStats)
	}
}

func getRecentFindingsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		_, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			return
		}

		// 模拟数据 - 实际应用中应该从任务结果中分析
		recentFindings := []map[string]interface{}{
			{
				"id": 1,
				"title": "AWS S3 存储桶可公开访问",
				"severity": "high",
				"cloudProvider": "AWS",
				"timestamp": "2024-01-15 14:30:00",
				"status": "open",
			},
			{
				"id": 2,
				"title": "阿里云 ECS 实例安全组配置过于宽松",
				"severity": "medium",
				"cloudProvider": "阿里云",
				"timestamp": "2024-01-15 13:45:00",
				"status": "open",
			},
			{
				"id": 3,
				"title": "GCP IAM 权限过大",
				"severity": "critical",
				"cloudProvider": "GCP",
				"timestamp": "2024-01-15 12:20:00",
				"status": "closed",
			},
			{
				"id": 4,
				"title": "Azure 存储账户密钥泄露",
				"severity": "high",
				"cloudProvider": "Azure",
				"timestamp": "2024-01-15 11:10:00",
				"status": "open",
			},
			{
				"id": 5,
				"title": "腾讯云 CAM 角色权限配置错误",
				"severity": "medium",
				"cloudProvider": "腾讯云",
				"timestamp": "2024-01-15 10:05:00",
				"status": "open",
			},
		}

		c.JSON(200, recentFindings)
	}
}