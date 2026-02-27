import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCredentials } from '../store/credentialSlice'
import { Typography, Card, Select, Table, Tabs, Spin, message, Alert, Button, Modal, List, Badge } from 'antd'
import { CloudOutlined, KeyOutlined, DatabaseOutlined, AppstoreOutlined, UploadOutlined, UserOutlined, SearchOutlined, DownloadOutlined, DownOutlined, RightOutlined, FolderOpenOutlined } from '@ant-design/icons'
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

  useEffect(() => {
    dispatch(fetchCredentials())
  }, [dispatch])

  // 处理凭证选择
  const handleCredentialChange = (credentialId) => {
    const credential = credentials.find(c => c.id === parseInt(credentialId))
    setSelectedCredential(credential)
    setSelectedRegion('all') // 重置区域选择
    if (credential) {
      fetchResources(credential)
    } else {
      setResources([])
      setError(null)
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
              region: credential.region,
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

    // 过滤掉那些 key 等于 bucket 的情况，避免下载存储桶本身
    const filteredFileKeys = selectedFileKeys.filter(key => {
      const fileKey = key.replace(`${bucket}/`, '')
      return fileKey !== bucket
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

    // 过滤掉那些 key 等于 bucket 的情况，避免下载存储桶本身
    const filteredObjects = objects.filter(file => file.key !== bucket)

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
      render: (text) => (
        <Text strong>{text}</Text>
      )
    },
    {
      title: '资源类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          ec2: 'EC2 实例',
          s3: 'S3 存储桶',
          iam: 'IAM 资源'
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
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div>
          {/* 操作按钮已移除，使用展开/折叠功能查看文件 */}
        </div>
      )
    }
  ]

  // 资源类型标签
  const resourceTabs = [
    { key: 'all', label: '全部资源', icon: <DatabaseOutlined /> },
    { key: 'ec2', label: 'EC2 实例', icon: <AppstoreOutlined /> },
    { key: 's3', label: 'S3 存储桶', icon: <UploadOutlined /> },
    { key: 'iam', label: 'IAM 资源', icon: <UserOutlined /> }
  ]

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
          
          <div style={{ display: 'flex', gap: 16 }}>
            {/* 左侧区域栏目 */}
            <div style={{ width: 240, padding: 16, backgroundColor: '#ffffff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
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
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => setSelectedRegion('all')}
                >
                  <span>所有区域</span>
                  <span style={{ backgroundColor: selectedRegion === 'all' ? 'rgba(255, 255, 255, 0.3)' : '#e8e8e8', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
                    {resources.length}
                  </span>
                </div>
                {/* 动态生成区域选项 */}
                {Array.from(new Set(resources.map(resource => resource.region))).map(region => {
                  // 统计该区域的资源数量
                  const regionResources = resources.filter(r => r.region === region);
                  const ec2Count = regionResources.filter(r => r.type === 'ec2').length;
                  const s3Count = regionResources.filter(r => r.type === 's3').length;
                  const iamCount = regionResources.filter(r => r.type === 'iam').length;
                  
                  return (
                    <div 
                      key={region}
                      style={{
                        padding: 12,
                        borderRadius: 6,
                        cursor: 'pointer',
                        backgroundColor: selectedRegion === region ? '#1890ff' : '#f5f5f5',
                        color: selectedRegion === region ? '#ffffff' : '#333333',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => setSelectedRegion(region)}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>{region}</span>
                          <span style={{ backgroundColor: selectedRegion === region ? 'rgba(255, 255, 255, 0.3)' : '#e8e8e8', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
                            {regionResources.length}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 12, opacity: 0.8 }}>
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 右侧资源内容 */}
            <div style={{ flex: 1 }}>
              <Tabs activeKey={activeTab} onChange={setActiveTab}>
              {resourceTabs.map(tab => (
                <TabPane tab={<><span style={{ marginRight: 8 }}>{tab.icon}</span>{tab.label}</>} key={tab.key}>
                  <div style={{ marginTop: 16 }}>
                    {loading ? (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16 }}>正在获取资源...</div>
                      </div>
                    ) : getFilteredResources().length > 0 ? (
                      <Table 
                        columns={resourceColumns} 
                        dataSource={getFilteredResources()} 
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
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
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Text type="secondary">当前分类下没有资源</Text>
                      </div>
                    )}
                  </div>
                </TabPane>
              ))}
            </Tabs>
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
                    {task.status === 'success' && (
                      <Button 
                        type="link" 
                        icon={<FolderOpenOutlined />}
                        onClick={() => {
                          // 显示下载目录路径，让用户手动打开
                          message.info(`下载目录: ${task.downloadPath}`);
                        }}
                      >
                        查看下载路径
                      </Button>
                    )}
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

export default ResourceOverview