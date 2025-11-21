import Peer from "peerjs";
import type { DataConnection, MediaConnection } from "peerjs";
import type {
  Message,
  UserStatus,
  Room,
  GameSession,
  GameInvite,
} from "../store/useStore";
import { useStore } from "../store/useStore";
import { useNotifications } from "../store/useNotifications";
import { v4 as uuidv4 } from "uuid";

let peerInstance: Peer | null = null;
let signalingSocket: WebSocket | null = null;
let currentCall: MediaConnection | null = null;
const dataConnections = new Map<string, DataConnection>();

export const initializeSignaling = () => {
  if (signalingSocket) return;

  try {
    signalingSocket = new WebSocket(`ws://${window.location.hostname}:3001`);

    signalingSocket.onopen = () => {
      console.log("Connected to signaling server");
    };

    signalingSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "room-list") {
          const rooms = data.rooms as Room[];
          useStore.setState((state) => {
            const newRooms = new Map(state.rooms);
            rooms.forEach((room) => {
              if (!newRooms.has(room.id)) {
                newRooms.set(room.id, room);
              }
            });
            return { rooms: newRooms };
          });
        } else if (data.type === "room-created") {
          const room = data.room as Room;
          useStore.setState((state) => {
            const newRooms = new Map(state.rooms);
            if (!newRooms.has(room.id)) {
              newRooms.set(room.id, room);
            }
            return { rooms: newRooms };
          });
          useNotifications
            .getState()
            .addNotification(`New room available: ${room.name}`, "info");
        } else if (data.type === "room-message") {
          const store = useStore.getState();
          const roomMessage: Message = {
            id: data.id as string,
            senderId: data.senderId as string,
            senderUsername: data.senderUsername as string,
            content: data.content as string,
            timestamp: data.timestamp as number,
            roomId: data.roomId as string,
            type: (data.messageType as "text" | "image") || "text",
          };
          if (!store.isUserBlocked(data.senderId as string)) {
            // Check if message already exists to prevent duplicates
            const room = store.rooms.get(data.roomId as string);
            const messageExists = room?.messages.some(
              (msg) => msg.id === roomMessage.id
            );

            if (!messageExists) {
              store.addMessageToRoom(data.roomId as string, roomMessage);
              store.addUnreadRoomMessage(data.roomId as string);
            }

            const roomName = room?.name;
            if (roomName) {
              useNotifications
                .getState()
                .addNotification(`New message in ${roomName}`, "success");
            }
          }
        }
      } catch (e) {
        console.error("Error parsing signaling message", e);
      }
    };

    signalingSocket.onerror = (error) => {
      console.error("Signaling socket error:", error);
    };
  } catch (e) {
    console.error("Failed to connect to signaling server", e);
  }
};

export const initializePeer = async (peerId: string): Promise<Peer> => {
  if (peerInstance) {
    return peerInstance;
  }

  peerInstance = new Peer(peerId, {
    config: {
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302"] },
        { urls: ["stun:stun1.l.google.com:19302"] },
        { urls: ["stun:stun2.l.google.com:19302"] },
      ],
    },
  });

  peerInstance.on("open", (id) => {
    console.log("Peer ID:", id);
  });

  peerInstance.on("connection", (conn) => {
    handleIncomingConnection(conn);
  });

  peerInstance.on("call", (call) => {
    handleIncomingCall(call);
  });

  peerInstance.on("error", (error) => {
    console.error("Peer error:", error);
  });

  return peerInstance;
};

const handleIncomingConnection = (conn: DataConnection) => {
  const peerId = conn.peer;
  dataConnections.set(peerId, conn);

  conn.on("open", () => {
    console.log("Connected to:", peerId);
    // Send our user info to the incoming peer
    const store = useStore.getState();
    sendUserInfo(conn, store.currentUser);
    // Share all existing rooms with the new peer (respecting privacy settings)
    store.rooms.forEach((room) => {
      // Only send private rooms to allowed users, or all public rooms
      if (
        room.isPublic ||
        (room.allowedUsers && room.allowedUsers.includes(peerId))
      ) {
        conn.send({
          type: "room-created",
          room: {
            id: room.id,
            name: room.name,
            createdBy: room.createdBy,
            members: room.members,
            messages: room.messages,
            createdAt: room.createdAt,
            isPublic: room.isPublic,
            allowedUsers: room.allowedUsers,
          },
        });
      }
    });
  });

  conn.on("data", (data) => {
    handleIncomingData(peerId, data);
  });

  conn.on("close", () => {
    dataConnections.delete(peerId);
    useStore.getState().removeConnection(peerId);
  });

  conn.on("error", (error) => {
    console.error("Connection error:", error);
  });
};

