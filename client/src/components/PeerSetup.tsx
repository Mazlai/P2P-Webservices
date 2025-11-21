import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { initializePeer, initializeSignaling } from "../services/peerService";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { motion } from "framer-motion";

interface PeerSetupProps {
  onSetupComplete: () => void;
}

export const PeerSetup: React.FC<PeerSetupProps> = ({ onSetupComplete }) => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentUser, setUsername: setStoreUsername } = useStore();

  const handleSetup = async () => {
    if (username.trim()) {
      setLoading(true);
      try {
        setStoreUsername(username);
        initializeSignaling();
        await initializePeer(currentUser.id);
        onSetupComplete();
      } catch (error) {
        console.error("Setup error:", error);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Subtle ambient light */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-sm"
      >
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl">
          <div className="p-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-center mb-8"
            >
              {/* Logo */}
              <img
                src="/favicon.ico"
                alt="PeerTea Logo"
                className="mx-auto mb-4 w-12 h-12"
              />
              <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
                PeerTea
              </h1>
              <p className="text-white/50 text-sm font-light">
                Direct peer-to-peer messaging
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-light text-white/70 mb-2">
                  Username
                </label>
                <Input
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSetup()}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/40"
                  disabled={loading}
                />
              </div>

              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  onClick={handleSetup}
                  disabled={!username.trim() || loading}
                  className="w-full bg-white text-black hover:bg-white/90 font-medium"
                >
                  {loading ? "Connecting..." : "Enter"}
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg"
              >
                <p className="text-xs text-white/40 text-center font-light">
                  ID:{" "}
                  <span className="font-mono text-white/60">
                    {currentUser.id.slice(0, 12)}...
                  </span>
                </p>
              </motion.div>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
