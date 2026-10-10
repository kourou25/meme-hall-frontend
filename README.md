# 尽欢 · 前端

> 发出 meme 千万张，欲得摸鱼佬友尽欢颜。

「尽欢」梗图交流站的前端代码。站点基于 Linux.DO 账号登录，支持图廊浏览、表情回应、一句回应、收藏、评论、解密谜题、群聊等。

- 纯静态文件，不需要构建：原生 JS（`app.js`）+ CSS（`style.css`、`chat.css`、`skin.css`），入口 `index.html`
- 平台表情在 `stickers/`，第三方库自托管在 `vendor/`（各自附带许可证）
- 服务端（Cloudflare Workers + D1 + R2）不在本仓库，前端单独无法完整运行

本仓库由私有主仓库的 `public/` 目录自动同步，请不要直接在这里提交修改。

## 许可

代码以 [MIT](LICENSE) 许可发布。`vendor/` 下的第三方库遵循各自的许可证。
