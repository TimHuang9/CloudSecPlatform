import React, { useState } from 'react'
import { Typography, Card, Button, Table, Modal, Form, Input, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CloudOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

const CloudManagement = () => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [form] = Form.useForm()

  // 模拟数据
  const cloudProviders = [
    {
      id: 1,
      name: 'AWS',
      description: 'Amazon Web Services',
      regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
      status: 'active'
    },
    {
      id: 2,
      name: '阿里云',
      description: 'Aliyun Cloud',
      regions: ['cn-hangzhou', 'cn-shanghai', 'cn-beijing', 'ap-southeast-1'],
      status: 'active'
    },
    {
      id: 3,
      name: 'GCP',
      description: 'Google Cloud Platform',
      regions: ['us-central1', 'us-east1', 'europe-west1', 'asia-east1'],
      status: 'active'
    },
    {
      id: 4,
      name: 'Azure',
      description: 'Microsoft Azure',
      regions: ['eastus', 'westus', 'northeurope', 'southeastasia'],
      status: 'inactive'
    },
    {
      id: 5,
      name: '腾讯云',
      description: 'Tencent Cloud',
      regions: ['ap-guangzhou', 'ap-shanghai', 'ap-beijing', 'ap-singapore'],
      status: 'active'
    }
  ]

  const columns = [
    {
      title: '云平台',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CloudOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </div>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '区域数量',
      dataIndex: 'regions',
      key: 'regions',
      render: (regions) => regions.length
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Text style={{ 
          color: status === 'active' ? '#52c41a' : '#ff4d4f' 
        }}>
          {status === 'active' ? '活跃' : '非活跃'}
        </Text>
      )
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
      description: record.description,
      status: record.status
    })
    setIsModalVisible(true)
  }

  const handleDelete = (id) => {
    message.success(`删除云平台 ${id} 成功`)
  }

  const handleSubmit = (values) => {
    if (editingRecord) {
      message.success(`更新云平台 ${editingRecord.name} 成功`)
    } else {
      message.success('添加云平台成功')
    }
    setIsModalVisible(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>云平台管理</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          添加云平台
        </Button>
      </div>
      
      <Card>
        <Table 
          columns={columns} 
          dataSource={cloudProviders} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
      
      <Modal
        title={editingRecord ? '编辑云平台' : '添加云平台'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="云平台名称"
            rules={[{ required: true, message: '请输入云平台名称' }]}
          >
            <Input placeholder="例如：AWS、阿里云" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入云平台描述' }]}
          >
            <Input.TextArea placeholder="例如：Amazon Web Services" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="选择状态">
              <Option value="active">活跃</Option>
              <Option value="inactive">非活跃</Option>
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
    </div>
  )
}

export default CloudManagement