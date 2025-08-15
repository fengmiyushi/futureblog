<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="Tag Name" prop="tagName">
        <el-input
          v-model="queryParams.tagName"
          placeholder="Please enter tag name"
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
          icon="el-icon-plus"
          size="mini"
          @click="handleAdd"
          v-hasPermi="['cms:tag:add']"
        >Add</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="el-icon-edit"
          size="mini"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['cms:tag:edit']"
        >Edit</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="el-icon-delete"
          size="mini"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['cms:tag:remove']"
        >Delete</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="el-icon-download"
          size="mini"
          @click="handleExport"
          v-hasPermi="['cms:tag:export']"
        >Export</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="tagList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="Tag Name" align="center" prop="tagName" />
      <el-table-column label="Blog Count" align="center" prop="blogNum" />
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
            icon="el-icon-edit"
            @click="handleUpdate(scope.row)"
            v-hasPermi="['cms:tag:edit']"
          >Edit</el-button>
          <el-button
            size="mini"
            type="text"
            icon="el-icon-delete"
            @click="handleDelete(scope.row)"
            v-hasPermi="['cms:tag:remove']"
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

    <!-- Add or Edit Tag Dialog -->
    <el-dialog :title="title" :visible.sync="open" width="500px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="Tag Name" prop="tagName">
          <el-input v-model="form.tagName" placeholder="Please enter tag name" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">Confirm</el-button>
        <el-button @click="cancel">Cancel</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listTag, getTag, delTag, addTag, updateTag } from "@/api/cms/tag";

export default {
  name: "Tag",
  data() {
    return {
      // Loading mask
      loading: true,
      // Selected array
      ids: [],
      names: [],
      // Disable if not single selected
      single: true,
      // Disable if not multiple selected
      multiple: true,
      // Show search criteria
      showSearch: true,
      // Total count
      total: 0,
      // Tag table data
      tagList: [],
      // Dialog title
      title: "",
      // Whether to show dialog
      open: false,
      // Query parameters
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        tagName: null,
        createBy: null
      },
      // Form parameters
      form: {},
      // Form validation
      rules: {
        tagName: [
          { required: true, message: "Tag name is required", trigger: "blur" }
        ]
      }
    };
  },
  created() {
    this.getList();
  },
  methods: {
    /** Query tag list */
    getList() {
      this.loading = true;
      listTag(this.queryParams).then(response => {
        this.tagList = response.rows;
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
        tagId: null,
        createBy: null,
        createTime: null,
        updateBy: null,
        updateTime: null,
        tagName: null
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
      this.ids = selection.map(item => item.tagId)
      this.names = selection.map(item => item.tagName)
      this.single = selection.length!==1
      this.multiple = !selection.length
    },
    /** Add button action */
    handleAdd() {
      this.reset();
      this.open = true;
      this.title = "Add Tag";
    },
    /** Edit button action */
    handleUpdate(row) {
      this.reset();
      const tagId = row.tagId || this.ids
      getTag(tagId).then(response => {
        this.form = response.data;
        this.open = true;
        this.title = "Edit Tag";
      });
    },
    /** Submit button */
    submitForm() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.tagId != null) {
            updateTag(this.form).then(response => {
              this.$modal.msgSuccess("Update successful");
              this.open = false;
              this.getList();
            });
          } else {
            addTag(this.form).then(response => {
              this.$modal.msgSuccess("Add successful");
              this.open = false;
              this.getList();
            });
          }
        }
      });
    },
    /** Delete button action */
    handleDelete(row) {
      const tagIds = row.tagId || this.ids;
      let name = row.tagName || this.names;
      this.$modal.confirm('Confirm to delete tag "' + name + '"?').then(function() {
        return delTag(tagIds);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("Delete successful");
      }).catch(() => {});
    },
    /** Export button action */
    handleExport() {
      this.download('cms/tag/export', {
        ...this.queryParams
      }, `tag_${new Date().getTime()}.xlsx`)
    }
  }
};
</script>
