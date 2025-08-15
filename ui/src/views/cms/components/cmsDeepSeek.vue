<template>
  <div class="chat-container">
    <!-- 左侧聊天历史侧边栏 -->
    <div class="sidebar">
      <div class="logo-container">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>DeepSeek</span>
        </div>
      </div>

      <button class="new-chat-btn" @click="startNewChat">
        <span>+</span> New Chat
      </button>

      <div class="chat-history">
        <div
          v-for="(chat, index) in chatHistory"
          :key="index"
          class="chat-item"
          :class="{ active: currentChatIndex === index }"
          @click="loadChat(index)"
        >
          <div class="chat-preview">
            {{ chat.title || `Chat ${index + 1}` }}
          </div>
          <button class="delete-chat" @click.stop="deleteChat(index)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="api-key-settings">
        <input
          type="password"
          v-model="apiKey"
          placeholder="Enter API Key"
          @change="saveApiKey"
        >
        <p class="api-key-hint">No API key? <a href="https://www.deepseek.com/" target="_blank">Get one</a></p>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="main-chat">
      <div class="messages" ref="messagesContainer">
        <!-- 欢迎信息 -->
        <div v-if="currentChat.messages.length === 0" class="welcome-message">
          <div class="welcome-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2>Welcome to DeepSeek Chat</h2>
          <p>How can I assist you today?</p>
        </div>

        <!-- 消息列表 -->
        <div
          v-for="(message, index) in currentChat.messages"
          :key="index"
          class="message"
          :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }"
          :data-message-id="index"
        >
          <div class="avatar">
            <svg v-if="message.role === 'user'" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="7" r="4" stroke="#9ca3af" stroke-width="2"/>
            </svg>
            <svg v-else width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="sender">{{ message.role === 'user' ? 'You' : 'DeepSeek' }}</span>
              <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-text" v-html="formatMessage(message.content)"></div>
          </div>
        </div>

        <!-- 加载指示器 -->
        <div v-if="isLoading" class="message ai-message">
          <div class="avatar">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#10a37f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="message-content">
            <div class="loading-indicator">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <textarea
          v-model="userInput"
          placeholder="Type your message here..."
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift="handleShiftEnter"
          ref="messageInput"
          :disabled="isLoading"
        ></textarea>
        <button @click="sendMessage" :disabled="!userInput.trim() || isLoading" class="send-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OptimizedDeepSeekChat',
  data() {
    return {
      apiKey: '',
      chatHistory: [],
      currentChatIndex: -1,
      userInput: '',
      isLoading: false,
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      abortController: null
    }
  },
  computed: {
    currentChat() {
      if (this.currentChatIndex >= 0 && this.currentChatIndex < this.chatHistory.length) {
        return this.chatHistory[this.currentChatIndex]
      }
      return {messages: []}
    }
  },
  mounted() {
    // 加载保存的API密钥和聊天历史
    this.loadApiKey();
    this.loadChatHistory();

    // 如果没有聊天历史，创建一个新聊天
    if (this.chatHistory.length === 0) {
      this.startNewChat();
    }

    // 自动聚焦到输入框
    this.$nextTick(() => {
      this.focusInput();
    });
  },
  methods: {
    // 加载API密钥
    loadApiKey() {
      const savedKey = localStorage.getItem('deepseek_api_key');
      if (savedKey) {
        this.apiKey = savedKey;
      }
    },

    // 保存API密钥
    saveApiKey() {
      if (this.apiKey) {
        localStorage.setItem('deepseek_api_key', this.apiKey);
      }
    },

    // 加载聊天历史
    loadChatHistory() {
      const savedHistory = localStorage.getItem('deepseek_chat_history');
      if (savedHistory) {
        try {
          this.chatHistory = JSON.parse(savedHistory);
          this.currentChatIndex = this.chatHistory.length - 1;
        } catch (e) {
          console.error('Failed to parse chat history:', e);
          this.chatHistory = [];
        }
      }
    },

    // 保存聊天历史
    saveChatHistory() {
      localStorage.setItem('deepseek_chat_history', JSON.stringify(this.chatHistory));
    },

    // 开始新聊天
    startNewChat() {
      const newChat = {
        title: '',
        messages: []
      };
      this.chatHistory.push(newChat);
      this.currentChatIndex = this.chatHistory.length - 1;
      this.saveChatHistory();
      this.focusInput();
    },

    // 加载指定聊天
    loadChat(index) {
      this.currentChatIndex = index;
      this.scrollToBottom();
      this.focusInput();
    },

    // 删除聊天
    deleteChat(index) {
      if (confirm('Are you sure you want to delete this chat?')) {
        this.chatHistory.splice(index, 1);

        // 调整当前聊天索引
        if (this.currentChatIndex === index) {
          this.currentChatIndex = this.chatHistory.length > 0 ? 0 : -1;
        } else if (this.currentChatIndex > index) {
          this.currentChatIndex--;
        }

        // 如果没有聊天了，创建一个新的
        if (this.chatHistory.length === 0) {
          this.startNewChat();
        } else {
          this.saveChatHistory();
        }
      }
    },

    // 处理Shift+Enter换行
    handleShiftEnter(e) {
      e.preventDefault();
      this.userInput += '\n';
    },

    // 发送消息
    async sendMessage() {
      if (!this.userInput.trim() || this.isLoading) return;
      if (!this.apiKey) {
        alert('Please enter your DeepSeek API key first');
        return;
      }

      // 添加用户消息
      const userMessage = {
        role: 'user',
        content: this.userInput.trim(),
        timestamp: new Date().toISOString()
      };
      this.currentChat.messages.push(userMessage);

      // 设置聊天标题（首次消息）
      if (this.currentChat.messages.length === 1) {
        this.currentChat.title = this.userInput.trim().substring(0, 40);
        if (this.userInput.trim().length > 40) {
          this.currentChat.title += '...';
        }
      }

      // 清空输入框并禁用
      this.userInput = '';
      this.isLoading = true;

      // 添加一个临时的AI消息对象用于流式显示
      const aiMessageIndex = this.currentChat.messages.length;
      this.currentChat.messages.push({
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      });

      // 保存聊天历史
      this.saveChatHistory();
      this.scrollToBottom();

      try {
        // 创建新的AbortController用于取消请求
        this.abortController = new AbortController();

        // 调用API获取流式响应
        await this.callDeepSeekAPIWithStreaming(aiMessageIndex);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('API error:', error);
          this.currentChat.messages[aiMessageIndex].content =
            `An error occurred: ${error.message || 'Please try again later'}`;
        }
      } finally {
        this.isLoading = false;
        this.abortController = null;
        this.saveChatHistory();
        this.scrollToBottom();
        this.focusInput();
      }
    },

    // 调用DeepSeek API并处理流式响应
    async callDeepSeekAPIWithStreaming(aiMessageIndex) {
      const messages = this.currentChat.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: messages,
          stream: true,  // 启用流式响应
          temperature: 0.7,
          max_tokens: 2000
        }),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`API request failed (${response.status}): ${response.statusText}`);
      }

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const {done, value} = await reader.read();

        if (done) {
          break;
        }

        // 解析SSE格式的响应
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          // 移除"data: "前缀
          const data = line.replace(/^data: /, '');

          // 检查是否结束
          if (data === '[DONE]') {
            return;
          }

          try {
            // 解析JSON并提取内容
            const json = JSON.parse(data);
            if (json.choices && json.choices[0] && json.choices[0].delta) {
              const content = json.choices[0].delta.content;
              if (content) {
                // 逐字添加到AI消息内容
                this.currentChat.messages[aiMessageIndex].content += content;
                this.scrollToBottom();
              }
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e);
          }
        }
      }
    },

    // 取消当前请求
    cancelRequest() {
      if (this.abortController) {
        this.abortController.abort();
        this.isLoading = false;
      }
    },

    // 格式化消息内容（支持简单的Markdown）
    formatMessage(content) {
      if (!content) return '';

      // 处理换行
      let formatted = content.replace(/\n/g, '<br>');

      // 处理粗体
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // 处理斜体
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // 处理代码
      formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');

      // 处理链接
      formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

      return formatted;
    },

    // 格式化时间戳
    formatTime(timestamp) {
      if (!timestamp) return '';

      const date = new Date(timestamp);
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    },

    // 滚动到最新消息
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },

    // 聚焦到输入框
    focusInput() {
      this.$nextTick(() => {
        const input = this.$refs.messageInput;
        if (input) {
          input.focus();
        }
      });
    }
  },
  watch: {
    chatHistory: {
      handler() {
        this.saveChatHistory();
      },
      deep: true
    }
  },
  beforeDestroy() {
    // 组件销毁时取消任何未完成的请求
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #374151;
  background-color: #f9fafb;
}

