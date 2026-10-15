# 脚手架协作约定

- `packages/*` 之间禁止相互 import（只允许 apps 引 packages），需要共享逻辑下沉到 utils
- 网络请求一律走 `@scaffold/api` 的 createRequest 实例，禁止裸 axios
- 包命名 `@scaffold/*`；全局替换 scaffold 为你的项目前缀
- apps 不得直接依赖第三方请求库
