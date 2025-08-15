<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="Notice Title" prop="noticeTitle">
        <el-input v-model="queryParams.noticeTitle" placeholder="Please enter notice title" clearable size="small"
                  @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item label="Operator" prop="createBy">
        <el-input v-model="queryParams.createBy" placeholder="Please enter operator" clearable size="small"
                  @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item label="Type" prop="noticeType">
        <el-select v-model="queryParams.noticeType" placeholder="Notice type" clearable size="small">
          <el-option v-for="dict in dict.type.sys_notice_type" :key="dict.value" :label="dict.label"
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
                   v-hasPermi="['system:notice:add']">Add</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="el-icon-edit" size="mini" :disabled="single" @click="handleUpdate"
                   v-hasPermi="['system:notice:edit']">Edit</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="el-icon-delete" size="mini" :disabled="multiple" @click="handleDelete"
                   v-hasPermi="['system:notice:remove']">Delete</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="noticeList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="Serial Number" align="center" prop="noticeId" width="100" />
      <el-table-column label="Notice Title" align="center" prop="noticeTitle" :show-overflow-tooltip="true" />
      <el-table-column label="Notice Type" align="center" prop="noticeType" width="100">
        <template slot-scope="scope">
          <dict-tag :options="dict.type.sys_notice_type" :value="scope.row.noticeType" />
        </template>
      </el-table-column>
      <el-table-column label="Status" align="center" prop="status" width="100">
        <template slot-scope="scope">
          <dict-tag :options="dict.type.sys_notice_status" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="Creator" align="center" prop="createBy" width="100" />
      <el-table-column label="Creation Time" align="center" prop="createTime" width="100">
        <template slot-scope="scope">
          <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Actions" align="center" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)"
                     v-hasPermi="['system:notice:edit']">Edit</el-button>
          <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)"
                     v-hasPermi="['system:notice:remove']">Delete</el-button>
          <el-button size="mini" type="text" icon="el-icon-folder-opened" @click="fileList(scope.row)"
                     v-hasPermi="['system:notice:query']">Resource List</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
                @pagination="getList" />

    <!-- Add or edit notice dialog -->
    <el-dialog :title="title" :visible.sync="open" :before-close="cancel" width="780px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="Notice Title" prop="noticeTitle">
              <el-input v-model="form.noticeTitle" placeholder="Please enter notice title" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Notice Type" prop="noticeType">
              <el-select v-model="form.noticeType" placeholder="Please select">
                <el-option v-for="dict in dict.type.sys_notice_type" :key="dict.value" :label="dict.label"
                           :value="dict.value"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="Status">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in dict.type.sys_notice_status" :key="dict.value" :label="dict.value">
                  {{dict.label}}
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="Content">
              <cmsEditor v-model="form.noticeContent" @getFileId="getFileId" :min-height="192" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">Confirm</el-button>
        <el-button @click="cancel">Cancel</el-button>
      </div>
    </el-dialog>

    <!-- Resource list dialog -->
    <el-dialog :title="title" :visible.sync="fileListOpen" width="1000px" append-to-body>
      <el-table v-loading="loading" :data="fileInfoList">
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
  listNotice,
  getNotice,
  delNotice,
  addNotice,
  updateNotice
} from "@/api/system/notice";
import {
  delFileInfo
} from "@/api/cms/fileInfo";
import {
  addFileNoticeInfo,
  delFileNoticeInfo,
  getFileList
} from "@/api/cms/fileNoticeInfo";

export default {
  name: "Notice",
  dicts: ['sys_notice_status', 'sys_notice_type'],
  data() {
    return {
      // Loading mask
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
      // Notice table data
      noticeList: [],
      // Resource list table data
      fileInfoList: [],
      // Dialog title
      title: "",
      // Whether to show dialogs
      open: false,
      fileListOpen: false,
      // Query parameters
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        noticeTitle: undefined,
        createBy: undefined,
        status: undefined
      },
      // Form parameters
      form: {},
      // Form validation rules
      rules: {
        noticeTitle: [{
          required: true,
          message: "Notice title cannot be empty",
          trigger: "blur"
        }],
        noticeType: [{
          required: true,
          message: "Notice type cannot be empty",
          trigger: "change"
        }]
      },
      fileIds: [],
    };
  },
  created() {
    this.getList();
  },
  methods: {
    /** Query notice list */
    getList() {
      this.loading = true;
      listNotice(this.queryParams).then(response => {
        this.noticeList = response.rows;
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
        this.open = false;
        this.reset();
      }).catch(() => {});
    },
    // Form reset
    reset() {
      this.form = {
        noticeId: undefined,
        noticeTitle: undefined,
        noticeType: undefined,
        noticeContent: undefined,
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
    // Selection change handler
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.noticeId)
      this.single = selection.length != 1
      this.multiple = !selection.length
    },
    /** Add button operation */
    handleAdd() {
      this.reset();
      this.open = true;
      this.title = "Add Notice";
    },
    /** Edit button operation */
    handleUpdate(row) {
      this.reset();
      const noticeId = row.noticeId || this.ids
      getNotice(noticeId).then(response => {
        this.form = response.data;
        this.open = true;
        this.title = "Edit Notice";
      });
    },
    /** Submit button */
    submitForm: function() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.noticeId != undefined) {
            updateNotice(this.form).then(response => {
              if(this.fileIds.length>0){
                let fileNoticeInfo = {
                  noticeId: this.form.noticeId,
                  fileIds: this.fileIds
                };
                addFileNoticeInfo(fileNoticeInfo).then(response => {});
              }
              this.$modal.msgSuccess("Update successful");
              this.fileIds.length = 0;
              this.open = false;
              this.getList();
            });
          } else {
            addNotice(this.form).then(response => {
              if(this.fileIds.length>0){
                let fileNoticeInfo = {
                  noticeId: response.data,
                  fileIds: this.fileIds
                };
                addFileNoticeInfo(fileNoticeInfo).then(response => {});
              }
              this.$modal.msgSuccess("Add successful");
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
      const noticeIds = row.noticeId || this.ids
      this.$modal.confirm(`Are you sure you want to delete the notice item(s) with ID(s) "${noticeIds}"?`).then(function() {
        delFileNoticeInfo(noticeIds).then().then(response => {});
        return delNotice(noticeIds);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("Deletion successful");
      }).catch(() => {});
    },
    getFileId(data) {
      this.fileIds.push(data);
    },
    /** Resource list button operation */
    fileList(row) {
      this.loading = true;
      this.reset();
      const noticeId = row.noticeId || this.ids
      getFileList(noticeId).then(response => {
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
        this.loading = false;
      });
    },
    // File download handler
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

