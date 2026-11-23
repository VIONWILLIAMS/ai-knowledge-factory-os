# AI Knowledge Factory OS

一个用 Three.js 搭建的交互式 3D 工厂原型，将需求接收、经营决策、生产流水线与交付呈现在同一个工厂空间里。

## 在线体验

- [主工厂](https://vionwilliams.github.io/ai-knowledge-factory-os/)
- [v1.2 独立 3D 场景](https://vionwilliams.github.io/ai-knowledge-factory-os/factory-scene.html)
- [版本实验室](https://vionwilliams.github.io/ai-knowledge-factory-os/factory-versions.html?version=1.2)
- [中控塔](https://vionwilliams.github.io/ai-knowledge-factory-os/index.html?tower=1)
- [工厂矩阵和机会雷达](https://vionwilliams.github.io/ai-knowledge-factory-os/factory-matrix.html?radar=1)

GitHub Pages 提供静态演示，中控塔使用内置规则完成高管问答、会议和任务回流。

## 本地运行

安装 Node.js，在仓库目录运行：

```sh
node record-server.mjs
```

访问 [本地工厂](http://localhost:8081/)。需要 GLM-5.2 时，在启动服务前设置 `ZAI_API_KEY` 或 `GLM_API_KEY` 环境变量。浏览器通过本地 Node 服务调用模型。
