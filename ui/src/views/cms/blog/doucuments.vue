<template>
  <div class="app-container">
    <el-container>
      <el-aside width="200px">Sidebar</el-aside>
      <el-main>
        <el-form :model="queryParams" ref="queryForm" :inline="true" v-show="showSearch" label-width="68px">
          <el-form-item label="Title" prop="title">
            <el-input v-model="queryParams.title" placeholder="Please enter title" clearable size="small"
                      @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item label="Status" prop="status">
            <el-select v-model="queryParams.status" placeholder="Please select status" clearable size="small">
              <el-option v-for="dict in dict.type.cms_blog_status" :key="dict.value" :label="dict.label"
                         :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">Search</el-button>
            <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">Reset</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="handleAdd"
                       v-hasPermi="['cms:blog:add']">Add</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="success" plain icon="el-icon-edit" size="mini" :disabled="single" @click="handleUpdate"
                       v-hasPermi="['cms:blog:edit']">Edit</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="el-icon-delete" size="mini" :disabled="multiple" @click="handleDelete"
                       v-hasPermi="['cms:blog:remove']">Delete</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="el-icon-download" size="mini" @click="handleExport"
                       v-hasPermi="['cms:blog:export']">Export</el-button>
          </el-col>
          <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
        </el-row>

        <el-table v-loading="loading" :data="blogList" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column label="Title" align="center" prop="title" />
          <el-table-column label="Status" align="center" prop="status">
            <template slot-scope="scope">
              <dict-tag :options="dict.type.cms_blog_status" :value="scope.row.status" />
            </template>
          </el-table-column>
          <el-table-column label="Creator" align="center" prop="createBy" />
          <el-table-column label="Creation Time" align="center" prop="createTime" width="100">
            <template slot-scope="scope">
              <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d} {h}:{i}:{s}') }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Actions" align="center" class-name="small-padding fixed-width">
            <template slot-scope="scope">
              <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)"
                         v-hasPermi="['cms:blog:edit']">Edit</el-button>
              <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)"
                         v-hasPermi="['cms:blog:remove']">Delete</el-button>
              <el-button size="mini" type="text" icon="el-icon-folder-opened" @click="fileList(scope.row)"
                         v-hasPermi="['system:notice:query']">Resource List</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination v-show="total>0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
                    @pagination="getList" />
      </el-main>
    </el-container>


    <!-- Add or Edit Document Dialog -->
    <el-dialog :title="title" :visible.sync="open" :before-close="cancel" width="1200px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="Title" prop="title">
          <el-input v-model="form.title" placeholder="Please enter title" />
        </el-form-item>
        <el-form-item label="Content">
          <!-- Images are stored in base64 format, URL format may display abnormally on mobile devices -->
          <cmsEditor v-model="form.content" @getFileId="getFileId" type="base64" :min-height="192" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="releaseForm">Publish</el-button>
        <el-button type="info" @click="saveForm">Save Draft</el-button>
        <el-button @click="cancel">Cancel</el-button>
      </div>
    </el-dialog>

    <!-- Resource List Dialog -->
    <el-dialog :title="title" :visible.sync="fileListOpen" width="1000px" append-to-body>
      <el-table class="file-list" :data="fileInfoList">
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="Preview" align="center" prop="pic" >
          <template slot-scope="scope">
            <el-image
              style="width: 120px;height: 60px;"
              :src="scope.row.pic"
              lazy
              :preview-src-list="[scope.row.pic]">
            </el-image>
          </template>
        </el-table-column>
        <el-table-column label="File Name" align="center" prop="fileOriginName" />
        <el-table-column label="File Type" align="center" prop="fileSuffix" />
        <el-table-column label="File Size" align="center" prop="fileSizeInfo" />
        <el-table-column label="Actions" align="center" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button
              size="mini"
              type="text"
              icon="el-icon-download"
              @click="handleDownload(scope.row)"
            >Download</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

  </div>
</template>

<script>
import {
  listBlog,
  getBlog,
  delBlog,
  addBlog,
  updateBlog
} from "@/api/cms/blog";
import {
  delFileInfo
} from "@/api/cms/fileInfo";
import {
  addFileBlogInfo,
  delFileBlogInfo,
  getFileList
} from "@/api/cms/fileBlogInfo";
import {
  Loading
} from 'element-ui';

