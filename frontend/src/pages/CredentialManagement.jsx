import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCredentials, createCredential, updateCredential, deleteCredential, clearError } from '../store/credentialSlice'
import { Typography, Card, Button, Table, Modal, Form, Input, Select, message, Alert } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, CloudOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

const CredentialManagement = () => {
  const dispatch = useDispatch()
  const { credentials, loading, error } = useSelector(state => state.credential)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [form] = Form.useForm()
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    dispatch(fetchCredentials())
  }, [dispatch])

  // 模拟数据
  const mockCredentials = [
    {
      id: 1,
      name: 'AWS Production',
      cloudProvider: 'AWS',
      accessKey: 'AKIAIOSFODNN7EXAMPLE',
      secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'us-east-1',
      description: '生产环境 AWS 凭证'
    },
    {
      id: 2,
      name: '阿里云测试',
      cloudProvider: '阿里云',
      accessKey: 'LTAI4FgS8e7yVEXAMPLE',
      secretKey: '1234567890abcdefghijklmnopqrstuv',
      region: 'cn-hangzhou',
      description: '测试环境 阿里云 凭证'
    },
    {
      id: 3,
      name: 'GCP Dev',
      cloudProvider: 'GCP',
      accessKey: 'GOOG1EXAMPLEKEY',
      secretKey: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
      region: 'us-central1',
      description: '开发环境 GCP 凭证'
    }
  ]

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '云平台',
      dataIndex: 'cloudProvider',
      key: 'cloudProvider',
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CloudOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {text}
        </div>
      )
    },
    {
      title: 'Access Key',
      dataIndex: 'accessKey',
      key: 'accessKey',
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <KeyOutlined style={{ marginRight: 8, color: '#52c41a' }} />
          <Text ellipsis={{ tooltip: text }}>{text}</Text>
        </div>
      )
    },

    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div>
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            style={{ marginRight: 8 }}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </div>
      )
    }
  ]

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    form.setFieldsValue({
      name: record.name,
      cloudProvider: record.cloudProvider,
      accessKey: record.accessKey,
      secretKey: record.secretKey,
      description: record.description
    })
    setIsModalVisible(true)
  }

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个凭证吗？此操作不可恢复。',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        dispatch(deleteCredential(id))
          .unwrap()
          .then(() => {
            message.success('凭证删除成功')
          })
          .catch((error) => {
            message.error('删除失败: ' + error)
          })
      },
    })
  }

  const handleSubmit = (values) => {
    if (editingRecord) {
      dispatch(updateCredential({ id: editingRecord.id, credentialData: values }))
    } else {
      dispatch(createCredential(values))
    }
    setIsModalVisible(false)
  }

  const toggleShowSecret = () => {
    setShowSecret(!showSecret)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>凭证管理</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAdd}
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
          添加凭证
        </Button>
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
          dataSource={credentials} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
        />
      </Card>
      
      <Modal
        title={editingRecord ? '编辑凭证' : '添加凭证'}
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
            label="凭证名称"
            rules={[{ required: true, message: '请输入凭证名称' }]}
          >
            <Input placeholder="例如：AWS Production" />
          </Form.Item>
          <Form.Item
            name="cloudProvider"
            label="云平台"
            rules={[{ required: true, message: '请选择云平台' }]}
          >
            <Select placeholder="选择云平台">
              <Option value="AWS">AWS</Option>
              <Option value="阿里云">阿里云</Option>
              <Option value="GCP">GCP</Option>
              <Option value="Azure">Azure</Option>
              <Option value="腾讯云">腾讯云</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="accessKey"
            label="Access Key"
            rules={[{ required: true, message: '请输入 Access Key' }]}
          >
            <Input placeholder="Access Key" />
          </Form.Item>
          <Form.Item
            name="secretKey"
            label="Secret Key"
            rules={[{ required: true, message: '请输入 Secret Key' }]}
          >
            <Input 
              placeholder="Secret Key" 
              type={showSecret ? 'text' : 'password'}
              suffix={
                <Button 
                  icon={showSecret ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={toggleShowSecret}
                />
              }
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="凭证描述" />
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
    </div>
  )
}

export default CredentialManagement