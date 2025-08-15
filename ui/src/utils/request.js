import axios from 'axios'
import { Notification, MessageBox, Message, Loading } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'
import errorCode from '@/utils/errorCode'
import { tansParams, blobValidate } from "@/utils/ruoyi";
import { saveAs } from 'file-saver'

let downloadLoadingInstance;

axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8'
// Create axios instance
const service = axios.create({
  // Base URL for all requests
  baseURL: process.env.VUE_APP_BASE_API,
  // Timeout in milliseconds
  timeout: 10000
})

// Request interceptor
service.interceptors.request.use(config => {
  // Check if token is required
  const isToken = (config.headers || {}).isToken === false
  if (getToken() && !isToken) {
    config.headers['Authorization'] = 'Bearer ' + getToken() // Add custom token to request headers
  }
  // Map params for GET requests
  if (config.method === 'get' && config.params) {
    let url = config.url + '?' + tansParams(config.params);
    url = url.slice(0, -1);
    config.params = {};
    config.url = url;
  }
  return config
}, error => {
  console.log(error)
  Promise.reject(error)
})

// Response interceptor
service.interceptors.response.use(res => {
    // Default to success if no status code is set
    const code = res.data.code || 200;
    // Get error message
    const msg = errorCode[code] || res.data.msg || errorCode['default']
    // Return binary data directly
    if(res.request.responseType ===  'blob' || res.request.responseType ===  'arraybuffer'){
      return res.data
    }
    if (code === 401) {
      MessageBox.confirm('Your login session has expired. You can stay on this page or log in again.', 'System Notification', {
          confirmButtonText: 'Log in again',
          cancelButtonText: 'Cancel',
          type: 'warning'
        }
      ).then(() => {
        store.dispatch('LogOut').then(() => {
          location.href = '/index';
        })
      }).catch(() => {});
      return Promise.reject('Invalid session or session expired. Please log in again.')
    } else if (code === 500) {
      Message({
        message: msg,
        type: 'error'
      })
      return Promise.reject(new Error(msg))
    } else if (code !== 200) {
      Notification.error({
        title: msg
      })
      return Promise.reject('error')
    } else {
      return res.data
    }
  },
  error => {
    console.log('err' + error)
    let { message } = error;
    if (message == "Network Error") {
      message = "Backend interface connection failed";
    }
    else if (message.includes("timeout")) {
      message = "System interface request timed out";
    }
    else if (message.includes("Request failed with status code")) {
      message = "System interface " + message.substr(message.length - 3) + " error";
    }
    Message({
      message: message,
      type: 'error',
      duration: 5 * 1000
    })
    return Promise.reject(error)
  }
)

// Universal download method
export function download(url, params, filename) {
  downloadLoadingInstance = Loading.service({ text: "Downloading data, please wait", spinner: "el-icon-loading", background: "rgba(0, 0, 0, 0.7)", })
  return service.post(url, params, {
    transformRequest: [(params) => { return tansParams(params) }],
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob'
  }).then(async (data) => {
    const isLogin = await blobValidate(data);
    if (isLogin) {
      const blob = new Blob([data])
      saveAs(blob, filename)
    } else {
      const resText = await data.text();
      const rspObj = JSON.parse(resText);
      const errMsg = errorCode[rspObj.code] || rspObj.msg || errorCode['default']
      Message.error(errMsg);
    }
    downloadLoadingInstance.close();
  }).catch((r) => {
    console.error(r)
    Message.error('An error occurred while downloading the file. Please contact the administrator!')
    downloadLoadingInstance.close();
  })
}

export default service

