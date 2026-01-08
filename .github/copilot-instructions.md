# Real-Time Chat Application

This is a Node.js real-time web chat application with temporary chat rooms.

## Tech Stack
- Backend: Node.js (Express.js)
- Real-time communication: Socket.IO
- Database ORM: Prisma
- Database: SQLite
- Authentication: bcrypt
- Frontend: HTML, CSS, JavaScript

## Features
- User authentication (register/login)
- Temporary chat rooms (expire after 15 minutes)
- Real-time messaging with Socket.IO
- Automatic room cleanup
- Shareable room links

## Project Status
- [x] Project requirements clarified
- [x] Project scaffolded
- [x] Dependencies installed
- [x] Database schema created
- [x] Authentication system implemented
- [x] Chat room functionality implemented
- [x] Frontend created
- [x] Room expiration system implemented
- [x] Project tested and documented

## Getting Started
1. The development server is running on http://localhost:3000
2. Open your browser and navigate to the URL above
3. Register a new account or log in
4. Create or join a chat room
5. Start chatting in real-time!

## Development Commands
- `npm run dev` - Start development server (currently running)
- `npm run db:studio` - Open Prisma Studio to view database
- `npm run db:migrate` - Run database migrations