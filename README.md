# 标签修改器

一个基于 Streamlit 的在线标签修改工具，适合团队内部统一管理素材命名规则，并批量纠正旧命名。

## 功能

- 账号密码登录
- 默认管理员与人员管理
- 规则管理
- 批量导入旧命名
- 自动生成纠正后命名
- 改名对照导出为 Excel

## 默认管理员

- 账号：`admin`
- 密码：`Tonghua2026!`

首次部署后建议登录管理员账号并立即修改或新增内部使用账号。

## 本地运行

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

启动后默认访问：

```text
http://localhost:8501
```

## 部署到 Streamlit Community Cloud

1. 把本项目推送到 GitHub 仓库
2. 打开 [https://share.streamlit.io](https://share.streamlit.io)
3. 选择 `New app`
4. Repository 选择你的仓库
5. Branch 选择 `main`
6. Main file path 填：

```text
streamlit_app.py
```

7. 点击 `Deploy`

## 数据存储说明

- 规则和人员信息保存在项目目录下的 `streamlit_data/`
- 当前实现适合小团队内部使用
- 如果后面要多人长期共用，建议再接数据库或对象存储

## 项目文件

- `streamlit_app.py`：Streamlit 主应用
- `requirements.txt`：依赖清单
- `.streamlit/config.toml`：Streamlit 页面与服务配置
- `index.html` / `script.js` / `styles.css`：早期网页原型

## 备注

如果你要把它继续做成正式团队工具，下一步通常会补：

- 修改密码
- 密码加密存储
- 操作日志
- 数据库持久化
