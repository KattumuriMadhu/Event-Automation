# 🚀 Event Automation & Social Media Manager

A full-stack AI-powered platform designed to streamline event management and automate social media marketing workflows. This application enables users to create events, generate AI-based promotional content, and schedule posts directly to platforms like Instagram and Facebook — all from a single dashboard.

## 📌 Overview

Managing events and promoting them on social media is often repetitive and time-consuming. This project solves that problem by combining:

- 📅 Event lifecycle management
- 🤖 AI-powered content creation
- 📱 Automated social media publishing
- 📊 Analytics & reporting

It is built with modern web technologies and designed to be scalable, secure, and user-friendly.

## ✨ Core Features

### 📅 Event Management
- Create, edit, and delete events
- Store event details (title, description, date, media)
- Calendar-based event visualization
- Efficient querying with MongoDB

### 🤖 AI-Powered Content Generation
- Generate engaging captions using:
  - OpenAI (GPT)
  - Google Gemini
- AI-generated promotional images
- Custom prompt templates for different event types
- Reduces manual effort in content creation

### 📱 Social Media Automation
- Schedule posts for future publishing
- Direct posting to:
  - Instagram
  - Facebook
- Post approval workflow:
  - Draft → Review → Publish
- Automated scheduling using cron jobs

### 📊 Analytics Dashboard
- Visual representation of:
  - Event performance
  - Posting activity
- Interactive charts and graphs
- Export reports in:
  - PDF
  - Excel (.xlsx)

### 🎨 User Interface
- Responsive and modern design
- Smooth animations using Framer Motion
- Clean notification system with toast alerts
- Optimized for both desktop and mobile

## 🏗️ System Architecture

This project follows a client-server architecture:

```
Frontend (Next.js)
        ↓
Backend API (Express.js)
        ↓
Database (MongoDB)
        ↓
External Services (AI APIs, Cloudinary, Social APIs)
```

**Key Components:**
- **Frontend**: Handles UI, user interaction, and API communication
- **Backend**: Manages business logic, authentication, and integrations
- **Database**: Stores users, events, and post data
- **External Services**:
  - AI APIs for content generation
  - Cloudinary for media storage
  - Social APIs for publishing

## 🛠️ Tech Stack

**🔹 Frontend**
- Next.js 15 (React 19)
- Sass & CSS Modules
- Framer Motion (animations)
- Lottie React (interactive visuals)
- Lucide React & React Icons

**🔹 Backend**
- Node.js
- Express.js
- MongoDB with Mongoose

**🔹 AI & Integrations**
- OpenAI API (GPT models)
- Google Generative AI (Gemini)
- Cloudinary (image hosting)

**🔹 Authentication & Security**
- Passport.js
- JWT (JSON Web Tokens)
- BCrypt (password hashing)
- Helmet (security headers)
- Rate Limiting
- XSS Clean & Mongo Sanitize

**🔹 Scheduling & Automation**
- Node-cron for scheduled jobs

## 🔐 Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# AI
OPENAI_API_KEYS=key1,key2
GEMINI_API_KEY=your_gemini_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Social Media
FACEBOOK_APP_ID=your_fb_app_id
FACEBOOK_APP_SECRET=your_fb_app_secret

# Session
SESSION_SECRET=your_secure_session_secret

FRONTEND_URL=http://localhost:3000
```

## ⚙️ Installation & Setup

1️⃣ **Clone Repository**
```bash
git clone https://github.com/KattumuriMadhu/Event-Automation.git
cd Event-Automation
```

2️⃣ **Backend Setup**
```bash
cd backend
npm install
npm start
```

3️⃣ **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

4️⃣ **Run Application**

Open in browser:
```
http://localhost:3000
```

## 🔄 Workflow
1. User creates an event
2. AI generates captions & images
3. User reviews content
4. Post is scheduled
5. System publishes automatically
6. Analytics are updated

## 📊 Use Cases
- Event organizers
- Digital marketing teams
- Small businesses
- Social media managers

## ⚡ Advantages
- Saves time with automation
- Reduces manual content effort
- Centralized event + marketing system
- Scalable architecture
- Easy to extend with more platforms

## 🚧 Limitations
- Requires API keys for AI and social platforms
- Social media APIs may have rate limits
- Cron jobs are not ideal for large-scale scheduling

## 🔮 Future Enhancements
- Support for Twitter (X), LinkedIn
- AI-based hashtag suggestions
- Smart posting time recommendations
- Real-time notifications
- Multi-user collaboration

## 🤝 Contributing

Contributions are welcome!

Steps:
1. Fork the repo
2. Create a feature branch
3. Commit changes
4. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## ⭐ Why This Project Stands Out
- Combines AI + Automation + Full-stack development
- Real-world use case (event marketing)
- Covers:
  - Backend APIs
  - Frontend UI/UX
  - AI integration
  - Scheduling systems