/* 侧边栏样式 */
.sidebar {
  width: 280px;
  background-color: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 90%;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.logo-container {
  padding: 1.2rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  font-size: 1.1rem;
  color: #10a37f;
}

.new-chat-btn {
  margin: 1rem;
  padding: 0.75rem 1rem;
  background-color: #10a37f;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  gap: 0.5rem;
}

.new-chat-btn:hover {
  background-color: #0d8c6d;
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.new-chat-btn:active {
  transform: translateY(0);
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.chat-item {
  padding: 0.75rem 1rem;
  margin: 0.25rem 0;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.chat-item:hover {
  background-color: #f3f4f6;
}

.chat-item.active {
  background-color: #e8f5e9;
  color: #10a37f;
  font-weight: 500;
}

.chat-preview {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 1rem;
}

.delete-chat {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.chat-item:hover .delete-chat {
  opacity: 1;
}

.delete-chat:hover {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.api-key-settings {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.api-key-settings input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  transition: border-color 0.2s ease;
}

.api-key-settings input:focus {
  outline: none;
  border-color: #10a37f;
  box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.2);
}

.api-key-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #6b7280;
  text-align: right;
}

.api-key-hint a {
  color: #10a37f;
  text-decoration: none;
}

.api-key-hint a:hover {
  text-decoration: underline;
}

/* 主聊天区域样式 */
.main-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 90%;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background-color: #ffffff;
  scroll-behavior: smooth;
}

.messages::-webkit-scrollbar {
  width: 6px;
}

.messages::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.messages::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 10px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 欢迎消息 */
.welcome-message {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.welcome-icon {
  margin-bottom: 1.5rem;
  opacity: 0.7;
}

.welcome-message h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
}

/* 消息样式 */
.message {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: flex-start;
  animation: fadeIn 0.3s ease forwards;
  max-width: 80%;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-message {
  margin-left: 57%;
}

.avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  margin-right: 0.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-message .avatar {
  margin-left: 0.75rem;
  margin-right: 0;
  order: 2;
}

.message-content {
  padding: 0.875rem 1.125rem;
  border-radius: 0.75rem;
  position: relative;
  max-width: calc(100% - 56px);
}

.ai-message .message-content {
  background-color: #f0fdf4;
  border: 1px solid #dcfce7;
  color: #134e4a;
}

.user-message .message-content {
  background-color: #eff6ff;
  border: 1px solid #dbeafe;
  color: #1e40af;
}

.message-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
}

.sender {
  font-weight: 600;
}

.timestamp {
  margin-left: 0.75rem;
  font-size: 0.75rem;
  opacity: 0.7;
}

.message-text {
  line-height: 1.6;
  font-size: 0.9375rem;
}

.message-text code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.875rem;
}

.message-text a {
  color: #10a37f;
  text-decoration: none;
}

.message-text a:hover {
  text-decoration: underline;
}

/* 加载指示器 */
.loading-indicator {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.dot {
  width: 0.75rem;
  height: 0.75rem;
  background-color: #10a37f;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 输入区域样式 */
.input-area {
  padding: 1rem 2rem;
  border-top: 1px solid #e5e7eb;
  background-color: #ffffff;
  display: flex;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.input-area textarea {
  flex: 1;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  resize: none;
  font-family: inherit;
  font-size: 0.9375rem;
  min-height: 4rem;
  max-height: 12rem;
  outline: none;
  transition: all 0.2s ease;
  line-height: 1.6;
}

.input-area textarea:focus {
  border-color: #10a37f;
  box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.2);
}

.input-area textarea:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
  opacity: 0.7;
}

.send-button {
  margin-left: 1rem;
  background-color: #10a37f;
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.send-button:hover:not(:disabled) {
  background-color: #0d8c6d;
  transform: translateY(-1px);
}

.send-button:active:not(:disabled) {
  transform: translateY(0);
}

.send-button:disabled {
  background-color: #d1d5db;
  cursor: not-allowed;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .sidebar {
    width: 80px;
  }

  .logo span, .new-chat-btn span, .chat-preview, .api-key-settings {
    display: none;
  }

  .new-chat-btn {
    justify-content: center;
    padding: 0.75rem;
  }

  .new-chat-btn span {
    display: none;
  }

  .message {
    max-width: 90%;
  }

  .messages {
    padding: 1rem;
  }

  .input-area {
    padding: 0.75rem 1rem;
  }
}
</style>
