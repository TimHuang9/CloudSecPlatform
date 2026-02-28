import React, { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCredentials } from '../store/credentialSlice'
import { createTask } from '../store/taskSlice'
import { Typography, Card, Select, Table, Tabs, Spin, message, Alert, Button, Modal, List, Badge, Tag } from 'antd'
import { CloudOutlined, KeyOutlined, DatabaseOutlined, AppstoreOutlined, UploadOutlined, UserOutlined, SearchOutlined, DownloadOutlined, DownOutlined, RightOutlined, FolderOpenOutlined, BuildOutlined } from '@ant-design/icons'
import ReactFlow, { Controls, Background, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'
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

const ResourceOverview = () => {
  const dispatch = useDispatch()
  const { credentials, loading: credentialsLoading } = useSelector(state => state.credential)
  
  // 状态管理
  const [selectedCredential, setSelectedCredential] = useState(null)
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [downloadTasks, setDownloadTasks] = useState([])
  const [selectedFiles, setSelectedFiles] = useState({})
  const [topologyData, setTopologyData] = useState(null)
  const [topologyLoading, setTopologyLoading] = useState(false)
  const [escalationData, setEscalationData] = useState(null)
  const [escalationLoading, setEscalationLoading] = useState(false)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 })
  const [permissions, setPermissions] = useState(null)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const topologyRef = useRef(null)

  useEffect(() => {
    dispatch(fetchCredentials())
  }, [dispatch])

  // 处理凭证选择
  const handleCredentialChange = (credentialId) => {
    const credential = credentials.find(c => c.id === parseInt(credentialId))
    setSelectedCredential(credential)
    setSelectedRegion('all') // 重置区域选择
    setPermissions(null) // 重置权限信息
    if (credential) {
      fetchResources(credential)
      fetchPermissions(credential)
    } else {
      setResources([])
      setError(null)
    }
  }

  // 获取权限信息
  const fetchPermissions = async (credential) => {
    setPermissionsLoading(true)
    try {
      // 先尝试从数据库读取权限信息
      const response = await api.post('/cloud/permissions', {
        credential_id: credential.id
      })
      
      if (response.data && response.data.result) {
        setPermissions(response.data.result)
        message.success('从数据库读取权限信息成功')
      } else {
        // 如果数据库中没有权限信息，调用云API获取
        const cloudResponse = await api.post('/cloud/escalate', {
          credential_id: credential.id
        })
        
        if (cloudResponse.data && cloudResponse.data.result) {
          setPermissions(cloudResponse.data.result)
          message.success('从云API获取权限信息成功')
        } else {
          setPermissions(null)
        }
      }
    } catch (error) {
      console.error('获取权限信息失败:', error)
      setPermissions(null)
    } finally {
      setPermissionsLoading(false)
    }
  }

  // 状态管理
  const [commandModalVisible, setCommandModalVisible] = useState(false)
  const [selectedInstanceId, setSelectedInstanceId] = useState('')
  const [command, setCommand] = useState('')
  const [commandTasks, setCommandTasks] = useState([])
  const [commandLoading, setCommandLoading] = useState(false)

  // 处理EC2命令执行
  const handleExecuteCommand = (instanceId) => {
    setSelectedInstanceId(instanceId)
    setCommand('')
    setCommandModalVisible(true)
  }

  // 执行命令
  const executeCommand = async () => {
    if (!selectedInstanceId || !command) {
      message.warning('请输入命令')
      return
    }

    // 创建命令执行任务
    const taskId = Date.now() + Math.random()
    const newTask = {
      id: taskId,
      name: `EC2命令执行 - ${selectedInstanceId}`,
      taskType: 'operate',
      status: 'running',
      instanceId: selectedInstanceId,
      command: command,
      startTime: new Date().toISOString()
    }

    // 添加到命令任务列表
    setCommandTasks(prev => [...prev, newTask])

    setCommandLoading(true)
    setCommandModalVisible(false) // 立即关闭弹窗
    
    try {
      // 查找实例的区域信息
      const instance = resources.find(r => r.id === selectedInstanceId && r.type === 'ec2')
      const instanceRegion = instance?.region || selectedCredential.region

      // 调用后端API执行命令
      const response = await api.post('/cloud/operate', {
        credential_id: selectedCredential.id,
        resource_type: 'ec2',
        action: 'execute_command',
        resource_id: selectedInstanceId,
        params: {
          command: command,
          region: instanceRegion
        }
      })

      if (response.data) {
        if (response.data.message) {
          message.success(response.data.message)
        } else {
          message.success('命令执行成功')
        }
        // 处理状态转换，确保状态值统一
        const rawStatus = response.data.status || response.data.result?.status || 'success';
        const normalizedStatus = rawStatus.toLowerCase() === 'success' ? 'success' : 'failed';
        
        // 更新任务状态
        setCommandTasks(prev => prev.map(task => 
          task.id === taskId ? { 
            ...task, 
            status: normalizedStatus, 
            commandId: response.data.commandId || response.data.result?.commandId,
            note: response.data.note || response.data.result?.note,
            stdout: response.data.stdout || response.data.result?.stdout,
            stderr: response.data.stderr || response.data.result?.stderr,
            executionSteps: response.data.executionSteps || response.data.result?.executionSteps,
            endTime: response.data.endTime || response.data.result?.endTime || new Date().toISOString()
          } : task
        ))
        
        // 创建全局任务记录
        const executionStatus = normalizedStatus;
        dispatch(createTask({
          credentialId: selectedCredential.id,
          taskType: 'operate',
          parameters: JSON.stringify({
            resource_type: 'ec2',
            action: 'execute_command',
            resource_id: selectedInstanceId,
            params: { command: command }
          }),
          name: `EC2命令执行 - ${selectedInstanceId}`,
          status: executionStatus,
          result: JSON.stringify({
            stdout: response.data.stdout || response.data.result?.stdout,
            stderr: response.data.stderr || response.data.result?.stderr,
            commandId: response.data.commandId || response.data.result?.commandId,
            executionSteps: response.data.executionSteps || response.data.result?.executionSteps
          })
        }))
      } else {
        message.error('命令执行失败: 未知错误')
        // 更新任务状态为失败
        setCommandTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: 'failed', endTime: new Date().toISOString() } : task
        ))
      }
    } catch (error) {
      console.error('命令执行失败:', error)
      const errorMessage = error.response?.data?.error || error.message || '未知错误'
      message.error('命令执行失败: ' + errorMessage)
      // 更新任务状态为失败
      setCommandTasks(prev => prev.map(task => 
        task.id === taskId ? { 
          ...task, 
          status: 'failed', 
          endTime: new Date().toISOString(),
          error: errorMessage
        } : task
      ))
      
      // 创建全局任务记录（失败状态）
      dispatch(createTask({
        credentialId: selectedCredential.id,
        taskType: 'operate',
        parameters: JSON.stringify({
          resource_type: 'ec2',
          action: 'execute_command',
          resource_id: selectedInstanceId,
          params: { command: command }
        }),
        name: `EC2命令执行 - ${selectedInstanceId}`,
        status: 'failed',
        error: errorMessage
      }))
    } finally {
      setCommandLoading(false)
    }
  }

  // 获取资源数据
  const fetchResources = async (credential) => {
    setLoading(true)
    setError(null)
    try {
      // 从数据库读取资源
      const response = await api.post('/cloud/resources', {
        credential_id: credential.id
      })
      
      if (response.data && response.data.result) {
        const result = response.data.result
        const allResources = []
        
        // 处理 EC2 实例
        if (result.instances && Array.isArray(result.instances)) {
          result.instances.forEach(instance => {
            allResources.push({
              id: instance.instanceId,
              name: instance.tags?.Name || `Instance ${instance.instanceId}`,
              type: 'ec2',
              status: instance.state,
              region: instance.region || credential.region,
              vpcId: instance.vpcId,
              tags: instance.tags
            })
          })
        }
        
        // 处理 S3 存储桶
        if (result.buckets && Array.isArray(result.buckets)) {
          result.buckets.forEach(bucket => {
            allResources.push({
              id: bucket.bucketName,
              name: bucket.bucketName,
              type: 's3',
              status: 'active',
              region: bucket.region || credential.region,
              objects: bucket.objects || [],
              moreObjects: bucket.moreObjects || false,
              expanded: false
            })
          })
        }
        
        // 处理 IAM 角色
        if (result.roles && Array.isArray(result.roles)) {
          result.roles.forEach(role => {
            allResources.push({
              id: role.roleId,
              name: role.roleName,
              type: 'iam',
              status: 'active',
              region: credential.region,
              permissions: [] // 后端未返回权限信息
            })
          })
        }
        
        // 处理 IAM 用户
        if (result.users && Array.isArray(result.users)) {
          result.users.forEach(user => {
            allResources.push({
              id: user.userId,
              name: user.userName,
              type: 'iam',
              status: 'active',
              region: credential.region,
              permissions: [] // 后端未返回权限信息
            })
          })
        }
        
        // 处理 VPC 资源
        if (result.vpcs && Array.isArray(result.vpcs)) {
          result.vpcs.forEach(vpc => {
            allResources.push({
              id: vpc.vpcId,
              name: vpc.tags?.Name || vpc.vpcId,
              type: 'vpc',
              status: vpc.state,
              region: vpc.region || credential.region,
              cidrBlock: vpc.cidrBlock,
              isDefault: vpc.isDefault,
              tags: vpc.tags
            })
          })
        }
        
        // 处理路由表资源
        if (result.routeTables && Array.isArray(result.routeTables)) {
          result.routeTables.forEach(rt => {
            allResources.push({
              id: rt.routeTableId,
              name: rt.tags?.Name || rt.routeTableId,
              type: 'route',
              status: 'active',
              region: rt.region || credential.region,
              vpcId: rt.vpcId,
              routes: rt.routes,
              tags: rt.tags
            })
          })
        }
        
        // 处理 ELB 资源
        if (result.elbs && Array.isArray(result.elbs)) {
          result.elbs.forEach(elb => {
            allResources.push({
              id: elb.loadBalancerArn,
              name: elb.loadBalancerName,
              type: 'elb',
              status: elb.state,
              region: elb.region || credential.region,
              elbType: elb.type,
              dnsName: elb.dnsName,
              availabilityZones: elb.availabilityZones,
              securityGroups: elb.securityGroups
            })
          })
        }
        
        // 处理 EKS 集群
        if (result.eksClusters && Array.isArray(result.eksClusters)) {
          result.eksClusters.forEach(cluster => {
            allResources.push({
              id: cluster.arn,
              name: cluster.name,
              type: 'eks',
              status: cluster.status,
              region: cluster.region || credential.region,
              version: cluster.version,
              endpoint: cluster.endpoint,
              createdAt: cluster.createdAt
            })
          })
        }
        
        // 处理 KMS 密钥
        if (result.kmsKeys && Array.isArray(result.kmsKeys)) {
          result.kmsKeys.forEach(key => {
            allResources.push({
              id: key.keyId,
              name: key.description || key.keyId,
              type: 'kms',
              status: key.keyState,
              region: key.region || credential.region,
              keyUsage: key.keyUsage,
              arn: key.arn,
              creationDate: key.creationDate
            })
          })
        }
        
        // 处理 RDS 数据库实例
        if (result.rdsInstances && Array.isArray(result.rdsInstances)) {
          result.rdsInstances.forEach(instance => {
            allResources.push({
              id: instance.dbInstanceIdentifier,
              name: instance.dbInstanceIdentifier,
              type: 'rds',
              status: instance.status,
              region: instance.region || credential.region,
              engine: instance.engine,
              engineVersion: instance.engineVersion,
              dbInstanceClass: instance.dbInstanceClass,
              allocatedStorage: instance.allocatedStorage,
              multiAZ: instance.multiAZ
            })
          })
        }
        
        // 处理 Lambda 函数
        if (result.lambdaFunctions && Array.isArray(result.lambdaFunctions)) {
          result.lambdaFunctions.forEach(lambdaFunction => {
            allResources.push({
              id: lambdaFunction.functionName,
              name: lambdaFunction.functionName,
              type: 'lambda',
              status: 'active',
              region: lambdaFunction.region || credential.region,
              runtime: lambdaFunction.runtime,
              handler: lambdaFunction.handler,
              timeout: lambdaFunction.timeout,
              memorySize: lambdaFunction.memorySize
            })
          })
        }
        
        // 处理 API Gateway
        if (result.apiGateways && Array.isArray(result.apiGateways)) {
          result.apiGateways.forEach(api => {
            allResources.push({
              id: api.id,
              name: api.name,
              type: 'apigateway',
              status: 'active',
              region: api.region || credential.region,
              version: api.version,
              apiKeySource: api.apiKeySource
            })
          })
        }
        
        // 处理 CloudTrail
        if (result.cloudTrails && Array.isArray(result.cloudTrails)) {
          result.cloudTrails.forEach(trail => {
            allResources.push({
              id: trail.name,
              name: trail.name,
              type: 'cloudtrail',
              status: 'active',
              region: trail.region || credential.region,
              s3BucketName: trail.s3BucketName,
              isMultiRegionTrail: trail.isMultiRegionTrail
            })
          })
        }
        
        // 处理 CloudWatch Logs
        if (result.cloudWatchLogGroups && Array.isArray(result.cloudWatchLogGroups)) {
          result.cloudWatchLogGroups.forEach(logGroup => {
            allResources.push({
              id: logGroup.logGroupName,
              name: logGroup.logGroupName,
              type: 'cloudwatchlogs',
              status: 'active',
              region: logGroup.region || credential.region,
              retentionInDays: logGroup.retentionInDays,
              metricFilterCount: logGroup.metricFilterCount
            })
          })
        }
        
        // 处理 DynamoDB 表
        if (result.dynamoDBTables && Array.isArray(result.dynamoDBTables)) {
          result.dynamoDBTables.forEach(table => {
            allResources.push({
              id: table.tableName,
              name: table.tableName,
              type: 'dynamodb',
              status: table.tableStatus,
              region: table.region || credential.region,
              creationDateTime: table.creationDateTime
            })
          })
        }
        
        // 处理 Secrets Manager
        if (result.secrets && Array.isArray(result.secrets)) {
          result.secrets.forEach(secret => {
            allResources.push({
              id: secret.name,
              name: secret.name,
              type: 'secretsmanager',
              status: 'active',
              region: secret.region || credential.region,
              description: secret.description,
              lastAccessedDate: secret.lastAccessedDate
            })
          })
        }
        
        // 处理 SNS 主题
        if (result.snsTopics && Array.isArray(result.snsTopics)) {
          result.snsTopics.forEach(topic => {
            allResources.push({
              id: topic.topicArn,
              name: topic.topicArn.substring(topic.topicArn.lastIndexOf(':') + 1),
              type: 'sns',
              status: 'active',
              region: topic.region || credential.region
            })
          })
        }
        
        // 处理 SQS 队列
        if (result.sqsQueues && Array.isArray(result.sqsQueues)) {
          result.sqsQueues.forEach(queue => {
            allResources.push({
              id: queue.queueUrl,
              name: queue.queueName,
              type: 'sqs',
              status: 'active',
              region: queue.region || credential.region
            })
          })
        }
        
        setResources(allResources)
        message.success('从数据库读取资源成功')
      } else {
        setResources([])
        message.warning('未发现资源')
      }
    } catch (error) {
      console.error('获取资源失败:', error)
      setError('获取资源失败: ' + (error.response?.data?.error || '未知错误'))
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  // 过滤资源
  const getFilteredResources = () => {
    // 首先按资源类型筛选
    let filtered = activeTab === 'all' ? resources : resources.filter(resource => resource.type === activeTab)
    
    // 然后按区域筛选
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(resource => resource.region === selectedRegion)
    }
    
    return filtered
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

  // 批量下载文件
  const handleBatchDownload = (bucket) => {
    const selectedFileKeys = Object.keys(selectedFiles).filter(key => 
      selectedFiles[key] && key.startsWith(`${bucket}/`)
    )

    if (selectedFileKeys.length === 0) {
      message.warning('请选择要下载的文件')
      return
    }

    // 过滤掉那些 key 等于 bucket 或为空的情况，避免下载存储桶本身
    const filteredFileKeys = selectedFileKeys.filter(key => {
      const fileKey = key.replace(`${bucket}/`, '')
      return fileKey !== bucket && fileKey !== ''
    })

    if (filteredFileKeys.length === 0) {
      message.warning('请选择要下载的文件，不要选择存储桶本身')
      return
    }

    // 创建批量下载任务
    const batchTaskId = Date.now() + Math.random()
    const newBatchTask = {
      id: batchTaskId,
      bucket: bucket,
      files: filteredFileKeys.map(key => key.replace(`${bucket}/`, '')),
      status: 'running',
      progress: 0,
      completed: 0,
      total: filteredFileKeys.length,
      downloadPath: '计算中...',
      startTime: new Date().toISOString()
    }

    setDownloadTasks(prev => [...prev, newBatchTask])

    // 逐个下载文件
    filteredFileKeys.forEach((key, index) => {
      const fileKey = key.replace(`${bucket}/`, '')
      handleDownloadFile(bucket, fileKey)
    })

    // 清空选择
    setSelectedFiles(prev => {
      const newSelectedFiles = { ...prev }
      selectedFileKeys.forEach(key => delete newSelectedFiles[key])
      return newSelectedFiles
    })

    message.success(`开始批量下载 ${filteredFileKeys.length} 个文件`)
  }

  // 全部下载文件
  const handleDownloadAllFiles = (bucket, objects) => {
    if (objects.length === 0) {
      message.warning('存储桶中没有文件')
      return
    }

    // 过滤掉那些 key 等于 bucket 或为空的情况，避免下载存储桶本身
    const filteredObjects = objects.filter(file => file.key !== bucket && file.key !== '')

    if (filteredObjects.length === 0) {
      message.warning('存储桶中没有可下载的文件')
      return
    }

    // 创建批量下载任务
    const batchTaskId = Date.now() + Math.random()
    const newBatchTask = {
      id: batchTaskId,
      bucket: bucket,
      files: filteredObjects.map(file => file.key),
      status: 'running',
      progress: 0,
      completed: 0,
      total: filteredObjects.length,
      downloadPath: '计算中...',
      startTime: new Date().toISOString()
    }

    setDownloadTasks(prev => [...prev, newBatchTask])

    // 逐个下载文件
    filteredObjects.forEach((file, index) => {
      handleDownloadFile(bucket, file.key)
    })

    message.success(`开始全部下载 ${filteredObjects.length} 个文件`)
  }

  // 切换文件选择状态
  const toggleFileSelection = (bucket, key) => {
    const fullKey = `${bucket}/${key}`
    setSelectedFiles(prev => ({
      ...prev,
      [fullKey]: !prev[fullKey]
    }))
  }

  // 全选/取消全选
  const toggleSelectAll = (bucket, files) => {
    const allSelected = files.every(file => selectedFiles[`${bucket}/${file.key}`])
    const newSelectedFiles = { ...selectedFiles }
    
    files.forEach(file => {
      newSelectedFiles[`${bucket}/${file.key}`] = !allSelected
    })
    
    setSelectedFiles(newSelectedFiles)
  }

  // 遍历存储桶文件
  const handleListObjects = async (bucket) => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    try {
      // 调用遍历 API
      const response = await api.post('/cloud/operate', {
        credential_id: selectedCredential.id,
        resource_type: 's3',
        action: 'list_objects',
        resource_id: bucket,
        params: {}
      })
      
      if (response.data && response.data.result?.objects) {
        // 显示文件列表
        Modal.info({
          title: `存储桶 ${bucket} 的文件列表`,
          content: (
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
                      onClick={() => handleDownloadFile(bucket, record.key)}
                    >
                      下载
                    </Button>
                  )
                }
              ]} 
              dataSource={response.data.result.objects}
              rowKey="key"
              pagination={{ pageSize: 10 }}
            />
          ),
          width: 800,
        })
      } else {
        message.warning('未找到文件')
      }
    } catch (error) {
      console.error('遍历存储桶失败:', error)
      message.error('遍历存储桶失败: ' + (error.response?.data?.error || '未知错误'))
    }
  }

  // 生成拓扑测绘
  const handleGenerateTopology = async () => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    setTopologyLoading(true)
    try {
      // 检查是否有资源数据
      if (resources.length === 0) {
        message.warning('请先获取资源，然后再生成拓扑图')
        setTopologyLoading(false)
        return
      }

      // 生成React Flow节点和边
      const nodes = []
      const edges = []

      // 添加中心节点（云账户）
      const centerNodeId = 'cloud_account'
      nodes.push({
        id: centerNodeId,
        position: { x: 500, y: 50 },
        data: { label: `${selectedCredential.cloudProvider} Account: ${selectedCredential.name}` },
        style: {
          backgroundColor: '#f0f0f0',
          border: '2px solid #333',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '14px',
          fontWeight: 'bold'
        },
        type: 'default'
      })

      // 为VPC和EC2资源创建节点
      const vpcNodes = {}
      let vpcX = 100
      const vpcY = 200
      const ec2YOffset = 150

      // 添加VPC节点
      resources.filter(r => r.type === 'vpc').forEach((vpc, index) => {
        const vpcNodeId = `vpc_${vpc.id.replace(/-/g, '_')}`
        vpcNodes[vpc.id] = vpcNodeId
        
        // 计算VPC节点位置
        const vpcPositionX = vpcX + (index * 250)
        
        nodes.push({
          id: vpcNodeId,
          position: { x: vpcPositionX, y: vpcY },
          data: { label: `VPC: ${vpc.name}` },
          style: {
            backgroundColor: '#f9f0ff',
            border: '2px solid #722ed1',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px'
          },
          type: 'default'
        })

        // 连接VPC到中心节点
        edges.push({
          id: `edge_${centerNodeId}_${vpcNodeId}`,
          source: centerNodeId,
          target: vpcNodeId,
          style: { stroke: '#999' }
        })

        // 为VPC内的EC2实例创建节点
        const ec2Instances = resources.filter(r => r.type === 'ec2' && r.vpcId === vpc.id)
        ec2Instances.forEach((instance, ec2Index) => {
          const ec2NodeId = `ec2_${instance.id.replace(/-/g, '_')}`
          
          // 计算EC2节点位置
          const ec2PositionX = vpcPositionX - 75 + (ec2Index * 150)
          
          nodes.push({
            id: ec2NodeId,
            position: { x: ec2PositionX, y: vpcY + ec2YOffset },
            data: { label: `EC2: ${instance.name}` },
            style: {
              backgroundColor: '#e6f7ff',
              border: '2px solid #1890ff',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px'
            },
            type: 'default'
          })

          // 连接EC2到VPC
          edges.push({
            id: `edge_${vpcNodeId}_${ec2NodeId}`,
            source: vpcNodeId,
            target: ec2NodeId,
            style: { stroke: '#999' }
          })
        })
      })

      // 为不在任何VPC中的EC2实例创建节点并连接到中心节点
      const standaloneEC2s = resources.filter(r => r.type === 'ec2' && !r.vpcId)
      standaloneEC2s.forEach((instance, index) => {
        const ec2NodeId = `ec2_${instance.id.replace(/-/g, '_')}`
        
        // 计算EC2节点位置
        const ec2PositionX = 100 + (index * 200)
        
        nodes.push({
          id: ec2NodeId,
          position: { x: ec2PositionX, y: vpcY + ec2YOffset },
          data: { label: `EC2: ${instance.name}` },
          style: {
            backgroundColor: '#e6f7ff',
            border: '2px solid #1890ff',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px'
          },
          type: 'default'
        })

        // 连接EC2到中心节点
        edges.push({
          id: `edge_${centerNodeId}_${ec2NodeId}`,
          source: centerNodeId,
          target: ec2NodeId,
          style: { stroke: '#999' }
        })
      })

      // 设置拓扑数据
      setTopologyData({ nodes, edges })
      message.success('拓扑测绘生成成功')
    } catch (error) {
      console.error('生成拓扑测绘失败:', error)
      message.error('生成拓扑测绘失败: ' + (error.response?.data?.error || '未知错误'))
      setTopologyData(null)
    } finally {
      setTopologyLoading(false)
    }
  }

  // 生成提权路径
  const handleGenerateEscalationPath = async () => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    setEscalationLoading(true)
    try {
      // 检查是否有权限信息
      if (!permissions) {
        message.warning('请先获取权限信息，然后再生成提权路径')
        setEscalationLoading(false)
        return
      }

      // 从 pathfinding.cloud 获取的提权路径数据
      const escalationPaths = [
        {
          id: 'APPRUNNER-001',
          name: 'AppRunner 提权',
          description: 'iam:PassRole + apprunner:CreateService',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'APPRUNNER-002',
          name: 'AppRunner 提权',
          description: 'apprunner:UpdateService',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'BEDROCK-001',
          name: 'Bedrock 提权',
          description: 'iam:PassRole + bedrock-agentcore:CreateCodeInterpreter + bedrock-agentcore:StartCodeInterpreterSession + bedrock-agentcore:InvokeCodeInterpreter',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'BEDROCK-002',
          name: 'Bedrock 提权',
          description: 'bedrock-agentcore:StartCodeInterpreterSession + bedrock-agentcore:InvokeCodeInterpreter',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'CLOUDFORMATION-001',
          name: 'CloudFormation 提权',
          description: 'iam:PassRole + cloudformation:CreateStack',
          type: 'New Passrole',
          risk: 'PMCSPR'
        },
        {
          id: 'CLOUDFORMATION-002',
          name: 'CloudFormation 提权',
          description: 'cloudformation:UpdateStack',
          type: 'Existing Passrole',
          risk: 'PMPR'
        },
        {
          id: 'CODEBUILD-001',
          name: 'CodeBuild 提权',
          description: 'iam:PassRole + codebuild:CreateProject',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'CODEBUILD-002',
          name: 'CodeBuild 提权',
          description: 'codebuild:UpdateProject',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'CODEPIPELINE-001',
          name: 'CodePipeline 提权',
          description: 'iam:PassRole + codepipeline:CreatePipeline',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'CODEPIPELINE-002',
          name: 'CodePipeline 提权',
          description: 'codepipeline:UpdatePipeline',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'DATAPIPELINE-001',
          name: 'DataPipeline 提权',
          description: 'iam:PassRole + datapipeline:CreatePipeline',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'DATAPIPELINE-002',
          name: 'DataPipeline 提权',
          description: 'datapipeline:PutPipelineDefinition',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'EC2-001',
          name: 'EC2 提权',
          description: 'iam:PassRole + ec2:RunInstances',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'EC2-002',
          name: 'EC2 提权',
          description: 'ec2:AssociateIamInstanceProfile',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'ECS-001',
          name: 'ECS 提权',
          description: 'iam:PassRole + ecs:CreateTaskDefinition',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'ECS-002',
          name: 'ECS 提权',
          description: 'ecs:RunTask',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'EKS-001',
          name: 'EKS 提权',
          description: 'iam:PassRole + eks:CreateCluster',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'EKS-002',
          name: 'EKS 提权',
          description: 'eks:UpdateClusterConfig',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'GLUE-001',
          name: 'Glue 提权',
          description: 'iam:PassRole + glue:CreateJob',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'GLUE-002',
          name: 'Glue 提权',
          description: 'glue:UpdateJob',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'IAM-001',
          name: 'IAM 提权',
          description: 'iam:CreateUser + iam:PutUserPolicy',
          type: 'New User',
          risk: 'PMPR'
        },
        {
          id: 'IAM-002',
          name: 'IAM 提权',
          description: 'iam:CreateRole + iam:PutRolePolicy',
          type: 'New Role',
          risk: 'PMPR'
        },
        {
          id: 'LAMBDA-001',
          name: 'Lambda 提权',
          description: 'iam:PassRole + lambda:CreateFunction',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'LAMBDA-002',
          name: 'Lambda 提权',
          description: 'lambda:UpdateFunctionCode',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'RDS-001',
          name: 'RDS 提权',
          description: 'iam:PassRole + rds:CreateDBInstance',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'RDS-002',
          name: 'RDS 提权',
          description: 'rds:ModifyDBInstance',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'S3-001',
          name: 'S3 提权',
          description: 's3:PutObject + s3:PutObjectAcl',
          type: 'Bucket Policy',
          risk: 'PR'
        },
        {
          id: 'SNS-001',
          name: 'SNS 提权',
          description: 'sns:CreateTopic + sns:SetTopicAttributes',
          type: 'Topic Policy',
          risk: 'PR'
        },
        {
          id: 'SQS-001',
          name: 'SQS 提权',
          description: 'sqs:CreateQueue + sqs:SetQueueAttributes',
          type: 'Queue Policy',
          risk: 'PR'
        },
        {
          id: 'STEPFUNCTIONS-001',
          name: 'Step Functions 提权',
          description: 'iam:PassRole + states:CreateStateMachine',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'STEPFUNCTIONS-002',
          name: 'Step Functions 提权',
          description: 'states:UpdateStateMachine',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'TRANSFER-001',
          name: 'Transfer 提权',
          description: 'iam:PassRole + transfer:CreateServer',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'TRANSFER-002',
          name: 'Transfer 提权',
          description: 'transfer:UpdateServer',
          type: 'Existing Passrole',
          risk: 'PR'
        },
        {
          id: 'WORKSPACES-001',
          name: 'WorkSpaces 提权',
          description: 'iam:PassRole + workspaces:CreateWorkspaces',
          type: 'New Passrole',
          risk: 'PR'
        },
        {
          id: 'WORKSPACES-002',
          name: 'WorkSpaces 提权',
          description: 'workspaces:ModifyWorkspaceProperties',
          type: 'Existing Passrole',
          risk: 'PR'
        }
      ]

      // 生成React Flow节点和边
      const nodes = []
      const edges = []

      // 添加当前权限节点
      const currentPermissionNodeId = 'current_permission'
      nodes.push({
        id: currentPermissionNodeId,
        position: { x: 400, y: 50 },
        data: { label: `当前权限: ${permissions.userType || 'Unknown'}` },
        style: {
          backgroundColor: '#f0f0f0',
          border: '2px solid #333',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '14px',
          fontWeight: 'bold'
        },
        type: 'default'
      })

      // 添加提权路径节点
      let xOffset = 0
      const yOffset = 150
      const nodeWidth = 300

      escalationPaths.forEach((path, index) => {
        const nodeId = `path_${path.id}`
        const xPosition = 150 + (index % 3) * (nodeWidth + 100)
        const yPosition = 150 + Math.floor(index / 3) * yOffset

        nodes.push({
          id: nodeId,
          position: { x: xPosition, y: yPosition },
          data: {
            label: `${path.id}\n${path.name}\n${path.description}\n类型: ${path.type}\n风险: ${path.risk}`
          },
          style: {
            backgroundColor: '#fff1f0',
            border: '2px solid #ff4d4f',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            width: nodeWidth
          },
          type: 'default'
        })

        // 连接当前权限到提权路径
        edges.push({
          id: `edge_${currentPermissionNodeId}_${nodeId}`,
          source: currentPermissionNodeId,
          target: nodeId,
          style: { stroke: '#ff4d4f' },
          animated: true
        })
      })

      // 设置提权路径数据
      setEscalationData({ nodes, edges })
      message.success('提权路径生成成功')
    } catch (error) {
      console.error('生成提权路径失败:', error)
      message.error('生成提权路径失败: ' + (error.response?.data?.error || '未知错误'))
      setEscalationData(null)
    } finally {
      setEscalationLoading(false)
    }
  }

  // 缩放和拖动处理函数
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1))
  }

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartDrag({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - startDrag.x,
        y: e.clientY - startDrag.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.max(0.1, Math.min(5, prev * delta)))
  }



  // 资源表格列
  const resourceColumns = [
    {
      title: '资源 ID',
      dataIndex: 'id',
      key: 'id',
      ellipsis: true,
      width: 200
    },
    {
      title: '资源名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      width: 200,
      render: (text) => (
        <Text strong>{text}</Text>
      )
    },
    {
      title: '资源类型',
      dataIndex: 'type',
      key: 'type',
      ellipsis: true,
      width: 150,
      render: (type) => {
        const typeMap = {
          ec2: 'EC2 实例',
          s3: 'S3 存储桶',
          iam: 'IAM 资源',
          vpc: 'VPC',
          route: '路由表',
          elb: '负载均衡器',
          eks: 'EKS 集群',
          kms: 'KMS 密钥',
          rds: 'RDS 数据库',
          lambda: 'Lambda 函数',
          apigateway: 'API Gateway',
          cloudtrail: 'CloudTrail',
          cloudwatchlogs: 'CloudWatch Logs',
          dynamodb: 'DynamoDB 表',
          secretsmanager: 'Secrets Manager',
          sns: 'SNS 主题',
          sqs: 'SQS 队列'
        }
        return typeMap[type] || type
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      ellipsis: true,
      width: 100,
      render: (status) => (
        <Text style={{ 
          color: status === 'running' || status === 'active' || status === 'available' ? '#52c41a' : '#ff4d4f' 
        }}>
          {status === 'running' || status === 'active' || status === 'available' ? '活跃' : '非活跃'}
        </Text>
      )
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
      ellipsis: true,
      width: 150
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => {
        // 检查资源类型，确保EC2实例显示执行命令选项
        if (record.type === 'ec2') {
          return (
            <div>
              <a href="#" onClick={(e) => {
                e.preventDefault();
                handleExecuteCommand(record.id);
              }} style={{ color: '#1890ff', cursor: 'pointer' }}>
                运行命令
              </a>
            </div>
          )
        }
        return null
      }
    }
  ]

  // 动态资源类型标签
  const getResourceTabs = () => {
    if (!selectedCredential) {
      return [
        { key: 'all', label: '全部资源', icon: <DatabaseOutlined /> },
        { key: 'ec2', label: 'EC2 实例', icon: <AppstoreOutlined /> },
        { key: 's3', label: 'S3 存储桶', icon: <UploadOutlined /> },
        { key: 'iam', label: 'IAM 资源', icon: <UserOutlined /> },
        { key: 'vpc', label: 'VPC', icon: <AppstoreOutlined /> },
        { key: 'route', label: '路由表', icon: <AppstoreOutlined /> },
        { key: 'elb', label: '负载均衡器', icon: <AppstoreOutlined /> },
        { key: 'eks', label: 'EKS 集群', icon: <AppstoreOutlined /> },
        { key: 'kms', label: 'KMS 密钥', icon: <KeyOutlined /> },
        { key: 'rds', label: 'RDS 数据库', icon: <DatabaseOutlined /> }
      ]
    }

    if (selectedCredential.cloudProvider === 'AWS') {
      return [
        { key: 'all', label: '全部资源', icon: <DatabaseOutlined /> },
        { key: 'ec2', label: 'EC2 实例', icon: <AppstoreOutlined /> },
        { key: 's3', label: 'S3 存储桶', icon: <UploadOutlined /> },
        { key: 'iam', label: 'IAM 资源', icon: <UserOutlined /> },
        { key: 'vpc', label: 'VPC', icon: <AppstoreOutlined /> },
        { key: 'route', label: '路由表', icon: <AppstoreOutlined /> },
        { key: 'elb', label: '负载均衡器', icon: <AppstoreOutlined /> },
        { key: 'eks', label: 'EKS 集群', icon: <AppstoreOutlined /> },
        { key: 'kms', label: 'KMS 密钥', icon: <KeyOutlined /> },
        { key: 'rds', label: 'RDS 数据库', icon: <DatabaseOutlined /> },
        { key: 'lambda', label: 'Lambda 函数', icon: <AppstoreOutlined /> },
        { key: 'apigateway', label: 'API Gateway', icon: <AppstoreOutlined /> },
        { key: 'cloudtrail', label: 'CloudTrail', icon: <AppstoreOutlined /> },
        { key: 'cloudwatchlogs', label: 'CloudWatch Logs', icon: <AppstoreOutlined /> },
        { key: 'dynamodb', label: 'DynamoDB 表', icon: <DatabaseOutlined /> },
        { key: 'secretsmanager', label: 'Secrets Manager', icon: <KeyOutlined /> },
        { key: 'sns', label: 'SNS 主题', icon: <AppstoreOutlined /> },
        { key: 'sqs', label: 'SQS 队列', icon: <AppstoreOutlined /> }
      ]
    } else if (selectedCredential.cloudProvider === '阿里云') {
      return [
        { key: 'all', label: '全部资源', icon: <DatabaseOutlined /> },
        { key: 'ecs', label: 'ECS 实例', icon: <AppstoreOutlined /> },
        { key: 'oss', label: 'OSS 存储桶', icon: <UploadOutlined /> },
        { key: 'ram', label: 'RAM 资源', icon: <UserOutlined /> }
      ]
    } else if (selectedCredential.cloudProvider === 'GCP') {
      return [
        { key: 'all', label: '全部资源', icon: <DatabaseOutlined /> },
        { key: 'compute', label: 'Compute 实例', icon: <AppstoreOutlined /> },
        { key: 'storage', label: 'Storage 存储桶', icon: <UploadOutlined /> },
        { key: 'iam', label: 'IAM 资源', icon: <UserOutlined /> }
      ]
    } else {
      return [
        { key: 'all', label: '全部资源', icon: <DatabaseOutlined /> }
      ]
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>资源总览</Title>
      </div>

      {/* 凭证选择 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Text strong style={{ marginRight: 16 }}>选择 AKSK 凭证：</Text>
          <Select
            style={{ width: 400 }}
            placeholder="选择要使用的凭证"
            onChange={handleCredentialChange}
            optionLabelProp="label"
            loading={credentialsLoading}
          >
            {credentials.map(credential => (
              <Option key={credential.id} value={credential.id} label={`${credential.name} (${credential.cloudProvider})`}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CloudOutlined style={{ marginRight: 8, color: '#1890ff' }} />
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

      {error && (
        <Alert 
          message="错误" 
          description={error} 
          type="error" 
          showIcon 
          style={{ marginBottom: 24 }}
          onClose={() => setError(null)}
        />
      )}

      {selectedCredential ? (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Text strong>当前凭证：</Text> {selectedCredential.name} ({selectedCredential.cloudProvider})
          </div>
          
          {/* 权限列表 */}
          <div style={{ marginBottom: 24 }}>
            <Title level={4}>权限分析</Title>
            {permissionsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin size="small" />
                <div style={{ marginTop: 8 }}>正在获取权限信息...</div>
              </div>
            ) : permissions ? (
              permissions.userType === 'ROOT' ? (
                <div style={{ backgroundColor: '#f6ffed', padding: '16px', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ marginRight: 12, fontSize: 24, color: '#52c41a' }}>✅</div>
                    <div>
                      <Text strong style={{ color: '#389e0d' }}>无需提权，权限为ROOT</Text>
                      <div style={{ marginTop: 8, color: '#52c41a' }}>您当前拥有最高权限，无需进行权限提升操作。</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>用户类型：</Text> {permissions.userType}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>用户：</Text> {permissions.user}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>权限：</Text>
                    <ul style={{ margin: '8px 0 0 20px' }}>
                      {permissions.permissions.map((permission, index) => (
                        <li key={index}>{permission}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <Text strong>风险等级：</Text> 
                    <Tag color={permissions.riskLevel === 'High' ? 'red' : permissions.riskLevel === 'Medium' ? 'orange' : 'green'}>
                      {permissions.riskLevel}
                    </Tag>
                  </div>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Text type="secondary">无法获取权限信息</Text>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 16 }}>
            {/* 左侧区域栏目 */}
            <div style={{ width: 240, padding: 16, backgroundColor: '#ffffff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <SearchOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                <Text strong style={{ fontSize: 16 }}>区域筛选</Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* 所有区域选项 */}
                <div 
                  style={{
                    padding: 12,
                    borderRadius: 6,
                    cursor: 'pointer',
                    backgroundColor: selectedRegion === 'all' ? '#1890ff' : '#f5f5f5',
                    color: selectedRegion === 'all' ? '#ffffff' : '#333333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.3s ease',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  onClick={() => setSelectedRegion('all')}
                >
                  <span>所有区域</span>
                  <span style={{ backgroundColor: selectedRegion === 'all' ? 'rgba(255, 255, 255, 0.3)' : '#e8e8e8', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
                    {resources.length}
                  </span>
                </div>
                {/* 动态生成区域选项 */}
                {Array.from(new Set(resources.map(resource => resource.region)))
                  .sort((a, b) => {
                    // 将没有区域的资源放在最后
                    if (!a) return 1;
                    if (!b) return -1;
                    return a.localeCompare(b);
                  })
                  .map(region => {
                  // 统计该区域的资源数量
                  const regionResources = resources.filter(r => r.region === region);
                  const ec2Count = regionResources.filter(r => r.type === 'ec2').length;
                  const s3Count = regionResources.filter(r => r.type === 's3').length;
                  const iamCount = regionResources.filter(r => r.type === 'iam').length;
                  const vpcCount = regionResources.filter(r => r.type === 'vpc').length;
                  const routeCount = regionResources.filter(r => r.type === 'route').length;
                  const elbCount = regionResources.filter(r => r.type === 'elb').length;
                  const eksCount = regionResources.filter(r => r.type === 'eks').length;
                  const kmsCount = regionResources.filter(r => r.type === 'kms').length;
                  const rdsCount = regionResources.filter(r => r.type === 'rds').length;
                  const lambdaCount = regionResources.filter(r => r.type === 'lambda').length;
                  const apigatewayCount = regionResources.filter(r => r.type === 'apigateway').length;
                  const cloudtrailCount = regionResources.filter(r => r.type === 'cloudtrail').length;
                  const cloudwatchlogsCount = regionResources.filter(r => r.type === 'cloudwatchlogs').length;
                  const dynamodbCount = regionResources.filter(r => r.type === 'dynamodb').length;
                  const secretsmanagerCount = regionResources.filter(r => r.type === 'secretsmanager').length;
                  const snsCount = regionResources.filter(r => r.type === 'sns').length;
                  const sqsCount = regionResources.filter(r => r.type === 'sqs').length;
                  
                  return (
                    <div 
                      key={region || 'no-region'}
                      style={{
                        padding: 12,
                        borderRadius: 6,
                        cursor: 'pointer',
                        backgroundColor: selectedRegion === region ? '#1890ff' : '#f5f5f5',
                        color: selectedRegion === region ? '#ffffff' : '#333333',
                        transition: 'all 0.3s ease',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                      onClick={() => setSelectedRegion(region)}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>{region || '无区域'}</span>
                          <span style={{ backgroundColor: selectedRegion === region ? 'rgba(255, 255, 255, 0.3)' : '#e8e8e8', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
                            {regionResources.length}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 12, opacity: 0.8, flexWrap: 'wrap' }}>
                          {ec2Count > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{ec2Count} EC2</span>
                            </div>
                          )}
                          {s3Count > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <UploadOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{s3Count} S3</span>
                            </div>
                          )}
                          {iamCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <UserOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{iamCount} IAM</span>
                            </div>
                          )}
                          {vpcCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{vpcCount} VPC</span>
                            </div>
                          )}
                          {routeCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{routeCount} 路由</span>
                            </div>
                          )}
                          {elbCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{elbCount} ELB</span>
                            </div>
                          )}
                          {eksCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{eksCount} EKS</span>
                            </div>
                          )}
                          {kmsCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <KeyOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{kmsCount} KMS</span>
                            </div>
                          )}
                          {rdsCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <DatabaseOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{rdsCount} RDS</span>
                            </div>
                          )}
                          {lambdaCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{lambdaCount} Lambda</span>
                            </div>
                          )}
                          {apigatewayCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{apigatewayCount} API</span>
                            </div>
                          )}
                          {cloudtrailCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{cloudtrailCount} CT</span>
                            </div>
                          )}
                          {cloudwatchlogsCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{cloudwatchlogsCount} CW</span>
                            </div>
                          )}
                          {dynamodbCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <DatabaseOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{dynamodbCount} Dynamo</span>
                            </div>
                          )}
                          {secretsmanagerCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <KeyOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{secretsmanagerCount} Secrets</span>
                            </div>
                          )}
                          {snsCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{snsCount} SNS</span>
                            </div>
                          )}
                          {sqsCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <AppstoreOutlined style={{ marginRight: 4, fontSize: 12 }} />
                              <span>{sqsCount} SQS</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 右侧资源内容 */}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {getResourceTabs().map(tab => {
                    // 计算每个资源类型的数量，根据当前选中的区域
                    let count = 0;
                    // 先根据区域筛选资源
                    const regionFilteredResources = selectedRegion === 'all' 
                      ? resources 
                      : resources.filter(resource => resource.region === selectedRegion);
                    
                    // 再根据资源类型筛选
                    if (tab.key === 'all') {
                      count = regionFilteredResources.length;
                    } else {
                      count = regionFilteredResources.filter(resource => resource.type === tab.key).length;
                    }
                    
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          borderRadius: 4,
                          border: activeTab === tab.key ? '1px solid #1890ff' : '1px solid #d9d9d9',
                          backgroundColor: activeTab === tab.key ? '#e6f7ff' : '#ffffff',
                          color: activeTab === tab.key ? '#1890ff' : '#333333',
                          cursor: 'pointer',
                          fontSize: 14,
                          transition: 'all 0.3s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <span style={{ marginRight: 8 }}>{tab.icon}</span>
                        <span>{tab.label}</span>
                        <span style={{
                          marginLeft: 8,
                          backgroundColor: activeTab === tab.key ? 'rgba(24, 144, 255, 0.2)' : '#f0f0f0',
                          color: activeTab === tab.key ? '#1890ff' : '#333',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: 12
                        }}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* 资源表格内容 */}
              <div style={{ marginTop: 16 }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>正在获取资源...</div>
                  </div>
                ) : getFilteredResources().length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <Table 
                      columns={resourceColumns} 
                      dataSource={getFilteredResources()} 
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 'max-content' }}
                      expandable={{
                        expandedRowRender: record => {
                          if (record.type === 's3' && record.objects && record.objects.length > 0) {
                            return (
                              <div style={{ padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                  <Text strong>存储桶文件：</Text>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <Button 
                                      type="primary" 
                                      icon={<DownloadOutlined />}
                                      onClick={() => handleBatchDownload(record.id)}
                                      style={{ marginRight: 8 }}
                                    >
                                      批量下载
                                    </Button>
                                    <Button 
                                      type="primary" 
                                      icon={<DownloadOutlined />}
                                      onClick={() => handleDownloadAllFiles(record.id, record.objects)}
                                      style={{ marginRight: 8 }}
                                    >
                                      全部下载
                                    </Button>
                                    <Button 
                                      type="link" 
                                      onClick={() => toggleSelectAll(record.id, record.objects)}
                                    >
                                      {record.objects.every(file => selectedFiles[`${record.id}/${file.key}`]) ? '取消全选' : '全选'}
                                    </Button>
                                  </div>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                  <Table
                                  columns={[
                                    {
                                      title: (
                                        <input 
                                          type="checkbox" 
                                          checked={record.objects.every(file => selectedFiles[`${record.id}/${file.key}`])} 
                                          onChange={() => toggleSelectAll(record.id, record.objects)}
                                        />
                                      ),
                                      key: 'checkbox',
                                      render: (_, fileRecord) => (
                                        <input 
                                          type="checkbox" 
                                          checked={selectedFiles[`${record.id}/${fileRecord.key}`] || false}
                                          onChange={() => toggleFileSelection(record.id, fileRecord.key)}
                                        />
                                      )
                                    },
                                      { title: '文件路径', dataIndex: 'key', key: 'key', ellipsis: true, width: 300 },
                                      { title: '大小', dataIndex: 'size', key: 'size', width: 100 },
                                      { title: '修改时间', dataIndex: 'lastModified', key: 'lastModified', width: 200 },
                                      { 
                                        title: '操作', 
                                        key: 'action',
                                        width: 100,
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
                                    scroll={{ x: 'max-content' }}
                                  />
                                </div>
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
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">当前分类下没有资源</Text>
                  </div>
                )}
              </div>

            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <KeyOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: 16 }} />
            <Text type="secondary" style={{ fontSize: '16px' }}>请选择一个 AKSK 凭证开始查看资源</Text>
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
                    {task.files ? `批量下载 (${task.bucket})` : `下载: ${task.key}`}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Badge 
                      status={task.status === 'success' ? 'success' : task.status === 'running' ? 'processing' : 'error'}
                      text={task.status === 'success' ? '成功' : task.status === 'running' ? '下载中' : '失败'}
                      style={{ marginRight: 8 }}
                    />

                  </div>
                </div>
                {task.downloadPath && (
                  <div style={{ marginBottom: 8, padding: '8px 12px', backgroundColor: '#f6ffed', borderRadius: 4, border: '1px solid #b7eb8f' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <FolderOpenOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                      <Text strong style={{ color: '#389e0d' }}>下载路径: {task.downloadPath}</Text>
                    </div>
                  </div>
                )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">开始时间: {task.startTime ? new Date(task.startTime).toLocaleString() : 'N/A'}</Text>
                  {task.endTime && (
                    <Text type="secondary">结束时间: {new Date(task.endTime).toLocaleString()}</Text>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 拓扑测绘 */}
      {selectedCredential && (
        <Card style={{ marginTop: 24 }}>
          <Title level={4}>拓扑测绘</Title>
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<BuildOutlined />}
              onClick={handleGenerateTopology}
              loading={topologyLoading}
              style={{ marginBottom: 16 }}
            >
              生成拓扑图
            </Button>
            
            {topologyData ? (
              <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
                <h3>拓扑测绘结果</h3>
                <div style={{ marginTop: 16, width: '100%' }}>
                  <div style={{ width: '100%', height: '600px', border: '1px solid #e8e8e8', borderRadius: '4px' }}>
                    <ReactFlow
                      nodes={topologyData.nodes}
                      edges={topologyData.edges}
                      defaultZoom={1}
                      defaultPosition={{ x: 0, y: 0 }}
                      minZoom={0.1}
                      maxZoom={5}
                      fitView
                    >
                      <Controls />
                      <Background variant="dots" gap={12} size={1} />
                      <MiniMap />
                    </ReactFlow>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">请点击"生成拓扑图"按钮生成资源拓扑</Text>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 提权路径 */}
      {selectedCredential && (
        <Card style={{ marginTop: 24 }}>
          <Title level={4}>提权路径</Title>
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="primary" 
              icon={<KeyOutlined />}
              onClick={handleGenerateEscalationPath}
              loading={escalationLoading}
              style={{ marginBottom: 16 }}
            >
              生成提权路径
            </Button>
            
            {escalationData ? (
              <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
                <h3>提权路径结果</h3>
                <div style={{ marginTop: 16, width: '100%' }}>
                  <div style={{ width: '100%', height: '600px', border: '1px solid #e8e8e8', borderRadius: '4px' }}>
                    <ReactFlow
                      nodes={escalationData.nodes}
                      edges={escalationData.edges}
                      defaultZoom={1}
                      defaultPosition={{ x: 0, y: 0 }}
                      minZoom={0.1}
                      maxZoom={5}
                      fitView
                    >
                      <Controls />
                      <Background variant="dots" gap={12} size={1} />
                      <MiniMap />
                    </ReactFlow>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text type="secondary">请点击"生成提权路径"按钮生成提权路径拓扑</Text>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 命令执行任务列表 */}
      {commandTasks.length > 0 && (
        <Card style={{ marginTop: 24 }}>
          <Title level={4}>命令执行任务</Title>
          <div>
            {commandTasks.map(task => (
              <div key={task.id} style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span>
                    {task.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Badge 
                      status={(task.status === 'success' || task.status === 'completed') ? 'success' : task.status === 'running' ? 'processing' : 'error'}
                      text={(task.status === 'success' || task.status === 'completed') ? '成功' : task.status === 'running' ? '执行中' : '失败'}
                      style={{ marginRight: 8 }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 8, padding: '8px 12px', backgroundColor: '#e6f7ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong>实例 ID: {task.instanceId}</Text>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong>命令: {task.command}</Text>
                  </div>
                  {task.commandId && (
                    <div style={{ marginBottom: 4 }}>
                      <Text strong>命令 ID: {task.commandId}</Text>
                    </div>
                  )}
                  {task.note && (
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary">{task.note}</Text>
                    </div>
                  )}
                  {task.stdout && (
                    <div style={{ marginBottom: 4 }}>
                      <Text strong>标准输出:</Text>
                      <div style={{ marginTop: 4, padding: '8px', backgroundColor: '#f5f5f5', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                        {task.stdout}
                      </div>
                    </div>
                  )}
                  {task.stderr && (
                    <div style={{ marginBottom: 4 }}>
                      <Text strong style={{ color: '#ff4d4f' }}>错误输出:</Text>
                      <div style={{ marginTop: 4, padding: '8px', backgroundColor: '#fff1f0', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', color: '#ff4d4f' }}>
                        {task.stderr}
                      </div>
                    </div>
                  )}
                  {task.error && (
                    <div style={{ marginBottom: 4 }}>
                      <Text strong style={{ color: '#ff4d4f' }}>错误信息:</Text>
                      <div style={{ marginTop: 4, padding: '8px', backgroundColor: '#fff1f0', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', color: '#ff4d4f' }}>
                        {task.error}
                      </div>
                    </div>
                  )}
                  {task.executionSteps && task.executionSteps.length > 0 && (
                    <div style={{ marginBottom: 4 }}>
                      <Text strong>执行流程:</Text>
                      <div style={{ marginTop: 4, padding: '8px', backgroundColor: '#f0f5ff', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                        {task.executionSteps.join('\n')}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">开始时间: {task.startTime ? new Date(task.startTime).toLocaleString() : 'N/A'}</Text>
                  {task.endTime && (
                    <Text type="secondary">结束时间: {new Date(task.endTime).toLocaleString()}</Text>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 命令执行模态框 */}
      <Modal
        title="执行命令"
        open={commandModalVisible}
        onOk={executeCommand}
        onCancel={() => setCommandModalVisible(false)}
        okText="执行"
        cancelText="取消"
        confirmLoading={commandLoading}
        width={600}
        style={{
          top: 20
        }}
        bodyStyle={{
          padding: 24
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>EC2 实例 ID: {selectedInstanceId}</Text>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text>请输入要执行的命令:</Text>
          <textarea
            style={{
              width: '100%',
              height: 150,
              marginTop: 8,
              padding: 12,
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              resize: 'vertical',
              fontFamily: 'monospace'
            }}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="例如: ls -la"
          />
        </div>
        <div style={{ color: '#666', fontSize: 12 }}>
          <Text>注意: 命令执行结果将显示在任务中心</Text>
        </div>
      </Modal>
    </div>
  )
}

export default ResourceOverview