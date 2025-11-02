import { Button } from "@/components/ui/button";
import { User, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Settings from "./Settings";

const Header = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <header className="bg-card shadow-card border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <svg fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white" viewBox="0 0 42 42">
                <path d="M1,17.838c0,8.747,7.131,15.827,15.94,15.827c8.796,0,15.938-7.08,15.938-15.827S25.736,2,16.94,2C8.131,2,1,9.091,1,17.838
                z M6.051,17.838c0-5.979,4.868-10.817,10.89-10.817c6.01,0,10.888,4.839,10.888,10.817c0,5.979-4.878,10.818-10.888,10.818
                C10.919,28.656,6.051,23.816,6.051,17.838z M28.162,32.361l6.855,7.809c1.104,1.102,1.816,1.111,2.938,0l2.201-2.181
                c1.082-1.081,1.149-1.778,0-2.921l-7.896-6.775L28.162,32.361z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">LeadInsight</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Research Intelligence</p>
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Settings />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px]">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium text-foreground">
                    {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;