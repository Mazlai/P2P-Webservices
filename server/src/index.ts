import { serve } from "bun";

interface Room {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: number;
  isPublic: boolean;
  allowedUsers?: string[];
}

interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: number;
  roomId: string;
  type: "text" | "image";
}

const rooms = new Map<string, Room>();
const roomMessages = new Map<string, Message[]>();
// Store connected clients
const connectedClients = new Set<ServerWebSocket<unknown>>();

const server = serve({
  hostname: "0.0.0.0",
  port: 3001,
  fetch(req, server) {
    // upgrade the request to a websocket
    if (server.upgrade(req)) {
      return; // do not return a Response
    }
    return new Response("P2P Signaling Server Running");
  },
  websocket: {
    open(ws) {
      connectedClients.add(ws);
      console.log("Client connected. Total clients:", connectedClients.size);

      const roomList = Array.from(rooms.values());
      ws.send(
        JSON.stringify({
          type: "room-list",
          rooms: roomList,
        })
      );
    },
    message(ws, message) {
      try {
        const data = JSON.parse(message as string);

        if (data.type === "create-room") {
          const room = data.room as Room;
          console.log("New room created:", room.name);
          rooms.set(room.id, room);

          // Broadcast to all clients (including sender, though sender usually has it)
          // Actually sender has it, so broadcast to others.
          const broadcastData = JSON.stringify({
            type: "room-created",
            room: room,
          });

          connectedClients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              // 1 is OPEN
              client.send(broadcastData);
            }
          });
        } else if (data.type === "room-message") {
          // Relay room messages to all connected clients except the sender
          const roomMessage: Message = {
            id: data.id,
            senderId: data.senderId,
            senderUsername: data.senderUsername,
            content: data.content,
            timestamp: data.timestamp,
            roomId: data.roomId,
            type: data.messageType || "text",
          };

          // Store message
          if (!roomMessages.has(data.roomId)) {
            roomMessages.set(data.roomId, []);
          }
          roomMessages.get(data.roomId)!.push(roomMessage);

          // Broadcast to all clients except the sender
          const broadcastData = JSON.stringify({
            type: "room-message",
            id: roomMessage.id,
            senderId: roomMessage.senderId,
            senderUsername: roomMessage.senderUsername,
            content: roomMessage.content,
            timestamp: roomMessage.timestamp,
            roomId: roomMessage.roomId,
            messageType: roomMessage.type,
          });

          connectedClients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(broadcastData);
            }
          });
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    },
    close(ws) {
      connectedClients.delete(ws);
      console.log("Client disconnected. Total clients:", connectedClients.size);
    },
  },
});

console.log(`Signaling server listening on port ${server.port}`);
