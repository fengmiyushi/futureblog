<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" :inline="true" v-show="showSearch" label-width="100px">
      <el-form-item label="File Name" prop="fileOriginName">
        <el-input
          v-model="queryParams.fileOriginName"
          placeholder="Enter file name"
          clearable
          size="small"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="File Type" prop="fileSuffix">
        <el-input
          v-model="queryParams.fileSuffix"
          placeholder="Enter file type, e.g. txt"
          clearable
          size="small"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="Storage Name" prop="fileObjectName">
        <el-input
          v-model="queryParams.fileObjectName"
          placeholder="Enter storage file name"
          clearable
          size="small"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">Search</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">Reset</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="el-icon-upload"
          size="mini"
          @click="uploadFile"
          v-hasPermi="['cms:fileInfo:add']"
        >Upload File</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="el-icon-delete"
          size="mini"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['cms:fileInfo:remove']"
        >Delete</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="fileInfoList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="Preview" align="center" prop="pic">
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
      <el-table-column label="Storage Name" align="center" prop="fileObjectName" />
      <el-table-column label="Creator" align="center" prop="createBy" />
      <el-table-column label="Create Time" align="center" prop="createTime" width="100">
        <template slot-scope="scope">
          <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d} {h}:{i}:{s}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Actions" align="center" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button
            size="mini"
            type="text"
            icon="el-icon-download"
            @click="handleDownload(scope.row)"
          >Download</el-button>
          <el-button
            size="mini"
            type="text"
            icon="el-icon-delete"
            @click="handleDelete(scope.row)"
            v-hasPermi="['cms:fileInfo:remove']"
          >Delete</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total>0"
      :total="total"
      :page.sync="queryParams.pageNum"
      :limit.sync="queryParams.pageSize"
      @pagination="getList"
    />

    <el-dialog :title="title" :visible.sync="open" width="500px" append-to-body>
      <el-upload
        style="min-height: 200px;"
        ref="upload"
        :limit="5"
        accept=".jpg, .png,.txt,.doc,.docx,.xls,.xlsx,.ppt,.zip,.pdf"
        :action="upload.url"
        :headers="upload.headers"
        :file-list="upload.fileList"
        :on-progress="handleFileUploadProgress"
        :on-success="handleFileSuccess"
        :auto-upload="false">
        <el-button slot="trigger" size="small" type="primary">Select File</el-button>
        <el-button style="margin-left: 10px;" size="small" type="success" :loading="upload.isUploading" @click="submitUpload">Upload to Server</el-button>
        <div slot="tip" class="el-upload__tip">Only jpg/png/txt/doc/docx/xls/xlsx/ppt/zip/pdf files can be uploaded, with single file size not exceeding 50MB</div>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script>
import { listFileInfo, getFileInfo, delFileInfo, addFileInfo, updateFileInfo } from "@/api/cms/fileInfo";
import { getToken } from "@/utils/auth";
import image from './image.js';
import store from '@/store';

export default {
  name: "FileInfo",
  data() {
    return {
      // Loading mask
      loading: true,
      // Selected array
      ids: [],
      fileNames: [],
      // Disable if not single selected
      single: true,
      // Disable if not multiple selected
      multiple: true,
      // Show search criteria
      showSearch: true,
      // Total count
      total: 0,
      // File table data
      fileInfoList: [],
      // Dialog title
      title: "",
      // Whether to show dialog
      open: false,
      // Upload parameters
      upload: {
        // Whether upload is disabled
        isUploading: false,
        // Set upload headers
        headers: { Authorization: "Bearer " + getToken() },
        // Upload URL
        url: process.env.VUE_APP_BASE_API + "/common/upload",
        // Upload file list
        fileList: []
      },
      // Query parameters
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        fileOriginName: null,
        fileSuffix: null,
        fileSizeInfo: null,
        fileObjectName: null,
        filePath: null,
        createBy: store.getters.name
      },
      // Form parameters
      form: {},
      // Form validation
      rules: {
        fileOriginName: [
          { required: true, message: "File name is required", trigger: "blur" }
        ],
        delFlag: [
          { required: true, message: "Delete flag is required", trigger: "blur" }
        ],
      }
    };
  },
  created() {
    this.getList();
  },
  methods: {
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
    /** Query file list */
    getList() {
      this.loading = true;
      listFileInfo(this.queryParams).then(response => {
        for(let i = 0; i<response.rows.length; i++){
          let fileInfo = response.rows[i];
          switch (fileInfo.fileSuffix){
            case 'png': case 'jpg': case 'jpeg': case 'bmp': case 'gif':
              response.rows[i].pic = process.env.VUE_APP_BASE_API + fileInfo.filePath;
              break;
            default:
              response.rows[i].pic = image.bg1;
              break;
          };
        };
        this.fileInfoList = response.rows;
        this.total = response.total;
        this.loading = false;
      });
    },
    // Cancel button
    cancel() {
      this.open = false;
      this.reset();
    },
    // Form reset
    reset() {
      this.form = {
        fileId: null,
        fileOriginName: null,
        fileSuffix: null,
        fileSizeInfo: null,
        fileObjectName: null,
        filePath: null,
        delFlag: null,
        createBy: store.getters.name,
        createTime: null,
        updateBy: null,
        updateTime: null
      };
      this.resetForm("form");
    },
    /** Search button action */
    handleQuery() {
      this.queryParams.pageNum = 1;
      this.getList();
    },
    /** Reset button action */
    resetQuery() {
      this.resetForm("queryForm");
      this.handleQuery();
    },
    // Selection change
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.fileId)
      this.fileNames = selection.map(item => item.fileOriginName)
      this.single = selection.length!==1
      this.multiple = !selection.length
    },
    /** Upload file button action */
    uploadFile() {
      this.reset();
      this.open = true;
      this.title = "Add File";
    },
    // File submit handler
    submitUpload() {
      this.$refs.upload.submit();
    },
    // File upload progress handler
    handleFileUploadProgress(event, file, fileList) {
      this.upload.isUploading = true;
    },
    // File upload success handler
    handleFileSuccess(response, file, fileList) {
      this.upload.isUploading = false;
      this.form.filePath = response.url;
      this.$modal.msgSuccess(response.msg);
      this.getList()
    },
    /** Delete button action */
    handleDelete(row) {
      const fileIds = row.fileId || this.ids;
      let fileOriginName = row.fileOriginName || this.fileNames;
      this.$modal.confirm('Confirm to delete file "' + fileOriginName + '"?').then(function() {
        return delFileInfo(fileIds);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("Delete successful");
      }).catch(() => {});
    }
  }
};
</script>
