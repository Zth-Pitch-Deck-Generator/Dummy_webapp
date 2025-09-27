import { InvestorMockRoom } from "@/components/investor-mockroom/InvestorMockRoom";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { Header } from "@/components/Header";

export default function InvestorMockRoomPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header />
      {/* Main content: take all remaining space, center contents */}
      <main className="flex-1 flex flex-col justify-center items-center bg-gradient-to-tr from-blue-50 via-white to-blue-100 p-4">
        <InvestorMockRoom />
      </main>
    </div>
  );
}


