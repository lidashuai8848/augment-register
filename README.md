# Augment Code 注册工具

> 支持两种邮箱方案，任选其一即可自动完成 AugmentCode 注册流程。

**一句话总结**：全部免费、复制放在油猴即用。AnonAddy 需要在官网注册账号和 key（
免费） ，GuerrillaMail 直接复制即用，在学不会把我腿打断 😁

## ✅ 方案一：AnonAddy 无限别名邮箱（推荐）

### 总结

> 无限别名自动创建为：  
> `随机字符串@user202vcd.anonaddy.com`  
> 域名或 Token 有变，只需修改脚本中的 `ADDY.token` 或 `createAlias` 里的域名。

1. 前往 [AnonAddy API 设置页](https://app.addy.io/settings/api) 注册账号并获取
   **Bearer Token**。
2. 将 Token 填入脚本 `ADDY.token` 变量即可使用。
3. 脚本会自动：
   - 创建一次性别名
   - 轮询收件箱
   - 提取验证码并完成注册

### 详情

| 步骤                     | 操作指引                                                                                                                                       | 直达链接                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **1. 注册账号**          | 打开官网 → 右上角 **Register** → 填写用户名、真实邮箱、密码 → 查收验证信 → 点击验证链接完成注册                                                | [https://anonaddy.com](https://anonaddy.com)                         |
| **2. 获取 API Token**    | 登录后进入 **Settings → API** → 点击 **Create New Token** → 复制生成的 `Bearer Token`（形如 `addy_io_xxxxxxxx`）→ 粘贴到脚本 `ADDY.token` 变量 | [https://app.addy.io/settings/api](https://app.addy.io/settings/api) |
| **3.（可选）自定义域名** | 免费用户可跳过；若拥有独立域名，进入 **Settings → Domains** 按提示添加 MX / SPF / DKIM 记录即可使用                                            | [https://app.addy.io/domains](https://app.addy.io/domains)           |
| **4. 直接使用**          | 注册网站时直接填写：<br>`任意前缀@你的用户名.anonaddy.com`<br>系统会自动创建别名并转发到你的真实邮箱                                           | —                                                                    |

> **免费额度**：每月 10 MB 流量 ≈ 140 封纯文本邮件；可创建 **无限标准别名**  
> **API 文档**：[https://docs.anonaddy.com/api](https://docs.anonaddy.com/api)

---

## ✅ 方案二：GuerrillaMail 临时邮箱（免注册即用）

### 总结

什么都不需要配置，复制(GuerrillaMail.js)即可使用。注意：部分网址会识别到 临时邮
箱，禁止临时邮箱注册，建议使用方案一，3 分钟就可以高度，本文已极简。

#### 详情

1. **生成一次性临时邮箱**（GuerrillaMail）
2. **自动填写并提交** AugmentCode 注册表单
3. **轮询收件箱**，读取验证码邮件并提取 6 位数字
4. **回填验证码**，完成注册

| 步骤                | 操作指引                                                                                                                          | 直达链接                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **1. 官网直用**     | 打开官网即可看到一个已分配好的临时邮箱（如 `abc123@guerrillamail.com`）                                                           | [https://www.guerrillamail.com](https://www.guerrillamail.com)                                                           |
| **2. 查收邮件**     | 页面左侧 **Check Mail** 每 5 秒自动轮询；或直接调用 API：<br>`https://api.guerrillamail.com/ajax.php?f=check_email&sid_token=xxx` | [https://api.guerrillamail.com/ajax.php?f=get_email_address](https://api.guerrillamail.com/ajax.php?f=get_email_address) |
| **3. API 参数**     | 无需登录，每次访问返回 `sid_token`；脚本自动提取 `PHPSESSID` Cookie；邮箱 60 分钟后失效                                           | —                                                                                                                        |
| **4. 转发（可选）** | 免费版 **不支持** 自定义转发；如需可手动转发到个人邮箱                                                                            | —                                                                                                                        |

> **使用期限**：邮箱保持 **60 分钟** 有效，超时后清空  
> **API 文
> 档**：[https://www.guerrillamail.com/api](https://www.guerrillamail.com/api)

#### GuerrillaMail 邮箱模块

| 步骤                 | 接口 & 说明                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **3.1 获取临时邮箱** | `GET https://api.guerrillamail.com/ajax.php?f=get_email_address`<br>解析 `email_addr` 字段，同时记录 `PHPSESSID` Cookie           |
| **3.2 轮询收件箱**   | 每 5 秒访问 `f=check_email`<br>检查 `list` 数组有无新邮件，返回最新 `mail_id`                                                     |
| **3.3 拉取邮件正文** | `GET f=fetch_email` 拉回整封邮件<br>使用三套正则提取 6 位数字验证码：<br>• 纯文本：`/\b\d{6}\b/`<br>• HTML 标签包裹<br>• 宽松匹配 |

#### 页面自动化模块

| 功能           | 实现要点                                                |
| -------------- | ------------------------------------------------------- |
| **等待元素**   | `waitForElement(selector, timeout=10s)` 每 100 ms 轮询  |
| **填写邮箱**   | 找到 `input[name="username"]` → 填入临时邮箱 → 点击提交 |
| **填写验证码** | 自动重试 5 次，间隔 5 秒；失败弹出手动输入框            |
| **完成注册**   | 勾选服务条款（如存在）→ 找到并点击注册按钮              |

#### 主流程 main()

1. 判断当前 URL 是否属于 augmentcode 注册/登录子域名
2. 根据页面元素决定所处步骤：
   - 邮箱输入页 → 显示「开始注册」按钮
   - 验证码页 → 自动跑验证码流程
   - 服务条款页 → 自动勾选并提交
   - 未知页 → 提示手动操作，提供重试按钮
3. 任何异常都会写入日志面板，按钮恢复可点

---

## 📚 一页速查链接汇总

| 服务              | 官网                                               | 注册 / 配置页                                                | API 文档                                                   |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| **AnonAddy**      | [anonaddy.com](https://anonaddy.com)               | [app.addy.io/settings/api](https://app.addy.io/settings/api) | [docs.anonaddy.com/api](https://docs.anonaddy.com/api)     |
| **GuerrillaMail** | [guerrillamail.com](https://www.guerrillamail.com) | 无需注册，即开即用                                           | [guerrillamail.com/api](https://www.guerrillamail.com/api) |

---

## 📦 脚本功能速览

| 区域              | 作用                                                                       |
| ----------------- | -------------------------------------------------------------------------- |
| **Metadata**      | 声明脚本名称、生效域名、所需权限                                           |
| **UI 创建**       | 页面右下角可折叠「日志面板」实时展示进度                                   |
| **日志系统**      | • `userLog`：关键信息展示在面板<br>• `debugLog`：详细信息输出到 F12 控制台 |
| **邮箱模块**      | 与 AnonAddy 或 GuerrillaMail API 交互：拿邮箱、轮询、解析验证码            |
| **页面操作模块**  | 使用 `waitForElement` 检测并填写表单、勾选条款、点击按钮                   |
| **主流程 main()** | 根据当前页面所处阶段调用对应函数                                           |

> 任选一种邮箱方案即可，脚本已分别封装，互不干扰。

## 🤝 技术交流

如果您在使用过程中遇到问题或有更好的建议，欢迎交流讨论：

- 📱 关注公众号「**彩色之外**」获取更多开发技巧和工具分享
- 🌐 访问 [个人技术官网](https://zk-99999.netlify.app/welcome.html) - 超级工具等
  你来用
- 🐛 [提交 Issue](../../issues) 报告问题或建议
- ⭐ 觉得项目有用请给个 Star 支持一下

## 📄 许可证

MIT License

## ♻️ ide 清理工具

1. 双击运行 augment-magic.exe
2. [augment-device-manager](https://github.com/Huo-zai-feng-lang-li/augment-device-manager)

## 📜 免责声明（技术研究与合法使用）

本脚本仅供 **安全研究、自动化测试与个人学习** 之用。  
使用即视为已阅读并同意以下条款：

1. **禁止违法用途**：严禁用于批量注册、绕过限制、破坏服务条款或任何违法行为。
2. **遵守目标网站政策**：使用前请阅读 AugmentCode / AnonAddy / GuerrillaMail 的
   服务条款，若禁止自动化请立即停用。
3. **数据与隐私**：脚本仅在本地运行，不收集或上传任何用户信息；网络请求可能被目
   标服务记录，风险自负。
4. **功能无保证**：作者不对脚本完整性、准确性或持续可用性负责，因页面改版、接口
   更新等导致的任何损失概不承担。
5. **责任自负**：因使用或滥用脚本导致的账号封禁、法律责任或其他纠纷，均由使用者
   自行承担。

> 若不同意本声明，请勿下载、安装或运行本脚本。  
> **使用时即视为已阅读并同意以上全部条款。**