const handleIncomingData = (peerId: string, data: unknown) => {
  const typedData = data as Record<string, unknown>;
  const store = useStore.getState();

  switch (typedData.type) {
    case "user-info": {
      store.addConnection(peerId, {
        peerId,
        username: typedData.username as string,
        status: typedData.status as UserStatus,
        statusMessage: typedData.statusMessage as string,
        blockedUsers: (typedData.blockedUsers as string[]) || [],
      });
      break;
    }

    case "status-update": {
      store.updateConnectionStatus(
        peerId,
        typedData.status as UserStatus,
        typedData.statusMessage as string
      );
      break;
    }

    case "direct-message": {
      const message: Message = {
        id: typedData.id as string,
        senderId: peerId,
        senderUsername: typedData.senderUsername as string,
        content: typedData.content as string,
        timestamp: typedData.timestamp as number,
        type: (typedData.messageType as "text" | "image") || "text",
      };
      if (!store.isUserBlocked(peerId)) {
        store.addDirectMessage(peerId, message);
        store.addUnreadDirectMessage(peerId);
        useNotifications
          .getState()
          .addNotification(
            `New message from ${typedData.senderUsername}`,
            "success"
          );
      }
      break;
    }

    case "room-message": {
      const roomMessage: Message = {
        id: typedData.id as string,
        senderId: peerId,
        senderUsername: typedData.senderUsername as string,
        content: typedData.content as string,
        timestamp: typedData.timestamp as number,
        roomId: typedData.roomId as string,
        type: (typedData.messageType as "text" | "image") || "text",
      };
      if (!store.isUserBlocked(peerId)) {
        store.addMessageToRoom(typedData.roomId as string, roomMessage);
        store.addUnreadRoomMessage(typedData.roomId as string);
        const room = store.rooms.get(typedData.roomId as string);
        if (room) {
          useNotifications
            .getState()
            .addNotification(`New message in ${room.name}`, "success");
        }
      }
      break;
    }

    case "block-user": {
      // Handle block notification
      break;
    }

    case "add-friend": {
      store.addFriend(peerId);
      break;
    }

    case "remove-friend": {
      store.removeFriend(peerId);
      break;
    }

    case "room-created": {
      const roomData = typedData.room as Record<string, unknown>;
      const isPublic = roomData.isPublic as boolean;
      const allowedUsers = roomData.allowedUsers as string[] | undefined;

      // Check if we should accept this room
      if (
        !isPublic &&
        allowedUsers &&
        !allowedUsers.includes(store.currentUser.id)
      ) {
        // Private room and we're not in the allowed list - skip it
        break;
      }

      const room = {
        id: roomData.id as string,
        name: roomData.name as string,
        createdBy: roomData.createdBy as string,
        members: (roomData.members as string[]) || [],
        messages: (roomData.messages as Message[]) || [],
        createdAt: roomData.createdAt as number,
        isPublic,
        allowedUsers,
      };
      const currentRooms = new Map(store.rooms);
      if (!currentRooms.has(room.id)) {
        currentRooms.set(room.id, room);
        store.rooms = currentRooms;
      }
      break;
    }

    case "room-join": {
      const roomId = typedData.roomId as string;
      const userId = typedData.userId as string;
      const room = store.rooms.get(roomId);
      if (room && !room.members.includes(userId)) {
        const newRooms = new Map(store.rooms);
        newRooms.set(roomId, {
          ...room,
          members: [...room.members, userId],
        });
        store.rooms = newRooms;
      }
      break;
    }

    case "game-invite": {
      const invite: GameInvite = {
        id: typedData.inviteId as string,
        from: peerId,
        fromUsername: typedData.fromUsername as string,
        gameId: typedData.gameId as string,
        timestamp: typedData.timestamp as number,
        accepted: false,
      };
      store.gameInvites.set(invite.id, invite);
      useNotifications
        .getState()
        .addNotification(
          `${typedData.fromUsername} invited you to play TicTacToe!`,
          "success"
        );
      break;
    }

    case "game-accept": {
      const sessionId = typedData.sessionId as string;
      const inviteId = typedData.inviteId as string;
      const session: GameSession = {
        id: sessionId,
        gameId: typedData.gameId as string,
        player1: typedData.player1 as string,
        player2: typedData.player2 as string,
        player1Symbol: typedData.player1Symbol as "X" | "O",
        player2Symbol: typedData.player2Symbol as "X" | "O",
        board: Array.isArray(typedData.board)
          ? (typedData.board as Array<"X" | "O" | null>)
          : Array(9).fill(null),
        currentPlayer: typedData.currentPlayer as "X" | "O",
        status: "active" as const,
        winner: null,
        createdAt: typedData.createdAt as number,
        dmPeerId: peerId,
      };
      store.activeSessions.set(sessionId, session);
      // Remove the invitation from the inviter's list
      store.removeGameInvite(inviteId);
      useNotifications
        .getState()
        .addNotification(
          `${typedData.fromUsername} accepted your game invitation!`,
          "success"
        );
      break;
    }

    case "game-move": {
      const sessionId = typedData.sessionId as string;
      const session = store.activeSessions.get(sessionId);
      if (session) {
        const newBoard = [...session.board];
        const cellIndex = typedData.cellIndex as number;
        newBoard[cellIndex] = typedData.symbol as "X" | "O";
        store.updateGameSession(sessionId, {
          board: newBoard,
          currentPlayer: typedData.nextPlayer as "X" | "O",
          status: (typedData.status as "active" | "finished") || "active",
          winner: typedData.winner as "draw" | "x-wins" | "o-wins" | null,
        });
      }
      break;
    }

    case "game-end": {
      const sessionId = typedData.sessionId as string;
      store.endGameSession(sessionId);
      useNotifications
        .getState()
        .addNotification(`TicTacToe game ended: ${typedData.result}`, "info");
      break;
    }
  }
};

