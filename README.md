# Real-Time Chat Application

A Node.js real-time web chat application with temporary chat rooms that automatically expire after 15 minutes.

## Features

- **User Authentication**: Register and login with username/email and password
- **Temporary Chat Rooms**: Create rooms that automatically expire after 15 minutes
- **Real-Time Messaging**: Instant messaging using Socket.IO
- **Room Management**: Join rooms with shareable codes/links
- **Automatic Cleanup**: Expired rooms and messages are automatically removed
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Node.js with Express.js
- **Real-time Communication**: Socket.IO
- **Database**: SQLite with Prisma ORM
- **Authentication**: bcrypt for password hashing
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Session Management**: Express-session

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Database**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Visit Application**
   Open your browser and navigate to `http://localhost:3000`

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio

## Usage

### Creating an Account
1. Visit the homepage at `http://localhost:3000`
2. Click "Register here" to create a new account
3. Fill in your username, email, and password
4. Click "Register"

### Creating a Room
1. After logging in, enter a room name
2. Click "Create Room"
3. You'll get a room code that others can use to join
4. Share the room link with others

### Joining a Room
1. Get a room code from someone or click a shared room link
2. Enter the room code in the "Join Existing Room" section
3. Click "Join Room"

### Room Features
- **Real-time messaging**: Messages appear instantly for all participants
- **Room expiration**: All rooms automatically expire after 15 minutes
- **Automatic cleanup**: Expired rooms and their messages are deleted
- **Room sharing**: Copy shareable links to invite others

## API Endpoints

### Authentication
- `POST /api/register` - Create new user account
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user

### Rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:code` - Get room information
- `GET /api/rooms/:code/messages` - Get room messages

## Database Schema

### Users
- `id` - Unique identifier
- `username` - Unique username
- `email` - Unique email address
- `password` - Hashed password
- `createdAt` - Account creation timestamp

### Rooms
- `id` - Unique identifier
- `name` - Room display name
- `code` - Unique 6-character room code
- `createdAt` - Room creation timestamp
- `expiresAt` - Room expiration timestamp
- `isExpired` - Expiration status flag
- `creatorId` - Foreign key to user who created the room

### Messages
- `id` - Unique identifier
- `content` - Message text content
- `createdAt` - Message timestamp
- `userId` - Foreign key to message author
- `roomId` - Foreign key to room

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **Session Management**: Secure session handling with express-session
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Prisma ORM provides protection
- **Room Code Generation**: Cryptographically secure random room codes

## Cleanup and Maintenance

The application includes automated cleanup processes:

1. **Room Expiration Check**: Runs every minute to mark expired rooms
2. **Room Deletion**: Runs every hour to permanently delete old expired rooms
3. **Socket Cleanup**: Automatically removes disconnected users from rooms

## Environment Variables

Create a `.env` file in the root directory with:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="your-secure-session-secret-here"
PORT=3000
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a production database (PostgreSQL recommended)
3. Set secure session secret
4. Enable HTTPS and set `secure: true` for cookies
5. Configure reverse proxy (nginx recommended)

## Development

### Database Management
- View data: `npm run db:studio`
- Reset database: Delete `prisma/dev.db` and run `npm run db:migrate`
- Schema changes: Edit `prisma/schema.prisma` and run `npm run db:migrate`

### Adding Features
- Frontend: Edit files in `/public/` directory
- Backend: Edit `server.js` for API routes and Socket.IO handling
- Database: Update `prisma/schema.prisma` for schema changes

## Troubleshooting

### Common Issues

1. **Database connection errors**: Run `npm run db:generate` and `npm run db:migrate`
2. **Port already in use**: Change PORT in `.env` or kill existing process
3. **Socket.IO connection issues**: Check firewall settings and proxy configuration

### Logs
The application logs important events to the console:
- User connections and disconnections
- Room creation and expiration
- Message sending
- Error conditions

## License

MIT License - see LICENSE file for details