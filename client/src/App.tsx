import { useState } from "react";
import "./App.css";
import { PeerSetup } from "./components/PeerSetup";
import { ChatInterface } from "./components/ChatInterface";
import { NotificationContainer } from "./components/Notifications";
import { useNotifications } from "./store/useNotifications";

function App() {
  const [setupComplete, setSetupComplete] = useState(false);
  const { notifications, removeNotification } = useNotifications();

  if (!setupComplete) {
    return (
      <>
        <PeerSetup onSetupComplete={() => setSetupComplete(true)} />
        <NotificationContainer
          notifications={notifications}
          onClose={removeNotification}
        />
      </>
    );
  }

  return (
    <>
      <ChatInterface />
    </>
  );
}

export default App;
