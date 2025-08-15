<template>
  <el-row :gutter="20">
    <el-col :sm="5" class="hidden-xs-only" style="opacity:0;">Left placeholder</el-col>
    <el-col :xs="24" :sm="14">
      <el-container style="opacity: 0.9" class="message">
        <el-card class="animate__animated animate__fadeInLeft publish">
          <div class="author">
            <el-avatar v-if="token==null" icon="el-icon-user-solid" size="large">
              <!-- style="background-color: #666" -->
            </el-avatar>
            <el-avatar v-else :src="avatar" size="large"></el-avatar>
            <div>
              <div class="nkname">
                <span class="name" v-if="token==null">Anonymous User</span>
                <span class="name" v-else>{{name}} </span>
              </div>
            </div>
          </div>
          <el-form :model="messageForm" :rules="messageFormRules" ref="messageFormRef">
            <el-form-item prop="content">
              <el-input @blur="blur" :rows="5" v-model="messageForm.content" type="textarea" maxlength="100"
                        show-word-limit placeholder="Please enter your message"></el-input>
            </el-form-item>
            <el-form-item>
              <el-row>
                <el-col :span="12" style="text-align: left">
                  <Emoji @output="output"></Emoji>
                </el-col>
                <el-col :span="12" style="text-align: right">
                  <el-button type="primary" @click="publish">Post Message</el-button>
                </el-col>
              </el-row>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card v-if="messageList.length>0" class="animate__animated animate__fadeInLeft">
          <comment :comments="messageList" @replyConfirm="commitComment"></comment>
          <pagination v-show="total>0" :total="total" :page.sync="queryParams.pageNum"
                      :limit.sync="queryParams.pageSize" @pagination="getMessageList" />
        </el-card>
      </el-container>
    </el-col>
    <el-col :sm="5" class="hidden-xs-only" style="opacity:0;">Right placeholder</el-col>
    <!-- Back to top button -->
    <el-backtop :bottom="60">
      <div style="{
            height: 50px;
            width: 50px;
            background-color: rgba(240,239,241,1);
            box-shadow: 0 0 6px rgba(0,0,0, .12);
            text-align: center;
            line-height: 40px;
            border-radius:2px;
            color: #1989fa;
          }">
        <svg-icon icon-class="top" />
      </div>
    </el-backtop>
  </el-row>
</template>

