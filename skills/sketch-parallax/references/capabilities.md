# 能力与安装路径

## 最小运行条件

| 环节 | 能力/依赖 | 缺少时 |
| --- | --- | --- |
| 从透明稿生成 HTML | Python 3.10+、Pillow | `python -m pip install -r requirements.txt` |
| 查看交互 | 支持 WebGL2、启用硬件加速的现代电脑浏览器 | 告知浏览器不支持；不能声称静态截图有 3D 交互 |
| 不透明输入抠图 | rembg CPU + 对应模型，或已有蒙版/编辑工具 | 使用 RGBA/蒙版路径；没有任何抠图手段时停在素材阶段并指出缺口 |
| 手绘风格转换 | 能编辑参考图且输出 alpha 的图像工具 | 接受用户透明手绘稿，或经用户选择保留原图风格 |
| 理解图片/检查质量 | Agent 视觉能力或用户验收 | 做程序检查但不能声称已看图确认 |
| AI 深度估计 | 本效果不要求 | 不安装；艺术深度由 WebGL 代码生成 |
| 自动化验证 | Playwright + Chromium | 可以手动检查，记录未自动验证 |
| 声音 | 用户许可的 MP3 | 不配乐；配乐按钮禁用 |

## 可选抠图环境

推荐新建 Python 3.11/3.12 的虚拟环境，不把依赖装进用户其他项目。Windows 用该 venv 的 `Scripts/python.exe`，Linux/macOS 用 `bin/python`。

```bash
python -m venv .venv-cutout
# 用虚拟环境里的 python 执行下一行
python -m pip install -r requirements-cutout.txt
python scripts/cutout.py --input input.png --out-dir cutouts --model isnet-anime
```

模型第一次使用由 rembg 下载到其用户缓存，需要网络。之后可复用缓存。照片用 `--model isnet-general-use`，也可根据实际主体选择其他 rembg 模型。不要把动漫模型强加到猫、商品和人物照片上。下载失败且没有蒙版时说明具体失败，不悄悄把完整背景当透明主体。

已有透明 PNG 无需 rembg；提供一一对应蒙版时使用：

```bash
python scripts/cutout.py --input original.jpg --masks mask.png --out-dir cutouts
```

黑白蒙版须与原图尺寸相同，白色保留、黑色删除。只改 alpha，不去锐化真实毛发，不重画照片。

## 工具可移植性

本 skill 不绑定某个私有 MCP、API 密钥、操作系统路径或图像生成服务。Agent 在当前工具清单中确认图像编辑能力；工具名字不一样也可以使用，只要能输入参考图并返回透明图。Codex 内置 `image_gen.imagegen` 可直接用 `transparent_background:true`，不需要用户提供 API key。其他客户端使用其已有编辑工具；没有工具时不会因安装这个 skill 自动获得能力。

图像编辑是外部能力，不把可执行脚本伪装为“自带生图模型”。如果用户选择付费 API 路径，按该服务的实际文档与用户授权配置，密钥永不放入仓库。
