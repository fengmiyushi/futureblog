<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" :inline="true" v-show="showSearch" label-width="68px"
             style="padding-left: 20px;">
      <el-form-item label="Commenter" prop="content" v-if="isAdmin">
        <el-input v-model="queryParams.createBy" placeholder="Please enter commenter" clearable size="small"
                  @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item label="Comment Content" prop="content">
        <el-input v-model="queryParams.content" placeholder="Please enter comment content" clearable size="small"
                  @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">Search</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">Reset</el-button>
      </el-form-item>
    </el-form>

    <el-card>
      <div class="el-card__header" style="text-align: left;padding: 0">
        <h3 style="float: left;margin: 0;">Comment List</h3>
        <right-toolbar style="float: right;" :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
      </div>
      <ul style="padding: 0;" class="comment-list">
        <li v-show="messageList.length==0"
            style="text-align: center;border-bottom: 1px dashed #ccc;margin: 10px 0;list-style-type:none;">
          <span class="el-table__empty-text">No data available</span>
        </li>
        <li class="comment" v-for="mes in messageList" :key="mes.id">
          <el-avatar v-if="mes.avatar!==''&&mes.avatar!=null" :src="mes.avatar"></el-avatar>
          <el-avatar v-else icon="el-icon-user-solid"></el-avatar>
          <div class="content">
            <div style="display: flex;justify-content: space-between;width: 100%">
              <div class="nkname">
                <span class="name">{{mes.createBy}} </span>
                <span class="date">{{mes.createTime}}</span>
                <span v-show="mes.type=='0'" class="rp">left you a message</span>
                <span v-show="mes.type=='1'" class="rp">replied to</span>
                <span v-show="mes.type=='1'" class="pcreateBy">{{mes.pcreateBy}}</span>
                <span v-show="mes.type=='1'" class="rp">'s comment</span>
              </div>
              <div class="op">
                <span @click="getBlogInfo(mes.id)" class="blog">View</span>
                <span> | </span>
                <el-button type="text" @click="handleAdd(mes)" v-hasPermi="['cms:message:add']">Reply</el-button>
                <span v-show="!isAdmin&&mes.createBy!=name" style="margin-right: 39.43px;"></span>
                <span v-show="!(!isAdmin&&mes.createBy!=name)"> | </span>
                <span v-show="!(!isAdmin&&mes.createBy!=name)" class="del" @click="handleDelete(mes)">Delete</span>
              </div>
            </div>
            <p class="reply">{{mes.content}}</p>
          </div>
        </li>
      </ul>
    </el-card>

    <pagination v-show="total>0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
                @pagination="getList" />

    <!-- Add or edit message dialog -->
    <el-dialog :title="title" :visible.sync="open" width="500px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-input @blur="blur" v-model="form.content" type="textarea" maxlength="100" show-word-limit :placeholder="toName" />
      </el-form>
      <div slot="footer" class="dialog-footer">
        <div style="float: left;">
          <Emoji @output="output"></Emoji>
        </div>
        <el-button type="primary" @click="submitForm">Confirm</el-button>
        <el-button @click="cancel">Cancel</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  mapGetters
} from 'vuex'
import {
  listMessage,
  getMessage,
  delMessage,
  addMessage,
  updateMessage
} from "@/api/cms/message";
import {
  Loading
} from 'element-ui';
import Emoji from '@/components/Emoji'

