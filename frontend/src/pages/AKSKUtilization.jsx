import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCredentials } from '../store/credentialSlice'
import { Typography, Card, Button, Select, Table, Tabs, Form, Input, Modal, message, Alert, Spin, Badge } from 'antd'
import { CloudOutlined, KeyOutlined, SearchOutlined, PlayCircleOutlined, SafetyOutlined, LaptopOutlined, DownloadOutlined, LockOutlined, AppstoreOutlined, DatabaseOutlined, CloudServerOutlined, FolderOpenOutlined, UserOutlined, BuildOutlined } from '@ant-design/icons'
import axios from 'axios'

// 配置 axios 基础 URL
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器，添加 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = token
  }
  return config
})

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

const AKSKUtilization = () => {
  const dispatch = useDispatch()
  const { credentials } = useSelector(state => state.credential)
  
  // 状态管理
  const [selectedCredential, setSelectedCredential] = useState(null)
  const [activeTab, setActiveTab] = useState('enumerate')
  const [resources, setResources] = useState([])
  const [filteredResources, setFilteredResources] = useState([])
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(false)
  const [selectedResourceTypes, setSelectedResourceTypes] = useState(['all'])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [action, setAction] = useState('list')
  const [resourceId, setResourceId] = useState('')
  const [operationParams, setOperationParams] = useState({})
  const [operationResult, setOperationResult] = useState(null)
  const [privilegeResult, setPrivilegeResult] = useState(null)
  const [takeoverResult, setTakeoverResult] = useState(null)
  const [downloadTasks, setDownloadTasks] = useState([])
  const [enumerationProgresses, setEnumerationProgresses] = useState({})
  const [enumerationStatus, setEnumerationStatus] = useState('')
  const [userInfo, setUserInfo] = useState({})
  
  // 资源组管理
  const [resourceGroups, setResourceGroups] = useState(() => {
    const savedGroups = localStorage.getItem('resourceGroups')
    return savedGroups ? JSON.parse(savedGroups) : []
  })
  const [selectedResourceGroup, setSelectedResourceGroup] = useState(null)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [currentGroup, setCurrentGroup] = useState({ name: '', resources: [] })
  const [isEditingGroup, setIsEditingGroup] = useState(false)

  // 动态资源类型列表
  const getResourceTypes = () => {
    if (!selectedCredential) {
      return [
        { value: 'all', label: '所有资源' },
        { value: 'ec2', label: 'EC2 实例' },
        { value: 's3', label: 'S3 存储桶' },
        { value: 'iam', label: 'IAM 权限' },
        { value: 'vpc', label: 'VPC' },
        { value: 'route', label: '路由表' },
        { value: 'elb', label: '负载均衡器' },
        { value: 'eks', label: 'EKS 集群' },
        { value: 'kms', label: 'KMS 密钥' },
        { value: 'rds', label: 'RDS 数据库' },
        { value: 'database', label: '数据库' },
        { value: 'network', label: '网络资源' }
      ]
    }

    if (selectedCredential.cloudProvider === 'AWS') {
      return [
        { value: 'all', label: '所有资源' },
        { value: 'ec2', label: 'EC2 实例' },
        { value: 's3', label: 'S3 存储桶' },
        { value: 'iam', label: 'IAM 权限' },
        { value: 'vpc', label: 'VPC' },
        { value: 'route', label: '路由表' },
        { value: 'elb', label: '负载均衡器' },
        { value: 'eks', label: 'EKS 集群' },
        { value: 'kms', label: 'KMS 密钥' },
        { value: 'rds', label: 'RDS 数据库' },
        { value: 'lambda', label: 'Lambda 函数' },
        { value: 'apigateway', label: 'API Gateway' },
        { value: 'cloudtrail', label: 'CloudTrail' },
        { value: 'cloudwatchlogs', label: 'CloudWatch Logs' },
        { value: 'dynamodb', label: 'DynamoDB 表' },
        { value: 'secretsmanager', label: 'Secrets Manager' },
        { value: 'sns', label: 'SNS 主题' },
        { value: 'sqs', label: 'SQS 队列' }
      ]
    } else if (selectedCredential.cloudProvider === '阿里云') {
      return [
        { value: 'all', label: '所有资源' },
        { value: 'ecs', label: 'ECS 实例' },
        { value: 'oss', label: 'OSS 存储桶' },
        { value: 'ram', label: 'RAM 权限' }
      ]
    } else if (selectedCredential.cloudProvider === 'GCP') {
      return [
        { value: 'all', label: '所有资源' },
        { value: 'compute', label: 'Compute 实例' },
        { value: 'storage', label: 'Storage 存储桶' },
        { value: 'iam', label: 'IAM 权限' }
      ]
    } else {
      return [
        { value: 'all', label: '所有资源' }
      ]
    }
  }

  // 动态资源分类标签
  const getResourceCategories = () => {
    if (!selectedCredential) {
      return [
        { value: 'all', label: '全部' },
        { value: 'ec2', label: 'EC2' },
        { value: 's3', label: 'S3' },
        { value: 'iam', label: 'IAM' },
        { value: 'vpc', label: 'VPC' },
        { value: 'route', label: '路由表' },
        { value: 'elb', label: '负载均衡器' },
        { value: 'eks', label: 'EKS' },
        { value: 'kms', label: 'KMS' },
        { value: 'rds', label: 'RDS' }
      ]
    }

    if (selectedCredential.cloudProvider === 'AWS') {
      return [
        { value: 'all', label: '全部' },
        { value: 'ec2', label: 'EC2' },
        { value: 's3', label: 'S3' },
        { value: 'iam', label: 'IAM' },
        { value: 'vpc', label: 'VPC' },
        { value: 'route', label: '路由表' },
        { value: 'elb', label: '负载均衡器' },
        { value: 'eks', label: 'EKS' },
        { value: 'kms', label: 'KMS' },
        { value: 'rds', label: 'RDS' },
        { value: 'lambda', label: 'Lambda' },
        { value: 'apigateway', label: 'API Gateway' },
        { value: 'cloudtrail', label: 'CloudTrail' },
        { value: 'cloudwatchlogs', label: 'CloudWatch Logs' },
        { value: 'dynamodb', label: 'DynamoDB' },
        { value: 'secretsmanager', label: 'Secrets Manager' },
        { value: 'sns', label: 'SNS' },
        { value: 'sqs', label: 'SQS' }
      ]
    } else if (selectedCredential.cloudProvider === '阿里云') {
      return [
        { value: 'all', label: '全部' },
        { value: 'ecs', label: 'ECS' },
        { value: 'oss', label: 'OSS' },
        { value: 'ram', label: 'RAM' }
      ]
    } else if (selectedCredential.cloudProvider === 'GCP') {
      return [
        { value: 'all', label: '全部' },
        { value: 'compute', label: 'Compute' },
        { value: 'storage', label: 'Storage' },
        { value: 'iam', label: 'IAM' }
      ]
    } else {
      return [
        { value: 'all', label: '全部' }
      ]
    }
  }

  // 模拟数据 - 操作类型
  const operations = [
    { value: 'list', label: '列出资源' },
    { value: 'start', label: '启动实例' },
    { value: 'stop', label: '停止实例' },
    { value: 'restart', label: '重启实例' },
    { value: 'list_objects', label: '遍历存储桶文件' },
    { value: 'upload', label: '上传文件' },
    { value: 'download', label: '下载文件' },
    { value: 'delete', label: '删除资源' },
    { value: 'federated_login', label: '联邦登录' }
  ]

  useEffect(() => {
    dispatch(fetchCredentials())
  }, [dispatch])

  // 处理凭证选择
  const handleCredentialChange = (credentialId) => {
    const credential = credentials.find(c => c.id === parseInt(credentialId))
    setSelectedCredential(credential)
    setResources([])
    setFilteredResources([])
    setPermissions({})
    setOperationResult(null)
    setPrivilegeResult(null)
    setTakeoverResult(null)
  }



  // 处理分类标签变化
  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
    // 根据选择的分类标签过滤资源
    if (category === 'all') {
      setFilteredResources(resources)
    } else {
      setFilteredResources(resources.filter(resource => resource.type === category))
    }
  }

  // 枚举资源
  const handleEnumerateResources = async () => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    // 检查云提供商是否支持所选资源类型
    const unsupportedTypes = []
    if (selectedCredential.cloudProvider !== 'AWS') {
      selectedResourceTypes.forEach(type => {
        if (type === 'vpc' || type === 'route' || type === 'elb' || type === 'eks' || type === 'kms' || type === 'rds') {
          unsupportedTypes.push(type)
        }
      })
      if (unsupportedTypes.length > 0) {
        message.warning('当前云提供商不支持所选的资源类型')
        return
      }
    }

    // 定义要枚举的资源类型
    const resourceTypesToEnumerate = []
    const addedTypes = new Set()
    
    if (selectedResourceTypes.includes('all')) {
      // 如果选择了'all'，枚举所有资源
      const allTypes = ['ec2', 's3', 'iamRoles', 'iamUsers', 'vpc', 'route', 'elb', 'eks', 'kms', 'rds', 'lambda', 'apigateway', 'cloudtrail', 'cloudwatchlogs', 'dynamodb', 'secretsmanager', 'sns', 'sqs']
      allTypes.forEach(type => {
        if (!addedTypes.has(type)) {
          resourceTypesToEnumerate.push(type)
          addedTypes.add(type)
        }
      })
    } else {
      // 处理选中的资源类型
      selectedResourceTypes.forEach(type => {
        if (type === 'iam') {
          // 处理IAM特殊情况
          if (!addedTypes.has('iamRoles')) {
            resourceTypesToEnumerate.push('iamRoles')
            addedTypes.add('iamRoles')
          }
          if (!addedTypes.has('iamUsers')) {
            resourceTypesToEnumerate.push('iamUsers')
            addedTypes.add('iamUsers')
          }
        } else {
          // 处理普通资源类型
          if (!addedTypes.has(type)) {
            resourceTypesToEnumerate.push(type)
            addedTypes.add(type)
          }
        }
      })
    }

    // 重置进度和状态
    setEnumerationStatus(`开始枚举 ${resourceTypesToEnumerate.length} 个资源类型...`)
    setLoading(true)

    // 初始化所有资源类型的进度条
    const initialProgresses = {
      api: { progress: 0, status: '正在请求 API...' }
    }
    for (const type of resourceTypesToEnumerate) {
      initialProgresses[type] = { progress: 0, status: `等待中...` }
    }
    setEnumerationProgresses(initialProgresses)

    try {
      // 模拟 API 进度
      const apiProgressInterval = setInterval(() => {
        setEnumerationProgresses(prev => {
          const updated = { ...prev }
          updated.api = { 
            progress: Math.min(updated.api?.progress + 10 || 0, 90), 
            status: '正在请求 API...'
          }
          return updated
        })
      }, 300)

      const response = await api.post('/cloud/enumerate', {
        credential_id: selectedCredential.id,
        resource_type: selectedResourceTypes.includes('all') ? 'all' : selectedResourceTypes.join(',')
      })

      clearInterval(apiProgressInterval)
      setEnumerationProgresses(prev => {
        const updated = { ...prev }
        updated.api = { progress: 100, status: 'API 请求完成' }
        return updated
      })
      
      setEnumerationStatus('处理响应数据...')
      
      // 处理响应数据
      if (response.data && response.data.result) {
        // 转换后端返回的数据格式为前端期望的格式
        const result = response.data.result
        const resources = []
        
        // 逐个处理每个资源类型
        for (const resourceType of resourceTypesToEnumerate) {
          try {
            switch (resourceType) {
              case 'ec2':
                if (result.instances && Array.isArray(result.instances)) {
                  const regions = [...new Set(result.instances.map(instance => instance.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 EC2 实例 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 EC2 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 EC2 实例 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 EC2 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 EC2 实例 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.instances.forEach(instance => {
                    resources.push({
                      id: instance.instanceId,
                      name: instance.tags?.Name || `Instance ${instance.instanceId}`,
                      type: 'ec2',
                      status: instance.state,
                      region: instance.region || selectedCredential.region,
                      tags: instance.tags
                    })
                  })
                  
                  // 更新 EC2 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 EC2 实例 (区域: ${regions.join(', ')}, ${result.instances.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 EC2 实例，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 EC2 实例` }
                    return updated
                  })
                }
                break
                
              case 's3':
                if (result.buckets && Array.isArray(result.buckets)) {
                  const regions = [...new Set(result.buckets.map(bucket => bucket.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 S3 存储桶 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 S3 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 S3 存储桶 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 S3 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 S3 存储桶 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.buckets.forEach(bucket => {
                    resources.push({
                      id: bucket.bucketName,
                      name: bucket.bucketName,
                      type: 's3',
                      status: 'active',
                      region: bucket.region || selectedCredential.region,
                      objects: bucket.objects || [],
                      moreObjects: bucket.moreObjects || false
                    })
                  })
                  
                  // 更新 S3 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 S3 存储桶 (区域: ${regions.join(', ')}, ${result.buckets.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 S3 存储桶，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 S3 存储桶` }
                    return updated
                  })
                }
                break
                
              case 'iamRoles':
                if (result.roles && Array.isArray(result.roles)) {
                  setEnumerationStatus(`枚举 IAM 角色 (全局资源)...`)
                  
                  // 更新 IAM 角色进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 IAM 角色 (全局资源)` }
                    return updated
                  })
                  
                  // 模拟 IAM 角色处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 25
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 IAM 角色 (全局资源)... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 150)
                  })
                  
                  result.roles.forEach(role => {
                    resources.push({
                      id: role.roleId,
                      name: role.roleName,
                      type: 'iam',
                      status: 'active',
                      region: role.region || selectedCredential.region,
                      permissions: [] // 后端未返回权限信息
                    })
                  })
                  
                  // 更新 IAM 角色进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 IAM 角色 (全局资源, ${result.roles.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 IAM 角色，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 IAM 角色` }
                    return updated
                  })
                }
                break
                
              case 'iamUsers':
                if (result.users && Array.isArray(result.users)) {
                  setEnumerationStatus(`枚举 IAM 用户 (全局资源)...`)
                  
                  // 更新 IAM 用户进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 IAM 用户 (全局资源)` }
                    return updated
                  })
                  
                  // 模拟 IAM 用户处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 25
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 IAM 用户 (全局资源)... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 150)
                  })
                  
                  result.users.forEach(user => {
                    resources.push({
                      id: user.userId,
                      name: user.userName,
                      type: 'iam',
                      status: 'active',
                      region: user.region || selectedCredential.region,
                      permissions: [] // 后端未返回权限信息
                    })
                  })
                  
                  // 更新 IAM 用户进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 IAM 用户 (全局资源, ${result.users.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 IAM 用户，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 IAM 用户` }
                    return updated
                  })
                }
                break
                
              case 'vpc':
                if (result.vpcs && Array.isArray(result.vpcs)) {
                  const regions = [...new Set(result.vpcs.map(vpc => vpc.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 VPC 资源 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 VPC 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 VPC 资源 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 VPC 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 VPC 资源 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.vpcs.forEach(vpc => {
                    resources.push({
                      id: vpc.vpcId,
                      name: vpc.tags?.Name || vpc.vpcId,
                      type: 'vpc',
                      status: vpc.state,
                      region: vpc.region || selectedCredential.region,
                      cidrBlock: vpc.cidrBlock,
                      isDefault: vpc.isDefault,
                      tags: vpc.tags
                    })
                  })
                  
                  // 更新 VPC 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 VPC 资源 (区域: ${regions.join(', ')}, ${result.vpcs.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 VPC 资源，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 VPC 资源` }
                    return updated
                  })
                }
                break
                
              case 'route':
                if (result.routeTables && Array.isArray(result.routeTables)) {
                  const regions = [...new Set(result.routeTables.map(rt => rt.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 路由表 资源 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 路由表 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 路由表 资源 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 路由表 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 路由表 资源 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.routeTables.forEach(rt => {
                    resources.push({
                      id: rt.routeTableId,
                      name: rt.tags?.Name || rt.routeTableId,
                      type: 'route',
                      status: 'active',
                      region: rt.region || selectedCredential.region,
                      vpcId: rt.vpcId,
                      routes: rt.routes,
                      tags: rt.tags
                    })
                  })
                  
                  // 更新 路由表 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 路由表 资源 (区域: ${regions.join(', ')}, ${result.routeTables.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 路由表 资源，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 路由表 资源` }
                    return updated
                  })
                }
                break
                
              case 'elb':
                if (result.elbs && Array.isArray(result.elbs)) {
                  const regions = [...new Set(result.elbs.map(elb => elb.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 ELB 资源 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 ELB 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 ELB 资源 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 ELB 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 ELB 资源 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.elbs.forEach(elb => {
                    resources.push({
                      id: elb.loadBalancerArn,
                      name: elb.loadBalancerName,
                      type: 'elb',
                      status: elb.state,
                      region: elb.region || selectedCredential.region,
                      elbType: elb.type,
                      dnsName: elb.dnsName,
                      availabilityZones: elb.availabilityZones,
                      securityGroups: elb.securityGroups
                    })
                  })
                  
                  // 更新 ELB 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 ELB 资源 (区域: ${regions.join(', ')}, ${result.elbs.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 ELB 资源，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 ELB 资源` }
                    return updated
                  })
                }
                break
                
              case 'eks':
                if (result.eksClusters && Array.isArray(result.eksClusters)) {
                  const regions = [...new Set(result.eksClusters.map(cluster => cluster.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 EKS 集群 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 EKS 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 EKS 集群 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 EKS 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 EKS 集群 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.eksClusters.forEach(cluster => {
                    resources.push({
                      id: cluster.arn,
                      name: cluster.name,
                      type: 'eks',
                      status: cluster.status,
                      region: cluster.region || selectedCredential.region,
                      version: cluster.version,
                      endpoint: cluster.endpoint,
                      createdAt: cluster.createdAt
                    })
                  })
                  
                  // 更新 EKS 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 EKS 集群 (区域: ${regions.join(', ')}, ${result.eksClusters.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 EKS 集群，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 EKS 集群` }
                    return updated
                  })
                }
                break
                
              case 'kms':
                if (result.kmsKeys && Array.isArray(result.kmsKeys)) {
                  const regions = [...new Set(result.kmsKeys.map(key => key.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 KMS 密钥 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 KMS 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 KMS 密钥 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 KMS 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 KMS 密钥 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.kmsKeys.forEach(key => {
                    resources.push({
                      id: key.keyId,
                      name: key.description || key.keyId,
                      type: 'kms',
                      status: key.keyState,
                      region: key.region || selectedCredential.region,
                      keyUsage: key.keyUsage,
                      arn: key.arn,
                      creationDate: key.creationDate
                    })
                  })
                  
                  // 更新 KMS 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 KMS 密钥 (区域: ${regions.join(', ')}, ${result.kmsKeys.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 KMS 密钥，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 KMS 密钥` }
                    return updated
                  })
                }
                break
                
              case 'rds':
                if (result.rdsInstances && Array.isArray(result.rdsInstances)) {
                  const regions = [...new Set(result.rdsInstances.map(instance => instance.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 RDS 数据库 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 RDS 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 RDS 数据库 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 RDS 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 RDS 数据库 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.rdsInstances.forEach(instance => {
                    resources.push({
                      id: instance.dbInstanceIdentifier,
                      name: instance.dbInstanceIdentifier,
                      type: 'rds',
                      status: instance.status,
                      region: instance.region || selectedCredential.region,
                      engine: instance.engine,
                      engineVersion: instance.engineVersion,
                      dbInstanceClass: instance.dbInstanceClass,
                      allocatedStorage: instance.allocatedStorage,
                      multiAZ: instance.multiAZ
                    })
                  })
                  
                  // 更新 RDS 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 RDS 数据库 (区域: ${regions.join(', ')}, ${result.rdsInstances.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 RDS 数据库，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 RDS 数据库` }
                    return updated
                  })
                }
                break
                
              case 'lambda':
                if (result.lambdaFunctions && Array.isArray(result.lambdaFunctions)) {
                  const regions = [...new Set(result.lambdaFunctions.map(lambda => lambda.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 Lambda 函数 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 Lambda 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 Lambda 函数 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 Lambda 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 Lambda 函数 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.lambdaFunctions.forEach(lambdaFunction => {
                    resources.push({
                      id: lambdaFunction.functionName,
                      name: lambdaFunction.functionName,
                      type: 'lambda',
                      status: 'active',
                      region: lambdaFunction.region || selectedCredential.region,
                      runtime: lambdaFunction.runtime,
                      handler: lambdaFunction.handler,
                      timeout: lambdaFunction.timeout,
                      memorySize: lambdaFunction.memorySize
                    })
                  })
                  
                  // 更新 Lambda 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 Lambda 函数 (区域: ${regions.join(', ')}, ${result.lambdaFunctions.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 Lambda 函数，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 Lambda 函数` }
                    return updated
                  })
                }
                break
                
              case 'apigateway':
                if (result.apiGateways && Array.isArray(result.apiGateways)) {
                  const regions = [...new Set(result.apiGateways.map(api => api.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 API Gateway (区域: ${regions.join(', ')})...`)
                  
                  // 更新 API Gateway 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 API Gateway (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 API Gateway 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 API Gateway (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.apiGateways.forEach(api => {
                    resources.push({
                      id: api.id,
                      name: api.name,
                      type: 'apigateway',
                      status: 'active',
                      region: api.region || selectedCredential.region,
                      version: api.version,
                      apiKeySource: api.apiKeySource
                    })
                  })
                  
                  // 更新 API Gateway 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 API Gateway (区域: ${regions.join(', ')}, ${result.apiGateways.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 API Gateway，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 API Gateway` }
                    return updated
                  })
                }
                break
                
              case 'cloudtrail':
                if (result.cloudTrails && Array.isArray(result.cloudTrails)) {
                  const regions = [...new Set(result.cloudTrails.map(trail => trail.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 CloudTrail (区域: ${regions.join(', ')})...`)
                  
                  // 更新 CloudTrail 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 CloudTrail (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 CloudTrail 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 CloudTrail (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.cloudTrails.forEach(trail => {
                    resources.push({
                      id: trail.name,
                      name: trail.name,
                      type: 'cloudtrail',
                      status: 'active',
                      region: trail.region || selectedCredential.region,
                      s3BucketName: trail.s3BucketName,
                      isMultiRegionTrail: trail.isMultiRegionTrail
                    })
                  })
                  
                  // 更新 CloudTrail 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 CloudTrail (区域: ${regions.join(', ')}, ${result.cloudTrails.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 CloudTrail，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 CloudTrail` }
                    return updated
                  })
                }
                break
                
              case 'cloudwatchlogs':
                if (result.cloudWatchLogGroups && Array.isArray(result.cloudWatchLogGroups)) {
                  const regions = [...new Set(result.cloudWatchLogGroups.map(logGroup => logGroup.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 CloudWatch Logs (区域: ${regions.join(', ')})...`)
                  
                  // 更新 CloudWatch Logs 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 CloudWatch Logs (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 CloudWatch Logs 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 CloudWatch Logs (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.cloudWatchLogGroups.forEach(logGroup => {
                    resources.push({
                      id: logGroup.logGroupName,
                      name: logGroup.logGroupName,
                      type: 'cloudwatchlogs',
                      status: 'active',
                      region: logGroup.region || selectedCredential.region,
                      retentionInDays: logGroup.retentionInDays,
                      metricFilterCount: logGroup.metricFilterCount
                    })
                  })
                  
                  // 更新 CloudWatch Logs 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 CloudWatch Logs (区域: ${regions.join(', ')}, ${result.cloudWatchLogGroups.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 CloudWatch Logs，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 CloudWatch Logs` }
                    return updated
                  })
                }
                break
                
              case 'dynamodb':
                if (result.dynamoDBTables && Array.isArray(result.dynamoDBTables)) {
                  const regions = [...new Set(result.dynamoDBTables.map(table => table.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 DynamoDB 表 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 DynamoDB 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 DynamoDB 表 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 DynamoDB 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 DynamoDB 表 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.dynamoDBTables.forEach(table => {
                    resources.push({
                      id: table.tableName,
                      name: table.tableName,
                      type: 'dynamodb',
                      status: table.tableStatus,
                      region: table.region || selectedCredential.region,
                      creationDateTime: table.creationDateTime
                    })
                  })
                  
                  // 更新 DynamoDB 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 DynamoDB 表 (区域: ${regions.join(', ')}, ${result.dynamoDBTables.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 DynamoDB 表，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 DynamoDB 表` }
                    return updated
                  })
                }
                break
                
              case 'secretsmanager':
                if (result.secrets && Array.isArray(result.secrets)) {
                  const regions = [...new Set(result.secrets.map(secret => secret.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 Secrets Manager (区域: ${regions.join(', ')})...`)
                  
                  // 更新 Secrets Manager 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 Secrets Manager (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 Secrets Manager 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 Secrets Manager (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.secrets.forEach(secret => {
                    resources.push({
                      id: secret.name,
                      name: secret.name,
                      type: 'secretsmanager',
                      status: 'active',
                      region: secret.region || selectedCredential.region,
                      description: secret.description,
                      lastAccessedDate: secret.lastAccessedDate
                    })
                  })
                  
                  // 更新 Secrets Manager 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 Secrets Manager (区域: ${regions.join(', ')}, ${result.secrets.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 Secrets Manager，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 Secrets Manager` }
                    return updated
                  })
                }
                break
                
              case 'sns':
                if (result.snsTopics && Array.isArray(result.snsTopics)) {
                  const regions = [...new Set(result.snsTopics.map(topic => topic.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 SNS 主题 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 SNS 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 SNS 主题 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 SNS 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 SNS 主题 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.snsTopics.forEach(topic => {
                    resources.push({
                      id: topic.topicArn,
                      name: topic.topicArn.substring(topic.topicArn.lastIndexOf(':') + 1),
                      type: 'sns',
                      status: 'active',
                      region: topic.region || selectedCredential.region
                    })
                  })
                  
                  // 更新 SNS 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 SNS 主题 (区域: ${regions.join(', ')}, ${result.snsTopics.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 SNS 主题，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 SNS 主题` }
                    return updated
                  })
                }
                break
                
              case 'sqs':
                if (result.sqsQueues && Array.isArray(result.sqsQueues)) {
                  const regions = [...new Set(result.sqsQueues.map(queue => queue.region || selectedCredential.region))]
                  setEnumerationStatus(`枚举 SQS 队列 (区域: ${regions.join(', ')})...`)
                  
                  // 更新 SQS 进度条状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 0, status: `开始枚举 SQS 队列 (区域: ${regions.join(', ')})` }
                    return updated
                  })
                  
                  // 模拟 SQS 处理进度
                  await new Promise(resolve => {
                    let progress = 0
                    const interval = setInterval(() => {
                      progress += 20
                      setEnumerationProgresses(prev => {
                        const updated = { ...prev }
                        updated[resourceType] = { 
                          progress: Math.min(progress, 100), 
                          status: `处理 SQS 队列 (区域: ${regions.join(', ')})... ${Math.min(progress, 100)}%`
                        }
                        return updated
                      })
                      if (progress >= 100) {
                        clearInterval(interval)
                        resolve()
                      }
                    }, 200)
                  })
                  
                  result.sqsQueues.forEach(queue => {
                    resources.push({
                      id: queue.queueUrl,
                      name: queue.queueName,
                      type: 'sqs',
                      status: 'active',
                      region: queue.region || selectedCredential.region
                    })
                  })
                  
                  // 更新 SQS 进度条为完成状态
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `完成枚举 SQS 队列 (区域: ${regions.join(', ')}, ${result.sqsQueues.length} 个)` }
                    return updated
                  })
                } else {
                  // 如果没有 SQS 队列，标记为完成
                  setEnumerationProgresses(prev => {
                    const updated = { ...prev }
                    updated[resourceType] = { progress: 100, status: `没有发现 SQS 队列` }
                    return updated
                  })
                }
                break
            }
          } catch (resourceError) {
            console.error(`处理 ${resourceType} 资源时出错:`, resourceError)
            // 标记该资源类型为失败，但继续处理其他资源类型
            setEnumerationProgresses(prev => {
              const updated = { ...prev }
              updated[resourceType] = { progress: 100, status: `处理 ${resourceType} 资源时出错` }
              return updated
            })
          }
          
          // 每个资源类型处理完成后，延迟一下再处理下一个
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        setEnumerationStatus(`完成资源枚举，共处理 ${resourceTypesToEnumerate.length} 个资源类型`)
        
        setResources(resources)
        // 根据选择的分类标签过滤资源
        if (selectedCategory === 'all') {
          setFilteredResources(resources)
        } else {
          setFilteredResources(resources.filter(resource => resource.type === selectedCategory))
        }
        message.success('资源枚举成功')
      } else {
        setEnumerationStatus('未发现资源')
        setResources([])
        setFilteredResources([])
        message.warning('未发现资源')
      }
    } catch (error) {
      console.error('资源枚举失败:', error)
      setEnumerationStatus('枚举失败')
      message.error('资源枚举失败: ' + (error.response?.data?.error || '未知错误'))
      setResources([])
    } finally {
      // 延迟重置进度和状态，让用户看到完成状态
      setTimeout(() => {
        setEnumerationProgresses({})
        setEnumerationStatus('')
        setLoading(false)
      }, 2000)
    }
  }

  // 分析权限
  const handleAnalyzePermissions = async () => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    setLoading(true)
    try {
      // 调用真实 API
      const response = await api.post('/cloud/escalate', {
        credential_id: selectedCredential.id
      })
      
      // 处理响应数据
      if (response.data && response.data.result) {
        setPermissions(response.data.result)
        message.success('权限分析成功')
      } else {
        setPermissions({})
        message.warning('无法获取权限信息')
      }
    } catch (error) {
      console.error('权限分析失败:', error)
      message.error('权限分析失败: ' + (error.response?.data?.error || '未知错误'))
      setPermissions({})
    } finally {
      setLoading(false)
    }
  }

  // 执行资源操作
  const handleResourceOperation = async () => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    if (!resourceId && action !== 'federated_login') {
      message.warning('请输入资源 ID')
      return
    }

    setLoading(true)
    try {
      // 调用真实 API
      const response = await api.post('/cloud/operate', {
        credential_id: selectedCredential.id,
        resource_type: resourceType,
        action: action,
        resource_id: resourceId,
        params: operationParams
      })
      
      // 处理响应数据
      if (response.data) {
        setOperationResult({
          success: true,
          message: response.data.message || '操作执行成功',
          resourceId: resourceId,
          objects: response.data.result?.objects,
          console_url: response.data.result?.federated_login_url || response.data.result?.console_url,
          access_key: response.data.result?.access_key,
          secret_key: response.data.result?.secret_key,
          session_token: response.data.result?.session_token,
          expiration: response.data.result?.expiration,
          role_arn: response.data.result?.role_arn,
          federated: response.data.result?.federated,
          timestamp: new Date().toISOString()
        })
        message.success('资源操作成功')
      } else {
        setOperationResult(null)
        message.warning('操作执行结果未知')
      }
    } catch (error) {
      console.error('资源操作失败:', error)
      message.error('资源操作失败: ' + (error.response?.data?.error || '未知错误'))
      setOperationResult(null)
    } finally {
      setLoading(false)
    }
  }

  // 下载文件
  const handleDownloadFile = async (bucket, key) => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    // 创建下载任务
    const taskId = Date.now() + Math.random()
    // 临时路径，稍后会从后端响应中更新
    const newTask = {
      id: taskId,
      bucket: bucket,
      key: key,
      status: 'running',
      progress: 0,
      downloadPath: '计算中...',
      startTime: new Date().toISOString()
    }

    setDownloadTasks(prev => [...prev, newTask])

    try {
      // 调用下载 API
      const response = await api.post('/cloud/download', {
        credential_id: selectedCredential.id,
        bucket: bucket,
        key: key
      })
      
      if (response.data && response.data.success) {
        // 更新任务的下载路径
        const actualDownloadPath = response.data.path
        setDownloadTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, downloadPath: actualDownloadPath } : task
        ))

        // 模拟下载进度
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          if (progress <= 100) {
            setDownloadTasks(prev => prev.map(task => 
              task.id === taskId ? { ...task, progress } : task
            ))
          } else {
            clearInterval(interval)
            setDownloadTasks(prev => prev.map(task => 
              task.id === taskId ? { ...task, status: 'success', progress: 100, endTime: new Date().toISOString() } : task
            ))
            message.success(`文件 ${key} 下载成功`)
          }
        }, 200)
      } else {
        setDownloadTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: 'failed', endTime: new Date().toISOString() } : task
        ))
        message.warning('下载失败: ' + (response.data?.message || '未知错误'))
      }
    } catch (error) {
      console.error('文件下载失败:', error)
      setDownloadTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: 'failed', endTime: new Date().toISOString() } : task
      ))
      message.error('文件下载失败: ' + (error.response?.data?.error || '未知错误'))
    }
  }

  // 权限提升
  const handlePrivilegeEscalation = async () => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    setLoading(true)
    try {
      // 调用真实 API
      const response = await api.post('/cloud/escalate', {
        credential_id: selectedCredential.id
      })
      
      // 处理响应数据
      if (response.data && response.data.result) {
        setPrivilegeResult({
          ...response.data.result,
          timestamp: new Date().toISOString()
        })
        message.success('权限提升成功')
      } else {
        setPrivilegeResult(null)
        message.warning('权限提升结果未知')
      }
    } catch (error) {
      console.error('权限提升失败:', error)
      message.error('权限提升失败: ' + (error.response?.data?.error || '未知错误'))
      setPrivilegeResult(null)
    } finally {
      setLoading(false)
    }
  }

  // 平台接管
  const handleTakeover = async () => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    setLoading(true)
    try {
      // 调用真实 API 执行平台接管
      const response = await api.post('/cloud/takeover', {
        credential_id: selectedCredential.id
      })
      
      // 处理响应数据
      if (response.data && response.data.result) {
        // 转换后端返回的数据格式为前端期望的格式
        const result = response.data.result
        setTakeoverResult({
          success: true,
          timestamp: new Date().toISOString()
        })
        message.success('平台接管成功')

        // 自动生成控制台URL并打开
        try {
          const consoleResponse = await api.post('/cloud/operate', {
            credential_id: selectedCredential.id,
            resource_type: 's3', // 任意资源类型，主要是为了调用接管控制台功能
            action: 'federated_login',
            resource_id: 'dummy', // 占位符，不影响功能
            params: {}
          })

          if (consoleResponse.data && consoleResponse.data.result && (consoleResponse.data.result.federated_login_url || consoleResponse.data.result.console_url)) {
            const consoleUrl = consoleResponse.data.result.federated_login_url || consoleResponse.data.result.console_url
            // 自动打开联邦登录网页
            window.open(consoleUrl, '_blank')
            message.success('已自动打开AWS联邦登录页面')
          } else {
            message.warning('无法生成联邦登录URL')
          }
        } catch (consoleError) {
          console.error('生成联邦登录URL失败:', consoleError)
          message.error('生成联邦登录URL失败: ' + (consoleError.response?.data?.error || '未知错误'))
        }
      } else {
        setTakeoverResult(null)
        message.warning('平台接管结果未知')
      }
    } catch (error) {
      console.error('平台接管失败:', error)
      message.error('平台接管失败: ' + (error.response?.data?.error || '未知错误'))
      setTakeoverResult(null)
    } finally {
      setLoading(false)
    }
  }

  // 获取用户信息
  const handleGetUserInfo = async () => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    setLoading(true)
    try {
      // 调用真实 API 获取用户信息
      const response = await api.post('/cloud/userinfo', {
        credential_id: selectedCredential.id
      })
      
      // 处理响应数据
      if (response.data && response.data.result) {
        setUserInfo(response.data.result)
        message.success('获取用户信息成功')
      } else {
        setUserInfo({})
        message.warning('无法获取用户信息')
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      message.error('获取用户信息失败: ' + (error.response?.data?.error || '未知错误'))
      setUserInfo({})
    } finally {
      setLoading(false)
    }
  }

  // 保存资源组
  const handleSaveResourceGroup = () => {
    if (!currentGroup.name || currentGroup.resources.length === 0) {
      message.warning('请输入资源组名称并选择至少一个资源类型')
      return
    }

    let updatedGroups
    if (isEditingGroup) {
      updatedGroups = resourceGroups.map(group => 
        group.id === currentGroup.id ? currentGroup : group
      )
    } else {
      const newGroup = {
        id: Date.now().toString(),
        name: currentGroup.name,
        resources: currentGroup.resources,
        created: new Date().toISOString()
      }
      updatedGroups = [...resourceGroups, newGroup]
    }

    setResourceGroups(updatedGroups)
    localStorage.setItem('resourceGroups', JSON.stringify(updatedGroups))
    setShowGroupModal(false)
    setCurrentGroup({ name: '', resources: [] })
    setIsEditingGroup(false)
    message.success(isEditingGroup ? '资源组更新成功' : '资源组创建成功')
  }

  // 编辑资源组
  const handleEditResourceGroup = (group) => {
    setCurrentGroup({ ...group })
    setIsEditingGroup(true)
    setShowGroupModal(true)
  }

  // 删除资源组
  const handleDeleteResourceGroup = (groupId) => {
    const updatedGroups = resourceGroups.filter(group => group.id !== groupId)
    setResourceGroups(updatedGroups)
    localStorage.setItem('resourceGroups', JSON.stringify(updatedGroups))
    message.success('资源组删除成功')
  }

  // 使用资源组
  const handleUseResourceGroup = (group) => {
    setSelectedResourceGroup(group.id)
    setSelectedResourceTypes(group.resources)
    message.success(`已选择资源组: ${group.name}`)
  }



  // 自定义节点组件
  const CustomNode = ({ data }) => {
    return (
      <div style={{
        width: 180,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        border: '1px solid #e8e8e8',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ marginBottom: 8 }}>{data.icon}</div>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{data.label}</div>
        <div style={{ fontSize: 12, color: '#666' }}>{data.description}</div>
      </div>
    )
  }



  // 资源表格列
  const resourceColumns = [
    {
      title: '资源 ID',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: '资源名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '资源类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          ec2: 'EC2 实例',
          s3: 'S3 存储桶',
          iam: 'IAM 角色',
          vpc: 'VPC',
          route: '路由表',
          elb: '负载均衡器',
          eks: 'EKS 集群',
          kms: 'KMS 密钥',
          rds: 'RDS 数据库',
          database: '数据库',
          network: '网络资源'
        }
        return typeMap[type] || type
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Text style={{ 
          color: status === 'running' || status === 'active' ? '#52c41a' : '#ff4d4f' 
        }}>
          {status === 'running' || status === 'active' ? '活跃' : '非活跃'}
        </Text>
      )
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
      width: 150,
      fixed: 'left',
      ellipsis: true
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>AKSK 利用</Title>
      </div>

      {/* 凭证选择 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Text strong style={{ marginRight: 16 }}>选择凭证：</Text>
          <Select
            style={{ width: 400 }}
            placeholder="选择要使用的凭证"
            onChange={handleCredentialChange}
            optionLabelProp="label"
          >
            {credentials.map(credential => (
              <Option key={credential.id} value={credential.id} label={`${credential.name} (${credential.cloudProvider})`}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CloudOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
                  <div>
                    <div>{credential.name}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {credential.cloudProvider}
                    </div>
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </div>
      </Card>

      {selectedCredential ? (
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            {/* 资源枚举 */}
            <TabPane tab="资源枚举" key="enumerate">
              <div style={{ marginBottom: 24 }}>
                {/* 资源组管理 */}
                <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0f2f5', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong>资源组管理</Text>
                    <Button 
                      type="dashed" 
                      onClick={() => {
                        setCurrentGroup({ name: '', resources: [] })
                        setIsEditingGroup(false)
                        setShowGroupModal(true)
                      }}
                    >
                      创建资源组
                    </Button>
                  </div>
                  
                  {resourceGroups.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {resourceGroups.map(group => (
                        <Card 
                          key={group.id}
                          style={{ width: 200, marginBottom: 8 }}
                          hoverable
                          actions={[
                            <Button 
                              key="use" 
                              size="small" 
                              onClick={() => handleUseResourceGroup(group)}
                              type={selectedResourceGroup === group.id ? "primary" : "default"}
                            >
                              使用
                            </Button>,
                            <Button 
                              key="edit" 
                              size="small" 
                              onClick={() => handleEditResourceGroup(group)}
                            >
                              编辑
                            </Button>,
                            <Button 
                              key="delete" 
                              size="small" 
                              danger 
                              onClick={() => handleDeleteResourceGroup(group.id)}
                            >
                              删除
                            </Button>
                          ]}
                        >
                          <Card.Meta 
                            title={group.name}
                            description={`包含 ${group.resources.length} 个资源类型`}
                          />
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Text type="secondary">暂无资源组，点击"创建资源组"按钮创建</Text>
                  )}
                </div>
                
                {/* 资源类型选择 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <Text strong style={{ marginRight: 16 }}>选择资源类型：</Text>
                    <Select
                      style={{ flex: 1, maxWidth: 400, marginRight: 16 }}
                      mode="multiple"
                      placeholder="选择要枚举的资源类型"
                      value={selectedResourceTypes}
                      onChange={setSelectedResourceTypes}
                      optionLabelProp="label"
                    >
                      {getResourceTypes().map(type => (
                        <Option key={type.value} value={type.value} label={type.label}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ marginRight: 8 }}>{type.label}</div>
                          </div>
                        </Option>
                      ))}
                    </Select>
                    <Button 
                      type="primary" 
                      icon={<SearchOutlined />}
                      onClick={handleEnumerateResources}
                      loading={loading}
                    >
                      枚举资源
                    </Button>
                  </div>
                </div>
                
                {/* 枚举进度条 */}
                {Object.keys(enumerationProgresses).length > 0 && (
                  <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
                    <Text style={{ marginBottom: 12, display: 'block' }}>{enumerationStatus}</Text>
                    {Object.entries(enumerationProgresses).map(([resourceType, progressData]) => (
                      <div key={resourceType} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text>{progressData.status}</Text>
                          <Text>{progressData.progress}%</Text>
                        </div>
                        <div style={{ height: 8, backgroundColor: '#e8e8e8', borderRadius: 4 }}>
                          <div 
                            style={{
                              height: '100%',
                              width: `${progressData.progress}%`,
                              backgroundColor: '#1890ff',
                              borderRadius: 4,
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 确保进度条在枚举开始时显示 */}
                {loading && Object.keys(enumerationProgresses).length === 0 && (
                  <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
                    <Text style={{ marginBottom: 12, display: 'block' }}>{enumerationStatus}</Text>
                    <div style={{ height: 8, backgroundColor: '#e8e8e8', borderRadius: 4 }}>
                      <div 
                        style={{
                          height: '100%',
                          width: '0%',
                          backgroundColor: '#1890ff',
                          borderRadius: 4,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {resources.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <Tabs activeKey={selectedCategory} onChange={handleCategoryChange}>
                      {getResourceCategories().map(category => (
                        <TabPane tab={category.label} key={category.value} />
                      ))}
                    </Tabs>
                  </div>
                )}
                
                {filteredResources.length > 0 ? (
                  <Table 
                    columns={resourceColumns} 
                    dataSource={filteredResources} 
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                    size="middle"
                    expandable={{
                      expandedRowRender: record => {
                        if (record.type === 's3' && record.objects && record.objects.length > 0) {
                          return (
                            <div style={{ padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <Text strong>存储桶文件：</Text>
                              </div>
                              <Table
                              columns={[
                                { title: '文件路径', dataIndex: 'key', key: 'key' },
                                { title: '大小', dataIndex: 'size', key: 'size' },
                                { title: '修改时间', dataIndex: 'lastModified', key: 'lastModified' },
                                { 
                                  title: '操作', 
                                  key: 'action',
                                  render: (_, fileRecord) => (
                                    <Button 
                                      type="link" 
                                      icon={<DownloadOutlined />}
                                      onClick={() => handleDownloadFile(record.id, fileRecord.key)}
                                    >
                                      下载
                                    </Button>
                                  )
                                }
                              ]}
                              dataSource={record.objects}
                              rowKey="key"
                              pagination={{ pageSize: 20 }}
                              size="small"
                              />
                            </div>
                          )
                        }
                        return null
                      },
                      rowExpandable: record => {
                        return record.type === 's3' && record.objects && record.objects.length > 0
                      }
                    }}
                  />
                ) : resources.length > 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">当前分类下没有资源</Text>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">请点击"枚举资源"按钮获取资源列表</Text>
                  </div>
                )}              </div>
            </TabPane>

            {/* 权限分析 */}
            <TabPane tab="权限分析" key="permissions">
              <div style={{ marginBottom: 16 }}>
                <Button 
                  type="primary" 
                  icon={<SafetyOutlined />}
                  onClick={handleAnalyzePermissions}
                  loading={loading}
                  style={{ marginBottom: 16 }}
                >
                  分析权限
                </Button>
                
                {Object.keys(permissions).length > 0 ? (
                  <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
                    <h3>权限分析结果</h3>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>用户类型：</Text> {permissions.userType || 'Unknown'}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>权限：</Text>
                      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {permissions.permissions && Array.isArray(permissions.permissions) ? (
                          permissions.permissions.map((perm, index) => (
                            <div key={index} style={{ marginBottom: '4px' }}>• {perm}</div>
                          ))
                        ) : (
                          <div>暂无权限信息</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Text strong>风险等级：</Text> 
                      <Text style={{ 
                        color: permissions.riskLevel === 'High' ? '#ff4d4f' : 
                               permissions.riskLevel === 'Medium' ? '#faad14' : '#52c41a' 
                      }}>
                        {permissions.riskLevel}
                      </Text>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">请点击"分析权限"按钮获取权限信息</Text>
                  </div>
                )}
              </div>
            </TabPane>

            {/* 资源操作 */}
            <TabPane tab="资源操作" key="operation">
              <Form layout="vertical" style={{ maxWidth: 600 }}>
                <Form.Item 
                  label="操作类型"
                  name="action"
                >
                  <Select 
                    value={action}
                    onChange={setAction}
                    style={{ width: '100%' }}
                  >
                    {operations.map(op => (
                      <Option key={op.value} value={op.value}>{op.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item 
                  label="资源 ID"
                  name="resourceId"
                >
                  <Input 
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                    placeholder="输入要操作的资源 ID，例如 S3 存储桶名称"
                  />
                </Form.Item>
                
                {action === 'list_objects' && (
                  <Form.Item 
                    label="前缀 (可选)"
                    name="prefix"
                  >
                    <Input 
                      value={operationParams.prefix || ''}
                      onChange={(e) => setOperationParams({ ...operationParams, prefix: e.target.value })}
                      placeholder="输入文件前缀，例如 'logs/'"
                    />
                  </Form.Item>
                )}
                
                {action === 'download' && (
                  <Form.Item 
                    label="文件路径"
                    name="key"
                  >
                    <Input 
                      value={operationParams.key || ''}
                      onChange={(e) => setOperationParams({ ...operationParams, key: e.target.value })}
                      placeholder="输入文件路径，例如 'path/to/file.txt'"
                    />
                  </Form.Item>
                )}
                
                <Form.Item>
                  <Button 
                    type="primary" 
                    icon={<LaptopOutlined />}
                    onClick={handleResourceOperation}
                    loading={loading}
                    style={{
                      background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)',
                      borderColor: 'transparent',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '0 24px',
                      height: '40px',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 77, 79, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 77, 79, 0.3)';
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    执行操作
                  </Button>
                </Form.Item>
              </Form>
              
              {operationResult && (
                <div style={{ marginTop: 24, backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
                  <h3>操作结果</h3>
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong>状态：</Text> 
                    <Text style={{ color: operationResult.success ? '#52c41a' : '#ff4d4f' }}>
                      {operationResult.success ? '成功' : '失败'}
                    </Text>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong>消息：</Text> {operationResult.message}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong>资源 ID：</Text> {operationResult.resourceId}
                  </div>
                  {operationResult.objects && (
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>文件列表：</Text>
                      <Table 
                        columns={[
                          { title: '文件路径', dataIndex: 'key', key: 'key' },
                          { title: '大小', dataIndex: 'size', key: 'size' },
                          { title: '修改时间', dataIndex: 'lastModified', key: 'lastModified' },
                          { 
                            title: '操作', 
                            key: 'action',
                            render: (_, record) => (
                              <Button 
                                type="link" 
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadFile(resourceId, record.key)}
                              >
                                下载
                              </Button>
                            )
                          }
                        ]} 
                        dataSource={operationResult.objects}
                        rowKey="key"
                        pagination={{ pageSize: 10 }}
                      />
                    </div>
                  )}
                  {operationResult.console_url && (
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>联邦登录链接：</Text>
                      <a href={operationResult.console_url} target="_blank" rel="noopener noreferrer">
                        {operationResult.console_url}
                      </a>
                    </div>
                  )}
                  {operationResult.federated && (
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>联邦登录信息：</Text>
                      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {operationResult.access_key && (
                          <div style={{ marginBottom: '4px' }}>
                            <Text strong>Access Key：</Text> {operationResult.access_key}
                          </div>
                        )}
                        {operationResult.secret_key && (
                          <div style={{ marginBottom: '4px' }}>
                            <Text strong>Secret Key：</Text> {operationResult.secret_key}
                          </div>
                        )}
                        {operationResult.session_token && (
                          <div style={{ marginBottom: '4px' }}>
                            <Text strong>Session Token：</Text> {operationResult.session_token}
                          </div>
                        )}
                        {operationResult.expiration && (
                          <div style={{ marginBottom: '4px' }}>
                            <Text strong>过期时间：</Text> {new Date(operationResult.expiration).toLocaleString()}
                          </div>
                        )}
                        {operationResult.role_arn && (
                          <div style={{ marginBottom: '4px' }}>
                            <Text strong>角色ARN：</Text> {operationResult.role_arn}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <Text strong>时间：</Text> {new Date(operationResult.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </TabPane>

            {/* 权限提升 */}
            <TabPane tab="权限提升" key="escalation">
              <div style={{ marginBottom: 16 }}>
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />}
                  onClick={handlePrivilegeEscalation}
                  loading={loading}
                  style={{ marginBottom: 16 }}
                >
                  执行权限提升
                </Button>
                
                {privilegeResult && (
                  <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
                    <h3>权限提升结果</h3>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>状态：</Text> 
                      <Text style={{ color: privilegeResult.success ? '#52c41a' : '#ff4d4f' }}>
                        {privilegeResult.success ? '成功' : '失败'}
                      </Text>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>当前权限：</Text>
                      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {privilegeResult.currentPermissions.map((perm, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>• {perm}</div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>提升后权限：</Text>
                      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {privilegeResult.escalatedPermissions.map((perm, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>• {perm}</div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>提升步骤：</Text>
                      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {privilegeResult.steps.map((step, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>{index + 1}. {step}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Text strong>时间：</Text> {new Date(privilegeResult.timestamp).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </TabPane>

            {/* 平台接管 */}
            <TabPane tab="平台接管" key="takeover">
              <div style={{ marginBottom: 16 }}>
                <Button 
                  type="primary" 
                  danger
                  icon={<DownloadOutlined />}
                  onClick={handleTakeover}
                  loading={loading}
                  style={{
                    background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)',
                    borderColor: 'transparent',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '0 24px',
                    height: '40px',
                    marginBottom: 16,
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 77, 79, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 77, 79, 0.3)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  执行平台接管
                </Button>
                
                {takeoverResult && (
                  <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
                    <h3>平台接管结果</h3>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>状态：</Text> 
                      <Text style={{ color: takeoverResult.success ? '#52c41a' : '#ff4d4f' }}>
                        {takeoverResult.success ? '成功' : '失败'}
                      </Text>
                    </div>
                    <div>
                      <Text strong>时间：</Text> {new Date(takeoverResult.timestamp).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </TabPane>
            
            {/* 用户信息 */}
            <TabPane tab="用户信息" key="userinfo">
              <div style={{ marginBottom: 16 }}>
                <Button 
                  type="primary" 
                  icon={<UserOutlined />}
                  onClick={handleGetUserInfo}
                  loading={loading}
                  style={{ marginBottom: 16 }}
                >
                  获取用户信息
                </Button>
                
                {Object.keys(userInfo).length > 0 ? (
                  <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
                    <h3>用户信息</h3>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>用户类型：</Text> {userInfo.userType || 'Unknown'}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>用户名：</Text> {userInfo.userName || 'Unknown'}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>权限：</Text>
                      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {userInfo.permissions && Array.isArray(userInfo.permissions) ? (
                          userInfo.permissions.map((perm, index) => (
                            <div key={index} style={{ marginBottom: '4px' }}>• {perm}</div>
                          ))
                        ) : (
                          <div>暂无权限信息</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Text strong>消息：</Text> {userInfo.message || ''}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">请点击"获取用户信息"按钮获取用户信息</Text>
                  </div>
                )}
              </div>
            </TabPane>




          </Tabs>
        </Card>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <CloudOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: 16 }} />
            <Text type="secondary" style={{ fontSize: '16px' }}>请选择一个凭证开始 AKSK 利用</Text>
          </div>
        </Card>
      )}

      {/* 下载任务列表 */}
      {downloadTasks.length > 0 && (
        <Card style={{ marginTop: 24 }}>
          <Title level={4}>下载任务</Title>
          <div>
            {downloadTasks.map(task => (
              <div key={task.id} style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span>
                    {task.key}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Badge 
                      status={task.status === 'success' ? 'success' : task.status === 'running' ? 'processing' : 'error'}
                      text={task.status === 'success' ? '成功' : task.status === 'running' ? '下载中' : '失败'}
                      style={{ marginRight: 8 }}
                    />

                  </div>
                </div>
                {task.progress !== undefined && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text>进度</Text>
                      <Text>{task.progress}%</Text>
                    </div>
                    <div style={{ height: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
                      <div 
                        style={{
                          height: '100%',
                          width: `${task.progress}%`,
                          backgroundColor: task.status === 'success' ? '#52c41a' : task.status === 'failed' ? '#ff4d4f' : '#1890ff',
                          borderRadius: 4
                        }}
                      />
                    </div>
                  </div>
                )}
                {task.downloadPath && (
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">下载路径: {task.downloadPath}</Text>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">开始时间: {new Date(task.startTime).toLocaleString()}</Text>
                  {task.endTime && (
                    <Text type="secondary">结束时间: {new Date(task.endTime).toLocaleString()}</Text>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* 资源组创建/编辑模态框 */}
      <Modal
        title={isEditingGroup ? '编辑资源组' : '创建资源组'}
        open={showGroupModal}
        onOk={handleSaveResourceGroup}
        onCancel={() => setShowGroupModal(false)}
      >
        <Form layout="vertical">
          <Form.Item
            label="资源组名称"
            rules={[{ required: true, message: '请输入资源组名称' }]}
          >
            <Input
              value={currentGroup.name}
              onChange={(e) => setCurrentGroup({ ...currentGroup, name: e.target.value })}
              placeholder="请输入资源组名称"
            />
          </Form.Item>
          
          <Form.Item
            label="选择资源类型"
            rules={[{ required: true, message: '请选择至少一个资源类型' }]}
          >
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="选择资源类型"
              value={currentGroup.resources}
              onChange={(resources) => setCurrentGroup({ ...currentGroup, resources })}
            >
              {getResourceTypes().map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>
          
          {currentGroup.resources.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">已选择 {currentGroup.resources.length} 个资源类型</Text>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default AKSKUtilization
