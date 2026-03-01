import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTasks } from '../store/taskSlice'
import { Typography, Row, Col, Card, Statistic, Progress, List, Avatar, Badge, Spin, message, Tag } from 'antd'
import { CloudOutlined, KeyOutlined, AppstoreOutlined, BarChartOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ThunderboltOutlined, RocketOutlined, AlertOutlined, AmazonOutlined, AliyunOutlined, GoogleOutlined, DatabaseOutlined, LockOutlined, FileOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const Dashboard = () => {
  const dispatch = useDispatch()
  const { tasks, loading } = useSelector(state => state.task)
  
  // 状态管理
  const [statistics, setStatistics] = useState([
    {
      title: '云平台凭证',
      value: 0,
      icon: <KeyOutlined style={{ color: '#1890ff' }} />,
      color: '#1890ff'
    },
    {
      title: '执行任务',
      value: 0,
      icon: <AppstoreOutlined style={{ color: '#52c41a' }} />,
      color: '#52c41a'
    },
    {
      title: '成功率',
      value: '0%',
      icon: <CheckCircleOutlined style={{ color: '#faad14' }} />,
      color: '#faad14'
    }
  ])

  const [cloudDistribution, setCloudDistribution] = useState([])
  const [taskStatistics, setTaskStatistics] = useState({
    total: 0,
    success: 0,
    running: 0,
    failed: 0,
    byCloud: {}
  })

  // 获取云平台分布数据
  const fetchCloudDistribution = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }

      // 先获取所有凭证
      const credentialsResponse = await fetch('http://localhost:8080/api/credentials', {
        headers: {
          'Authorization': token
        }
      })

      if (!credentialsResponse.ok) {
        throw new Error('Failed to fetch credentials')
      }

      const credentials = await credentialsResponse.json()

      // 统计每个云平台的凭证数量
      const cloudCounts = {}
      credentials.forEach(cred => {
        if (cloudCounts[cred.cloud_provider]) {
          cloudCounts[cred.cloud_provider]++
        } else {
          cloudCounts[cred.cloud_provider] = 1
        }
      })

      // 计算总数量和百分比
      const total = credentials.length
      const distribution = Object.entries(cloudCounts).map(([name, count]) => {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
        return {
          name: name,
          count: count,
          percentage: `${percentage}%`
        }
      })

      // 按数量降序排序
      distribution.sort((a, b) => b.count - a.count)

      setCloudDistribution(distribution)

      // 更新统计数据
      setStatistics(prev => [
        {
          ...prev[0],
          value: total
        },
        prev[1],
        prev[2]
      ])
    } catch (error) {
      console.error('Error fetching cloud distribution:', error)
      message.error('获取云平台分布数据失败')
      // 使用默认数据
      setCloudDistribution([
        { name: 'AWS', count: 5, percentage: '42%' },
        { name: '阿里云', count: 3, percentage: '25%' },
        { name: 'GCP', count: 2, percentage: '17%' },
        { name: 'Azure', count: 1, percentage: '8%' },
        { name: '腾讯云', count: 1, percentage: '8%' }
      ])
    } finally {
      setLoading(false)
    }
  }

  // 组件加载时获取数据
  useEffect(() => {
    fetchCloudDistribution()
    dispatch(fetchTasks())
  }, [dispatch])

  // 当任务数据变化时更新统计信息
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      // 计算任务总数
      const total = tasks.length
      // 计算成功任务数
      const success = tasks.filter(task => task.status === 'success' || task.status === 'completed').length
      // 计算运行中任务数
      const running = tasks.filter(task => task.status === 'running').length
      // 计算失败任务数
      const failed = tasks.filter(task => task.status === 'failed').length
      // 计算成功率
      const successRate = total > 0 ? Math.round((success / total) * 100) : 0
      
      // 按云平台统计任务
      const byCloud = {}
      tasks.forEach(task => {
        // 过滤掉云平台为Unknown的任务
        const cloud = task.cloudProvider || 'Unknown'
        if (cloud === 'Unknown') {
          return
        }
        if (!byCloud[cloud]) {
          byCloud[cloud] = {
            total: 0,
            success: 0,
            running: 0,
            failed: 0
          }
        }
        byCloud[cloud].total++
        if (task.status === 'success' || task.status === 'completed') {
          byCloud[cloud].success++
        } else if (task.status === 'running') {
          byCloud[cloud].running++
        } else if (task.status === 'failed') {
          byCloud[cloud].failed++
        }
      })
      
      // 更新统计数据
      setStatistics(prev => [
        prev[0],
        {
          ...prev[1],
          value: total
        },
        {
          ...prev[2],
          value: `${successRate}%`
        }
      ])
      
      // 更新任务统计
      setTaskStatistics({
        total,
        success,
        running,
        failed,
        byCloud
      })
    }
  }, [tasks])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <RocketOutlined style={{ color: '#ffffff' }} />
      case 'running':
        return <ThunderboltOutlined style={{ color: '#ffffff' }} />
      case 'failed':
        return <AlertOutlined style={{ color: '#ffffff' }} />
      default:
        return null
    }
  }
  
  const getAvatarStyle = (status) => {
    switch (status) {
      case 'success':
        return { backgroundColor: '#52c41a' }
      case 'running':
        return { backgroundColor: '#faad14' }
      case 'failed':
        return { backgroundColor: '#999999' }
      default:
        return { backgroundColor: '#999999' }
    }
  }

  // 获取云平台图标
  const getCloudIcon = (cloudProvider) => {
    switch (cloudProvider) {
      case 'aws':
        return <AmazonOutlined />
      case 'aliyun':
        return <AliyunOutlined />
      case 'gcp':
        return <GoogleOutlined />
      case 'azure':
        return <CloudOutlined />
      default:
        return <CloudOutlined />
    }
  }

  // 获取任务类型图标
  const getTaskTypeIcon = (taskType) => {
    switch (taskType) {
      case 'enumerate':
        return <AppstoreOutlined />
      case 'analyze':
        return <LockOutlined />
      case 'operate':
        return <DatabaseOutlined />
      case 'takeover':
        return <FileOutlined />
      default:
        return <AppstoreOutlined />
    }
  }

  // 获取任务类型文本
  const getTaskTypeText = (taskType) => {
    switch (taskType) {
      case 'enumerate':
        return '资源枚举'
      case 'analyze':
        return '权限分析'
      case 'operate':
        return '资源操作'
      case 'takeover':
        return '平台接管'
      default:
        return taskType
    }
  }

  // 解析任务参数，获取资源类型
  const getResourceType = (parameters) => {
    try {
      const params = JSON.parse(parameters)
      return params.resource_type || ''
    } catch (error) {
      return ''
    }
  }

  return (
    <div>
      <Title level={2}>仪表盘</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {statistics.map((stat, index) => (
          <Col span={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Card title="任务执行统计" style={{ marginBottom: 24 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
              </div>
            ) : taskStatistics.total > 0 ? (
              <>
                <div style={{ marginBottom: 24 }}>
                  <Text>总体执行进度</Text>
                  <Progress 
                    percent={Math.round((taskStatistics.success / taskStatistics.total) * 100)} 
                    status={taskStatistics.running > 0 ? "active" : taskStatistics.success === taskStatistics.total ? "success" : "exception"} 
                  />
                </div>
                {Object.entries(taskStatistics.byCloud).map(([cloud, stats]) => (
                  <div key={cloud} style={{ marginBottom: 24 }}>
                    <Text>{cloud} 任务</Text>
                    <Progress 
                      percent={Math.round((stats.success / stats.total) * 100)} 
                      status={stats.running > 0 ? "active" : stats.success === stats.total ? "success" : "exception"} 
                    />
                  </div>
                ))}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text>暂无任务数据</Text>
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="最近任务" style={{ marginBottom: 24 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
              </div>
            ) : tasks && tasks.length > 0 ? (
              <List
                    itemLayout="horizontal"
                    dataSource={tasks.slice(0, 4)} // 显示最近的4个任务
                    renderItem={item => {
                      const resourceType = getResourceType(item.parameters)
                      return (
                        <List.Item key={item.id}>
                          <List.Item.Meta
                            avatar={<Avatar icon={getTaskTypeIcon(item.taskType)} style={getAvatarStyle(item.status)} />}
                            title={
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span>{item.name || '未命名任务'}</span>
                                  <Tag icon={getTaskTypeIcon(item.taskType)} color="orange">
                                    {getTaskTypeText(item.taskType)}
                                  </Tag>
                                  {item.cloudProvider && (
                                    <Tag icon={getCloudIcon(item.cloudProvider)} color="blue">
                                      {item.cloudProvider.toUpperCase()}
                                    </Tag>
                                  )}
                                  {resourceType && (
                                    <Tag color="green">
                                      {resourceType}
                                    </Tag>
                                  )}
                                </div>
                                <Badge 
                                  status={(item.status === 'success' || item.status === 'completed') ? 'success' : item.status === 'running' ? 'processing' : 'error'}
                                  text={(item.status === 'success' || item.status === 'completed') ? '成功' : item.status === 'running' ? '运行中' : '失败'}
                                />
                              </div>
                            }
                            description={
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span>{new Date(item.startTime).toLocaleString()}</span>
                                {item.credentialName && (
                                  <span>凭证: {item.credentialName}</span>
                                )}
                              </div>
                            }
                          />
                        </List.Item>
                      )
                    }}
                  />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text>暂无任务数据</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Card title="云平台分布" style={{ marginBottom: 24 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
              </div>
            ) : cloudDistribution.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={cloudDistribution}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<CloudOutlined />} />}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{item.name}</span>
                          <Text>{item.count} 个凭证</Text>
                        </div>
                      }
                      description={
                        <Progress 
                          percent={parseInt(item.percentage)} 
                          size="small" 
                          showInfo={false}
                        />
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Text>暂无云平台凭证数据</Text>
              </div>
            )}
          </Card>
        </Col>
        

      </Row>
    </div>
  )
}

export default Dashboard