export default {
  name: "Message",
  components: {
    Emoji
  },
  data() {
    return {
      // Loading mask
      loading: true,
      // Selected array
      ids: [],
      names: [],
      // Disable when not single selection
      single: true,
      // Disable when no selection
      multiple: true,
      // Show search criteria
      showSearch: false,
      // Total number of items
      total: 0,
      // Message list table data
      messageList: [],
      // Dialog title
      title: "",
      // Whether to show dialog
      open: false,
      // Query parameters
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        parentId: null,
        likeNum: null,
        content: null,
        type: null,
        blogId: null,
        userId: null,
        delFlag: null,
        createBy: null,
      },
      // Form parameters
      form: {},
      // Form validation rules
      rules: {},
      toName:'',
      isAdmin: false,
      cursorIndexStart: null,// Cursor selection start position
      cursorIndexEnd: null,// Cursor selection end position
    };
  },
  computed: {
    ...mapGetters([
      'name'
    ]),
  },
  created() {},
  mounted: function () {
    this.$nextTick(function () {
      // Code that runs only after the entire view is rendered
      this.getList();
      this.isAdminRole();
    })
  },
  methods: {
    /** Query message list */
    getList() {
      let loadingInstance = Loading.service({
        target: ".comment-list"
      });
      listMessage(this.queryParams).then(response => {
        for (let i = 0; i < response.rows.length; i++) {
          let mesInfo = response.rows[i];
          if (mesInfo.avatar != null && mesInfo.avatar != "") {
            response.rows[i].avatar = process.env.VUE_APP_BASE_API + mesInfo.avatar
          }
        };
        this.messageList = response.rows;
        this.total = response.total;
        setTimeout(() => {
          loadingInstance.close();
        }, 100);
      });
    },
    // Cancel button
    cancel() {
      this.open = false;
      this.reset();
    },
    // Reset form
    reset() {
      this.form = {
        id: null,
        parentId: null,
        mainId: null,
        likeNum: null,
        content: null,
        type: null,
        blogId: null,
        userId: null,
        createBy: null,
        createTime: null,
        updateBy: null,
        updateTime: null
      };
      this.resetForm("form");
    },
    /** Search button operation */
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    /** Reset button operation */
    resetQuery() {
      this.queryParams.createBy = "";
      this.queryParams.content = "";
      this.resetForm("queryForm");
      this.handleQuery();
    },
    // Selection change handler
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.id)
      this.single = selection.length !== 1
      this.multiple = !selection.length
    },
    /** Reply button operation */
    handleAdd(mes) {
      this.reset();
      if(mes.mainId!=null){
        this.form.mainId = mes.mainId
      }else{
        this.form.mainId = mes.id
      }
      this.form.parentId = mes.id
      this.form.type = '1'
      this.form.createBy = this.$store.getters.name
      this.toName = "@" + mes.createBy
      this.open = true;
      this.title = "Reply to Comment";
    },
    /** Edit button operation */
    handleUpdate(row) {
      this.reset();
      const id = row.id || this.ids
      getMessage(id).then(response => {
        this.form = response.data;
        this.open = true;
        this.title = "Edit Comment";
      });
    },
    /** Submit button */
    submitForm() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.id != null) {
            updateMessage(this.form).then(response => {
              this.$modal.msgSuccess("Update successful");
              this.open = false;
              this.getList();
            });
          } else {
            addMessage(this.form).then(response => {
              this.$modal.msgSuccess("Reply successful");
              this.open = false;
              this.getList();
            });
          }
        }
      });
    },
    /** Delete button operation */
    handleDelete(row) {
      const ids = row.id || this.ids;
      let name = row.content || this.names;
      this.$modal.confirm('Are you sure you want to delete "' + name + '"?').then(function() {
        return delMessage(ids);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("Deletion successful");
      }).catch(() => {});
    },
    /** Export button operation */
    handleExport() {
      this.download('cms/message/export', {
        ...this.queryParams
      }, `message_${new Date().getTime()}.xlsx`)
    },
    // Jump to message page
    getBlogInfo(blogId) {
      let routeUrl = this.$router.resolve({
        path: '/cms/main/message',
        query: {
          id: blogId
        }
      });
      window.open(routeUrl.href, '_blank');
    },
    isAdminRole(){
      // Verify if user has admin role
      if(this.$auth.hasRole("admin")||this.$auth.hasRole("cms")){
        this.isAdmin = true;
      }
    },
    blur(e){
      this.cursorIndexStart = e.srcElement.selectionStart  // Get cursor start position when textarea loses focus
      this.cursorIndexEnd = e.srcElement.selectionEnd  // Get cursor end position when textarea loses focus
    },
    output(val) {
      if (this.cursorIndexStart !== null && this.form.content) {
        // Insert content at cursor position if textarea has focus
        this.form.content = this.form.content.substring(0, this.cursorIndexStart) + val + this.form.content.substring(this.cursorIndexEnd)
      } else {
        // Insert content at end if textarea doesn't have focus
        this.form.content = this.form.content?this.form.content:'' + val
      }
    },
  }
};
</script>

<style scoped>
.comment {
  border-bottom: 1px dashed #ccc;
  margin: 10px 0;
  display: flex;
}

.el-avatar {
  width: 35px;
  height: 35px;
  box-shadow: 0 0 10px 2px rgba(0, 0, 0, .06);
  flex-shrink: 0;
}

.content {
  text-align: left;
  font-size: 14px;
  flex-grow: 1;
}

.nkname {
  margin-left: 10px;
  max-width: 530px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.rp,
.date {
  color: #999;
  margin-left: 10px;
}

.pcreateBy {
  margin-left: 10px;
}

.blog {
  color: #349edf;
  margin-left: 10px;
  cursor: pointer;
}

.reply {
  margin-left: 10px;
}

.op {
  color: #ddd;
  font-weight: lighter;
}

.rep {
  color: #349edf;
}

.del {
  color: red;
}

.op:hover {
  cursor: pointer;
}

.el-table__empty-text {
  line-height: 60px;
  width: 50%;
  color: #909399;
}
</style>
