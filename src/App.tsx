import { useState } from 'react';
import Nav from './components/layout/Nav';
import Footer from './components/layout/Footer';
import AuthModal from './components/auth/AuthModal';
import VoiceConcierge from './components/agent/VoiceConcierge';
import Home from './pages/Home';
import Results from './pages/Results';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import Ops from './pages/Ops';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { BookingDraft, Offer, Page, SearchCriteria } from './types/domain';

function AppShell() {
  const [page, setPage] = useState<Page>('home');
  const [criteria, setCriteria] = useState<SearchCriteria | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [booking, setBooking] = useState<BookingDraft | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, token } = useAuth();

  function handleSearch(c: SearchCriteria) {
    setCriteria(c);
    setPassengers(c.passengers || 1);
    setPage('results');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleSelect(offer: Offer, offerPassengers?: number) {
    setSelectedOffer(offer);
    if (offerPassengers) setPassengers(offerPassengers);
    setPage('checkout');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleConfirm(details: BookingDraft) {
    setBooking(details);
    setPage('confirmation');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function goHome() {
    setPage('home');
    setCriteria(null);
    setSelectedOffer(null);
    setBooking(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-navy-950">
      <Nav
        page={page}
        cartCount={selectedOffer && page !== 'confirmation' ? 1 : 0}
        onNavigate={(p) => (p === 'home' ? goHome() : setPage(p))}
        onSignIn={() => setAuthOpen(true)}
      />

      {page === 'home' && <Home onSearch={handleSearch} />}

      {page === 'results' && criteria && (
        <Results criteria={criteria} onSearch={handleSearch} onSelect={handleSelect} />
      )}

      {page === 'checkout' && (
        <Checkout
          offer={selectedOffer}
          passengers={passengers}
          account={user}
          token={token}
          onBack={() => setPage(criteria ? 'results' : 'home')}
          onConfirm={handleConfirm}
        />
      )}

      {page === 'confirmation' && <Confirmation booking={booking} onDone={goHome} />}

      {page === 'ops' && (
        <Ops user={user} token={token} onBack={goHome} onSignIn={() => setAuthOpen(true)} />
      )}

      {page === 'admin' && (
        <AdminDashboard user={user} token={token} onBack={goHome} onSignIn={() => setAuthOpen(true)} />
      )}

      {page !== 'ops' && page !== 'admin' && <Footer />}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      <VoiceConcierge token={token} onReviewOffer={handleSelect} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
