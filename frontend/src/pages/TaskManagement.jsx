import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTasks, createTask, fetchTaskDetails, fetchTaskResults, deleteTask, deleteAllTasks, clearError, clearCurrentTask } from '../store/taskSlice'
import { Typography, Card, Button, Table, Modal, Form, Select, message, Alert, Tabs, Descriptions, List, Badge } from 'antd'
import { PlusOutlined, PlayCircleOutlined, StopOutlined, DeleteOutlined, AppstoreOutlined, BarChartOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

const TaskManagement = () => {
  const dispatch = useDispatch()
  const { tasks, currentTask, taskResults, loading, error } = useSelector(state => state.task)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    dispatch(fetchTasks())
  }, [dispatch])

  // 模拟数据
  const mockTasks = [
    {
      id: 1,
      name: 'AWS S3 存储桶枚举',
      credentialId: 1,
      taskType: 'enumerate',
      status: 'success',
      startTime: '2024-01-15 14:30:00',
      endTime: '2024-01-15 14:35:00'
    },
    {
      id: 2,
      name: '阿里云 ECS 实例操作',
      credentialId: 2,
      taskType: 'operate',
      status: 'running',
      startTime: '2024-01-15 13:45:00',
      endTime: ''
    },
    {
      id: 3,
      name: 'GCP IAM 权限分析',
      credentialId: 3,
      taskType: 'escalate',
      status: 'failed',
      startTime: '2024-01-15 12:20:00',
      endTime: '2024-01-15 12:25:00'
    },
    {
      id: 4,
      name: 'Azure 资源枚举',
      credentialId: 4,
      taskType: 'enumerate',
      status: 'success',
      startTime: '2024-01-15 11:10:00',
      endTime: '2024-01-15 11:18:00'
    }
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'running':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return null
    }
  }

  const getTaskTypeText = (type) => {
    switch (type) {
      case 'enumerate':
        return '资源枚举'
      case 'escalate':
        return '权限提升'
      case 'operate':
        return '资源操作'
      case 'takeover':
        return '平台接管'
      default:
        return type
    }
  }

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '任务类型',
      dataIndex: 'taskType',
      key: 'taskType',
      render: (type) => getTaskTypeText(type)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={(status === 'success' || status === 'completed') ? 'success' : status === 'running' ? 'processing' : 'error'}
          text={(status === 'success' || status === 'completed') ? '成功' : status === 'running' ? '运行中' : '失败'}
        />
      )
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime'
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time) => time || '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div>
          <Button 
            icon={<PlayCircleOutlined />} 
            size="small" 
            style={{ marginRight: 8 }}
            onClick={() => handleRunTask(record.id)}
          >
            运行
          </Button>
          <Button 
            icon={<StopOutlined />} 
            size="small" 
            style={{ marginRight: 8 }}
            onClick={() => handleStopTask(record.id)}
          >
            停止
          </Button>
          <Button 
            icon={<BarChartOutlined />} 
            size="small" 
            style={{ marginRight: 8 }}
            onClick={() => handleViewTask(record)}
          >
            查看
          </Button>
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger
            onClick={() => handleDeleteTask(record.id)}
          >
            删除
          </Button>
        </div>
      )
    }
  ]

  const handleAddTask = () => {
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleRunTask = (id) => {
    message.success(`开始运行任务 ${id}`)
  }

  const handleStopTask = (id) => {
    message.success(`停止任务 ${id}`)
  }

  const handleViewTask = (task) => {
    setSelectedTask(task)
    dispatch(fetchTaskDetails(task.id))
    dispatch(fetchTaskResults(task.id))
    setIsDetailVisible(true)
  }

  const handleDeleteTask = (id) => {
    // 调用API删除任务
    dispatch(deleteTask(id))
      .unwrap()
      .then(() => {
        message.success(`删除任务 ${id} 成功`)
        // 重新获取任务列表
        dispatch(fetchTasks())
      })
      .catch((error) => {
        message.error(`删除任务失败: ${error}`)
      })
  }

  const handleDeleteAllTasks = () => {
    // 调用API删除所有任务
    dispatch(deleteAllTasks())
      .unwrap()
      .then(() => {
        message.success('删除所有任务成功')
        // 重新获取任务列表
        dispatch(fetchTasks())
      })
      .catch((error) => {
        message.error(`删除所有任务失败: ${error}`)
      })
  }

  const handleSubmit = (values) => {
    // 从values中删除parameters字段（如果存在）
    const { parameters, ...taskData } = values
    dispatch(createTask(taskData))
    setIsModalVisible(false)
  }

  // 从其他页面添加下载任务
  const addDownloadTask = (taskData) => {
    // 这里可以添加下载任务到任务列表
    console.log('添加下载任务:', taskData)
    // 实际应用中应该调用API创建任务
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>任务管理</Title>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button 
            type="danger" 
            icon={<DeleteOutlined />}
            onClick={handleDeleteAllTasks}
            disabled={tasks.length === 0}
          >
            删除所有任务
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddTask}
          >
            创建任务
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert 
          message="错误" 
          description={error} 
          type="error" 
          showIcon 
          style={{ marginBottom: 24 }}
          onClose={() => dispatch(clearError())}
        />
      )}
      
      <Card>
        <Table 
          columns={columns} 
          dataSource={tasks.length > 0 ? tasks : []} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          locale={{ emptyText: '暂无任务' }}
        />
      </Card>
      
      {/* 创建任务模态框 */}
      <Modal
        title="创建任务"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <input placeholder="例如：AWS S3 存储桶枚举" />
          </Form.Item>
          <Form.Item
            name="credentialId"
            label="选择凭证"
            rules={[{ required: true, message: '请选择凭证' }]}
          >
            <Select placeholder="选择凭证">
              <Option value="1">AWS Production</Option>
              <Option value="2">阿里云测试</Option>
              <Option value="3">GCP Dev</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="taskType"
            label="任务类型"
            rules={[{ required: true, message: '请选择任务类型' }]}
          >
            <Select placeholder="选择任务类型">
              <Option value="enumerate">资源枚举</Option>
              <Option value="escalate">权限提升</Option>
              <Option value="operate">资源操作</Option>
              <Option value="takeover">平台接管</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ textAlign: 'right' }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              确定
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 任务详情模态框 */}
      <Modal
        title="任务详情"
        open={isDetailVisible}
        onCancel={() => {
          setIsDetailVisible(false)
          dispatch(clearCurrentTask())
        }}
        footer={null}
        width={800}
      >
        {currentTask && (
          <Tabs defaultActiveKey="info">
            <TabPane tab="任务信息" key="info">
              <Descriptions column={2}>
                <Descriptions.Item label="任务名称">{currentTask.name}</Descriptions.Item>
                <Descriptions.Item label="任务类型">{getTaskTypeText(currentTask.taskType)}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Badge 
                    status={(currentTask.status === 'success' || currentTask.status === 'completed') ? 'success' : currentTask.status === 'running' ? 'processing' : 'error'}
                    text={(currentTask.status === 'success' || currentTask.status === 'completed') ? '成功' : currentTask.status === 'running' ? '运行中' : '失败'}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="开始时间">{currentTask.startTime}</Descriptions.Item>
                <Descriptions.Item label="结束时间">{currentTask.endTime || '-'}</Descriptions.Item>
              </Descriptions>
            </TabPane>
            <TabPane tab="执行结果" key="results">
              <List
                dataSource={taskResults.length > 0 ? taskResults : [
                  {
                    id: 1,
                    result: '{"buckets": ["bucket1", "bucket2", "bucket3"]}',
                    error: '',
                    timestamp: '2024-01-15 14:35:00'
                  }
                ]}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.timestamp}
                      description={
                        <div>
                          {item.error ? (
                            <Text type="danger">错误: {item.error}</Text>
                          ) : (
                            <Text>结果: {item.result}</Text>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  )
}

export default TaskManagement