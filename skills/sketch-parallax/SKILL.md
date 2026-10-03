---
name: sketch-parallax
description: 把人物、动物或物件图片制作成电脑浏览的透明手绘分层 HTML，支持共享 3D 穿梭空间和逐页独立 3D 手稿。用于彩铅、石墨笔触拆开并从正面重组的交互效果。
---

# Sketch Parallax · 手绘视界

目标是电脑端交互 HTML，不默认做手机版、MP4 或真实身体建模。支持 1–8 个主体。每个主体先有可靠透明素材，再做可选手绘转换，最后用随包模板产生两种空间效果。

## 先确认能力，不假定工具存在

读取 [references/capabilities.md](references/capabilities.md)，运行 `python scripts/doctor.py`。确认可用的 Python、图像编辑工具和浏览器。

- 必需：Python + Pillow；可执行本地脚本；支持 WebGL2 的电脑浏览器。
- 抠图：已有透明图或用户蒙版不需要模型；不透明图可选本地 rembg。模型另下载，不在 skill 包里。动漫优先试 isnet-anime，照片/动物试 isnet-general-use，结果必须看图验收。
- 当前彩铅效果：需要图像编辑/生成工具，或用户直接提供透明手绘稿。没有编辑能力时可用透明原图展示空间分层，但要说明未做手绘转换，不能把普通滤镜宣称为同等效果。
- **不需要 AI 单目深度模型。** 模板生成 14 层局部笔触和轻微曲面深度，这属于人工设计的艺术空间；不是从图中恢复真实身体。用户要求真实深度、肢体运动或侧背面时，本模板不足，要说明并另选技术。
- 验证可选依赖：Playwright + Chromium。没有浏览器自动化时仍可构建，手动检查页面，并明确未自动验证。
- 音乐可选。没有授权音频就不放音乐，不从参考视频抽取音轨，不需要语音/音乐 API。

## 模式语义

- `mixed.html`：所有角色在共享固定 3D 空间，镜头穿过笔触，左右错开站位。检查每个正面停留点，上一角色不能覆盖当前角色的脸和身体。
- `pages.html`：每页只绘制当前角色自己的独立 3D 空间。拖动旋转、缩放、层间距离、播放和上下页切换都有；其他角色不绘制、不参与遮挡。这里的“逐页”不表示静态图片、平面 PDF，也不是共享空间里移动到下一块板。

用户只要一种就只交付对应入口；两种都要时使用共享素材，避免重复嵌入大图片。

## 素材流程

1. 保存来源，先裁掉截图状态栏、播放器和无关边缘。保留主体全部轮廓。
2. 用 `scripts/cutout.py` 生成透明 PNG 和棋盘格/浅色/深色预览。看耳尖、头发、翅膀、尾巴、白衣、胡须等，不通过颜色接近白色来删除背景。用户给局部轮廓时修改蒙版，不重画其他已认可区域。照片中的运动模糊保留。
3. 用户要手绘时，读 [references/artwork.md](references/artwork.md)，通过实际可用图像编辑工具做彩铅/石墨转换，要求真透明背景和身份保留。纸感属于场景，不放进 PNG。生成后的面部、服饰和轮廓都要看；如果失败，不把错误生成稿拿来继续构建。
4. 用户要原图风格时不做生成。明确输出是原像素素材空间化；脚本抠图只改 alpha。

## 构建

按 [references/manifest.md](references/manifest.md) 写 JSON，图像路径相对该 JSON。先跑一个主体，再扩展多主体。命令中 `scripts/` 相对本 skill 目录；在别处运行用真实 skill 的绝对路径。

```bash
python -m pip install -r requirements.txt
python scripts/build.py --manifest /path/to/scene.json --out /path/to/site
```

默认产生共享的 `data.js`、`engine.js`、`style.css` 和两个 HTML，`index.html` 指向混合版。素材转 WebP 并嵌入 data URI，离线 file:// 下不依赖跨域贴图读取；上传 GitHub 要带完整站点目录。

需要每个入口独立单文件时加 `--standalone`，并如实报告重复素材带来的体积。默认不安装 Node、Three.js、FFmpeg 或大深度模型。

## 验收

```bash
python -m pip install -r requirements-test.txt
python -m playwright install chromium
python scripts/verify.py --site /path/to/site --qa /path/to/qa
```

看正面、侧面和每个角色的截图。确认：背景干净、正面认得出主体、侧面真实分开、无完整图片替换/磁吸重组、停留点无遮挡；空间坐标固定；独立页每次仅绘制当前角色 14 层；拖动/缩放/复位/播放正常；静止停止重绘、后台暂停。软件渲染测试不能冒充真实显卡性能实测。

这是一种透明手绘纹理的局部笔触分层，不是每根线条提取为独立向量曲线。需要真正逐根绘制时另做笔迹提取，而不要误报本模板的能力。

## 精简交付

交付完整站点目录或 ZIP、构建说明与实际验证结果。不要塞入源截图、用户目录路径、参考视频、PNG 大稿、模型权重、venv、node_modules、浏览器安装包或缓存。可保留必要来源说明、音频许可、压缩素材和一张测试截图。除非用户要求保存原始素材，否则测试中间文件留在本地工作目录。
