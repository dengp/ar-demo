import getBehavior from './behavior'
import yuvBehavior from './yuvBehavior'

const NEAR = 0.001
const FAR = 1000

Component({
  behaviors: [getBehavior(), yuvBehavior],
  data: {
    theme: 'light',
    frameShow: false,
    frameX: 0,
    frameY: 0,
    frameWidth: 0,
    frameHeight: 0,
  },
  lifetimes: {
    detached() {
      if (wx.offThemeChange) {
        wx.offThemeChange()
      }
    },
    ready() {
      wx.showLoading()
      this.setData({
        theme: wx.getSystemInfoSync().theme || 'light'
      })
      if (wx.onThemeChange) {
        wx.onThemeChange(({theme}) => {
          this.setData({theme})
        })
      }
    },
  },
  methods: {
    init() {
      this.initGL()
    },
    afterVKSessionCreated() {
      this.session.on('addAnchors', anchors => {
        const anchor = anchors[0]
        const {
          width,
          height
        } = this.data
        if (anchor && this.markerId) {
          this.setData({
            frameShow: true,
            frameX: anchor.origin.x * width,
            frameY: anchor.origin.y * height,
            frameWidth: anchor.size.width * width,
            frameHeight: anchor.size.height * height,
          })
        }
      })
      this.session.on('updateAnchors', anchors => {
        const anchor = anchors[0]
        const {
          width,
          height
        } = this.data
        if (anchor) {
          this.setData({
            frameX: anchor.origin.x * width,
            frameY: anchor.origin.y * height,
            frameWidth: anchor.size.width * width,
            frameHeight: anchor.size.height * height,
          })
        }
      })
      this.session.on('removeAnchors', anchors => {
        this.setData({
          frameShow: false,
        })
      })
      this.addOSDMarker()
    },
    render(frame) {
      this.renderGL(frame)
      const camera = frame.camera
      if (camera) {
        this.camera.matrixAutoUpdate = false
        this.camera.matrixWorldInverse.fromArray(camera.viewMatrix)
        this.camera.matrixWorld.getInverse(this.camera.matrixWorldInverse)
        const projectionMatrix = camera.getProjectionMatrix(NEAR, FAR)
        this.camera.projectionMatrix.fromArray(projectionMatrix)
        this.camera.projectionMatrixInverse.getInverse(this.camera.projectionMatrix)
      }
      this.renderer.autoClearColor = false
      this.renderer.render(this.scene, this.camera)
      this.renderer.state.setCullFace(this.THREE.CullFaceNone)
    },
    addOSDMarker() {
      if (this.markerId) return
      const fs = wx.getFileSystemManager()
      const filePath = `${wx.env.USER_DATA_PATH}/osd-ar.jpg`
      wx.compressImage({
        src: './assets/jz.jpg', 
        quality: 100,
        success: (res) => {
          fs.saveFile({
            filePath,
            tempFilePath: res.tempFilePath,
            success: () => {
              this.markerId = this.session.addOSDMarker(filePath)
              wx.hideLoading()
            }
          })
        }
      })
    },
    resultClick() {
      wx.showModal({
        title: '提示',
        content: '崇宁镇老爷庙是渭华起义发祥地，想听听渭华起义的更多历史吗?',
        success (res) {
          if (res.confirm) {
            const backgroundAudioManager = wx.getBackgroundAudioManager()
            backgroundAudioManager.title = '渭华起义'
            backgroundAudioManager.src = 'https://tqai-76286.gzc.vod.tencent-cloud.com/3024/bc269d073a33bed22a9070211a6b2850.mp3'
          } else if (res.cancel) {
            wx.navigateTo({
              url: '/pages/webview/webview'
            });
          }
        }
      })
    }
  },
})