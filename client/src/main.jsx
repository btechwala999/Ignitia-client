import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import store from './redux/store'

// Set default axios baseURL
axios.defaults.baseURL = 'https://ignitia-1.onrender.com';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
