# 🚀 ProjectFlow – Educational Project Management System

## 📌 Overview

**ProjectFlow** is a full-stack educational project management platform designed to streamline academic project collaboration between students and administrators.

It enables:

* Team creation and management
* Task assignment and tracking
* Real-time team communication
* Performance analytics and monitoring
* Secure role-based access control

The system is built using modern web technologies with a scalable and secure backend architecture.

---

# 🎯 Problem Statement

In academic environments, managing student projects manually can lead to:

* Poor coordination
* Missed deadlines
* Lack of transparency
* Inefficient communication
* Difficulty in tracking performance

ProjectFlow solves this by providing a centralized digital platform for structured project management.

---

# 🏗 System Architecture

```
React Frontend  →  Supabase Backend  →  PostgreSQL Database
```

* The frontend communicates with Supabase APIs.
* Supabase handles authentication, database operations, and real-time updates.
* PostgreSQL ensures relational integrity and data consistency.

---

# 🛠 Tech Stack

## 🔹 Frontend

* React 19
* Vite
* React Router DOM
* Tailwind CSS
* Headless UI
* Styled Components

## 🔹 Backend

* Supabase (Backend-as-a-Service)
* PostgreSQL Database
* Supabase Authentication
* Row Level Security (RLS)
* Real-Time Subscriptions (WebSockets)

## 🔹 Development Tools

* ESLint
* PostCSS
* TypeScript (for schema types)

---

# 🔐 Authentication & Authorization

* Secure login using Supabase Auth
* JWT-based session management
* Role-based access control (Admin / Student)
* Protected routes in frontend
* Row Level Security enforced at database level

---

# 🗄 Database Design

## 1️⃣ profiles (Users)

Stores all registered users.

| Column      | Description         |
| ----------- | ------------------- |
| id (UUID)   | Primary key         |
| full_name   | User name           |
| email       | User email          |
| roll_number | Student roll number |
| branch      | Academic branch     |
| role        | admin / student     |
| created_at  | Timestamp           |

---

## 2️⃣ teams

Stores team information.

| Column     | Description               |
| ---------- | ------------------------- |
| id (UUID)  | Primary key               |
| team_name  | Name of team              |
| leader_id  | Foreign key → profiles.id |
| created_at | Timestamp                 |

Relationship:

* One team has one leader.
* One team has multiple students.

---

## 3️⃣ tasks

Stores tasks assigned to teams.

| Column      | Description               |
| ----------- | ------------------------- |
| id          | Primary key               |
| title       | Task title                |
| description | Task details              |
| team_id     | Foreign key → teams.id    |
| assigned_by | Foreign key → profiles.id |
| deadline    | Due date                  |
| status      | pending / completed       |
| created_at  | Timestamp                 |

Relationship:

* One team → many tasks
* One admin → many assigned tasks

---

## 4️⃣ messages

Stores team chat messages.

| Column     | Description               |
| ---------- | ------------------------- |
| id         | Primary key               |
| team_id    | Foreign key → teams.id    |
| sender_id  | Foreign key → profiles.id |
| content    | Message text              |
| created_at | Timestamp                 |

Relationship:

* One team → many messages
* One user → many messages

---

# 🔄 Application Flow

## 🟢 Admin Flow

1. Admin logs in.
2. Accesses Admin Dashboard.
3. Creates teams (max 4 members).
4. Assigns team leader.
5. Assigns tasks to teams.
6. Monitors task completion rate.
7. Views analytics dashboard.
8. Monitors team communication.

---

## 🔵 Student Flow

1. Student logs in.
2. Accesses Student Dashboard.
3. Views team details.
4. Views assigned tasks.
5. Updates task status.
6. Communicates via team chat.
7. Tracks personal progress.

---

# 💬 Real-Time Chat System

Implemented using Supabase real-time subscriptions.

Flow:

1. User sends message.
2. Message inserted into `messages` table.
3. Supabase detects INSERT event.
4. WebSocket pushes update to subscribed clients.
5. UI updates automatically.

No page refresh required.

---

# 📊 Analytics & Metrics

Admin dashboard displays:

* Total tasks assigned
* Completed tasks
* Pending tasks
* Completion rate (%)
* On-time vs delayed tasks
* Team performance metrics

Completion Rate Formula:

```
Completion Rate = (Completed Tasks / Total Tasks) × 100
```

---

# 🔐 Security Implementation

* JWT-based authentication
* Row Level Security (RLS)
* Role-based route protection
* Foreign key constraints for data integrity
* UUID primary keys for enhanced security

RLS ensures:

* Students can only access their team's data.
* Admins can access all data.
* Unauthorized access is blocked at database level.

---

# ⚡ Performance Features

* Component-based modular architecture
* Optimized queries
* Real-time updates without polling
* Efficient state management using React hooks
* Lazy loading for performance improvement

---

# 🧠 Key Features

* Role-based authentication
* Team management system
* Task assignment & tracking
* Real-time team chat
* Performance analytics dashboard
* Secure relational database
* Responsive UI design

---

# 👥 Team Structure

This project was developed by a team of 4 members.

### 👨‍💼 My Role - Team Leader

* Designed system architecture
* Created database schema
* Implemented authentication & RLS
* Integrated real-time chat
* Developed core backend logic
* Managed task distribution
* Integrated all modules
* Debugging and final deployment

---

# 🚧 Challenges Faced

* Implementing secure Row Level Security policies
* Managing real-time updates efficiently
* Designing relational database structure
* Integrating frontend and backend smoothly
* Handling role-based route protection

---

# 🔮 Future Enhancements

* Multi-institution support
* Mobile application
* Notification system
* File upload support
* Advanced analytics with data visualization libraries
* Microservices backend (Node.js expansion)
* Redis caching for scalability

---

# 📈 Business Impact

ProjectFlow improves:

* Academic project transparency
* Team collaboration efficiency
* Deadline tracking accuracy
* Performance monitoring
* Structured academic workflow management

---

# 🏁 Conclusion

ProjectFlow is a scalable, secure, and modern project management platform built specifically for academic environments.

It demonstrates strong knowledge in:

* Full-stack development
* Database design
* Authentication & authorization
* Real-time systems
* Role-based access control
* System architecture planning

---

# 📬 Contact

Developed as a mini project during B.Tech 3rd Year.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ProjectFlow.git
   cd ProjectFlow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