export const connectToPeer = async (
  peerId: string
): Promise<DataConnection> => {
  if (!peerInstance) {
    throw new Error("Peer not initialized");
  }

  if (dataConnections.has(peerId)) {
    const conn = dataConnections.get(peerId)!;
    if (conn.open) {
      return conn;
    }
    conn.close();
    dataConnections.delete(peerId);
  }

  return new Promise((resolve, reject) => {
    const conn = peerInstance!.connect(peerId);

    const onOpen = () => {
      console.log("Connected to peer:", peerId);
      const store = useStore.getState();
      sendUserInfo(conn, store.currentUser);

      // Share all existing rooms with the new peer (respecting privacy settings)
      store.rooms.forEach((room) => {
        if (
          room.isPublic ||
          (room.allowedUsers && room.allowedUsers.includes(peerId))
        ) {
          conn.send({
            type: "room-created",
            room: {
              id: room.id,
              name: room.name,
              createdBy: room.createdBy,
              members: room.members,
              messages: room.messages,
              createdAt: room.createdAt,
              isPublic: room.isPublic,
              allowedUsers: room.allowedUsers,
            },
          });
        }
      });

      cleanup();
      resolve(conn);
    };

    const onError = (error: unknown) => {
      console.error("Connection error:", error);
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      // If closed before open, it might be a failure, but usually error fires.
    };

    const cleanup = () => {
      conn.off("open", onOpen);
      conn.off("error", onError);
      conn.off("close", onClose);

      // Re-attach permanent listeners
      conn.on("close", () => {
        dataConnections.delete(peerId);
        useStore.getState().removeConnection(peerId);
      });
      conn.on("error", (error) => {
        console.error("Connection error:", error);
      });
    };

    conn.on("open", onOpen);
    conn.on("error", onError);
    conn.on("close", onClose);

    conn.on("data", (data) => {
      handleIncomingData(peerId, data);
    });

    dataConnections.set(peerId, conn);
  });
};

export const sendUserInfo = (
  conn: DataConnection,
  user: { username: string; status: UserStatus; statusMessage: string }
) => {
  if (conn.open) {
    conn.send({
      type: "user-info",
      username: user.username,
      status: user.status,
      statusMessage: user.statusMessage,
      blockedUsers: Array.from(useStore.getState().blockedUsers),
    });
  }
};

