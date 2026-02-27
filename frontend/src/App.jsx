import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Layout, Menu, ConfigProvider, Typography } from 'antd'
import {
  DashboardOutlined,
  KeyOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  DatabaseOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

import CredentialManagement from './pages/CredentialManagement'
import AKSKUtilization from './pages/AKSKUtilization'
import TaskManagement from './pages/TaskManagement'
import ResourceOverview from './pages/ResourceOverview'

import { useSelector, useDispatch } from 'react-redux'
import { logout } from './store/authSlice'

const { Header, Sider, Content } = Layout
const { Title } = Typography

function App() {
  const { isAuthenticated } = useSelector(state => state.auth)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 私有路由组件
  const PrivateRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }
    return children
  }

  // 创建内部导航组件
  const NavMenu = () => {
    const navigate = useNavigate();
    
    return (
      <Menu
        theme="light"
        mode="inline"
        defaultSelectedKeys={['dashboard']}
        items={[
          {
            key: 'dashboard',
            icon: <DashboardOutlined style={{ fontSize: '18px' }} />,
            label: '仪表盘',
            path: '/dashboard'
          },
          {
            key: 'credentials',
            icon: <KeyOutlined style={{ fontSize: '18px' }} />,
            label: '凭证管理',
            path: '/credentials'
          },
          {
            key: 'aksk',
            icon: <KeyOutlined style={{ fontSize: '18px' }} />,
            label: 'AKSK 利用',
            path: '/aksk'
          },
          {
            key: 'tasks',
            icon: <AppstoreOutlined style={{ fontSize: '18px' }} />,
            label: '任务管理',
            path: '/tasks'
          },
          {
            key: 'resources',
            icon: <DatabaseOutlined style={{ fontSize: '18px' }} />,
            label: '资源总览',
            path: '/resources'
          },
        ]}
        onClick={({ key, item }) => {
          const path = item.props.path
          if (path) {
            navigate(path)
          }
        }}
        style={{
          borderRight: 'none',
          marginTop: '16px'
        }}
        className="nav-menu"
      />
    );
  };

  // 创建内部头部组件
  const HeaderMenu = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    return (
      <Menu
        theme="light"
        mode="horizontal"
        items={[
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
          }
        ]}
        onClick={({ key }) => {
          if (key === 'logout') {
            // 退出登录逻辑
            dispatch(logout());
            navigate('/login');
          }
        }}
        style={{
          borderBottom: 'none'
        }}
      />
    );
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a2980',
          colorPrimaryHover: '#2638a0',
          colorBgContainer: '#ffffff',
          colorText: '#303133',
          colorBorder: '#e4e7ed',
          colorBgBase: '#f8f9fa',
          fontSize: 14,
          borderRadius: 8,
        },
      }}
    >
      <Router>
        {isAuthenticated ? (
          <Layout style={{ minHeight: '100vh' }}>
            <Sider 
              theme="light" 
              width={260} 
              style={{
                background: '#ffffff', 
                borderRight: '1px solid #e4e7ed', 
                boxShadow: '0 0 20px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
                transform: mounted ? 'translateX(0)' : '-100%',
                opacity: mounted ? 1 : 0
              }}
            >
              <div className="logo" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* 平台图标 */}
                  <div className="logo-icon" style={{
                    width: 60,
                    height: 60,
                    background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(255, 77, 79, 0.3)',
                    marginBottom: '16px'
                  }}>
                    <ThunderboltOutlined style={{ fontSize: 30, color: '#ffffff' }} />
                  </div>
                  <Title level={4} style={{ 
                    color: '#1a2980', 
                    margin: 0, 
                    fontWeight: '600',
                    fontSize: '18px'
                  }}>
                    云红队平台
                  </Title>
                </div>
              </div>
              <NavMenu />
            </Sider>
            <Layout>
              <Header style={{ 
                background: '#ffffff', 
                borderBottom: '1px solid #e4e7ed', 
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
                height: '64px',
                padding: '0 24px',
                transition: 'all 0.3s ease',
                transform: mounted ? 'translateY(0)' : '-50px',
                opacity: mounted ? 1 : 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: '100%' }}>
                  <HeaderMenu />
                </div>
              </Header>
              <Content style={{ 
                padding: '32px', 
                background: '#f8f9fa', 
                minHeight: 'calc(100vh - 64px)',
                transition: 'all 0.3s ease',
                transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                opacity: mounted ? 1 : 0
              }}>
                <Routes>
                  <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

                  <Route path="/credentials" element={<PrivateRoute><CredentialManagement /></PrivateRoute>} />
                  <Route path="/aksk" element={<PrivateRoute><AKSKUtilization /></PrivateRoute>} />
                  <Route path="/tasks" element={<PrivateRoute><TaskManagement /></PrivateRoute>} />
                  <Route path="/resources" element={<PrivateRoute><ResourceOverview /></PrivateRoute>} />
                  <Route path="/*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Content>
            </Layout>
          </Layout>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </Router>
      
      {/* 全局样式 */}
      <style jsx global>{`
        /* 导航菜单样式 */
        .ant-layout-sider .nav-menu {
          background: #ffffff !important;
        }
        
        .ant-layout-sider .nav-menu .ant-menu-item {
          margin: 8px 16px !important;
          border-radius: 8px !important;
          height: 48px !important;
          line-height: 48px !important;
          display: flex !important;
          align-items: center !important;
          font-size: 15px !important;
          transition: all 0.3s ease !important;
          background: transparent !important;
        }
        
        .ant-layout-sider .nav-menu .ant-menu-item:hover {
          background: rgba(255, 77, 79, 0.05) !important;
          color: #303133 !important;
        }
        
        .ant-layout-sider .nav-menu .ant-menu-item-selected {
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3) !important;
        }
        
        .ant-layout-sider .nav-menu .ant-menu-item-selected:hover {
          background: linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%) !important;
          color: #ffffff !important;
        }
        
        .ant-layout-sider .nav-menu .ant-menu-item-selected .anticon {
          color: #ffffff !important;
        }
        
        .ant-layout-sider .nav-menu .ant-menu-item .anticon {
          color: #666666 !important;
        }
        
        .ant-layout-sider .nav-menu .ant-menu-item:hover .anticon {
          color: #ff4d4f !important;
        }
        
        .logo-icon {
          transition: all 0.3s ease !important;
        }
        
        .logo-icon:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 6px 16px rgba(255, 77, 79, 0.4) !important;
        }
        
        .ant-layout-content {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
        }
        
        /* 通用按钮样式 */
        button.ant-btn.ant-btn-primary,
        button.ant-btn.ant-btn-danger {
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
          transition: all 0.3s ease !important;
          border-radius: 8px !important;
        }
        
        button.ant-btn.ant-btn-primary:hover,
        button.ant-btn.ant-btn-danger:hover {
          background: linear-gradient(135deg, #ff7a45 0%, #ff4d4f 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(255, 77, 79, 0.4) !important;
        }
        
        button.ant-btn.ant-btn-primary:active,
        button.ant-btn.ant-btn-danger:active {
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
          transform: translateY(0) !important;
        }
        
        button.ant-btn.ant-btn-primary:focus,
        button.ant-btn.ant-btn-danger:focus {
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2) !important;
        }
        
        /* 确保按钮在所有状态下都保持红色 */
        button.ant-btn.ant-btn-primary:visited,
        button.ant-btn.ant-btn-danger:visited {
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%) !important;
          border-color: transparent !important;
          color: #ffffff !important;
        }
      `}</style>
    </ConfigProvider>
  )
}

export default App
