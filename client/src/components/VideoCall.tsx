import React, { useEffect, useRef, useState } from "react";
import { useStore } from "../store/useStore";
import { answerCall, endCall } from "../services/peerService";
import { motion } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";

export const VideoCall: React.FC = () => {
  const { callState, connections } = useStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream;
    }
  }, [callState.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.remoteStream]);

  const toggleMic = () => {
    if (callState.localStream) {
      callState.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleVideo = () => {
    if (callState.localStream) {
      callState.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(!isVideoMuted);
    }
  };

  if (!callState.isIncoming && !callState.isActive) return null;

  const remoteUser = callState.remotePeerId
    ? connections.get(callState.remotePeerId)
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-full max-w-4xl aspect-video relative flex flex-col"
      >
        {/* Incoming Call Screen */}
        {callState.isIncoming && !callState.isActive && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/90">
            <Avatar className="w-24 h-24 mb-4 border-4 border-white/10">
              <AvatarFallback className="text-2xl font-bold">
                {remoteUser?.username.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-2xl font-bold text-white mb-2">
              {remoteUser?.username || "Unknown User"}
            </h3>
            <p className="text-white/60 mb-8">Incoming Video Call...</p>
            <div className="flex gap-4">
              <Button
                onClick={endCall}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16 p-0"
              >
                <PhoneOff className="w-8 h-8" />
              </Button>
              <Button
                onClick={answerCall}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full w-16 h-16 p-0 animate-pulse"
              >
                <Phone className="w-8 h-8" />
              </Button>
            </div>
          </div>
        )}

        {/* Active Call Interface */}
        <div className="relative flex-1 bg-black group">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover relative z-0 pointer-events-none"
          />
          {!callState.remoteStream && callState.isActive && (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 z-10">
              Waiting for remote video...
            </div>
          )}

          {/* Local Video (PIP) */}
          <div className="absolute bottom-4 right-4 w-48 aspect-video bg-slate-800 rounded-lg overflow-hidden border border-white/20 shadow-lg z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-full border border-white/10 z-50 shadow-xl">
            <Button
              onClick={toggleMic}
              variant="ghost"
              className={`rounded-full w-12 h-12 p-0 ${
                isMicMuted
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {isMicMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            <Button
              onClick={endCall}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-14 h-14 p-0"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button
              onClick={toggleVideo}
              variant="ghost"
              className={`rounded-full w-12 h-12 p-0 ${
                isVideoMuted
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {isVideoMuted ? (
                <VideoOff className="w-5 h-5" />
              ) : (
                <Video className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Close Button (Top Right) */}
          <Button
            onClick={endCall}
            variant="ghost"
            className="absolute top-4 right-4 z-50 text-white/50 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