<script>
import {
  mapGetters
} from 'vuex'
import {
  getToken
} from '@/utils/auth'
import {
  cmsListMessage,
  cmsAddMessage,
} from "@/api/cms/message"
import comment from './messages/messages.vue'
import Emoji from '@/components/Emoji'
export default {
  name: 'message',
  data() {
    return {
      picList: [],
      editing: false,
      messageList: [],
      message: {
        userId: -1,
        content: ''
      },
      messageForm: {},
      // Total number of items
      total: 0,
      // Query parameters
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        parentId: null,
        mainId: null,
        likeNum: null,
        content: null,
        type: null,
        blogId: null,
        userId: null,
        delFlag: null,
        createBy: null,
      },
      messageFormRules: {
        content: [{
          min: 0,
          max: 100,
          message: "Message content cannot exceed 100 characters!"
        }]
      },
      cursorIndexStart: null,// Cursor selection start position
      cursorIndexEnd: null,// Cursor selection end position
    }
  },
  created() {
    this.getMessageList()
    this.reset();
  },
  updated: function() {
    this.$nextTick(function() {
      // Code that will run only after the entire view has been rendered
      this.to();
    })
  },
  computed: {
    ...mapGetters([
      'token',
      'avatar',
      'name'
    ]),
  },
  components: {
    comment,
    Emoji
  },
  methods: {
    // Form reset
    reset() {
      this.messageForm = {
        id: null,
        parentId: null,
        mainId: null,
        likeNum: null,
        content: null,
        type: null,
        blogId: null,
        userId: null,
        delFlag: null,
        createBy: null,
        createTime: null,
        updateBy: null,
        updateTime: null
      };
      this.resetForm("messageForm");
    },
    // Publish message
    publish() {
      let token = getToken();
      this.$refs.messageFormRef.validate(async valid => {
        if (!valid) return
        if (this.messageForm.content == null || this.messageForm.content == '') {
          this.$modal.msgError("Message content cannot be empty!");
          return;
        }
        if (token == null || token == '') {
          this.messageForm.createBy = "Anonymous User"
          this.messageForm.type = '0'
        } else {
          this.messageForm.createBy = this.$store.getters.name
          this.messageForm.type = '0'
        }
        cmsAddMessage(this.messageForm).then(response => {
          this.$modal.msgSuccess("Message published successfully");
          this.reset();
          this.getMessageList();
        });
      })
    },
    /**
     * Submit comment
     */
    commitComment(value) {
      this.reset();
      this.messageForm.content = value.inputComment;
      this.messageForm.parentId = value.id;
      let token = getToken();
      this.$refs.messageFormRef.validate(async valid => {
        if (!valid) return
        if (this.messageForm.content == null || this.messageForm.content == '') {
          this.$modal.msgError("Comment content cannot be empty!");
          return;
        }
        if (token == null || token == '') {
          this.messageForm.createBy = "Anonymous User"
          this.messageForm.type = '1'
        } else {
          this.messageForm.createBy = this.$store.getters.name
          this.messageForm.type = '1'
        }
        cmsAddMessage(this.messageForm).then(response => {
          this.$modal.msgSuccess("Comment published successfully");
          this.reset();
          this.getMessageList();
        });
      })
    },
    // Get message list
    async getMessageList() {
      let token = getToken();
      if (token != null && token != '') {
        this.queryParams.createBy = this.$store.getters.name
      }
      cmsListMessage(this.queryParams).then(response => {
        for (let i = 0; i < response.rows.length; i++) {
          let mesInfo = response.rows[i];
          if (mesInfo.avatar != null && mesInfo.avatar != "") {
            response.rows[i].avatar = process.env.VUE_APP_BASE_API + mesInfo.avatar
          }
          if (mesInfo.children != null && mesInfo.children != "") {
            for (let j = 0; j < response.rows[i].children.length; j++) {
              let children = response.rows[i].children;
              if (children.avatar != null && children.avatar != "") {
                response.rows[i].children[j].avatar = process.env.VUE_APP_BASE_API + children.avatar
              }
            };
          }
        };
        this.messageList = response.rows;
        this.total = response.total;
      });
    },
    blur(e){
      this.cursorIndexStart = e.srcElement.selectionStart  // Get cursor start position when textarea loses focus
      this.cursorIndexEnd = e.srcElement.selectionEnd  // Get cursor end position when textarea loses focus
    },
    output(val) {
      if (this.cursorIndexStart !== null && this.messageForm.content) {
        // If textarea has focus, insert content at cursor position
        this.messageForm.content = this.messageForm.content.substring(0, this.cursorIndexStart) + val + this.messageForm.content.substring(this.cursorIndexEnd)
      } else {
        // If textarea doesn't have focus, append content to end
        this.messageForm.content = (this.messageForm.content ? this.messageForm.content : '') + val
      }
    },
    // Jump to specific position
    to() {
      if (this.$route.query.id != null) {
        var toEl = document.getElementById(this.$route.query.id);
        if (toEl != null) {
          if (toEl != null && toEl != "") {
            // toEl is the DOM node to jump to
            let bridgeCms = toEl;
            let bodyTop = document.body;
            let heightCms = 0;
            // Calculate distance from DOM node to body top
            do {
              heightCms += bridgeCms.offsetTop;
              bridgeCms = bridgeCms.offsetParent;
            } while (bridgeCms !== bodyTop)
            // Scroll to position
            window.scrollTo({
              top: heightCms,
              behavior: 'smooth'
            })
          }
        }
      }
    },

  },
}
</script>

<style scoped>
.el-container {
  display: block;
}

.publish {
  margin-bottom: 20px;
}

.author {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  margin-bottom: 20px;
}

.comment {
  border-bottom: 1px dashed #ccc;
  margin: 30px 0;
  display: flex;
}

.content {
  text-align: left;
  font-size: 14px;
  flex-grow: 1;
}

.nkname {
  margin: 10px;
  max-width: 530px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.date {
  color: #999;
  margin-left: 10px;
}

.reply {
  margin-left: 10px;
}
</style>
