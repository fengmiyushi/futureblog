<template>
  <el-container style="opacity: 0.9">
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
        <el-input @blur="blur" :rows="5" v-model="messageForm.content" type="textarea" maxlength="100" show-word-limit
                  placeholder="Please enter your comment"></el-input>
      </el-form-item>
      <el-form-item style="text-align: right">
        <el-row>
          <el-col :span="12" style="text-align: left">
            <Emoji @output="output"></Emoji>
          </el-col>
          <el-col :span="12" style="text-align: right">
            <el-button type="primary" @click="publish">Submit</el-button>
          </el-col>
        </el-row>
      </el-form-item>
    </el-form>
    <el-divider v-if="messageList.length>0"><span style="color: #999;font-size: small;">Latest Comments</span></el-divider>
    <comment :comments="messageList" @replyConfirm="commitComment"></comment>
    <pagination v-show="total>0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
                @pagination="getMessageList" />
  </el-container>
</template>


<script>
import {
  mapGetters
} from 'vuex'
import {
  getToken
} from '@/utils/auth'
import {
  cmsListComment,
  cmsAddComment,
} from "@/api/cms/comment"
import comment from './comments.vue'
import Emoji from '@/components/Emoji'
export default {
  name: 'Ipcomment',
  data() {
    return {
      picList: [],
      editing: false,
      messageList: [],
      // userInfo: null,
      message: {
        userId: -1,
        content: ''
      },
      messageForm: {},
      // Total count
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
        blogId: this.$route.query.id,
        userId: null,
        delFlag: null,
        createBy: null,
      },
      messageFormRules: {
        content: [{
          min: 0,
          max: 100,
          message: "Comment content cannot exceed 100 characters!"
        }]
      },
      cursorIndexStart: null, // Cursor selection start position
      cursorIndexEnd: null, // Cursor selection end position
    }
  },
  created() {
    this.getMessageList()
    this.reset();
  },
  updated: function() {
    this.$nextTick(function() {
      // Code that runs only after the entire view is rendered
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
        blogId: this.$route.query.id,
        userId: null,
        delFlag: null,
        createBy: null,
        createTime: null,
        updateBy: null,
        updateTime: null
      };
      this.resetForm("messageForm");
    },
    // Publish comment
    publish() {
      let token = getToken();
      this.$refs.messageFormRef.validate(async valid => {
        if (!valid) return
        if (this.messageForm.content == null || this.messageForm.content == '') {
          this.$modal.msgError("Comment content cannot be empty!");
          return;
        }
        if (token == null || token == '') {
          this.messageForm.createBy = "Anonymous User"
          this.messageForm.type = '0'
        } else {
          this.messageForm.createBy = this.$store.getters.name
          this.messageForm.type = '0'
        }
        cmsAddComment(this.messageForm).then(response => {
          this.$modal.msgSuccess("Comment published successfully");
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
        cmsAddComment(this.messageForm).then(response => {
          this.$modal.msgSuccess("Reply published successfully");
          this.reset();
          this.getMessageList();
        });
      })
    },
    // Get comment list
    async getMessageList() {
      let token = getToken();
      if (token != null && token != '') {
        this.queryParams.createBy = this.$store.getters.name
      }
      cmsListComment(this.queryParams).then(response => {
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
      this.cursorIndexStart = e.srcElement.selectionStart  // Get cursor selection start position when input loses focus
      this.cursorIndexEnd = e.srcElement.selectionEnd  // Get cursor selection end position when input loses focus
    },
    output(val) {
      if (this.cursorIndexStart !== null && this.messageForm.content) {
        // If textarea has focus, insert content at cursor position
        this.messageForm.content = this.messageForm.content.substring(0, this.cursorIndexStart) + val + this.messageForm.content.substring(this.cursorIndexEnd)
      } else {
        // If textarea doesn't have focus, append content at the end
        this.messageForm.content = this.messageForm.content?this.messageForm.content:'' + val
      }
    },
    // Jump to specific position
    to() {
      if (this.$route.query.commentId != null) {
        var toEl = document.getElementById(this.$route.query.commentId);
        if (toEl != null) {
          if (toEl != null && toEl != "") {
            // toEl is the DOM node to scroll to
            let bridgeCms = toEl;
            let bodyTop = document.body;
            let heightCms = 0;
            // Calculate distance from this DOM node to bodyTop
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
