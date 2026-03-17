import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { StreamProvider } from "./contexts/StreamContext";
import { LocalStorageControls } from "./components/LocalStorageControls";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { ServiceWorkerUpdate } from "./components/ServiceWorkerUpdate";
import { useTheme } from "./hooks/useTheme";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Apply theme class on document root at mount
  useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <StreamProvider>
        <Router />
        <LocalStorageControls />
        <PWAInstallPrompt />
        <ServiceWorkerUpdate />
        <Toaster />
      </StreamProvider>
    </QueryClientProvider>
  );
}

export default App;
