import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { login, clearError } from '../store/authSlice'
import { Button, Checkbox, Form, Input, Alert, Card, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { LockOutlined, UserOutlined, ThunderboltOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const Login = () => {
  const dispatch = useDispatch()
  const { isAuthenticated, loading, error } = useSelector(state => state.auth)
  const [form] = Form.useForm()
  const [remember, setRemember] = useState(false)
  const [mounted, setMounted] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // 当认证状态变为 true 时，导航到仪表盘
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (values) => {
    dispatch(clearError())
    dispatch(login({
      username: values.username,
      password: values.password
    }))
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)
        `,
        zIndex: 0
      }} />
      
      <Card 
        style={{
          width: 440,
          background: 'rgba(255, 255, 255, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          borderRadius: '20px',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)',
          zIndex: 1,
          transform: mounted ? 'translateY(0)' : 'translateY(30px)',
          opacity: mounted ? 1 : 0,
          transition: 'all 0.5s ease'
        }}
      >
        <div style={{
          textAlign: 'center',
          padding: '40px 30px 30px',
        }}>
          {/* 平台图标 */}
          <div style={{
            width: 80,
            height: 80,
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)',
            borderRadius: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 8px 24px rgba(255, 77, 79, 0.3)'
          }}>
            <ThunderboltOutlined style={{ fontSize: 40, color: '#ffffff' }} />
          </div>
          
          <Title level={3} style={{ color: '#1a2980', marginBottom: 8, fontWeight: '600' }}>云安全评估平台</Title>
          <Text style={{ color: '#666', fontSize: '16px' }}>专业云安全管理平台</Text>
        </div>
        
        <div style={{ padding: '0 30px 40px' }}>
          {error && (
            <Alert 
              message="登录失败" 
              description={error} 
              type="error" 
              showIcon 
              style={{ marginBottom: 24, borderRadius: '8px' }}
              onClose={() => dispatch(clearError())}
            />
          )}
          
          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            initialValues={{ remember: false }}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input 
                prefix={<UserOutlined className="site-form-item-icon" style={{ color: '#1a2980' }} />} 
                placeholder="用户名"
                size="large"
                style={{
                  background: 'rgba(248, 249, 250, 0.8)',
                  borderColor: 'rgba(26, 41, 128, 0.2)',
                  color: '#303133',
                  borderRadius: '12px',
                  height: '50px',
                  fontSize: '16px',
                  transition: 'all 0.3s ease'
                }}
              />
            </Form.Item>
            
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input
                prefix={<LockOutlined className="site-form-item-icon" style={{ color: '#1a2980' }} />}
                type="password"
                placeholder="密码"
                size="large"
                style={{
                  background: 'rgba(248, 249, 250, 0.8)',
                  borderColor: 'rgba(26, 41, 128, 0.2)',
                  color: '#303133',
                  borderRadius: '12px',
                  height: '50px',
                  fontSize: '16px',
                  transition: 'all 0.3s ease'
                }}
              />
            </Form.Item>
            
            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox 
                    onChange={(e) => setRemember(e.target.checked)}
                    style={{ color: '#666', fontSize: '14px' }}
                  >
                    记住我
                  </Checkbox>
                </Form.Item>
              </div>
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                size="large"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)',
                  borderColor: 'transparent',
                  borderRadius: '12px',
                  height: '50px',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 16px rgba(255, 77, 79, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                className="custom-login-button"
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Card>
      
      {/* 全局样式 */}
      <style jsx global>{`
        .site-form-item-icon {
          font-size: 18px;
        }
        
        .ant-input:focus {
          border-color: #ff4d4f !important;
          box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.1) !important;
        }
        
        .custom-login-button {
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
        }
        
        .custom-login-button:hover {
          background: linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(255, 77, 79, 0.4) !important;
        }
        
        .custom-login-button:active {
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
          transform: translateY(0) !important;
        }
        
        .custom-login-button:focus {
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2) !important;
        }
      `}</style>
    </div>
  )
}

export default Login