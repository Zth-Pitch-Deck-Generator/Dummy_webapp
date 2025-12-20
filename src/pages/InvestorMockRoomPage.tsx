// src/pages/InvestorMockRoomPage.tsx
import { InvestorMockRoom } from "@/components/investor-mockroom/InvestorMockRoom";
import { Header } from "@/components/Header";
import { handleGoogleSignIn } from "@/lib/auth"; //

export default function InvestorMockRoomPage() {
  // Define the missing function by using the imported auth handler
  const handleAuthRedirect = () => handleGoogleSignIn();

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <Header handleAuthRedirect={handleAuthRedirect} />
      {/* Main content */}
      <main className="container mx-auto p-4 md:p-8 w-full flex-1 flex flex-col justify-center items-center bg-gradient-to-tr ">
        <InvestorMockRoom />
      </main>
    </div>
  );
}