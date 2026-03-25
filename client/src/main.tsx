import React from 'react'
import ReactDOM from 'react-dom/client'
import { ReactFlowProvider } from 'reactflow'
import App from './App'
import './style.css'
import 'reactflow/dist/style.css'

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  </React.StrictMode>,
)
