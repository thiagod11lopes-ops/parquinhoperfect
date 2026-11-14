import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { wipeOperationalDataOnce } from './utils/wipeOperationalData'
import './styles/global.scss'

wipeOperationalDataOnce()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
