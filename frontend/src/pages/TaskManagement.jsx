import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTasks, createTask, fetchTaskDetails, fetchTaskResults, deleteTask, deleteAllTasks, clearError, clearCurrentTask } from '../store/taskSlice'
import { fetchCredentials } from '../store/credentialSlice'
import { Typography, Card, Button, Table, Modal, Form, Select, message, Alert, Tabs, Descriptions, List, Badge, Tag } from 'antd'
import { PlusOutlined, PlayCircleOutlined, StopOutlined, DeleteOutlined, AppstoreOutlined, BarChartOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

const TaskManagement = () => {
  const dispatch = useDispatch()
  const { tasks, currentTask, taskResults, loading, error } = useSelector(state => state.task)
  const { credentials } = useSelector(state => state.credential)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [form] = Form.useForm()
  const [selectedEscalationMethods, setSelectedEscalationMethods] = useState([])

  useEffect(() => {
    dispatch(fetchTasks())
    dispatch(fetchCredentials())
  }, [dispatch])

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
      case 'analyze':
        return '权限分析'
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
    // 调用API运行任务
    // 实际应用中应该调用相应的API
    message.success(`开始运行任务 ${id}`)
  }

  const handleStopTask = (id) => {
    // 调用API停止任务
    // 实际应用中应该调用相应的API
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
    // 将credentialId转换为数字类型
    taskData.credentialId = parseInt(taskData.credentialId)
    
    // 如果是权限提升任务，添加提升方法
    if (taskData.taskType === 'escalate') {
      taskData.parameters = JSON.stringify({
        escalation_methods: selectedEscalationMethods
      })
    }
    
    dispatch(createTask(taskData))
    // 重置选中的提升方法
    setSelectedEscalationMethods([])
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
              {credentials.map(credential => (
                <Option key={credential.id} value={credential.id}>
                  {credential.name} ({credential.cloud_provider})
                </Option>
              ))}
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
              <Option value="analyze">权限分析</Option>
              <Option value="operate">资源操作</Option>
              <Option value="takeover">平台接管</Option>
            </Select>
          </Form.Item>

          {/* 权限提升方法选择 */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.taskType !== currentValues.taskType}
          >
            {({ getFieldValue }) => {
              const taskType = getFieldValue('taskType');
              if (taskType === 'escalate') {
                return (
                  <Form.Item
                    label="权限提升方法"
                    rules={[{ required: true, message: '请选择至少一种权限提升方法' }]}
                  >
                    <div>
                      {
                        [
                          { key: 'attachpolicy', label: 'Attach Policy' },
                          { key: 'putuserpolicy', label: 'Put User Policy' },
                          { key: 'createrole', label: 'Create Role' },
                          { key: 'assumerole', label: 'Assume Role' },
                          { key: 'instanceprofile', label: 'Instance Profile' },
                          { key: 'createpolicyversion', label: 'Create Policy Version' }
                        ].map(method => (
                        <Tag
                          key={method.key}
                          color={selectedEscalationMethods.includes(method.key) ? 'blue' : 'default'}
                          onClick={() => {
                            if (selectedEscalationMethods.includes(method.key)) {
                              setSelectedEscalationMethods(selectedEscalationMethods.filter(item => item !== method.key));
                            } else {
                              setSelectedEscalationMethods([...selectedEscalationMethods, method.key]);
                            }
                          }}
                          style={{ margin: '4px', cursor: 'pointer' }}
                        >
                          {method.label}
                        </Tag>
                      ))}
                    </div>
                  </Form.Item>
                );
              }
              return null;
            }}
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
              {taskResults.length > 0 ? (
                <List
                  dataSource={taskResults}
                  renderItem={item => {
                    // 格式化时间
                    const formatTime = (timestamp) => {
                      if (!timestamp) return 'N/A';
                      try {
                        return new Date(timestamp).toLocaleString('zh-CN');
                      } catch (e) {
                        return timestamp;
                      }
                    };
                    
                    // 美化JSON显示，特别处理标签信息
                    const formatJSON = (jsonStr) => {
                      if (!jsonStr) return '{}';
                      try {
                        const obj = JSON.parse(jsonStr);
                        // 处理资源标签，使其更易读
                        const processTags = (data) => {
                          if (Array.isArray(data)) {
                            return data.map(item => processTags(item));
                          } else if (typeof data === 'object' && data !== null) {
                            const processed = {};
                            for (const key in data) {
                              if (key === 'tags' && typeof data[key] === 'object') {
                                // 将标签对象转换为字符串数组，更易读
                                processed[key] = Object.entries(data[key]).map(([k, v]) => `${k}: ${v}`);
                              } else if (typeof data[key] === 'object' && data[key] !== null) {
                                processed[key] = processTags(data[key]);
                              } else {
                                processed[key] = data[key];
                              }
                            }
                            return processed;
                          }
                          return data;
                        };
                        const processedObj = processTags(obj);
                        return JSON.stringify(processedObj, null, 2);
                      } catch (e) {
                        return jsonStr;
                      }
                    };
                    
                    return (
                      <List.Item>
                        <List.Item.Meta
                          title={formatTime(item.timestamp)}
                          description={
                            <div>
                              {item.error ? (
                                <Text type="danger">错误: {item.error}</Text>
                              ) : (
                                <div>
                                  <Text>结果:</Text>
                                  <div style={{ 
                                    marginTop: 8, 
                                    padding: 12, 
                                    backgroundColor: '#f5f5f5', 
                                    borderRadius: 4, 
                                    fontFamily: 'monospace', 
                                    fontSize: 12, 
                                    whiteSpace: 'pre-wrap',
                                    overflowX: 'auto'
                                  }}>
                                    {formatJSON(item.result)}
                                  </div>
                                </div>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Text type="secondary">暂无执行结果</Text>
                </div>
              )}
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  )
}

export default TaskManagement