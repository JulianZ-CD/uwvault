#!/bin/bash

# 配置变量
IMAGE_NAME="uwvault"
VERSION=$(git describe --tags --always)
MODE=${MODE:-"single"}  # 默认单容器模式
ACTION=${1:-"build"}    # 默认动作为构建
REGISTRY=${REGISTRY:-""}  # 镜像仓库地址，可以为空
GITHUB_REGISTRY="ghcr.io/your-username"  # GitHub Container Registry
GCP_REGISTRY="gcr.io/your-project"       # Google Container Registry

# 如果设置了镜像仓库地址，添加到镜像名前
if [ ! -z "$REGISTRY" ]; then
    IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}"
fi

# 构建函数
build() {
    echo "Building Docker image: ${IMAGE_NAME}:${VERSION}"
    echo "Build mode: ${MODE}"

    # 确保 buildx 已安装并准备就绪
    docker buildx create --use --name builder || true

    case $MODE in
        "single")
            echo "Building single container multi-arch image..."
            docker buildx build \
                --platform linux/amd64,linux/arm64 \
                --load \
                -t ${IMAGE_NAME}:${VERSION} \
                -t ${IMAGE_NAME}:latest \
                .
            ;;
        "multi")
            echo "Error: Split mode not implemented yet"
            exit 1
            ;;
        *)
            echo "Invalid mode: ${MODE}"
            exit 1
            ;;
    esac
}

# Push 到 GitHub Container Registry
push_github() {
    echo "Pushing to GitHub Container Registry..."
    
    # 标记镜像
    docker tag ${IMAGE_NAME}:${VERSION} ${GITHUB_REGISTRY}/${IMAGE_NAME}:${VERSION}
    docker tag ${IMAGE_NAME}:${VERSION} ${GITHUB_REGISTRY}/${IMAGE_NAME}:latest
    
    # 推送镜像
    docker push ${GITHUB_REGISTRY}/${IMAGE_NAME}:${VERSION}
    docker push ${GITHUB_REGISTRY}/${IMAGE_NAME}:latest
    
    echo "Successfully pushed to GitHub Container Registry"
}

# Push 到 Google Container Registry
push_gcp() {
    echo "Pushing to Google Container Registry..."
    
    # 标记镜像
    docker tag ${IMAGE_NAME}:${VERSION} ${GCP_REGISTRY}/${IMAGE_NAME}:${VERSION}
    docker tag ${IMAGE_NAME}:${VERSION} ${GCP_REGISTRY}/${IMAGE_NAME}:latest
    
    # 推送镜像
    docker push ${GCP_REGISTRY}/${IMAGE_NAME}:${VERSION}
    docker push ${GCP_REGISTRY}/${IMAGE_NAME}:latest
    
    echo "Successfully pushed to Google Container Registry"
}

# 部署函数
deploy() {
    echo "Deploying version: ${VERSION}"
    # 这里添加你的部署逻辑
    # 例如：使用 docker-compose 或 kubectl
}

# 清理函数
cleanup() {
    echo "Cleaning up old images..."
    docker image prune -f
}

# 主逻辑
case $ACTION in
    "build")
        build
        ;;
    "push-github")
        push_github
        ;;
    "push-gcp")
        push_gcp
        ;;
    "deploy")
        deploy
        ;;
    "cleanup")
        cleanup
        ;;
    "all")
        build
        push_github
        push_gcp
        deploy
        ;;
    *)
        echo "Usage: $0 {build|push-github|push-gcp|deploy|cleanup|all}"
        echo "Environment variables:"
        echo "  MODE: single|split (default: single)"
        echo "  REGISTRY: Docker registry URL (optional)"
        echo "  GITHUB_REGISTRY: GitHub Container Registry URL (optional)"
        echo "  GCP_REGISTRY: Google Container Registry URL (optional)"
        exit 1
        ;;
esac 