package main

import (
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
	"github.com/redteamsec/backend/config"
	"github.com/redteamsec/backend/internal/api"
	"github.com/redteamsec/backend/internal/database"
	"github.com/redteamsec/backend/internal/task"
)

func main() {
	// 加载配置
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 初始化数据库
	db, err := database.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// 初始化 Redis
	var redisClient *redis.Client
	redisClient, err = database.InitRedis(cfg)
	if err != nil {
		log.Printf("Warning: Failed to initialize Redis: %v, running without Redis", err)
	}

	// 创建任务处理 worker
	worker := task.NewWorker(db, redisClient, cfg)

	// 启动任务处理 worker（后台运行）
	go worker.Start()

	// 设置路由
	router := api.SetupRouter(db, redisClient, cfg)

	// 启动服务器
	serverAddr := fmt.Sprintf("%s:%d", cfg.ServerHost, cfg.ServerPort)
	log.Printf("Server starting on %s", serverAddr)
	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