export default {
  name: "DocumentManagement",
  dicts: ['cms_blog_status'],
  data() {
    return {
      // Mask layer
      loading: true,
      // Selected array
      ids: [],
      // Disable when not single selection
      single: true,
      // Disable when no selection
      multiple: true,
      // Show search criteria
      showSearch: true,
      // Total number of items
      total: 0,
      // Document list table data
      blogList: [],
      // Resource list table data
      fileInfoList: [],
      // Pop-up layer title
      title: "",
      // Whether to show pop-up layer
      open: false,
      fileListOpen: false,
      // Query parameters
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        title: null,
        type: 3,
        content: null,
        top: null,
        views: null,
        status: null,
        createBy: null
      },
      // Form parameters
      form: {},
      top: false,
      // Form validation rules
      rules: {
        title: [{
          required: true,
          message: "Title cannot be empty",
          trigger: "blur"
        }],
        type: [{
          required: true,
          message: "Type cannot be empty",
          trigger: "change"
        }],
      },
      fileIds: [],
    };
  },
  created() {
    this.getList();
  },
  methods: {
    /** Query document list */
    getList() {
      this.loading = true;
      listBlog(this.queryParams).then(response => {
        this.blogList = response.rows;
        this.total = response.total;
        this.loading = false;
      });
    },
    // Cancel button
    cancel() {
      this.$confirm('Do you want to abandon this edit?', 'System Prompt', {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(() => {
        let fileids = this.fileIds;
        if (fileids.length > 0) {
          delFileInfo(fileids);
        };
        this.fileIds.length = 0;
        this.top = false;
        this.open = false;
        this.reset();
      }).catch(() => {});
    },
    // Reset form
    reset() {
      this.form = {
        id: null,
        createBy: null,
        createTime: null,
        updateBy: null,
        updateTime: null,
        title: null,
        type: 3,
        content: null,
        top: "0",
        views: null,
        status: "0"
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
      this.resetForm("queryForm");
      this.handleQuery();
    },
    // Handle selection change
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.id)
      this.single = selection.length !== 1
      this.multiple = !selection.length
    },
    /** Add button operation */
    handleAdd() {
      this.reset();
      this.open = true;
      this.title = "Add Document";
    },
    /** Edit button operation */
    handleUpdate(row) {
      this.reset();
      const id = row.id || this.ids
      getBlog(id).then(response => {
        this.form = response.data;
        if (this.form.top == 1) {
          this.top = true;
        };
        this.open = true;
        this.title = "Edit Document";
      });
    },
    /** Publish button */
    releaseForm() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          this.form.type = 3;
          this.form.status = 1;
          if (this.top) {
            this.form.top = 1;
          } else {
            this.form.top = 0;
          }
          if (this.form.id != null) {
            updateBlog(this.form).then(response => {
              if(this.fileIds.length>0){
                let fileBlogInfo = {
                  blogId: this.form.id,
                  fileIds: this.fileIds
                };
                addFileBlogInfo(fileBlogInfo).then(response => {});
              }
              this.$modal.msgSuccess("Updated successfully");
              this.fileIds.length = 0;
              this.open = false;
              this.getList();
            });
          } else {
            addBlog(this.form).then(response => {
              if(this.fileIds.length>0){
                let fileBlogInfo = {
                  blogId: response.data,
                  fileIds: this.fileIds
                };
                addFileBlogInfo(fileBlogInfo).then(response => {});
              }
              this.$modal.msgSuccess("Added successfully");
              this.fileIds.length = 0;
              this.open = false;
              this.getList();
            });
          }
        }
      });
    },
    /** Save draft button */
    saveForm() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          this.form.type = 3;
          this.form.status = 0;
          if (this.top) {
            this.form.top = 1;
          } else {
            this.form.top = 0;
          }
          if (this.form.id != null) {
            updateBlog(this.form).then(response => {
              if(this.fileIds.length>0){
                let fileBlogInfo = {
                  blogId: this.form.id,
                  fileIds: this.fileIds
                };
                addFileBlogInfo(fileBlogInfo).then(response => {});
              }
              this.$modal.msgSuccess("Updated successfully");
              this.fileIds.length = 0;
              this.open = false;
              this.getList();
            });
          } else {
            addBlog(this.form).then(response => {
              if(this.fileIds.length>0){
                let fileBlogInfo = {
                  blogId: response.data,
                  fileIds: this.fileIds
                };
                addFileBlogInfo(fileBlogInfo).then(response => {});
              }
              this.$modal.msgSuccess("Added successfully");
              this.fileIds.length = 0;
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
      this.$modal.confirm('Are you sure you want to delete the document with ID "' + ids + '"?').then(function() {
        delFileBlogInfo(ids).then().then(response => {});
        return delBlog(ids);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("Deleted successfully");
      }).catch(() => {});
    },
    /** Export button operation */
    handleExport() {
      this.download('cms/blog/export', {
        ...this.queryParams
      }, `document_${new Date().getTime()}.xlsx`)
    },
    getFileId(data) {
      this.fileIds.push(data);
    },
    /** Resource list button operation */
    fileList(row) {
      let loadingInstance = Loading.service({
        target: ".file-list"
      });
      this.reset();
      const blogId = row.id || this.ids
      getFileList(blogId).then(response => {
        for(let i = 0; i<response.data.length; i++){
          let fileInfo = response.data[i];
          switch (fileInfo.fileSuffix){
            case 'png': case 'jpg': case 'jpeg': case 'bmp': case 'gif':
              response.data[i].pic = process.env.VUE_APP_BASE_API + fileInfo.filePath;
              break;
            default:
              response.data[i].pic = image.bg1;
              break;
          };
        };
        this.fileInfoList = response.data;
        this.fileListOpen = true;
        this.title = "Resource List";
        setTimeout(() => {
          loadingInstance.close();
        }, 100);
      });
    },
    // File download processing
    handleDownload(row) {
      var name = row.fileOriginName;
      var url = row.filePath;
      var suffix = url.substring(url.lastIndexOf("."), url.length);
      const a = document.createElement('a')
      a.setAttribute('download', name)
      a.setAttribute('target', '_blank')
      a.setAttribute('href', process.env.VUE_APP_BASE_API + url)
      a.click()
    },
  }
};
</script>
