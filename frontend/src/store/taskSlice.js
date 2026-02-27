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

// 异步获取所有任务
export const fetchTasks = createAsyncThunk(
  'task/fetchTasks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/tasks')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || '获取任务失败')
    }
  }
)

// 异步创建任务
export const createTask = createAsyncThunk(
  'task/createTask',
  async (taskData, { rejectWithValue }) => {
    try {
      const response = await api.post('/tasks', taskData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || '创建任务失败')
    }
  }
)

// 异步获取任务详情
export const fetchTaskDetails = createAsyncThunk(
  'task/fetchTaskDetails',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/tasks/${id}`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || '获取任务详情失败')
    }
  }
)

// 异步获取任务结果
export const fetchTaskResults = createAsyncThunk(
  'task/fetchTaskResults',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/tasks/${id}/results`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || '获取任务结果失败')
    }
  }
)

const taskSlice = createSlice({
  name: 'task',
  initialState: {
    tasks: [],
    currentTask: null,
    taskResults: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearCurrentTask: (state) => {
      state.currentTask = null
      state.taskResults = []
    },
  },
  extraReducers: (builder) => {
    // 获取任务列表
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false
        state.tasks = action.payload
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
    
    // 创建任务
    builder
      .addCase(createTask.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false
        state.tasks.push(action.payload)
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
    
    // 获取任务详情
    builder
      .addCase(fetchTaskDetails.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTaskDetails.fulfilled, (state, action) => {
        state.loading = false
        state.currentTask = action.payload
      })
      .addCase(fetchTaskDetails.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
    
    // 获取任务结果
    builder
      .addCase(fetchTaskResults.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTaskResults.fulfilled, (state, action) => {
        state.loading = false
        state.taskResults = action.payload
      })
      .addCase(fetchTaskResults.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { clearError, clearCurrentTask } = taskSlice.actions
export default taskSlice.reducer