import React, { useState, useEffect } from 'react'
import { Typography, Row, Col, Card, Statistic, Progress, List, Avatar, Badge, Spin, message } from 'antd'
import { CloudOutlined, KeyOutlined, AppstoreOutlined, BarChartOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ThunderboltOutlined, RocketOutlined, AlertOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const Dashboard = () => {
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

  const [recentTasks, setRecentTasks] = useState([
    {
      id: 1,
      name: 'AWS S3 存储桶枚举',
      status: 'success',
      time: '2024-01-15 14:30'
    },
    {
      id: 2,
      name: '阿里云 ECS 实例操作',
      status: 'running',
      time: '2024-01-15 13:45'
    },
    {
      id: 3,
      name: 'GCP IAM 权限分析',
      status: 'failed',
      time: '2024-01-15 12:20'
    },
    {
      id: 4,
      name: 'Azure 资源枚举',
      status: 'success',
      time: '2024-01-15 11:10'
    }
  ])

  const [cloudDistribution, setCloudDistribution] = useState([])
  const [loading, setLoading] = useState(true)

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
  }, [])

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
            <div style={{ marginBottom: 24 }}>
              <Text>总体执行进度</Text>
              <Progress percent={65} status="active" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <Text>AWS 任务</Text>
              <Progress percent={80} status="success" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <Text>阿里云任务</Text>
              <Progress percent={50} status="active" />
            </div>
            <div>
              <Text>GCP 任务</Text>
              <Progress percent={30} status="exception" />
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="最近任务" style={{ marginBottom: 24 }}>
            <List
              itemLayout="horizontal"
              dataSource={recentTasks}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={getStatusIcon(item.status)} style={getAvatarStyle(item.status)} />}
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{item.name}</span>
                        <Badge 
                          status={item.status === 'success' ? 'success' : item.status === 'running' ? 'warning' : 'default'}
                          text={item.status === 'success' ? '成功' : item.status === 'running' ? '运行中' : '失败'}
                        />
                      </div>
                    }
                    description={item.time}
                  />
                </List.Item>
              )}
            />
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
        
        <Col span={12}>
          <Card title="系统状态" style={{ marginBottom: 24 }}>
            <List
              itemLayout="horizontal"
              dataSource={[
                { name: 'CPU 使用率', value: '35%' },
                { name: '内存使用率', value: '60%' },
                { name: '磁盘使用率', value: '45%' },
                { name: '网络带宽', value: '1.2 GB/s' },
                { name: '活跃连接', value: '128' }
              ]}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{item.name}</span>
                        <Text strong>{item.value}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard