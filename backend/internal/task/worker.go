package task

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redteamsec/backend/config"
	"github.com/redteamsec/backend/internal/cloud"
	"github.com/redteamsec/backend/internal/database"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// Worker 任务处理 worker
type Worker struct {
	db          *gorm.DB
	redisClient *redis.Client
	cfg         *config.Config
}

// NewWorker 创建新的任务处理 worker
func NewWorker(db *gorm.DB, redisClient *redis.Client, cfg *config.Config) *Worker {
	return &Worker{
		db:          db,
		redisClient: redisClient,
		cfg:         cfg,
	}
}

// Start 启动任务处理 worker
func (w *Worker) Start() {
	ctx := context.Background()

	for {
		// 检查Redis客户端是否可用
		if w.redisClient == nil {
			time.Sleep(5 * time.Second)
			continue
		}

		// 从队列中获取任务
		taskID, err := w.redisClient.BLPop(ctx, 5*time.Second, "task_queue").Result()
		if err != nil {
			if err != redis.Nil {
				fmt.Printf("Error popping task: %v\n", err)
			}
			continue
		}

		// 处理任务
		w.processTask(taskID[1])
	}
}

// processTask 处理任务
func (w *Worker) processTask(taskIDStr string) {
	// 解析任务 ID
	var taskID uint
	_, err := fmt.Sscanf(taskIDStr, "%d", &taskID)
	if err != nil {
		fmt.Printf("Error parsing task ID: %v\n", err)
		return
	}

	// 获取任务信息
	var task database.Task
	if result := w.db.First(&task, taskID); result.Error != nil {
		fmt.Printf("Error getting task: %v\n", result.Error)
		return
	}

	// 更新任务状态为 running
	task.Status = "running"
	task.StartTime = time.Now().Format(time.RFC3339)
	if result := w.db.Save(&task); result.Error != nil {
		fmt.Printf("Error updating task status: %v\n", result.Error)
		return
	}

	// 获取凭证信息
	var credential database.CloudCredential
	if result := w.db.First(&credential, task.CredentialID); result.Error != nil {
		fmt.Printf("Error getting credential: %v\n", result.Error)
		w.updateTaskStatus(taskID, "failed", "Credential not found")
		return
	}

	// 创建云平台实例
	provider, err := cloud.NewCloudProvider(credential.CloudProvider, credential.AccessKey, credential.SecretKey, credential.Region)
	if err != nil {
		fmt.Printf("Error creating cloud provider: %v\n", err)
		w.updateTaskStatus(taskID, "failed", "Failed to create cloud provider")
		return
	}

	// 解析任务参数
	var params map[string]interface{}
	if err := json.Unmarshal([]byte(task.Parameters), &params); err != nil {
		fmt.Printf("Error unmarshaling parameters: %v\n", err)
		w.updateTaskStatus(taskID, "failed", "Invalid parameters")
		return
	}

	// 根据任务类型执行不同的操作
	var result map[string]interface{}
	switch task.TaskType {
	case "enumerate":
		resourceType, ok := params["resource_type"].(string)
		if !ok {
			w.updateTaskStatus(taskID, "failed", "Invalid resource type")
			return
		}
		result, err = provider.EnumerateResources(resourceType)

	case "escalate":
		result, err = provider.EscalatePrivileges()

	case "operate":
		resourceType, ok1 := params["resource_type"].(string)
		action, ok2 := params["action"].(string)
		resourceID, ok3 := params["resource_id"].(string)
		if !ok1 || !ok2 || !ok3 {
			w.updateTaskStatus(taskID, "failed", "Invalid parameters")
			return
		}
		result, err = provider.OperateResource(resourceType, action, resourceID, params)

	case "takeover":
		result, err = provider.Takeover()

	default:
		w.updateTaskStatus(taskID, "failed", "Unsupported task type")
		return
	}

	// 处理执行结果
	if err != nil {
		fmt.Printf("Error executing task: %v\n", err)
		w.updateTaskStatus(taskID, "failed", err.Error())
		return
	}

	// 保存任务结果
	w.updateTaskStatus(taskID, "completed", "")
	w.saveTaskResult(taskID, result)
}

// updateTaskStatus 更新任务状态
func (w *Worker) updateTaskStatus(taskID uint, status, errorMsg string) {
	var task database.Task
	if result := w.db.First(&task, taskID); result.Error != nil {
		fmt.Printf("Error getting task: %v\n", result.Error)
		return
	}

	task.Status = status
	task.EndTime = time.Now().Format(time.RFC3339)
	if result := w.db.Save(&task); result.Error != nil {
		fmt.Printf("Error updating task status: %v\n", result.Error)
	}
}

// saveTaskResult 保存任务结果
func (w *Worker) saveTaskResult(taskID uint, result map[string]interface{}) {
	resultJSON, err := json.Marshal(result)
	if err != nil {
		fmt.Printf("Error marshaling result: %v\n", err)
		return
	}

	taskResult := database.TaskResult{
		TaskID:    taskID,
		Result:    string(resultJSON),
		Error:     "",
		Timestamp: time.Now().Format(time.RFC3339),
	}

	if result := w.db.Create(&taskResult); result.Error != nil {
		fmt.Printf("Error saving task result: %v\n", result.Error)
	}
}
