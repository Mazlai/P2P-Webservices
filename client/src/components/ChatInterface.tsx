import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { useNotifications } from "../store/useNotifications";
import { motion, AnimatePresence } from "framer-motion";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import {
  Users,
  MessageSquare,
  Settings,
  Plus,
  Send,
  Lock,
  Copy,
  Check,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  connectToPeer,
  sendDirectMessage,
  sendRoomMessage,
  broadcastStatusUpdate,
  broadcastRoomCreated,
  addFriend,
  removeFriend,
  initiateCall,
} from "../services/peerService";
import { NotificationContainer } from "./Notifications";
import { VideoCall } from "./VideoCall";
import {
  TicTacToeGame,
  TicTacToeInvitation,
  SendGameInviteButton,
} from "./TicTacToe";
import type { UserStatus } from "../store/useStore";

// Initialize Giphy with a beta key
const gf = new GiphyFetch("SYuQlNJE9C0WHIe6QFmFGqln9tQQ8SqX");

export const ChatInterface: React.FC = () => {
  const {
    currentUser,
    setStatus,
    setStatusMessage,
    connections,
    directMessages,
    rooms,
    createRoom,
    blockUser,
    isUserBlocked,
    isFriend,
    friends,
    blockedUsers,
    unreadDirectMessages,
    unreadRooms,
    markDirectMessagesAsRead,
    markRoomMessagesAsRead,
    activeSessions,
  } = useStore();

  const { notifications, addNotification, removeNotification } =
    useNotifications();

  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [remotePeerId, setRemotePeerId] = useState("");
  const [statusMessage, setStatusText] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomIsPublic, setNewRoomIsPublic] = useState(true);
  const [activeStatus, setActiveStatus] = useState<UserStatus>("online");
  const [copiedId, setCopiedId] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchGifs = (offset: number) => {
    if (gifSearch) {
      return gf.search(gifSearch, { offset, limit: 10 });
    } else {
      return gf.trending({ offset, limit: 10 });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat, directMessages, rooms]);

  // Mark messages as read when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      if (selectedChat.startsWith("room-")) {
        const roomId = selectedChat.replace("room-", "");
        markRoomMessagesAsRead(roomId);
      } else if (selectedChat.startsWith("dm-")) {
        const peerId = selectedChat.replace("dm-", "");
        markDirectMessagesAsRead(peerId);
      }
    }
  }, [selectedChat, markDirectMessagesAsRead, markRoomMessagesAsRead]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    if (selectedChat?.startsWith("room-")) {
      const roomId = selectedChat.replace("room-", "");
      sendRoomMessage(roomId, messageText);
    } else if (selectedChat?.startsWith("dm-")) {
      const peerId = selectedChat.replace("dm-", "");
      sendDirectMessage(peerId, messageText);
    }

    setMessageText("");
  };

  const handleConnectPeer = async () => {
    if (remotePeerId.trim()) {
      try {
        await connectToPeer(remotePeerId);
        setRemotePeerId("");
        addNotification("Connected to peer", "success");
      } catch (error) {
        console.error("Connection error:", error);
        addNotification("Failed to connect", "error");
      }
    }
  };

  const handleStatusChange = (status: UserStatus, message: string) => {
    setStatus(status);
    setStatusMessage(message);
    broadcastStatusUpdate(status, message);
  };

  const handleCopyID = () => {
    navigator.clipboard.writeText(currentUser.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "busy":
        return "bg-red-500";
      case "invisible":
        return "bg-gray-500";
    }
  };

  const currentMessages = selectedChat?.startsWith("room-")
    ? rooms.get(selectedChat.replace("room-", ""))?.messages || []
    : selectedChat?.startsWith("dm-")
    ? directMessages.get(selectedChat.replace("dm-", "") || "") || []
    : [];

  const getChatName = () => {
    if (selectedChat?.startsWith("room-")) {
      return rooms.get(selectedChat.replace("room-", ""))?.name;
    } else if (selectedChat?.startsWith("dm-")) {
      const peerId = selectedChat.replace("dm-", "");
      return connections.get(peerId)?.username;
    }
    return null;
  };

  const getChatSubtitle = () => {
    if (selectedChat?.startsWith("room-")) {
      const room = rooms.get(selectedChat.replace("room-", ""));
      return `${room?.members.length || 0} members`;
    } else if (selectedChat?.startsWith("dm-")) {
      const peerId = selectedChat.replace("dm-", "");
      const conn = connections.get(peerId);
      return conn?.statusMessage || conn?.status;
    }
    return null;
  };

  // Debug logging for state changes
  useEffect(() => {
    console.log("Friends list updated:", friends.size);
  }, [friends]);

  useEffect(() => {
    console.log("Blocked users updated:", blockedUsers.size);
  }, [blockedUsers]);

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row">
      <VideoCall />
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
      />

      {/* Subtle ambient light */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -400 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full lg:w-80 bg-gradient-to-b from-slate-950 to-black flex flex-col min-h-screen lg:min-h-full border-r border-white/10"
      >
        {/* Profile Header */}
        <motion.div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Avatar className="w-10 h-10 border-2 border-white/20">
                <AvatarFallback className="bg-white/10 text-white font-bold">
                  {currentUser.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(
                  currentUser.status
                )} rounded-full border-2 border-slate-950`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate text-sm">
                {currentUser.username}
              </p>
              <p className="text-xs text-white/50">
                {currentUser.statusMessage || "No status"}
              </p>
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-white/10 border-white/20 text-white/80 hover:bg-white/20 text-xs h-8"
              >
                <Settings className="w-3 h-3 mr-1" />
                Status
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white text-sm">
                  Update Status
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(["online", "busy", "invisible"] as UserStatus[]).map(
                    (status) => (
                      <motion.div
                        key={status}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={() => setActiveStatus(status)}
                          variant={
                            activeStatus === status ? "default" : "outline"
                          }
                          className={`w-full capitalize text-xs h-8 ${
                            activeStatus === status
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          {status}
                        </Button>
                      </motion.div>
                    )
                  )}
                </div>
                <Input
                  placeholder="Status message..."
                  value={statusMessage}
                  onChange={(e) => setStatusText(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm h-9"
                />
                <Button
                  onClick={() =>
                    handleStatusChange(activeStatus, statusMessage)
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-9"
                >
                  Update
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Peer ID Share */}
        <motion.div className="p-4 border-b border-white/10">
          <p className="text-xs text-white/50 mb-2 font-semibold">
            Your Peer ID
          </p>
          <div className="bg-white/5 border border-white/10 rounded p-2 flex items-center justify-between gap-2">
            <code className="text-xs text-white/60 truncate">
              {currentUser.id.slice(0, 12)}...
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyID}
              className="h-6 w-6 p-0 hover:bg-white/10"
            >
              {copiedId ? (
                <Check className="w-3 h-3 text-green-400" />
              ) : (
                <Copy className="w-3 h-3 text-white/60" />
              )}
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs
          defaultValue="conversations"
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="m-2 bg-white/20 border-white/10 text-xs h-9">
            <TabsTrigger
              value="conversations"
              className="text-xs data-[state=inactive]:text-white/70"
            >
              Chats
            </TabsTrigger>
            <TabsTrigger
              value="rooms"
              className="text-xs data-[state=inactive]:text-white/70"
            >
              Rooms
            </TabsTrigger>
            <TabsTrigger
              value="connections"
              className="text-xs data-[state=inactive]:text-white/70"
            >
              Peers
            </TabsTrigger>
          </TabsList>

          {/* Conversations Tab */}
          <TabsContent
            value="conversations"
            className="flex-1 overflow-y-auto px-2 pb-2 space-y-1"
          >
            <AnimatePresence>
              {Array.from(directMessages.entries()).map(([peerId]) => {
                const conn = connections.get(peerId);
                if (!conn) return null;

                return (
                  <motion.div
                    key={peerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedChat(`dm-${peerId}`)}
                      className={`w-full p-3 rounded-lg transition-all text-left text-sm ${
                        selectedChat === `dm-${peerId}`
                          ? "bg-blue-600/30 border-blue-500"
                          : "bg-white/5 hover:bg-white/10 text-white border-transparent"
                      } border`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback
                              className={`text-xs font-bold ${
                                selectedChat === `dm-${peerId}`
                                  ? "bg-blue-600"
                                  : "bg-white/20"
                              }`}
                            >
                              {conn.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${getStatusColor(
                              conn.status
                            )} rounded-full border-2 border-slate-950`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {conn.username}
                          </p>
                          <p
                            className={`text-xs truncate ${
                              selectedChat === `dm-${peerId}`
                                ? "text-white/60"
                                : "text-white/40"
                            }`}
                          >
                            {conn.statusMessage || conn.status}
                          </p>
                        </div>
                        {unreadDirectMessages.has(peerId) && (
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {directMessages.size === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-white/40 text-sm"
              >
                <MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-30" />
                <p>No conversations</p>
              </motion.div>
            )}
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent
            value="rooms"
            className="flex-1 overflow-y-auto px-2 pb-2 space-y-1"
          >
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                  <Plus className="w-3 h-3 mr-1" />
                  New Room
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white text-sm">
                    Create Room
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Room name..."
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm h-9"
                  />
                  <div className="flex items-center justify-between bg-white/5 border border-white/20 rounded-lg p-3">
                    <label className="text-sm text-white/80">
                      {newRoomIsPublic ? "Public Room" : "Private Room"}
                    </label>
                    <button
                      onClick={() => setNewRoomIsPublic(!newRoomIsPublic)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        newRoomIsPublic ? "bg-blue-600" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          newRoomIsPublic ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-white/50">
                    {newRoomIsPublic
                      ? "Public rooms are visible to all connected peers"
                      : "Private rooms are only visible to your friends"}
                  </p>
                  <Button
                    onClick={() => {
                      if (newRoomName.trim()) {
                        const room = createRoom(newRoomName, newRoomIsPublic);
                        broadcastRoomCreated(room.id);
                        setSelectedChat(`room-${room.id}`);
                        setNewRoomName("");
                        setNewRoomIsPublic(true);
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-9"
                  >
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <AnimatePresence>
              {Array.from(rooms.values()).map((room) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedChat(`room-${room.id}`)}
                    className={`w-full p-3 rounded-lg transition-all text-left text-sm ${
                      selectedChat === `room-${room.id}`
                        ? "bg-blue-600/30 border-blue-500"
                        : "bg-white/5 hover:bg-white/10 text-white border-transparent"
                    } border`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 opacity-60 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">
                            # {room.name}
                          </p>
                          {!room.isPublic && (
                            <Lock className="w-3 h-3 opacity-60 flex-shrink-0" />
                          )}
                        </div>
                        <p
                          className={`text-xs ${
                            selectedChat === `room-${room.id}`
                              ? "text-white/60"
                              : "text-white/40"
                          }`}
                        >
                          {room.members.length} members
                        </p>
                      </div>
                      {unreadRooms.has(room.id) && (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                    </div>
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            {rooms.size === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-white/40 text-sm"
              >
                <Users className="w-5 h-5 mx-auto mb-2 opacity-30" />
                <p>No rooms</p>
              </motion.div>
            )}
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent
            value="connections"
            className="flex-1 overflow-y-auto px-2 pb-2 space-y-1"
          >
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                  <Plus className="w-3 h-3 mr-1" />
                  Connect
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white text-sm">
                    Connect to Peer
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter peer ID..."
                    value={remotePeerId}
                    onChange={(e) => setRemotePeerId(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm h-9"
                  />
                  <Button
                    onClick={handleConnectPeer}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-9"
                  >
                    Connect
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <AnimatePresence>
              {Array.from(connections.values()).map((conn) => (
                <motion.div
                  key={conn.peerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card className="bg-white/5 border-white/10 p-2 hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="bg-white/20 text-xs font-bold">
                              {conn.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute bottom-0 right-0 w-2 h-2 ${getStatusColor(
                              conn.status
                            )} rounded-full border border-slate-950`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate text-xs">
                            {conn.username}
                          </p>
                          <p className="text-xs text-white/40">
                            {conn.statusMessage || conn.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedChat(`dm-${conn.peerId}`)}
                          className="h-6 w-6 p-0 hover:bg-blue-600/30"
                          title="Send message"
                        >
                          <MessageSquare className="w-3 h-3 text-blue-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (isFriend(conn.peerId)) {
                              removeFriend(conn.peerId);
                            } else {
                              addFriend(conn.peerId);
                            }
                          }}
                          className={`h-6 w-6 p-0 ${
                            isFriend(conn.peerId)
                              ? "text-green-400 hover:text-green-300"
                              : "text-white/40 hover:text-green-400"
                          }`}
                          title={
                            isFriend(conn.peerId)
                              ? "Remove friend"
                              : "Add friend"
                          }
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => blockUser(conn.peerId)}
                          className={`h-6 w-6 p-0 ${
                            isUserBlocked(conn.peerId)
                              ? "text-red-400 hover:text-red-300"
                              : "text-white/40 hover:text-red-400"
                          }`}
                          title="Block user"
                        >
                          <Lock className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {connections.size === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-white/40 text-sm"
              >
                <Users className="w-5 h-5 mx-auto mb-2 opacity-30" />
                <p>No connections</p>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Main Chat Area */}
      <div className="relative z-10 flex-1 flex flex-col min-h-screen lg:min-h-full bg-gradient-to-b from-black to-slate-950">
        {selectedChat ? (
          <>
            {/* Check if there's an active game for this DM */}
            {selectedChat.startsWith("dm-") &&
              Array.from(activeSessions.values()).find(
                (session) =>
                  session.dmPeerId === selectedChat.replace("dm-", "")
              ) && (
                <div className="p-4 border-b border-white/10">
                  <TicTacToeGame
                    session={
                      Array.from(activeSessions.values()).find(
                        (session) =>
                          session.dmPeerId === selectedChat.replace("dm-", "")
                      )!
                    }
                    peerId={selectedChat.replace("dm-", "")}
                  />
                </div>
              )}

            {/* Chat Header */}
            <motion.div
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              className="p-4 border-b border-white/10 flex items-center justify-between"
            >
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {selectedChat.startsWith("dm-") ? "@" : "#"}
                  {getChatName()}
                </h2>
                <p className="text-xs text-white/40">{getChatSubtitle()}</p>
              </div>
              <div className="flex gap-2">
                {selectedChat.startsWith("dm-") && (
                  <>
                    <SendGameInviteButton
                      peerId={selectedChat.replace("dm-", "")}
                      peerUsername={
                        connections.get(selectedChat.replace("dm-", ""))
                          ?.username || ""
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        initiateCall(selectedChat.replace("dm-", ""))
                      }
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Video className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
            </motion.div>

            {/* Display game invitation if any */}
            {selectedChat.startsWith("dm-") && (
              <div className="p-4">
                <TicTacToeInvitation
                  peerId={selectedChat.replace("dm-", "")}
                  peerUsername={
                    connections.get(selectedChat.replace("dm-", ""))
                      ?.username || ""
                  }
                />
              </div>
            )}

            {/* Messages Area */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 overflow-y-auto p-4 space-y-2 flex flex-col"
            >
              <AnimatePresence>
                {currentMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex ${
                      msg.senderId === currentUser.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.senderId === currentUser.id
                          ? "bg-blue-600 text-white"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold mb-0.5 ${
                          msg.senderId === currentUser.id
                            ? "text-blue-100"
                            : "text-white/70"
                        }`}
                      >
                        {msg.senderUsername}
                      </p>
                      {msg.type === "image" ? (
                        <img
                          src={msg.content}
                          alt="GIF"
                          className="rounded-lg max-w-full h-auto my-1"
                          loading="lazy"
                        />
                      ) : (
                        <p className="text-sm break-words">{msg.content}</p>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          msg.senderId === currentUser.id
                            ? "text-blue-200/60"
                            : "text-white/30"
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </motion.div>

            {/* Input Area */}
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="p-4 border-t border-white/10"
            >
              <div className="flex gap-2">
                <Popover
                  open={isGifPickerOpen}
                  onOpenChange={setIsGifPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 p-0 bg-slate-950 border-white/10"
                    align="start"
                    side="top"
                  >
                    <div className="p-2">
                      <Input
                        placeholder="Search GIFs..."
                        value={gifSearch}
                        onChange={(e) => setGifSearch(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm h-8 mb-2"
                      />
                      <div className="h-64 overflow-y-auto custom-scrollbar">
                        <Grid
                          width={300}
                          columns={3}
                          fetchGifs={fetchGifs}
                          key={gifSearch}
                          onGifClick={(gif, e) => {
                            e.preventDefault();
                            if (selectedChat?.startsWith("room-")) {
                              const roomId = selectedChat.replace("room-", "");
                              sendRoomMessage(
                                roomId,
                                gif.images.fixed_height.url,
                                "image"
                              );
                            } else if (selectedChat?.startsWith("dm-")) {
                              const peerId = selectedChat.replace("dm-", "");
                              sendDirectMessage(
                                peerId,
                                gif.images.fixed_height.url,
                                "image"
                              );
                            }
                            setIsGifPickerOpen(false);
                          }}
                          noLink
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Input
                  placeholder="Message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm h-9"
                />
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleSendMessage}
                    className="bg-blue-600 hover:bg-blue-700 h-9 w-9 p-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center">
              <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Select a chat
              </h3>
              <p className="text-sm text-white/40">
                or connect with a peer to start
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
