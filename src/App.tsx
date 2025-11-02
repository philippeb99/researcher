import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResearchDetails from "./pages/ResearchDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route 
                path="/" 
                element={
                  <AuthGuard requireAuth={true}>
                    <Index />
                  </AuthGuard>
                } 
              />
              <Route 
                path="/auth" 
                element={
                  <AuthGuard requireAuth={false}>
                    <Auth />
                  </AuthGuard>
                } 
              />
              <Route 
                path="/research/:id" 
                element={
                  <AuthGuard requireAuth={true}>
                    <ResearchDetails />
                  </AuthGuard>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
