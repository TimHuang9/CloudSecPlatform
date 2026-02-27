package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config 配置结构
type Config struct {
	// 服务器配置
	ServerHost string
	ServerPort int

	// 数据库配置
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string

	// Redis 配置
	RedisAddr string

	// JWT 配置
	JWTSecret string
	JWTExpiry int

	// 环境配置
	Environment string
}

// LoadConfig 加载配置
func LoadConfig() (*Config, error) {
	// 加载 .env 文件
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// 解析服务器端口
	serverPort, err := strconv.Atoi(getEnv("SERVER_PORT", "8080"))
	if err != nil {
		serverPort = 8080
	}

	// 解析数据库端口
	dbPort, err := strconv.Atoi(getEnv("DB_PORT", "5432"))
	if err != nil {
		dbPort = 5432
	}

	// 解析 JWT 过期时间
	jwtExpiry, err := strconv.Atoi(getEnv("JWT_EXPIRY", "24"))
	if err != nil {
		jwtExpiry = 24
	}

	return &Config{
		// 服务器配置
		ServerHost: getEnv("SERVER_HOST", "0.0.0.0"),
		ServerPort: serverPort,

		// 数据库配置
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     dbPort,
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "redteamsec"),

		// Redis 配置
		RedisAddr: getEnv("REDIS_ADDR", "localhost:6379"),

		// JWT 配置
		JWTSecret: getEnv("JWT_SECRET", "your-secret-key"),
		JWTExpiry: jwtExpiry,

		// 环境配置
		Environment: getEnv("ENVIRONMENT", "development"),
	}, nil
}

// getEnv 获取环境变量，如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
