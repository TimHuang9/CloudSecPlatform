import React from 'react'
import { render } from '@testing-library/react'
import App from './App'

// This is a simple test to check if App renders without crashing
test('App renders without crashing', () => {
  const { container } = render(<App />)
  expect(container).toBeTruthy()
})
