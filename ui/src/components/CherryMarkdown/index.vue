<template>
  <div @click.prevent.stop>
    <div :id="mdId" :style="{height:height+'px'}" />
  </div>
</template>

<script>
import Cherry from 'cherry-markdown'
import {
  getToken
} from '@/utils/auth'
import 'cherry-markdown/dist/cherry-markdown.min.css'
export default {
  props: {
    height: {
      type: Number | String,
      default: null
    },
    value: {
      type: String,
      default: ''
    },
    mdId: {
      type: String,
      default: 'markdown-container'
    },
    defaultModel: {
      type: String,
      default: 'edit&preview'
    }
  },
  data() {
    return {
      content: null,
      cherrInstance: null
    }
  },
  mounted() {
    this.initCherryMD()
  },
  methods: {
    // Initialize editor
    initCherryMD(value, config) {
      var {
        afterChange,
        afterInit,
        beforeImageMounted,
        fileUpload,
        mdId
      } = this
      var defaultValue = value || this.value
      /**
       * Custom menu
       * First click: make selected text both bold and italic
       * Keep cursor position unchanged
       * Second click: revert formatted text to normal
       */
      var customMenuA = Cherry.createMenuHook('Bold & Italic', {
        iconName: 'font',
        onClick: function(selection) {
          // Get selected text, if no selection, try to get word or sentence at cursor position
          let $selection = this.getSelection(selection) || 'Bold & Italic';
          // If single selection without bold syntax, expand selection range
          if (!this.isSelections && !/^\s*(\*\*\*)[\s\S]+(\1)/.test($selection)) {
            this.getMoreSelection('***', '***', () => {
              const newSelection = this.editor.editor.getSelection();
              const isBoldItalic = /^\s*(\*\*\*)[\s\S]+(\1)/.test(newSelection);
              if (isBoldItalic) {
                $selection = newSelection;
              }
              return isBoldItalic;
            });
          }
          // Remove formatting if already formatted
          if (/^\s*(\*\*\*)[\s\S]+(\1)/.test($selection)) {
            return $selection.replace(/(^)(\s*)(\*\*\*)([^\n]+)(\3)(\s*)($)/gm, '$1$4$7');
          }
          /**
           * Register rule for reducing selection range
           * After inserting "***TEXT***", selection will be "***【TEXT】***"
           * Without registration, it would be "【***TEXT***】"
           */
          this.registerAfterClickCb(() => {
            this.setLessSelection('***', '***');
          });
          return $selection.replace(/(^)([^\n]+)($)/gm, '$1***$2***$3');
        }
      });
      /**
       * Empty shell for customizing toolbar hierarchy
       */
      var customMenuB = Cherry.createMenuHook('Laboratory', {
        iconName: '',
      });
      /**
       * Toolbar with submenu
       */
      var customMenuC = Cherry.createMenuHook('Help Center', {
        iconName: 'question',
        onClick: (selection, type) => {
          switch (type) {
            case 'markdown':
              return `${selection}Markdown tutorial: https://www.markdownguide.org/basic-syntax/`;
            case 'Emoji':
              return `${selection}Emoji reference: https://emojipedia.org/`;
            case 'formula':
              return `${selection}LaTeX formula editor: https://www.latexlive.com/`;
            case 'Example':
              return `${selection}Full examples: https://tencent.github.io/cherry-markdown/examples/index.html`;
            default:
              return selection;
          }
        },
        subMenuConfig: [{
          noIcon: true,
          name: 'Markdown Tutorial',
          onclick: (event) => {
            this.cherrInstance.toolbar.menus.hooks.customMenuCName.fire(null, 'markdown')
          }
        },
          {
            noIcon: true,
            name: 'Emoji Reference',
            onclick: (event) => {
              this.cherrInstance.toolbar.menus.hooks.customMenuCName.fire(null, 'Emoji')
            }
          },
          {
            noIcon: true,
            name: 'Formula Editor',
            onclick: (event) => {
              this.cherrInstance.toolbar.menus.hooks.customMenuCName.fire(null, 'formula')
            }
          },
          {
            noIcon: true,
            name: 'Full Examples',
            onclick: (event) => {
              this.cherrInstance.toolbar.menus.hooks.customMenuCName.fire(null, 'Example')
            }
          },
        ]
      });
      this.cherrInstance = new Cherry({
        id: mdId,
        value: defaultValue,
        fileUpload: fileUpload,
        // Third-party packages
        externals: { // externals
        },
        // Parser engine configuration
        engine: {
          // Global configuration
          global: {
            // Whether to enable classic line break logic
            // true: single line break is ignored, two+ consecutive breaks split into paragraphs
            // false: single line break becomes <br>, two consecutive breaks split into paragraphs
            classicBr: false,

            /**
             * Global URL processor
             * @param {string} url Source URL
             * @param {'image'|'audio'|'video'|'autolink'|'link'} srcType Source type
             * @returns
             */
            urlProcessor: this.urlProcessor,

            /**
             * Additional allowed HTML tags for rendering
             * Tags separated by vertical bars, e.g.: 'iframe|script|style'
             * Default is empty, see src/utils/sanitize.js whiteList for default allowed tags
             * Note:
             *    - Enabling iframe, script tags creates XSS risks, use carefully
             *    - Generally safe in controlled editing environments (like API docs)
             */
            htmlWhiteList: ''
          },
          // Built-in syntax configuration
          syntax: {
            // Syntax switches
            // 'hookName': false,
            // Syntax configurations
            // 'hookName': {
            //
            // }
            autoLink: {
              /** Whether to enable short links */
              enableShortLink: true,

              /** Short link length */
              shortLinkLength: 20
            },
            list: {
              listNested: false,
              // Convert same-level list type to sub-level
              indentSpace: 2 // Default 2-space indentation

            },
            table: {
              enableChart: false // chartRenderEngine: EChartsTableEngine,
              // externals: ['echarts'],

            },
            inlineCode: {
              theme: 'red'
            },
            codeBlock: {
              theme: 'dark',
              // Default dark theme
              wrap: true,
              // Wrap long lines or show scrollbar
              lineNumber: true,
              // Show line numbers by default
              copyCode: true,
              // Show "Copy" button
              customRenderer: { // Custom syntax renderer
              },
              mermaid: {
                svg2img: false, // Convert mermaid diagrams to img format
              },

              /**
               * Whether to enable indented code blocks
               *
               *    Not supported by default in versions before 6.X.
               *    Cherry team considered this syntax error-prone
               *    Team recommends using ``` code block syntax instead
               *    Added in 6.X after user feedback for specific use cases
               *    For backward compatibility with <6.x versions, disable with:
               *        indentedCodeBlock：false
               */
              indentedCodeBlock: true
            },
            emoji: {
              useUnicode: false, // Render using Unicode
              customResourceURL: 'https://github.githubassets.com/images/icons/emoji/unicode/${code}.png?v8',
              upperCase: true,

            },
            fontEmphasis: {
              /**
               * Allow surrounding whitespace
               * Examples:
               *    true:
               *           __ hello __  ====>   <strong> hello </strong>
               *           __hello__    ====>   <strong>hello</strong>
               *    false:
               *           __ hello __  ====>   <em>_ hello _</em>
               *           __hello__    ====>   <strong>hello</strong>
               */
              allowWhitespace: false
            },
            strikethrough: {
              /**
               * Require surrounding whitespace
               * Examples:
               *    true:
               *            hello wor~~l~~d     ====>   hello wor~~l~~d
               *            hello wor ~~l~~ d   ====>   hello wor <del>l</del> d
               *    false:
               *            hello wor~~l~~d     ====>   hello wor<del>l</del>d
               *            hello wor ~~l~~ d     ====>   hello wor <del>l</del> d
               */
              needWhitespace: false
            },
            mathBlock: {
              engine: 'MathJax',
              // katex or MathJax
              src: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js', // Required for MathJax
              plugins: true // Load plugins by default

            },
            inlineMath: {
              engine: 'MathJax',
              // katex or MathJax
              src: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js' // Required for MathJax
            },
            toc: {
              /** Only render one table of contents by default */
              allowMultiToc: false
            },
            header: {
              /**
               * Header styles:
               *  - default       Default with anchor links
               *  - autonumber    With auto-incrementing number anchors
               *  - none          No anchors
               */
              anchorStyle: 'default'
            }
          }
        },
        editor: {
          id: 'code',
          // textarea id attribute
          name: 'code',
          // textarea name attribute
          autoSave2Textarea: false,
          // Auto-sync content to textarea
          theme: 'default',
          // Based on codemirror themes: https://codemirror.net/demo/theme.htm
          // Editor height, 100% by default, inline styles take precedence
          height: '100%',
          // Default editor mode after initialization:
          // edit&preview: Split view with editing and preview
          // editOnly: Editing only (can switch via toolbar)
          // previewOnly: Preview only (toolbar shows "Return to edit" button)
          defaultModel: this.defaultModel,
          // Auto-convert HTML to markdown when pasting
          convertWhenPaste: true,
          codemirror: {
            // Auto-focus on load, true by default
            autofocus: true
          }
        },
        toolbars: {
          theme: 'dark',
          // light or dark
          showToolbar: this.defaultModel=="previewOnly"?false:true,
          // false: hide toolbar; true: show toolbar; same as toolbars.toolbar=false
          toolbar: ['bold', 'italic',
            {
              strikethrough: ['strikethrough', 'underline', 'sub', 'sup', 'ruby', 'customMenuAName'],
            },
            'size','|', 'color', 'header', '|','drawIo', '|', 'list',
            'panel', 'justify', // Alignment options
            'detail', '|', {
              insert: ['image', 'audio', 'video', 'link', 'hr', 'br', 'code', 'formula', 'toc', 'table',
                'line-table', 'bar-table', 'pdf', 'word'
              ]
            }, 'graph', 'export', 'codeTheme', 'switchModel', 'togglePreview',
            // {
            //   customMenuBName: ['ruby', 'audio', 'video', 'customMenuAName'], // Laboratory
            // },
            'settings', 'customMenuCName', 'theme'
          ],
          toolbarRight: ['fullScreen', '|'],
          bubble: ['bold', 'italic', 'underline', 'strikethrough', 'sub', 'sup', 'quote', 'ruby', '|', 'size',
            'color'
          ],
          // array or false
          "float": ['h1', 'h2', 'h3', '|', 'checklist', 'quote', 'quickTable', 'code'], // array or false
          sidebar: ['mobilePreview', 'theme'], // 'copy',
          customMenu: {
            customMenuAName: customMenuA,
            customMenuBName: customMenuB,
            customMenuCName: customMenuC,
          },
        },
        // URL for draw.io editor, button disabled if empty
        drawioIframeUrl: window.location.origin + '/CherryMarkdown/drawio_demo.html',
        /**
         * Specify file types for upload
         */
        fileTypeLimitMap: {
          video: 'video/*',
          audio: 'audio/*',
          image: 'image/*',
          word: '.doc,.docx',
          pdf: '.pdf',
          file: '*',
        },
        callback: {
          afterChange: this.afterChange,
          afterInit: this.afterInit,
          beforeImageMounted: this.beforeImageMounted,
          // Preview area click event, works when previewer.enablePreviewerBubble = true
          onClickPreview: this.onClickPreview,
          // Callback when copying code block content
          onCopyCode: this.onCopyCode,
          // Callback for converting Chinese to pinyin (or other string transformations)
          changeString2Pinyin: this.changeString2Pinyin
        },
        previewer: {
          // Custom class for markdown preview area
          className: 'cherry-markdown-previewer'
        },
        // No event binding needed for preview page
        isPreviewOnly: false,
        // Auto-scroll preview area with editor cursor
        autoScrollByCursor: true,
        // Force output to body when container doesn't exist
        forceAppend: true,
        // The locale Cherry is going to use. Locales live in /src/locales/
        locale: 'en_US'
      })
    },
    // General upload interface
    fileUpload(file) {
      var formData = new FormData()
      formData.append('file', file)
      var request = new XMLHttpRequest()
      // Update image upload path to your endpoint
      request.open('POST', process.env.VUE_APP_BASE_API + '/common/upload')
      request.setRequestHeader('Authorization', "Bearer " + getToken())
      request.onload = this.onloadCallback
      request.send(formData)
    },
    onloadCallback(oEvent) {
      var currentTarget = oEvent.currentTarget
      if (currentTarget.status !== 200) {
        return this.$message({
          type: 'error',
          message: currentTarget.status + ' ' + currentTarget.statusText
        })
      }
      var resp = JSON.parse(currentTarget.response)
      let imgMdStr = ''
      if (resp.code !== 200) {
        return this.$message({
          type: 'error',
          message: resp.msg
        })
      }
      if (resp.code === 200) {
        if (/mp4|avi|rmvb/i.test(resp.fileSuffix)) {
          imgMdStr = `!video[${resp.fileOriginName}](${process.env.VUE_APP_BASE_API + resp.fileName})`;
        } else if (/mp3/i.test(resp.fileSuffix)) {
          imgMdStr = `!audio[${resp.fileOriginName}](${process.env.VUE_APP_BASE_API + resp.fileName})`;
        } else if (/bmp|gif|jpg|jpeg|png/i.test(resp.fileSuffix)) {
          imgMdStr = `![${resp.fileOriginName}](${process.env.VUE_APP_BASE_API + resp.fileName})`
        } else {
          imgMdStr = `[${resp.fileOriginName}](${process.env.VUE_APP_BASE_API + resp.fileName})`
        }
      }
      this.cherrInstance.insert(imgMdStr)
    },
    // Global URL processor
    urlProcessor(url, srcType) {
      return url;
    },
    // Change event callback
    afterChange(text, html) {
      this.content = text
      this.$emit('mdChange', html, text)
      this.$emit('input', text)
    },
    // Initialization callback
    afterInit(e) {},
    // Image loading callback
    beforeImageMounted(e, src) {
      return {
        [e]: src
      }
    },
    // Preview area click event
    onClickPreview(event) {},
    // Paste event
    onCopyCode(event, code) {
      // Prevent default paste event
      // return false;
      // Additional processing for copied content
      return code;
    },
    // Convert Chinese to pinyin
    changeString2Pinyin(string) {
      /**
       * Recommend using this component: https://github.com/liu11hao11/pinyin_js
       *
       * Can be referenced directly in ../scripts/pinyin/pinyin_dist.js
       */
      var pinyin = require("./pinyin/pinyin.js");
      return pinyin.pinyin(string, " ");
    },
    setMarkdown(content, keepCursor) {
      if (!this.cherrInstance) { // Re-initialize if not loaded
        this.initCherryMD(content)
        return
      }
      this.cherrInstance.setMarkdown(content)
    },
    getCherryContent() {
      var result = this.cherrInstance.getMarkdown() // Get markdown content
      return result
    },
    getCherryHtml() {
      var result = this.cherrInstance.getHtml()
      return result
    },
    getData() {
      var result = this.cherrInstance.getHtml()
      return result
    },
    /**
     * type：{'pdf'|'img'}
     */
    exportMD(type = 'pdf') {
      this.cherrInstance.export(type)
    },
    /**
     * model{'edit&preview'|'editOnly'|'previewOnly'}
     */
    switchModel(model) {
      if (this.isInit()) {
        this.cherrInstance.switchModel(model)
      }
    },

    insert(content, isSelect = false, anchor = [], focus = true) {
      this.cherrInstance.insert(content, isSelect, anchor, focus)
    },
    isInit() {
      if (this.cherrInstance) {
        return true
      }
      this.$message.warning('Editor not initialized, please check')
      return false
    },
  }
}
</script>

<style lang="scss" >
// draw.io style modifications (cannot use scoped)
.cherry-dialog {
  z-index: 9999 !important;
  .cherry-dialog-iframe {
    width: 100%;
    height: 100%;
  }
}
.cherry-markdown-previewer {
  border: none;
  padding: 20px 20px 20px 20px;
  background-color: white;
  box-shadow: 0 0px 0px white;
  -webkit-box-shadow: 0 0px 0px white!important;
}
</style>

