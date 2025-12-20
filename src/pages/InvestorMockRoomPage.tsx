// src/pages/InvestorMockRoomPage.tsx
import { InvestorMockRoom } from "@/components/investor-mockroom/InvestorMockRoom";
import { Header } from "@/components/Header";
import { handleGoogleSignIn } from "@/lib/auth";

export default function InvestorMockRoomPage() {
  // If the user clicks "Get Started" in the header here, 
  // they usually want to start the creation flow.
  const handleAuthRedirect = () => handleGoogleSignIn('/create');

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header handleAuthRedirect={handleAuthRedirect} />
      <main className="container mx-auto p-4 md:p-8 w-full flex-1 flex flex-col justify-center items-center">
        <InvestorMockRoom />
      </main>
    </div>
  );
}