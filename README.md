# Community Calendar - Node.js Backend

Production-ready REST API for the Community Calendar app built with Express.js and MongoDB.

## Features

✅ **User Authentication** - JWT-based authentication with bcrypt password hashing
✅ **Event CRUD** - Create, read, update, delete events
✅ **RSVP System** - Users can RSVP to events (going/interested/not going)
✅ **Favorites** - Users can favorite events
✅ **Search & Filter** - Search events by keyword, filter by category
✅ **Security** - Helmet, CORS, rate limiting, input validation
✅ **Logging** - Morgan HTTP request logging

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/community_calendar
JWT_SECRET=your_super_secret_key_change_this
CORS_ORIGIN=http://localhost:8000,https://yourdomain.com
```

### 3. Set Up MongoDB

**Option A: Local MongoDB**

```bash
# Install MongoDB
# Ubuntu/Debian:
sudo apt-get install mongodb

# macOS:
brew install mongodb-community

# Start MongoDB
mongod
```

**Option B: MongoDB Atlas (Cloud)**

1. Create account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### 4. Start Server

**Development:**

```bash
npm run dev  # Uses nodemon for auto-reload
```

**Production:**

```bash
npm start
```

Server will start on `http://localhost:3000`

## API Endpoints

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "id": "user_id",
  "username": "john_doe",
  "email": "john@example.com",
  "token": "jwt_token_here"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Events

#### Get All Events
```http
GET /api/events
# Optional query parameters:
GET /api/events?category=sports&search=soccer
```

#### Get Single Event
```http
GET /api/events/:id
```

#### Create Event (Requires Auth)
```http
POST /api/events
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Community BBQ",
  "description": "Annual summer BBQ event",
  "category": "community",
  "date": "2024-07-15",
  "time": "2:00 PM - 6:00 PM",
  "location": "Central Park",
  "contact_info": "555-1234",
  "max_capacity": 100,
  "tags": ["food", "family-friendly"]
}
```

#### Update Event (Requires Auth)
```http
PUT /api/events/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  ...
}
```

#### Delete Event (Requires Auth)
```http
DELETE /api/events/:id
Authorization: Bearer {token}
```

#### RSVP to Event (Requires Auth)
```http
POST /api/events/:id/rsvp
Authorization: Bearer {token}
Content-Type: application/json

{
  "rsvp_status": "going"  // "going" | "interested" | "not_going" | ""
}
```

#### Toggle Favorite (Requires Auth)
```http
POST /api/events/:id/favorite
Authorization: Bearer {token}
Content-Type: application/json

{
  "is_favorited": true
}
```

## Project Structure

```
Backend/nodejs-example/
├── models/
│   ├── User.js          # User model
│   └── Event.js         # Event model
├── routes/
│   ├── auth.js          # Authentication routes
│   └── events.js        # Event routes
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── .env.example         # Environment variables template
├── package.json         # Dependencies
├── server.js            # Main server file
└── README.md            # This file
```

## Deployment

### Deploy to Heroku

1. Install Heroku CLI
2. Create Heroku app:
   ```bash
   heroku create your-app-name
   ```
3. Set environment variables:
   ```bash
   heroku config:set JWT_SECRET=your_secret
   heroku config:set MONGODB_URI=your_mongodb_uri
   ```
4. Deploy:
   ```bash
   git push heroku main
   ```

### Deploy to Railway

1. Install Railway CLI
2. Initialize:
   ```bash
   railway init
   ```
3. Deploy:
   ```bash
   railway up
   ```

### Deploy to DigitalOcean App Platform

1. Connect your GitHub repo
2. Set environment variables in dashboard
3. Deploy automatically on push

## Security Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use HTTPS (TLS/SSL) for all requests
- [ ] Set proper `CORS_ORIGIN` (not `*`)
- [ ] Enable rate limiting
- [ ] Keep dependencies updated
- [ ] Use MongoDB connection string with authentication
- [ ] Don't commit `.env` file
- [ ] Review and harden security headers
- [ ] Implement input validation on all endpoints
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure database backups

## Testing

```bash
npm test
```

## Production Tips

1. **Use PM2** for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js
   pm2 startup
   pm2 save
   ```

2. **Enable MongoDB Replica Set** for production reliability

3. **Set up reverse proxy** (Nginx) for better performance

4. **Enable database backups**:
   ```bash
   mongodump --uri="mongodb://..." --out=/backup/directory
   ```

5. **Monitor logs**:
   ```bash
   pm2 logs
   ```

## Support

For issues, refer to:
- Express.js docs: https://expressjs.com
- MongoDB docs: https://docs.mongodb.com
- JWT docs: https://jwt.io

---

Built with ❤️ for Community Calendar
