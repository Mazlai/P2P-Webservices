import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export type UserStatus = "online" | "busy" | "invisible";

export interface User {
  id: string;
  username: string;
  status: UserStatus;
  statusMessage: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: number;
  roomId?: string;
  type: "text" | "image";
}

export interface GameInvite {
  id: string;
  from: string;
  fromUsername: string;
  gameId: string;
  timestamp: number;
  accepted: boolean;
}

export interface GameSession {
  id: string;
  gameId: string;
  player1: string;
  player2: string;
  player1Symbol: "X" | "O";
  player2Symbol: "X" | "O";
  board: Array<"X" | "O" | null>; // Array of cells
  currentPlayer: "X" | "O";
  status: "pending" | "active" | "finished";
  winner: "draw" | "x-wins" | "o-wins" | null;
  createdAt: number;
  dmPeerId?: string; // The peer ID for direct message games
}

export interface Room {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  messages: Message[];
  createdAt: number;
  isPublic: boolean;
  allowedUsers?: string[]; // For private rooms, list of allowed peer IDs
}

export interface Connection {
  peerId: string;
  username: string;
  status: UserStatus;
  statusMessage: string;
  blockedUsers: string[];
}

export interface CallState {
  isIncoming: boolean;
  isActive: boolean;
  remotePeerId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

interface Store {
  // User
  currentUser: User;
  setUsername: (username: string) => void;
  setStatus: (status: UserStatus) => void;
  setStatusMessage: (message: string) => void;

  // Friends
  friends: Set<string>; // Peer IDs of friends
  addFriend: (peerId: string) => void;
  removeFriend: (peerId: string) => void;
  isFriend: (peerId: string) => boolean;

  // Connections
  connections: Map<string, Connection>;
  addConnection: (peerId: string, connection: Connection) => void;
  removeConnection: (peerId: string) => void;
  updateConnectionStatus: (
    peerId: string,
    status: UserStatus,
    message: string
  ) => void;

  // Rooms
  rooms: Map<string, Room>;
  createRoom: (name: string, isPublic?: boolean) => Room;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  addMessageToRoom: (roomId: string, message: Message) => void;

  // Direct Messages
  directMessages: Map<string, Message[]>;
  addDirectMessage: (peerId: string, message: Message) => void;
  getDirectMessages: (peerId: string) => Message[];

  // Unread Messages
  unreadDirectMessages: Set<string>; // Set of peer IDs with unread messages
  unreadRooms: Set<string>; // Set of room IDs with unread messages
  markDirectMessagesAsRead: (peerId: string) => void;
  markRoomMessagesAsRead: (roomId: string) => void;
  addUnreadDirectMessage: (peerId: string) => void;
  addUnreadRoomMessage: (roomId: string) => void;

  // Blocklist
  blockedUsers: Set<string>;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;

  // Call State
  callState: CallState;
  setCallState: (state: Partial<CallState>) => void;
  resetCallState: () => void;

