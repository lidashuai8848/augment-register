# 🚀 Vercel 部署指南

## 📋 部署步骤

### 1. 准备工作
确保你有以下信息：
- QQ邮箱账号（如：your-email@qq.com）
- QQ邮箱授权码（不是QQ密码！）

### 2. 获取QQ邮箱授权码
1. 登录QQ邮箱网页版
2. 设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务
3. 开启"IMAP/SMTP服务"
4. 生成授权码（16位字符串）

### 3. 部署到Vercel

#### 方法一：通过Vercel CLI
```bash
# 安装Vercel CLI
npm install -g vercel

# 登录Vercel
vercel login

# 部署项目
vercel

# 设置环境变量
vercel env add QQ_USER
# 输入你的QQ邮箱地址

vercel env add QQ_PASS  
# 输入你的QQ邮箱授权码

# 重新部署以应用环境变量
vercel --prod
```

#### 方法二：通过Vercel网页控制台
1. 访问 [vercel.com](https://vercel.com)
2. 连接GitHub仓库
3. 导入此项目
4. 在项目设置中添加环境变量：
   - `QQ_USER`: 你的QQ邮箱地址
   - `QQ_PASS`: 你的QQ邮箱授权码
5. 重新部署

### 4. 测试部署
部署成功后，你的API地址将是：
```
https://your-project-name.vercel.app/api/code
```

### 5. 更新油猴脚本
修改 `anonaddy.js` 中的API地址：
```javascript
const API_URL = "https://your-project-name.vercel.app/api/code";
```

## 🔧 故障排除

### 常见问题
1. **API返回404** - 检查vercel.json配置是否正确
2. **认证失败** - 检查QQ邮箱授权码是否正确
3. **CORS错误** - 确保API正确设置了CORS头部

### 调试方法
1. 查看Vercel函数日志
2. 使用本地测试服务器验证逻辑
3. 检查环境变量是否正确设置

## ✅ 验证部署成功
1. 访问 `https://your-project-name.vercel.app` 应该看到欢迎页面
2. 使用curl测试API：
```bash
curl -X POST "https://your-project-name.vercel.app/api/code" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## 🎯 下一步
部署成功后，就可以使用油猴脚本自动获取验证码了！
