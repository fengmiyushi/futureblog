<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="Category Name" prop="typeName">
        <el-input v-model="queryParams.typeName" placeholder="Please enter category name" clearable size="small"
                  @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">Search</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">Reset</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="handleAdd"
                   v-hasPermi="['cms:type:add']">Add</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="el-icon-edit" size="mini" :disabled="single" @click="handleUpdate"
                   v-hasPermi="['cms:type:edit']">Edit</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="el-icon-delete" size="mini" :disabled="multiple" @click="handleDelete"
                   v-hasPermi="['cms:type:remove']">Delete</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="el-icon-download" size="mini" @click="handleExport"
                   v-hasPermi="['cms:type:export']">Export</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="typeList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <!-- <el-table-column label="Category ID" align="center" prop="typeId" /> -->
      <el-table-column label="Category Image" align="center" prop="typePic" width="100">
        <template slot-scope="scope">
          <el-image style="width: 28px;height: 28px; border-radius: 50%; margin-right: 10px" :src="scope.row.typePicLink" lazy :preview-src-list="[scope.row.typePicLink]" v-if="scope.row.typePicType == '0'">
            <div slot="error" class="image-slot">
              <i class="el-icon-collection"></i>
            </div>
          </el-image>
          <el-image style="width: 28px;height: 28px; border-radius: 50%; margin-right: 10px" :src="scope.row.typePic" lazy :preview-src-list="[scope.row.typePic]" v-if="scope.row.typePicType == '1'">
            <div slot="error" class="image-slot">
              <i class="el-icon-collection"></i>
            </div>
          </el-image>
        </template>
      </el-table-column>
      <el-table-column label="Category Name" align="center" prop="typeName" />
      <el-table-column label="Blog Count" align="center" prop="blogNum" />
      <el-table-column label="Creator" align="center" prop="createBy" />
      <el-table-column label="Creation Time" align="center" prop="createTime" width="100">
        <template slot-scope="scope">
          <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d} {h}:{i}:{s}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Actions" align="center" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)"
                     v-hasPermi="['cms:type:edit']">Edit</el-button>
          <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)"
                     v-hasPermi="['cms:type:remove']">Delete</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
                @pagination="getList" />

    <!-- Add or edit category management dialog -->
    <el-dialog :title="title" :visible.sync="open" :before-close="cancel" width="500px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="Category Name" prop="typeName">
          <el-input v-model="form.typeName" placeholder="Please enter category name" />
        </el-form-item>
        <el-form-item label="Category Image">
          <el-radio-group v-model="form.typePicType">
            <el-radio-button label="0">URL</el-radio-button>
            <el-radio-button label="1">Upload</el-radio-button>
          </el-radio-group>
          <div v-show="form.typePicType == '0'" class="tabBlock">
            <el-input v-model="form.typePicLink" placeholder="Please enter image URL https://" style="margin-bottom: 10px;" />
            <el-image :src="form.typePicLink" :preview-src-list="[form.typePicLink]" fit="cover" class="typePic" >
              <div slot="error" class="image-slot">
                <i class="el-icon-collection"></i>
              </div>
            </el-image>
          </div>
          <div v-show="form.typePicType == '1'" class="tabBlock">
            <imageUpload v-model="form.typePic" :limit="1" />
          </div>
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
import {
  listType,
  getType,
  delType,
  addType,
  updateType,
  cancelType
} from "@/api/cms/type";

export default {
  name: "Type",
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
      showSearch: true,
      // Total number of items
      total: 0,
      // Category management table data
      typeList: [],
      // Dialog title
      title: "",
      // Whether to show dialog
      open: false,
      // Query parameters
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        typeName: null,
        typePic: null,
        createBy: null
      },
      // Form parameters
      form: {},
      // Form validation rules
      rules: {
        typeName: [{
          required: true,
          message: "Category name cannot be empty",
          trigger: "blur"
        }],
      }
    };
  },
  created() {
    this.getList();
  },
  methods: {
    /** Query category management list */
    getList() {
      this.loading = true;
      listType(this.queryParams).then(response => {
        for (let i = 0; i < response.rows.length; i++) {
          let typeInfo = response.rows[i];
          if (typeInfo.typePic.length > 0) {
            response.rows[i].typePic = process.env.VUE_APP_BASE_API + typeInfo.typePic
          }
        };
        this.typeList = response.rows;
        this.total = response.total;
        this.loading = false;
      });
    },
    // Cancel button
    cancel() {
      cancelType(this.form).then(response => {
        this.open = false;
        this.reset();
      });
    },
    // Reset form
    reset() {
      this.form = {
        typeId: null,
        createBy: null,
        createTime: null,
        updateBy: null,
        updateTime: null,
        typeName: null,
        typePicType: '0',
        typePic: null,
        typePicLink: null
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
      this.ids = selection.map(item => item.typeId)
      this.names = selection.map(item => item.typeName)
      this.single = selection.length !== 1
      this.multiple = !selection.length
    },
    /** Add button operation */
    handleAdd() {
      this.reset();
      this.open = true;
      this.title = "Add Category";
    },
    /** Edit button operation */
    handleUpdate(row) {
      this.reset();
      const typeId = row.typeId || this.ids
      getType(typeId).then(response => {
        this.form = response.data;
        this.open = true;
        this.title = "Edit Category";
      });
    },
    /** Submit button */
    submitForm() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.typeId != null) {
            updateType(this.form).then(response => {
              this.$modal.msgSuccess("Update successful");
              this.open = false;
              this.getList();
            });
          } else {
            addType(this.form).then(response => {
              this.$modal.msgSuccess("Add successful");
              this.open = false;
              this.getList();
            });
          }
        }
      });
    },
    /** Delete button operation */
    handleDelete(row) {
      const typeIds = row.typeId || this.ids;
      let name = row.typeName || this.names;
      this.$modal.confirm('Are you sure you want to delete "' + name + '"?').then(function() {
        return delType(typeIds);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("Deletion successful");
      }).catch(() => {});
    },
    /** Export button operation */
    handleExport() {
      this.download('cms/type/export', {
        ...this.queryParams
      }, `type_${new Date().getTime()}.xlsx`)
    }
  }
};
</script>

<style scoped lang="scss">
.tabBlock {
  height: 180px;
  margin-top: 20px;
}
.typePic {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
</style>