  // TicTacToe Games
  gameInvites: Map<string, GameInvite>; // Key: invite ID
  activeSessions: Map<string, GameSession>; // Key: session ID
  sendGameInvite: (to: string, toUsername: string) => GameInvite;
  acceptGameInvite: (inviteId: string) => GameSession;
  declineGameInvite: (inviteId: string) => void;
  removeGameInvite: (inviteId: string) => void;
  updateGameSession: (sessionId: string, session: Partial<GameSession>) => void;
  endGameSession: (sessionId: string) => void;
}

export const useStore = create<Store>((set, get) => ({
  currentUser: {
    id: uuidv4(),
    username: "Anonymous",
    status: "online",
    statusMessage: "",
  },

  setUsername: (username: string) =>
    set((state) => ({
      currentUser: { ...state.currentUser, username },
    })),

  setStatus: (status: UserStatus) =>
    set((state) => ({
      currentUser: { ...state.currentUser, status },
    })),

  setStatusMessage: (message: string) =>
    set((state) => ({
      currentUser: { ...state.currentUser, statusMessage: message },
    })),

  friends: new Set(),

  addFriend: (peerId: string) =>
    set((state) => {
      const newFriends = new Set(state.friends);
      newFriends.add(peerId);
      return { friends: newFriends };
    }),

  removeFriend: (peerId: string) =>
    set((state) => {
      const newFriends = new Set(state.friends);
      newFriends.delete(peerId);
      return { friends: newFriends };
    }),

  isFriend: (peerId: string) => get().friends.has(peerId),

  connections: new Map(),

  addConnection: (peerId: string, connection: Connection) =>
    set((state) => {
      const newConnections = new Map(state.connections);
      newConnections.set(peerId, connection);
      return { connections: newConnections };
    }),

  removeConnection: (peerId: string) =>
    set((state) => {
      const newConnections = new Map(state.connections);
      newConnections.delete(peerId);
      return { connections: newConnections };
    }),

  updateConnectionStatus: (
    peerId: string,
    status: UserStatus,
    message: string
  ) =>
    set((state) => {
      const newConnections = new Map(state.connections);
      const conn = newConnections.get(peerId);
      if (conn) {
        newConnections.set(peerId, { ...conn, status, statusMessage: message });
      }
      return { connections: newConnections };
    }),

  rooms: new Map(),

  createRoom: (name: string, isPublic: boolean = true) => {
    const room: Room = {
      id: uuidv4(),
      name,
      createdBy: get().currentUser.id,
      members: [get().currentUser.id],
      messages: [],
      createdAt: Date.now(),
      isPublic,
      allowedUsers: isPublic ? undefined : [get().currentUser.id],
    };
    set((state) => {
      const newRooms = new Map(state.rooms);
      newRooms.set(room.id, room);
      return { rooms: newRooms };
    });
    return room;
  },

  joinRoom: (roomId: string) =>
    set((state) => {
      const newRooms = new Map(state.rooms);
      const room = newRooms.get(roomId);
      if (room && !room.members.includes(state.currentUser.id)) {
        newRooms.set(roomId, {
          ...room,
          members: [...room.members, state.currentUser.id],
        });
      }
      return { rooms: newRooms };
    }),

  leaveRoom: (roomId: string) =>
    set((state) => {
      const newRooms = new Map(state.rooms);
      const room = newRooms.get(roomId);
      if (room) {
        newRooms.set(roomId, {
          ...room,
          members: room.members.filter((id) => id !== state.currentUser.id),
        });
      }
      return { rooms: newRooms };
    }),

  addMessageToRoom: (roomId: string, message: Message) =>
    set((state) => {
      const newRooms = new Map(state.rooms);
      const room = newRooms.get(roomId);
      if (room) {
        newRooms.set(roomId, {
          ...room,
          messages: [...room.messages, message],
        });
      }
      return { rooms: newRooms };
    }),

  directMessages: new Map(),

  addDirectMessage: (peerId: string, message: Message) =>
    set((state) => {
      const newMessages = new Map(state.directMessages);
      const messages = newMessages.get(peerId) || [];
      newMessages.set(peerId, [...messages, message]);
      return { directMessages: newMessages };
    }),

  getDirectMessages: (peerId: string) => {
    return get().directMessages.get(peerId) || [];
  },

  blockedUsers: new Set(),

  blockUser: (userId: string) =>
    set((state) => {
      const newBlocked = new Set(state.blockedUsers);
      newBlocked.add(userId);
      return { blockedUsers: newBlocked };
    }),

  unblockUser: (userId: string) =>
    set((state) => {
      const newBlocked = new Set(state.blockedUsers);
      newBlocked.delete(userId);
      return { blockedUsers: newBlocked };
    }),

  isUserBlocked: (userId: string) => get().blockedUsers.has(userId),

  unreadDirectMessages: new Set(),

  unreadRooms: new Set(),

  markDirectMessagesAsRead: (peerId: string) =>
    set((state) => {
      const newUnread = new Set(state.unreadDirectMessages);
      newUnread.delete(peerId);
      return { unreadDirectMessages: newUnread };
    }),

  markRoomMessagesAsRead: (roomId: string) =>
    set((state) => {
      const newUnread = new Set(state.unreadRooms);
      newUnread.delete(roomId);
      return { unreadRooms: newUnread };
    }),

  addUnreadDirectMessage: (peerId: string) =>
    set((state) => {
      const newUnread = new Set(state.unreadDirectMessages);
      newUnread.add(peerId);
      return { unreadDirectMessages: newUnread };
    }),

  addUnreadRoomMessage: (roomId: string) =>
    set((state) => {
      const newUnread = new Set(state.unreadRooms);
      newUnread.add(roomId);
      return { unreadRooms: newUnread };
    }),

  callState: {
    isIncoming: false,
    isActive: false,
    remotePeerId: null,
    localStream: null,
    remoteStream: null,
  },

  setCallState: (newState: Partial<CallState>) =>
    set((state) => ({
      callState: { ...state.callState, ...newState },
    })),

  resetCallState: () =>
    set(() => ({
      callState: {
        isIncoming: false,
        isActive: false,
        remotePeerId: null,
        localStream: null,
        remoteStream: null,
      },
    })),

  // TicTacToe Games
  gameInvites: new Map(),

  activeSessions: new Map(),

  sendGameInvite: (_to: string, _toUsername: string) => {
    const invite: GameInvite = {
      id: uuidv4(),
      from: get().currentUser.id,
      fromUsername: get().currentUser.username,
      gameId: uuidv4(),
      timestamp: Date.now(),
      accepted: false,
    };
    set((state) => {
      const newInvites = new Map(state.gameInvites);
      newInvites.set(invite.id, invite);
      return { gameInvites: newInvites };
    });
    return invite;
  },

  acceptGameInvite: (inviteId: string) => {
    const invite = get().gameInvites.get(inviteId);
    if (!invite) throw new Error("Invite not found");

    const session: GameSession = {
      id: uuidv4(),
      gameId: invite.gameId,
      player1: invite.from,
      player2: get().currentUser.id,
      player1Symbol: "X",
      player2Symbol: "O",
      board: Array(9).fill(null),
      currentPlayer: "X",
      status: "active",
      winner: null,
      createdAt: Date.now(),
      dmPeerId: invite.from,
    };

    set((state) => {
      const newSessions = new Map(state.activeSessions);
      newSessions.set(session.id, session);

      const newInvites = new Map(state.gameInvites);
      newInvites.delete(inviteId);

      return { activeSessions: newSessions, gameInvites: newInvites };
    });

    return session;
  },

  declineGameInvite: (inviteId: string) =>
    set((state) => {
      const newInvites = new Map(state.gameInvites);
      newInvites.delete(inviteId);
      return { gameInvites: newInvites };
    }),

  removeGameInvite: (inviteId: string) =>
    set((state) => {
      const newInvites = new Map(state.gameInvites);
      newInvites.delete(inviteId);
      return { gameInvites: newInvites };
    }),

  updateGameSession: (sessionId: string, sessionUpdate: Partial<GameSession>) =>
    set((state) => {
      const newSessions = new Map(state.activeSessions);
      const session = newSessions.get(sessionId);
      if (session) {
        newSessions.set(sessionId, { ...session, ...sessionUpdate });
      }
      return { activeSessions: newSessions };
    }),

  endGameSession: (sessionId: string) =>
    set((state) => {
      const newSessions = new Map(state.activeSessions);
      newSessions.delete(sessionId);
      return { activeSessions: newSessions };
    }),
}));
