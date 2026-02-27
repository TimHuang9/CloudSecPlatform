import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

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

// 异步获取所有凭证
export const fetchCredentials = createAsyncThunk(
  'credential/fetchCredentials',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/credentials')
      // 转换字段名：下划线命名转换为驼峰命名
      const transformedCredentials = response.data.map(credential => ({
        id: credential.id,
        name: credential.name,
        cloudProvider: credential.cloud_provider,
        accessKey: credential.access_key,
        secretKey: credential.secret_key,
        description: credential.description
      }))
      return transformedCredentials
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || '获取凭证失败')
    }
  }
)

// 异步创建凭证
export const createCredential = createAsyncThunk(
  'credential/createCredential',
  async (credentialData, { rejectWithValue }) => {
    try {
      // 转换字段名：驼峰命名转换为下划线命名
      const transformedData = {
        cloud_provider: credentialData.cloudProvider,
        access_key: credentialData.accessKey,
        secret_key: credentialData.secretKey,
        name: credentialData.name,
        description: credentialData.description
      }
      const response = await api.post('/credentials', transformedData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || '创建凭证失败')
    }
  }
)

// 异步更新凭证
export const updateCredential = createAsyncThunk(
  'credential/updateCredential',
  async ({ id, credentialData }, { rejectWithValue }) => {
    try {
      // 转换字段名：驼峰命名转换为下划线命名
      const transformedData = {
        cloud_provider: credentialData.cloudProvider,
        access_key: credentialData.accessKey,
        secret_key: credentialData.secretKey,
        name: credentialData.name,
        description: credentialData.description
      }
      const response = await api.put(`/credentials/${id}`, transformedData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || '更新凭证失败')
    }
  }
)

// 异步删除凭证
export const deleteCredential = createAsyncThunk(
  'credential/deleteCredential',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/credentials/${id}`)
      return id
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || '删除凭证失败')
    }
  }
)

const credentialSlice = createSlice({
  name: 'credential',
  initialState: {
    credentials: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // 获取凭证
    builder
      .addCase(fetchCredentials.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCredentials.fulfilled, (state, action) => {
        state.loading = false
        state.credentials = action.payload
      })
      .addCase(fetchCredentials.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
    
    // 创建凭证
    builder
      .addCase(createCredential.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createCredential.fulfilled, (state, action) => {
        state.loading = false
        // 转换字段名：下划线命名转换为驼峰命名
        const transformedCredential = {
          id: action.payload.id,
          name: action.payload.name,
          cloudProvider: action.payload.cloud_provider,
          accessKey: action.payload.access_key,
          secretKey: action.payload.secret_key,
          description: action.payload.description
        }
        state.credentials.push(transformedCredential)
      })
      .addCase(createCredential.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
    
    // 更新凭证
    builder
      .addCase(updateCredential.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateCredential.fulfilled, (state, action) => {
        state.loading = false
        // 转换字段名：下划线命名转换为驼峰命名
        const transformedCredential = {
          id: action.payload.id,
          name: action.payload.name,
          cloudProvider: action.payload.cloud_provider,
          accessKey: action.payload.access_key,
          secretKey: action.payload.secret_key,
          description: action.payload.description
        }
        const index = state.credentials.findIndex(c => c.id === transformedCredential.id)
        if (index !== -1) {
          state.credentials[index] = transformedCredential
        }
      })
      .addCase(updateCredential.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
    
    // 删除凭证
    builder
      .addCase(deleteCredential.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteCredential.fulfilled, (state, action) => {
        state.loading = false
        state.credentials = state.credentials.filter(c => c.id !== action.payload)
      })
      .addCase(deleteCredential.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { clearError } = credentialSlice.actions
export default credentialSlice.reducer
