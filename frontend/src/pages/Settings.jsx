import React, { useState, useEffect } from 'react'
import { Typography, Card, Form, Input, Button, message, Alert, Spin } from 'antd'
import { SettingOutlined, SaveOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Title, Text } = Typography

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

const Settings = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // 获取当前配置
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      // 这里应该调用后端API获取配置，暂时使用默认值
      // 实际实现时，应该添加一个获取配置的API端点
      form.setFieldsValue({
        downloadPath: '/Users/admin/Documents/Downloads/CloudSecPlatform'
      })
    } catch (error) {
      console.error('获取配置失败:', error)
      message.error('获取配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // 这里应该调用后端API保存配置，暂时只显示成功消息
      // 实际实现时，应该添加一个保存配置的API端点
      console.log('保存配置:', values)
      setSuccess('配置保存成功')
      message.success('配置保存成功')
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (error) {
      console.error('保存配置失败:', error)
      setError('保存配置失败: ' + (error.response?.data?.error || '未知错误'))
      message.error('保存配置失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>
          <SettingOutlined style={{ marginRight: 12, color: '#ff4d4f' }} />
          系统配置
        </Title>
      </div>

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

      {success && (
        <Alert 
          message="成功" 
          description={success} 
          type="success" 
          showIcon 
          style={{ marginBottom: 24 }}
          onClose={() => setSuccess(null)}
        />
      )}

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="downloadPath"
            label="下载路径"
            rules={[
              {
                required: true,
                message: '请输入下载路径'
              }
            ]}
          >
            <Input
              placeholder="输入文件下载的保存路径"
              style={{ width: 600 }}
              addonAfter={<Text type="secondary">默认: ~/Documents/Downloads/CloudSecPlatform</Text>}
            />
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
              下载的文件将保存在此路径下，按照存储桶名称创建子目录
            </Text>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={loading}
              style={{
                background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)',
                borderColor: 'transparent',
                color: '#ffffff',
                borderRadius: 8,
                padding: '0 24px',
                height: '40px'
              }}
            >
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Settings