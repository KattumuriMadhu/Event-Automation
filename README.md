# Event Automation & Social Media Manager

A powerful full-stack application for managing events and automating social media posts using AI. This project integrates event scheduling, AI-powered content generation, and direct publishing to social platforms like Instagram and Facebook.

## 🚀 Features

*   **Event Management**: Create, update, and manage events with ease.
*   **AI Content Generation**:
    *   Generates engaging captions using **OpenAI (GPT)** and **Google Generative AI (Gemini)**.
    *   Creates promotional images using AI.
*   **Social Media Automation**:
    *   Schedule and publish posts directly to **Instagram** and **Facebook**.
    *   Manage content approval workflows.
*   **Secure Authentication**: User authentication protected with **Passport.js** and **JWT**.
*   **Modern UI/UX**: Built with **Next.js 15**, **Framer Motion**, and **Sass** for a responsive and animated experience.

## 🛠 Tech Stack

### Frontend
*   **Framework**: [Next.js 15](https://nextjs.org/) (React 19)
*   **Styling**: Sass, CSS Modules
*   **Animations**: Framer Motion, Lottie React
*   **Icons**: Lucide React, React Icons

### Backend
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: MongoDB (via Mongoose)
*   **AI Integration**: OpenAI API, Google Generative AI
*   **Media Storage**: Cloudinary
*   **Authentication**: Passport.js, BCrypt, JWT
*   **Scheduling**: Node-cron

## 📦 Installation

Clone the repository:
```bash
git clone https://github.com/KattumuriMadhu/Event-Automation.git
cd Event-Automation
```

### 1. Backend Setup

Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder with the following variables:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
OPENAI_API_KEYS=key1,key2
GEMINI_API_KEY=your_gemini_key
FACEBOOK_APP_ID=your_fb_app_id
FACEBOOK_APP_SECRET=your_fb_app_secret
```

Start the backend server:
```bash
npm start
```

### 2. Frontend Setup

Navigate to the frontend directory and install dependencies:
```bash
cd ../frontend
npm install
```

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📝 License

This project is licensed under the MIT License.
