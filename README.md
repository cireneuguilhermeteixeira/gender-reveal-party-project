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
- Landing page
<img width="904" height="608" alt="image" src="https://github.com/user-attachments/assets/48bc60a1-4496-4151-a60c-18fd9fa84c3a" />
<img width="903" height="606" alt="image" src="https://github.com/user-attachments/assets/efa6216f-2c03-4acf-8f22-3893e891e363" />

- Host initial room
<img width="889" height="599" alt="image" src="https://github.com/user-attachments/assets/98bc9063-9ab5-4480-93c9-85cbe86ba61f" />


- Player initial room
<img width="944" height="603" alt="image" src="https://github.com/user-attachments/assets/a0fd54a3-6cff-42cd-beea-b957acc76833" />

- Quiz Host Page 
  <img width="915" height="613" alt="image" src="https://github.com/user-attachments/assets/6928c5e9-8024-4ba7-b7d6-52fb9103a059" />
- Quiz Player Page
<img width="280" height="510" alt="image" src="https://github.com/user-attachments/assets/0dde04d3-c897-4a77-a56c-bf88d71e6a9c" />


- Termo Host Page
<img width="902" height="610" alt="image" src="https://github.com/user-attachments/assets/02a7a0b3-2d20-40a5-8a4c-32de92b7e286" />
- Termo Player Page
<img width="206" height="449" alt="image" src="https://github.com/user-attachments/assets/40a6f655-5836-4a44-a7e8-407f924f06fe" />


