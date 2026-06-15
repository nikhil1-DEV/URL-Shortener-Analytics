# 🔗 LinkSwift - URL Shortener & Analytics

A modern and powerful URL Shortener built with FastAPI that allows users to generate short links, create custom aliases, and track link performance through an analytics dashboard.

![LinkSwift Dashboard](./screenshot.png)

## 🚀 Features

- ✨ Shorten long URLs instantly
- 🎯 Custom URL aliases
- 📊 Click tracking and analytics
- 🌐 Browser usage statistics
- 📈 Dashboard with real-time metrics
- 📋 One-click copy functionality
- 🔗 Redirect short URLs to original destinations
- 📱 Fully responsive and modern UI
- 🌙 Dark-themed interface

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap/Tailwind CSS (if used)

### Backend
- Python
- FastAPI
- Jinja2 Templates

### Database
- SQLite

## 📸 Screenshots

### Dashboard
- URL shortening interface
- Analytics overview
- Recent links management
- Browser statistics

## 📂 Project Structure

```bash
LinkSwift/
│
├── static/
│   ├── css/
│   ├── js/
│   └── assets/
│
├── templates/
│   ├── index.html
│   └── analytics.html
│
├── database/
│   └── urls.db
│
├── main.py
├── requirements.txt
├── README.md
└── .gitignore
```

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-username/linkswift.git
cd linkswift
```

### 2. Create Virtual Environment

```bash
python -m venv venv
```

### 3. Activate Virtual Environment

#### Windows

```bash
venv\Scripts\activate
```

#### Linux / macOS

```bash
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Run Application

```bash
uvicorn main:app --reload
```

### 6. Open Browser

```bash
http://127.0.0.1:8000
```

## 📊 Analytics Features

- Total shortened links
- Total clicks
- Most-used browser tracking
- Individual link statistics
- Recent links overview

## 🎯 Future Improvements

- User Authentication
- QR Code Generation
- Link Expiration Dates
- Custom Domains
- Geographic Analytics
- API Access
- Export Analytics Reports

## 💡 Learning Outcomes

Through this project, I gained practical experience with:

- FastAPI Development
- RESTful APIs
- Database Management
- URL Redirection Logic
- Analytics Tracking
- Frontend & Backend Integration
- Responsive UI Design

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the project
2. Create your feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push to the branch

```bash
git push origin feature/new-feature
```

5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Nik**

If you liked this project, consider giving it a ⭐ on GitHub!

---

⭐ Built with FastAPI, Python, and a passion for web development.
