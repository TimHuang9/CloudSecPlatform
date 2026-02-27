import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import credentialReducer from './credentialSlice'
import taskReducer from './taskSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    credential: credentialReducer,
    task: taskReducer,
  },
})

export default store