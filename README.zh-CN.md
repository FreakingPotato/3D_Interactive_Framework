# 3D Interactive Framework

**用三维、手势和声音，探索你感兴趣的复杂系统。**

这是一个可复用的浏览器三维交互框架起点。WCM 是首批案例，不是框架的边界，也不是我们开发的科学模型。三维资产、手势模型、声音合成代码和两段真实预处理数据均已准备好。

[English](README.md) · [接入自己的项目](docs/ADAPTERS.md) · [来源与鸣谢](THIRD_PARTY_NOTICES.md)

![三维交互案例](docs/preview.png)

## 本地体验：无需 Blender 或 WCM

安装 Python 3.10+，运行：

```sh
git clone https://github.com/FreakingPotato/3D_Interactive_Framework.git
cd 3D_Interactive_Framework
python3 scripts/build_site.py --out _site
python3 -m http.server 8766 --bind 127.0.0.1 --directory _site
```

Windows 可将 `python3` 换成 `py -3`。打开 **http://localhost:8766/**。不需要安装 Python 依赖、Node、模型求解器或建模工具。开发测试才需要 `npm ci`。

- 左上角切换 vEcoli 与 minimal cell，每套案例包含 0–60 秒真实预处理数据。
- 三维拖动、缩放、剖切、结构展开、选择和透明度调节。
- 自愿开启本地摄像头手势；视频不上传，鼠标键盘始终可用。
- 声音默认关闭；播放时随数据变化，选中群体只听该群体，也可暂停试听。
- 不依赖 WCM 的粒子示例：**http://localhost:8766/examples/particle-lab/**。

演示两套数据合计约 24 MB 压缩体积；完整软件包还包含即用的三维与手势资产。演示不运行实时求解器，不提供新实验计算。摄像头需要 localhost 或 HTTPS。

## 用于其他项目

从 `examples/particle-lab/app.js` 开始：提供自己的组件、状态和时间数据，将选择与手势接到普通 Three.js 场景，并配置自己的声音纹理。共用模块与细胞专属适配器已在 [接入指南](docs/ADAPTERS.md) 中说明。

这是早期框架项目，尚不是稳定的通用 SDK；界面控制器仍有少量约定的元素 ID。我们会优先让接入方式清楚、可验证，而不是声称所有领域可以零改动套用。

## 缓存与性能

短演示会自动后台下载全部帧。完整轨迹有 7,201 帧，不会全部解码塞入内存：解码后的帧限制为 128 MiB / 12 帧，压缩内存缓存 48 MiB，浏览器持久缓存上限 768 MiB，单次轨迹后台下载预算 512 MiB。浏览器配额不足时可继续按需播放。下载缓存不能消除 GPU 绘制成本。

完整数据或模型求解器属于高级接入，见 [本地部署文档](docs/LOCAL_DEPLOYMENT.md)。GitHub Pages 只托管静态演示，部署见 [发布指南](docs/PUBLISHING.md)。预期地址为 `https://freakingpotato.github.io/3D_Interactive_Framework/`，以首次成功部署结果为准。

## 许可证与鸣谢

原创框架代码采用 **Apache-2.0 + NOTICE**：允许免费使用、修改与商用，分发时保留适用的许可证、版权和署名通知。欢迎在项目介绍与论文中引用我们；不额外强制每个网站在首页显示标记。

请分别鸣谢科学工作：**Covert Lab / vEcoli**；**Thornburg、Maytin 等人的 4D minimal cell 模型与 Zenodo 数据**；**Google DeepMind / EMBL-EBI AlphaFold DB**。最小细胞数据与 AlphaFold 衍生结构保持 CC BY 4.0，不改成我们的软件许可证。详情见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

vEcoli 空间布局为示意；最小细胞保留原始格点坐标，分子造型与朝向仍为示意；声音为数据映射，不是真实细胞录音。

如果这个项目对你有帮助，欢迎 Star、分享你的案例或贡献新的数据适配器。
