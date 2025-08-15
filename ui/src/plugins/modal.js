import { Message, MessageBox, Notification, Loading } from 'element-ui'

let loadingInstance;

export default {
  // Information message
  msg(content) {
    Message.info(content)
  },
  // Error message
  msgError(content) {
    Message.error(content)
  },
  // Success message
  msgSuccess(content) {
    Message.success(content)
  },
  // Warning message
  msgWarning(content) {
    Message.warning(content)
  },
  // Pop-up alert
  alert(content) {
    MessageBox.alert(content, "System Notification")
  },
  // Error alert
  alertError(content) {
    MessageBox.alert(content, "System Notification", { type: 'error' })
  },
  // Success alert
  alertSuccess(content) {
    MessageBox.alert(content, "System Notification", { type: 'success' })
  },
  // Warning alert
  alertWarning(content) {
    MessageBox.alert(content, "System Notification", { type: 'warning' })
  },
  // Notification
  notify(content) {
    Notification.info(content)
  },
  // Error notification
  notifyError(content) {
    Notification.error(content);
  },
  // Success notification
  notifySuccess(content) {
    Notification.success(content)
  },
  // Warning notification
  notifyWarning(content) {
    Notification.warning(content)
  },
  // Confirmation dialog
  confirm(content) {
    return MessageBox.confirm(content, "System Confirmation", {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: "warning",
    })
  },
  // Input prompt
  prompt(content) {
    return MessageBox.prompt(content, "System Prompt", {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      type: "warning",
    })
  },
  // Open loading mask
  loading(content) {
    loadingInstance = Loading.service({
      lock: true,
      text: content,
      spinner: "el-icon-loading",
      background: "rgba(0, 0, 0, 0.7)",
    })
  },
  // Close loading mask
  closeLoading() {
    loadingInstance.close();
  }
}