export const sendDirectMessage = (
  peerId: string,
  content: string,
  type: "text" | "image" = "text"
) => {
  const conn = dataConnections.get(peerId);
  if (!conn || !conn.open) {
    console.error("Connection not open");
    return;
  }

  const store = useStore.getState();
  const message: Message = {
    id: uuidv4(),
    senderId: store.currentUser.id,
    senderUsername: store.currentUser.username,
    content,
    timestamp: Date.now(),
    type,
  };

  conn.send({
    type: "direct-message",
    id: message.id,
    senderUsername: store.currentUser.username,
    content,
    timestamp: message.timestamp,
    messageType: type,
  });

  store.addDirectMessage(peerId, message);
};

export const sendRoomMessage = (
  roomId: string,
  content: string,
  type: "text" | "image" = "text"
) => {
  const store = useStore.getState();
  const message: Message = {
    id: uuidv4(),
    senderId: store.currentUser.id,
    senderUsername: store.currentUser.username,
    content,
    timestamp: Date.now(),
    roomId,
    type,
  };

  // Add message locally immediately for optimistic UI update
  store.addMessageToRoom(roomId, message);

  // Send to signaling server for relay to all clients (excluding sender via server logic)
  if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
    signalingSocket.send(
      JSON.stringify({
        type: "room-message",
        id: message.id,
        senderId: store.currentUser.id,
        senderUsername: store.currentUser.username,
        content,
        timestamp: message.timestamp,
        roomId,
        messageType: type,
      })
    );
  }

  // Also broadcast to direct peer connections
  dataConnections.forEach((conn) => {
    if (conn.open) {
      conn.send({
        type: "room-message",
        id: message.id,
        senderId: store.currentUser.id,
        senderUsername: store.currentUser.username,
        content,
        timestamp: message.timestamp,
        roomId,
        messageType: type,
      });
    }
  });
};

export const broadcastRoomCreated = (roomId: string) => {
  const store = useStore.getState();
  const room = store.rooms.get(roomId);
  if (!room) return;

  // Send to signaling server if public
  if (
    room.isPublic &&
    signalingSocket &&
    signalingSocket.readyState === WebSocket.OPEN
  ) {
    signalingSocket.send(
      JSON.stringify({
        type: "create-room",
        room,
      })
    );
  }

  dataConnections.forEach((conn) => {
    if (conn.open) {
      // For private rooms, only send to allowed users
      if (
        !room.isPublic &&
        room.allowedUsers &&
        !room.allowedUsers.includes(conn.peer)
      ) {
        return;
      }

      conn.send({
        type: "room-created",
        room: {
          id: room.id,
          name: room.name,
          createdBy: room.createdBy,
          members: room.members,
          messages: room.messages,
          createdAt: room.createdAt,
          isPublic: room.isPublic,
          allowedUsers: room.allowedUsers,
        },
      });
    }
  });
};

export const broadcastRoomJoin = (roomId: string, userId: string) => {
  dataConnections.forEach((conn) => {
    if (conn.open) {
      conn.send({
        type: "room-join",
        roomId,
        userId,
      });
    }
  });
};

export const broadcastStatusUpdate = (
  status: UserStatus,
  statusMessage: string
) => {
  dataConnections.forEach((conn) => {
    if (conn.open) {
      conn.send({
        type: "status-update",
        status,
        statusMessage,
      });
    }
  });
};

export const blockUser = (userId: string) => {
  const conn = dataConnections.get(userId);
  if (conn && conn.open) {
    conn.send({
      type: "block-user",
      blockedUserId: useStore.getState().currentUser.id,
    });
  }
};

export const addFriend = (peerId: string) => {
  const store = useStore.getState();
  store.addFriend(peerId);

  // Notify the peer that they've been added as a friend
  const conn = dataConnections.get(peerId);
  if (conn && conn.open) {
    conn.send({
      type: "add-friend",
      friendId: store.currentUser.id,
    });
  }
};

export const removeFriend = (peerId: string) => {
  const store = useStore.getState();
  store.removeFriend(peerId);

  // Notify the peer that they've been removed as a friend
  const conn = dataConnections.get(peerId);
  if (conn && conn.open) {
    conn.send({
      type: "remove-friend",
      friendId: store.currentUser.id,
    });
  }
};

