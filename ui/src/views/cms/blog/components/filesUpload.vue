<template>
  <div class="component-upload-image">
    <el-upload
      :disabled="disabled"
      :action="uploadImgUrl"
      list-type="picture-card"
      :on-success="handleUploadSuccess"
      :before-upload="handleBeforeUpload"
      :limit="limit"
      :on-error="handleUploadError"
      name="file"
      :on-remove="handleRemove"
      :show-file-list="true"
      :headers="headers"
      :file-list="fileList"
      :class="{hide: this.fileList.length >= this.limit}"
    >
      <i class="el-icon-plus"></i>
    </el-upload>

    <!-- Upload hint -->
    <div class="el-upload__tip" slot="tip" v-if="showTip">
      Please upload
      <template v-if="fileSize"> files smaller than <b style="color: #f56c6c">{{ fileSize }}MB</b> </template>
      <template v-if="fileType"> files in <b style="color: #f56c6c">{{ fileType.join("/") }}</b> format </template>
    </div>

  </div>
</template>

<script>
import { getToken } from "@/utils/auth";

export default {
  props: {
    value: [String, Object, Array],
    // Size limit (MB)
    fileSize: {
      type: Number,
      default: 10,
    },
    // File types, e.g. ['png', 'jpg', 'jpeg']
    fileType: {
      type: Array,
      default: () => ['doc', 'xls', 'ppt', 'pdf', 'png', 'jpg', 'jpeg', 'zip', '7z', 'wps'],
    },
    // Whether to show hint
    isShowTip: {
      type: Boolean,
      default: true
    },
    // Whether it's disabled
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      limit: 1,
      hideUpload: false,
      baseUrl: process.env.VUE_APP_BASE_API,
      uploadImgUrl: process.env.VUE_APP_BASE_API + "/common/upload", // Image server upload URL
      headers: {
        Authorization: "Bearer " + getToken(),
      },
      fileList: []
    };
  },
  watch: {
    value: {
      handler(val) {
        if (val) {
          // First convert value to array
          const list = Array.isArray(val) ? val : this.value.split(',');
          // Then convert array to object array
          this.fileList = list.map(item => {
            if (typeof item === "string") {
              if (item.indexOf(this.baseUrl) === -1) {
                item = { name: this.baseUrl + item, url: '/file.png' };
              } else {
                item = { name: item, url: item };
              }
            }
            return item;
          });
        } else {
          this.fileList = [];
          return [];
        }
      },
      deep: true,
      immediate: true
    }
  },
  computed: {
    // Whether to show hint
    showTip() {
      return this.isShowTip && (this.fileType || this.fileSize);
    },
  },
  methods: {
    // Delete image
    handleRemove(file, fileList) {
      const findex = this.fileList.map(f => f.name).indexOf(file.name);
      if(findex > -1) {
        this.fileList.splice(findex, 1);
        this.$emit("input", this.listToString(this.fileList));
      }
    },
    // Upload success callback
    handleUploadSuccess(res) {
      this.fileList.push({ name: res.fileName, url: res.fileName });
      this.$emit("input", this.listToString(this.fileList));
      const fileInfo = {
        fileId: this.listToString(this.fileList),
        fileOriginName: res.fileOriginName,
        fileSuffix: res.fileSuffix,
        fileSize: res.fileSize,
        filePath: res.fileName,
      }
      this.$emit("handleFilesSuccess", fileInfo);
      this.loading.close();
    },
    // Show loading before upload
    handleBeforeUpload(file) {
      let isImg = false;
      if (this.fileType.length) {
        let fileExtension = "";
        if (file.name.lastIndexOf(".") > -1) {
          fileExtension = file.name.slice(file.name.lastIndexOf(".") + 1);
        }
        isImg = this.fileType.some(type => {
          if (file.type.indexOf(type) > -1) return true;
          if (fileExtension && fileExtension.indexOf(type) > -1) return true;
          return false;
        });
      } else {
        isImg = file.type.indexOf("image") > -1;
      }

      if (!isImg) {
        this.$message.error(
          `File format incorrect, please upload ${this.fileType.join("/")} format files!`
        );
        return false;
      }
      if (this.fileSize) {
        const isLt = file.size / 1024 / 1024 < this.fileSize;
        if (!isLt) {
          this.$message.error(`File size cannot exceed ${this.fileSize} MB!`);
          return false;
        }
      }
      this.loading = this.$loading({
        lock: true,
        text: "Uploading",
        background: "rgba(0, 0, 0, 0.7)",
      });
    },
    // Upload failure
    handleUploadError() {
      this.$message({
        type: "error",
        message: "Upload failed",
      });
      this.loading.close();
    },
    // Convert list to string with specified separator
    listToString(list, separator) {
      let strs = "";
      separator = separator || ",";
      for (let i in list) {
        strs += list[i].url.replace(this.baseUrl, "") + separator;
      }
      return strs != '' ? strs.substr(0, strs.length - 1) : '';
    }
  }
};
</script>
<style scoped lang="scss">
// .el-upload--picture-card controls the plus sign part
::v-deep.hide .el-upload--picture-card {
  display: none;
}
// Remove animation effects
::v-deep .el-list-enter-active,
::v-deep .el-list-leave-active {
  transition: all 0s;
}

::v-deep .el-list-enter, .el-list-leave-active {
  opacity: 0;
  transform: translateY(0);
}
</style>
