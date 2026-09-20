# 奶泡的草地小镇

一个可以直接在浏览器中探索的低多边形 3D 小镇。

在线体验：https://naipao-grass-town.poohtw342613.chatgpt.site

GitHub Pages：https://neohoy.github.io/naipao-grass-town/

## 当前内容

- 扩大后的圆形草地岛、中心广场和三栋小镇建筑
- Blender 制作的小镇 GLB 场景
- Hyper3D 生成、Blender 拆件绑定的奶泡角色
- 点击地面移动，支持方向键和 WASD
- 建筑碰撞、角色转向、走路动画和跟随镜头
- 桌面与手机响应式显示

## 本地预览

```bash
python3 -m http.server 4173 -d dist
```

打开 `http://127.0.0.1:4173/`。

网页使用原生 Three.js 和 GLTFLoader，不需要构建步骤。
