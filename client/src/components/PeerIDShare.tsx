import React from "react";
import { useStore } from "../store/useStore";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useState } from "react";

export const PeerIDShare: React.FC = () => {
  const { currentUser } = useStore();
  const [copied, setCopied] = useState(false);

  const handleCopyID = () => {
    navigator.clipboard.writeText(currentUser.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="text-sm font-semibold text-purple-300">
          Share Your Peer ID
        </h3>
        <div className="bg-slate-800/50 rounded-lg p-3 font-mono text-xs text-purple-200 break-all">
          {currentUser.id}
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleCopyID}
            size="sm"
            className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy ID
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </Card>
  );
};
