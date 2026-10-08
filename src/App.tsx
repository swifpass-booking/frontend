import { useCallback, useState } from 'react';
import Nav from './components/layout/Nav';
import Footer from './components/layout/Footer';
import AuthModal from './components/auth/AuthModal';
import VoiceMode from './components/agent/VoiceMode';
import { VoiceProvider } from './context/VoiceContext';
import Home from './pages/Home';
import PaymentReturn from './pages/PaymentReturn';
import Results from './pages/Results';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import AdminApp from './pages/AdminDashboard';
import GateBoard from './pages/GateBoard';
import StaffLogin from './pages/StaffLogin';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { BookingDraft, Offer, Page, SearchCriteria } from './types/domain';

function TravellerApp() {
  const [page, setPage] = useState<Page>('home');
  const [criteria, setCriteria] = useState<SearchCriteria | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [booking, setBooking] = useState<BookingDraft | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, token } = useAuth();
  // eSewa / Khalti send the browser back to /payment/<provider>?... — confirm it before anything else.
  const [returning, setReturning] = useState<'esewa' | 'khalti' | null>(() => {
    const m = window.location.pathname.match(/^\/payment\/(esewa|khalti)$/);
    return m ? (m[1] as 'esewa' | 'khalti') : null;
  });

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

  const handlePaid = useCallback((details: BookingDraft) => {
    setBooking(details);
    setReturning(null);
    setPage('confirmation');
  }, []);

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
    <VoiceProvider token={token} onReviewOffer={handleSelect} onSearch={handleSearch}>
    <div className="min-h-screen bg-slate-50 font-sans text-navy-950">
      <Nav
        page={page}
        cartCount={selectedOffer && page !== 'confirmation' ? 1 : 0}
        onNavigate={(p) => (p === 'home' ? goHome() : setPage(p))}
        onSignIn={() => setAuthOpen(true)}
      />

      {returning && <PaymentReturn provider={returning} onConfirmed={handlePaid} onBack={() => setReturning(null)} />}

      {!returning && page === 'home' && <Home onSearch={handleSearch} />}

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

      <Footer />

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      <VoiceMode />
    </div>
    </VoiceProvider>
  );
}

/** Which app you get depends on who you are: admins and gate/operator staff never see the traveller site. */
function RoleRouter() {
  const { user, token, ready, logout } = useAuth();
  const path = window.location.pathname;

  if (!ready) return <div className="min-h-screen bg-slate-50" />;

  if (user?.role === 'admin') return <AdminApp user={user} token={token} onSignOut={logout} />;

  if (user?.role === 'operator_staff' || user?.role === 'gate_agent') {
    return (
      <div className="min-h-screen bg-slate-50">
        <GateBoard user={user} token={token} onBack={logout} onSignIn={() => undefined} backLabel="Sign out" />
      </div>
    );
  }

  // Not staff: /admin and /ops are sign-in doors, not menu items.
  if (!user && (path.startsWith('/admin') || path.startsWith('/ops'))) {
    return <StaffLogin area={path.startsWith('/admin') ? 'admin' : 'ops'} />;
  }
  return <TravellerApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <RoleRouter />
    </AuthProvider>
  );
}