const handleIncomingCall = (call: MediaConnection) => {
  const store = useStore.getState();
  if (store.callState.isActive) {
    // Already in a call, reject
    call.close();
    return;
  }

  currentCall = call;
  store.setCallState({
    isIncoming: true,
    remotePeerId: call.peer,
  });

  call.on("close", () => {
    endCall();
  });

  call.on("error", (err) => {
    console.error("Call error:", err);
    endCall();
  });
};

export const initiateCall = async (peerId: string) => {
  if (!peerInstance) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    const call = peerInstance.call(peerId, stream);
    currentCall = call;

    const store = useStore.getState();
    store.setCallState({
      isActive: true,
      remotePeerId: peerId,
      localStream: stream,
    });

    call.on("stream", (remoteStream) => {
      store.setCallState({ remoteStream });
    });

    call.on("close", () => {
      endCall();
    });

    call.on("error", (err) => {
      console.error("Call error:", err);
      endCall();
    });
  } catch (err) {
    console.error("Failed to get local stream", err);
    useNotifications
      .getState()
      .addNotification("Failed to access camera/microphone", "error");
  }
};

export const answerCall = async () => {
  if (!currentCall) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    currentCall.answer(stream);

    const store = useStore.getState();
    store.setCallState({
      isIncoming: false,
      isActive: true,
      localStream: stream,
    });

    currentCall.on("stream", (remoteStream) => {
      store.setCallState({ remoteStream });
    });
  } catch (err) {
    console.error("Failed to get local stream", err);
    useNotifications
      .getState()
      .addNotification("Failed to access camera/microphone", "error");
    endCall();
  }
};

export const endCall = () => {
  console.log("Ending call...");
  if (currentCall) {
    try {
      currentCall.close();
    } catch (e) {
      console.error("Error closing call:", e);
    }
    currentCall = null;
  }

  const store = useStore.getState();

  // Stop local tracks
  if (store.callState.localStream) {
    store.callState.localStream.getTracks().forEach((track) => track.stop());
  }

  store.resetCallState();
};

export const getPeerInstance = (): Peer | null => peerInstance;

export const getDataConnection = (peerId: string): DataConnection | null => {
  return dataConnections.get(peerId) || null;
};

export const getAllConnections = (): DataConnection[] => {
  return Array.from(dataConnections.values());
};

export const sendGameInvite = (
  peerId: string,
  inviteId: string,
  gameId: string
) => {
  const conn = dataConnections.get(peerId);
  if (!conn || !conn.open) {
    console.error("Connection not open");
    return;
  }

  const store = useStore.getState();
  conn.send({
    type: "game-invite",
    inviteId,
    gameId,
    fromUsername: store.currentUser.username,
    timestamp: Date.now(),
  });
};

export const acceptGameInvite = (
  peerId: string,
  inviteId: string,
  sessionId: string,
  gameId: string,
  player1: string,
  player2: string
) => {
  const conn = dataConnections.get(peerId);
  if (!conn || !conn.open) {
    console.error("Connection not open");
    return;
  }

  const store = useStore.getState();
  conn.send({
    type: "game-accept",
    inviteId,
    sessionId,
    gameId,
    player1,
    player2,
    player1Symbol: "X",
    player2Symbol: "O",
    currentPlayer: "X",
    fromUsername: store.currentUser.username,
    createdAt: Date.now(),
  });
};

export const sendGameMove = (
  peerId: string,
  sessionId: string,
  cellIndex: number,
  symbol: "X" | "O",
  nextPlayer: "X" | "O",
  status: "active" | "finished",
  winner: "draw" | "x-wins" | "o-wins" | null
) => {
  const conn = dataConnections.get(peerId);
  if (!conn || !conn.open) {
    console.error("Connection not open");
    return;
  }

  conn.send({
    type: "game-move",
    sessionId,
    cellIndex,
    symbol,
    nextPlayer,
    status,
    winner,
    timestamp: Date.now(),
  });
};

export const endGameSession = (
  peerId: string,
  sessionId: string,
  result: string
) => {
  const conn = dataConnections.get(peerId);
  if (!conn || !conn.open) {
    console.error("Connection not open");
    return;
  }

  conn.send({
    type: "game-end",
    sessionId,
    result,
    timestamp: Date.now(),
  });
};
