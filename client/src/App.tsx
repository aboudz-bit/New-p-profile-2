import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui/index";
import { AppShell } from "@/components/layout/AppShell";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import ProductRegistry from "@/pages/ProductRegistry";
import ProductProfile from "@/pages/ProductProfile";
import Directory from "@/pages/Directory";
import Branches from "@/pages/Branches";
import UsersPage from "@/pages/Users";
import SettingsPage from "@/pages/Settings";
import PublicPreview from "@/pages/PublicPreview";
import NotFound from "@/pages/NotFound";

function Protected() {
  const { isBusiness } = useAuth();
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/registry" component={ProductRegistry} />
        <Route path="/registry/:id" component={ProductProfile} />
        <Route path="/directory" component={Directory} />
        {isBusiness && <Route path="/branches" component={Branches} />}
        {isBusiness && <Route path="/users" component={UsersPage} />}
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public QR scan preview — accessible with or without a session. */}
      <Route path="/p/:pProfileId" component={PublicPreview} />
      <Route path="/login">{user ? <Redirect to="/" /> : <Login />}</Route>
      <Route path="/register">{user ? <Redirect to="/" /> : <Register />}</Route>
      <Route>{user ? <Protected /> : <Redirect to="/login" />}</Route>
    </Switch>
  );
}
