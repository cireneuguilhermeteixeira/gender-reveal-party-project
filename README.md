# Gender Reveal Party

An interactive gender reveal party application built with Next.js and React. The host launches a game session and shares a link for players to join from their own devices. Participants compete in two mini-games—**Quiz** and **Termo**—before the big gender reveal.

## Technologies

- **Next.js 15** and **React 19** for the web interface and routing
- **TypeScript** for static typing
- **Prisma ORM** with **PostgreSQL**
- **Tailwind CSS** for styling
- **ws** for WebSocket communication

## Project Structure

```
src/
├─ app/
│  ├─ host_session/[session_id]       # Host dashboard
│  └─ player_session/[session_id]     # Player flow
│     ├─ quiz                         # Quiz phase
│     └─ termo                        # Termo phase
├─ components/                        # Reusable UI pieces
└─ lib/                               # Client utilities (HTTP, WS, helpers)
```

### Host Flow
The host screen orchestrates the session, advances game phases and broadcasts updates over WebSockets.

### Player Flow
Players join via a session URL and are routed to either the Quiz or Termo sub-pages depending on the current phase.

## Game Phases

Phases alternate between multiple Quiz rounds and a word-guessing Termo challenge, followed by a final scoreboard and gender reveal.

- **Quiz**: multiple-choice questions with timers and real-time updates
- **Termo**: a word puzzle with a custom on-screen keyboard and limited attempts

## WebSocket Server & Deployment

Vercel's serverless platform lacks native WebSocket support, so a custom Node server (`server.mjs`) is bundled to handle WebSocket connections alongside Next.js routing.

## Database

Prisma schema defines sessions, questions, answers and game phases. A seed script pre-populates sample quiz questions.

### Create Database and Run Migrations

```bash
# Create Postgres database & user
sudo -u postgres psql
CREATE DATABASE gender_reveal;
CREATE USER gender_reveal_user WITH PASSWORD 'pass';
GRANT ALL PRIVILEGES ON DATABASE gender_reveal TO gender_reveal_user;
ALTER ROLE gender_reveal_user CREATEDB;
\q

# Run Prisma migrations & seed data
npx prisma migrate dev -n initial_database
npx prisma db seed
npx prisma generate
```

## Running Locally

```bash
npm install
npm run dev             # Next.js dev server
# or
npm start               # Runs node server.mjs in production mode
```

## Screenshots

<!--
![Landing](docs/screenshot1.png)
![Quiz Screen](docs/screenshot2.png)
![Termo Screen](docs/screenshot3.png)
-->

(Replace the placeholders with actual images of the application.)

