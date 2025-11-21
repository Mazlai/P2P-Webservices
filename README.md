# PeerTea - Ynov MicroServices Project

Eric PHILIPPE
Mickaël FERNANDEZ
Tillian HURE

This repository contains all the code for the PeerTea project, a peer-to-peer web application developed as part of the Ynov MicroServices curriculum.

The website is shared between five main features:

1. **Chat Application**: A real-time chat application that allows users to communicate with each other using WebRTC technology.
2. **Room Management**: A room management system that enables users to create, join, and manage chat rooms.
3. **Gif integration**: Integration with the Giphy API to allow users to search for and share GIFs within the chat application.
4. **Video Calling**: A video calling feature that allows users to make video calls to each other using WebRTC.
5. **Tic-Tac-Toe Game**: A simple Tic-Tac-Toe game that users can play against each other within the chat application.

## Technologies Used

> The project is mainly built on the frontend side.

- **Frontend**: React.ts, WebRTC, ShadCn/ui

> The backend server is only used for signaling and room management.

- **Backend**: Bun.ts

## Getting Started

To run the PeerTea application locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/Mazlai/P2P-Webservices.git
   cd P2P-Webservices
   ```

````

2. Install dependencies for both frontend and backend:
 ```bash
 # For frontend
 cd client
 bun install

 # For backend
 cd ../server
 bun install
````

3. Start the backend server:

   ```bash
   bun run start
   ```

4. Start the frontend application:

   ```bash
   cd ../client
   bun run dev
   ```

5. Open your web browser and navigate to `http://localhost:5173` to access the PeerTea application.

## Documentation

When the website is reached, enter your username. From here you can copy and share your id. Like this just click on "Peers" and add your friend's id to start a chat with him.
From the same panel, you'll be able to :

- Create private message
- Block users (You won't receive messages from them)
- Add them in your temp friends list

You can also create or join rooms to chat with multiple users at once. For public ones, you won't have to peer with people to see their messages.

On a private chat, you can either start a video call or play a game of Tic-Tac-Toe with your friend.
To send GIFs, simply click on the GIF icon in the chat input area, search for your desired GIF using the Giphy integration, and select it to send it in the chat.

## Structure

The whole peer logic is managed inside `peerService.ts` managing connections, calls and data channels also the TicTacToe game logic is here. Working closely with useStore.ts making the bridge between the UI and the peer connections.

tictactoegame.ts contains the game logic for TicTacToe.

`/components`contains all the React components and ShadCn/ui components used in the frontend and no pages since it's a single page application. (cf. App.tsx)
