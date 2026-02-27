import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { register, clearError } from '../store/authSlice'
import { Button, Form, Input, Alert, Card, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { LockOutlined, UserOutlined, MailOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const Register = () => {
  const dispatch = useDispatch()
  const { isAuthenticated, loading, error } = useSelector(state => state.auth)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  // 当认证状态变为 true 时，导航到仪表盘
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (values) => {
    dispatch(clearError())
    dispatch(register({
      username: values.username,
      email: values.email,
      password: values.password
    }))
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card 
        style={{ 
          width: 420, 
          background: '#ffffff', 
          borderColor: '#e4e7ed',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          overflow: 'hidden'
        }} 
        title={
          <div style={{ textAlign: 'center', padding: '20px 0', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#ffffff', margin: '-24px -24px 24px -24px' }}>
            <Title level={3} style={{ color: '#ffffff', marginBottom: 8, fontWeight: 'bold' }}>云红队平台</Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)' }}>云红队平台注册</Text>
          </div>
        }
      >
        {error && (
          <Alert 
            message="注册失败" 
            description={error} 
            type="error" 
            showIcon 
            style={{ marginBottom: 24 }}
            onClose={() => dispatch(clearError())}
          />
        )}
        <Form
          form={form}
          name="register"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined className="site-form-item-icon" style={{ color: '#409eff' }} />} 
              placeholder="用户名" 
              style={{ 
                background: '#f8f9fa', 
                borderColor: '#e4e7ed', 
                color: '#303133',
                borderRadius: '8px',
                height: '40px'
              }}
            />
          </Form.Item>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input
              prefix={<MailOutlined className="site-form-item-icon" style={{ color: '#409eff' }} />}
              placeholder="邮箱"
              style={{ 
                background: '#f8f9fa', 
                borderColor: '#e4e7ed', 
                color: '#303133',
                borderRadius: '8px',
                height: '40px'
              }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少为6位' }
            ]}
          >
            <Input
              prefix={<LockOutlined className="site-form-item-icon" style={{ color: '#409eff' }} />}
              type="password"
              placeholder="密码"
              style={{ 
                background: '#f8f9fa', 
                borderColor: '#e4e7ed', 
                color: '#303133',
                borderRadius: '8px',
                height: '40px'
              }}
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                }
              })
            ]}
          >
            <Input
              prefix={<LockOutlined className="site-form-item-icon" style={{ color: '#409eff' }} />}
              type="password"
              placeholder="确认密码"
              style={{ 
                background: '#f8f9fa', 
                borderColor: '#e4e7ed', 
                color: '#303133',
                borderRadius: '8px',
                height: '40px'
              }}
            />
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              className="register-form-button"
              loading={loading}
              style={{ 
                width: '100%',
                backgroundColor: '#409eff',
                borderColor: '#409eff',
                borderRadius: '8px',
                height: '40px',
                fontSize: '16px',
                fontWeight: '500',
                boxShadow: '0 2px 8px rgba(64, 158, 255, 0.3)'
              }}
            >
              注册
            </Button>
          </Form.Item>
          <Form.Item>
            <Link href="/login" style={{ float: 'right', color: '#1890ff' }}>
              已有账号？立即登录
            </Link>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Register