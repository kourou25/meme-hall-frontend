# 音乐服务分页修改对应源码

这是当前运行的第三方音乐服务及库的对应源码。基于 go-music-dl v1.1.3（2c1cefe7064fba6e46034359791060debbc935e6）与 music-lib v1.1.1-0.20261018010056-7cc4467b4e30，修改日期 2026-10-27；两者遵循各自保留的 AGPL-3.0 LICENSE。未包含尽欢站点自有 Worker、账号、凭据、数据库或用户媒体。

改动：core/service.go、internal/web/music.go 传递 page / limit；music-lib 的 netease、qq、kuwo、kugou 搜索支持页码；go.mod 的本地 replace 隔离修改。保留上游可用性与账号权限处理，没有修改鉴权。

使用 Go 1.25.12，在解压根目录执行：

```sh
cd music-farm-farewell-20261026/go-music-dl
go build -o ../../music-dl ./cmd/music-dl
```

请保留两个目录的相对位置，以便 go.mod 的 replace 生效。依赖版本由 go.mod / go.sum 固定。外部音乐源可能变更或不可用。运行及分发遵循各目录许可证及适用的内容授权。

官方源码：https://github.com/guohuiyuan/go-music-dl ，https://github.com/guohuiyuan/music-lib 。仅省略 CI 工作流、截图和空环境配置示例；Go 源码、模板、静态依赖、构建文件与许可证保留。manifest.json 列出逐文件 SHA256。
