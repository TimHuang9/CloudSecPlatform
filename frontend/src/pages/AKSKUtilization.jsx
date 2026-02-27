import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCredentials } from '../store/credentialSlice'
import { Typography, Card, Button, Select, Table, Tabs, Form, Input, Modal, message, Alert, Spin, Badge } from 'antd'
import { CloudOutlined, KeyOutlined, SearchOutlined, PlayCircleOutlined, SafetyOutlined, LaptopOutlined, DownloadOutlined, LockOutlined, AppstoreOutlined, DatabaseOutlined, CloudServerOutlined, AimOutlined, FolderOpenOutlined } from '@ant-design/icons'
import axios from 'axios'
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge } from 'reactflow'
import 'reactflow/dist/style.css'

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
  const [resourceType, setResourceType] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [action, setAction] = useState('list')
  const [resourceId, setResourceId] = useState('')
  const [operationParams, setOperationParams] = useState({})
  const [operationResult, setOperationResult] = useState(null)
  const [privilegeResult, setPrivilegeResult] = useState(null)
  const [takeoverResult, setTakeoverResult] = useState(null)
  const [attackPathData, setAttackPathData] = useState(null)
  const [downloadTasks, setDownloadTasks] = useState([])

  // 模拟数据 - 资源类型
  const resourceTypes = [
    { value: 'all', label: '所有资源' },
    { value: 'ec2', label: 'EC2 实例' },
    { value: 's3', label: 'S3 存储桶' },
    { value: 'iam', label: 'IAM 权限' },
    { value: 'database', label: '数据库' },
    { value: 'network', label: '网络资源' }
  ]

  // 资源分类标签
  const resourceCategories = [
    { value: 'all', label: '全部' },
    { value: 'ec2', label: 'EC2' },
    { value: 's3', label: 'S3' },
    { value: 'iam', label: 'IAM' }
  ]

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
    { value: 'takeover_console', label: '接管控制台' }
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
    setAttackPathData(null)
  }

  // 生成攻击路径图数据
  const generateAttackPath = async () => {
    if (!selectedCredential) {
      message.warning('请选择凭证')
      return
    }

    setLoading(true)
    try {
      // 首先获取权限信息
      const permResponse = await api.post('/cloud/escalate', {
        credential_id: selectedCredential.id
      })

      // 然后获取资源信息
      const resourceResponse = await api.post('/cloud/enumerate', {
        credential_id: selectedCredential.id,
        resource_type: 'all'
      })

      if (permResponse.data && permResponse.data.result && resourceResponse.data && resourceResponse.data.result) {
        const permData = permResponse.data.result
        const resourceData = resourceResponse.data.result

        // 生成攻击路径数据
        const nodes = []
        const edges = []

        // 添加起点节点
        nodes.push({
          id: 'start',
          data: {
            label: `${selectedCredential.name} (${selectedCredential.cloudProvider})`,
            description: 'AKSK凭证'
          },
          position: { x: 250, y: 50 }
        })

        // 添加权限节点
        if (permData.permissions && permData.permissions.length > 0) {
          nodes.push({
            id: 'permissions',
            data: {
              label: '权限分析',
              description: `风险等级: ${permData.riskLevel}`
            },
            position: { x: 250, y: 150 }
          })
          edges.push({
            id: 'start-perm',
            source: 'start',
            target: 'permissions',
            label: '分析权限'
          })

          // 添加权限提升路径
          if (permData.potentialEscalation && permData.potentialEscalation.length > 0) {
            nodes.push({
              id: 'escalation',
              data: {
                label: '权限提升',
                description: '潜在提升路径'
              },
              position: { x: 250, y: 250 }
            })
            edges.push({
              id: 'perm-escalation',
              source: 'permissions',
              target: 'escalation',
              label: '提升权限'
            })
          }
        }

        // 添加资源节点
        let yPos = 350
        const resourceTypes = ['ec2', 's3', 'iam']

        resourceTypes.forEach(resourceType => {
          const resourceCount = {
            ec2: resourceData.instances?.length || 0,
            s3: resourceData.buckets?.length || 0,
            iam: (resourceData.users?.length || 0) + (resourceData.roles?.length || 0)
          }

          if (resourceCount[resourceType] > 0) {
            nodes.push({
              id: resourceType,
              data: {
                label: {
                  ec2: 'EC2实例',
                  s3: 'S3存储桶',
                  iam: 'IAM资源'
                }[resourceType],
                description: `数量: ${resourceCount[resourceType]}`
              },
              position: { x: 100 + (resourceTypes.indexOf(resourceType) * 200), y: yPos }
            })

            edges.push({
              id: `escalation-${resourceType}`,
              source: permData.potentialEscalation ? 'escalation' : 'permissions',
              target: resourceType,
              label: '访问资源'
            })
          }
        })

        // 添加终点节点
        nodes.push({
          id: 'end',
          data: {
            label: '平台接管',
            description: '获取管理员权限'
          },
          position: { x: 250, y: 450 }
        })

        // 连接资源到平台接管
        resourceTypes.forEach(resourceType => {
          if (nodes.some(node => node.id === resourceType)) {
            edges.push({
              id: `${resourceType}-end`,
              source: resourceType,
              target: 'end',
              label: '利用资源'
            })
          }
        })

        setAttackPathData({ nodes, edges })
        message.success('攻击路径生成成功')
      } else {
        message.warning('无法生成攻击路径')
      }
    } catch (error) {
      console.error('生成攻击路径失败:', error)
      message.error('生成攻击路径失败: ' + (error.response?.data?.error || '未知错误'))
    } finally {
      setLoading(false)
    }
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

    setLoading(true)
    try {
      // 调用真实 API
      const response = await api.post('/cloud/enumerate', {
        credential_id: selectedCredential.id,
        resource_type: resourceType
      })
      
      // 处理响应数据
      if (response.data && response.data.result) {
        // 转换后端返回的数据格式为前端期望的格式
        const result = response.data.result
        const resources = []
        
        // 处理 EC2 实例
        if (result.instances && Array.isArray(result.instances)) {
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
        }
        
        // 处理 S3 存储桶
        if (result.buckets && Array.isArray(result.buckets)) {
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
        }
        
        // 处理 IAM 角色
        if (result.roles && Array.isArray(result.roles)) {
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
        }
        
        // 处理 IAM 用户
        if (result.users && Array.isArray(result.users)) {
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
        }
        
        setResources(resources)
        // 根据选择的分类标签过滤资源
        if (selectedCategory === 'all') {
          setFilteredResources(resources)
        } else {
          setFilteredResources(resources.filter(resource => resource.type === selectedCategory))
        }
        message.success('资源枚举成功')
      } else {
        setResources([])
        setFilteredResources([])
        message.warning('未发现资源')
      }
    } catch (error) {
      console.error('资源枚举失败:', error)
      message.error('资源枚举失败: ' + (error.response?.data?.error || '未知错误'))
      setResources([])
    } finally {
      setLoading(false)
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

    if (!resourceId && action !== 'takeover_console') {
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
          console_url: response.data.result?.console_url,
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
          takeoverSteps: result.actions || [],
          affectedResources: [],
          persistenceMethod: '创建了具有管理员权限的IAM用户',
          timestamp: new Date().toISOString()
        })
        message.success('平台接管成功')

        // 自动生成控制台URL并打开
        try {
          const consoleResponse = await api.post('/cloud/operate', {
            credential_id: selectedCredential.id,
            resource_type: 's3', // 任意资源类型，主要是为了调用接管控制台功能
            action: 'takeover_console',
            resource_id: 'dummy', // 占位符，不影响功能
            params: {}
          })

          if (consoleResponse.data && consoleResponse.data.result && consoleResponse.data.result.console_url) {
            const consoleUrl = consoleResponse.data.result.console_url
            // 自动打开控制台网页
            window.open(consoleUrl, '_blank')
            message.success('已自动打开AWS控制台')
          } else {
            message.warning('无法生成控制台URL')
          }
        } catch (consoleError) {
          console.error('生成控制台URL失败:', consoleError)
          message.error('生成控制台URL失败: ' + (consoleError.response?.data?.error || '未知错误'))
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
      key: 'region'
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
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  <Select
                    style={{ width: 200, marginRight: 16 }}
                    value={resourceType}
                    onChange={setResourceType}
                  >
                    {resourceTypes.map(type => (
                      <Option key={type.value} value={type.value}>{type.label}</Option>
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
                
                {resources.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <Tabs activeKey={selectedCategory} onChange={handleCategoryChange}>
                      {resourceCategories.map(category => (
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
                )}
              </div>
              </div>
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
                      <Text strong>用户：</Text> {permissions.user}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>角色：</Text> {permissions.role}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>权限：</Text>
                      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {permissions.permissions.map((perm, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>• {perm}</div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>潜在提升路径：</Text>
                      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {permissions.potentialEscalation.map((path, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>• {path}</div>
                        ))}
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
                      <Text strong>控制台链接：</Text>
                      <a href={operationResult.console_url} target="_blank" rel="noopener noreferrer">
                        {operationResult.console_url}
                      </a>
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
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>接管步骤：</Text>
                      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {takeoverResult.takeoverSteps.map((step, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>{index + 1}. {step}</div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>受影响资源：</Text>
                      <div style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {takeoverResult.affectedResources.map((resource, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>• {resource}</div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <Text strong>持久化方法：</Text> {takeoverResult.persistenceMethod}
                    </div>
                    <div>
                      <Text strong>时间：</Text> {new Date(takeoverResult.timestamp).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </TabPane>

            {/* 攻击路径图 */}
            <TabPane tab="攻击路径图" key="attack-path">
              <div style={{ marginBottom: 16 }}>
                <Button 
                  type="primary" 
                  icon={<AimOutlined />}
                  onClick={generateAttackPath}
                  loading={loading}
                  style={{
                    background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
                    borderColor: 'transparent',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '0 24px',
                    height: '40px',
                    marginBottom: 16,
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #36cfc9 0%, #1890ff 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(24, 144, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.3)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  生成攻击路径
                </Button>
                
                {attackPathData ? (
                  <div style={{ height: 600, border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
                    <ReactFlow
                      nodes={attackPathData.nodes}
                      edges={attackPathData.edges}
                      fitView
                    >
                      <Background variant="dots" gap={12} size={1} />
                      <Controls />
                      <MiniMap />
                    </ReactFlow>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '80px 0' }}>
                    <AimOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: 16 }} />
                    <Text type="secondary" style={{ fontSize: '16px' }}>请点击"生成攻击路径"按钮生成攻击路径图</Text>
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
    </div>
  )
}

export default AKSKUtilization
