import { useCallback, useState } from 'react';
import Nav from './components/layout/Nav';
import Footer from './components/layout/Footer';
import AuthModal from './components/auth/AuthModal';
import { VoiceProvider } from './context/VoiceContext';
import Home from './pages/Home';
import PaymentReturn from './pages/PaymentReturn';
import Results from './pages/Results';
import Checkout from './pages/Checkout';
import MyTickets from './pages/MyTickets';
import Confirmation from './pages/Confirmation';
import AdminApp from './pages/AdminDashboard';
import GateBoard from './pages/GateBoard';
import Planner from './pages/Planner';
import StaffLogin from './pages/StaffLogin';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { BookingDraft, Offer, Page, SearchCriteria, SeatPick } from './types/domain';

/** `embedded`: shown inside the admin panel, so the admin sees exactly what travellers book from. */
function TravellerApp({ embedded = false }: { embedded?: boolean }) {
  const [page, setPage] = useState<Page>('home');
  const [criteria, setCriteria] = useState<SearchCriteria | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<SeatPick[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [booking, setBooking] = useState<BookingDraft | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [voiceStart, setVoiceStart] = useState(false); // planner opened from a mic button: begin listening
  const { user, token } = useAuth();
  // eSewa / Khalti send the browser back to /payment/<provider>?... — confirm it before anything else.
  const [returning, setReturning] = useState<'esewa' | 'khalti' | 'fonepay' | null>(() => {
    const m = window.location.pathname.match(/^\/payment\/(esewa|khalti|fonepay)$/);
    return m ? (m[1] as 'esewa' | 'khalti' | 'fonepay') : null;
  });

  // The AI planner is a standalone chat screen (own header, no site nav/footer) except inside the admin panel.
  const fullBleed = page === 'planner' && !embedded && !returning;

  function openPlanner(voice: boolean) {
    setVoiceStart(voice);
    setReturning(null);
    setPage('planner');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleSearch(c: SearchCriteria) {
    setCriteria(c);
    setPassengers(c.passengers || 1);
    setPage('results');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleSelect(offer: Offer, offerPassengers?: number, seats?: SeatPick[], zoneId?: string) {
    setSelectedOffer(offer);
    setSelectedSeats(seats ?? []);
    setSelectedZoneId(zoneId ?? '');
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
    <VoiceProvider token={token} onReviewOffer={handleSelect}>
    <div className={`${embedded ? '' : 'min-h-screen '}bg-slate-50 font-sans text-navy-950`}>
      {!fullBleed && <Nav
        page={page}
        cartCount={selectedOffer && page !== 'confirmation' ? 1 : 0}
        onNavigate={(p) => {
          setVoiceStart(false);
          setReturning(null); // leaving a payment-return screen (e.g. for My tickets) must not leave it showing
          if (p === 'home') goHome();
          else setPage(p);
        }}
        onSignIn={() => setAuthOpen(true)}
      />}

      {returning && <PaymentReturn
          provider={returning}
          onConfirmed={handlePaid}
          onBack={() => setReturning(null)}
          onTickets={() => {
            setReturning(null);
            setPage('tickets');
          }}
        />}

      {!returning && page === 'home' && <Home onSearch={handleSearch} onPlan={() => openPlanner(false)} onVoice={() => openPlanner(true)} />}

      {page === 'planner' && (
        <Planner
          onNavigate={(p) => {
            setVoiceStart(false);
            if (p === 'home') goHome();
            else setPage(p);
          }}
          onSignIn={() => setAuthOpen(true)}
          autoStart={voiceStart}
        />
      )}

      {page === 'tickets' && <MyTickets onSignIn={() => setAuthOpen(true)} />}

      {page === 'results' && criteria && (
        <Results criteria={criteria} onSearch={handleSearch} onSelect={handleSelect} onVoice={() => openPlanner(true)} />
      )}

      {page === 'checkout' && (
        <Checkout
          offer={selectedOffer}
          passengers={passengers}
          seats={selectedSeats}
          initialZoneId={selectedZoneId}
          account={user}
          token={token}
          onBack={() => setPage(criteria ? 'results' : 'home')}
          onConfirm={handleConfirm}
        />
      )}

      {page === 'confirmation' && <Confirmation booking={booking} onDone={goHome} />}

      {!embedded && !fullBleed && <Footer />}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
    </VoiceProvider>
  );
}

/** Which app you get depends on who you are: admins and gate/operator staff never see the traveller site. */
function RoleRouter() {
  const { user, token, ready, logout } = useAuth();
  const path = window.location.pathname;

  if (!ready) return <div className="min-h-screen bg-slate-50" />;

  if (user?.role === 'admin') {
    return (
      <AdminApp
        user={user}
        token={token}
        onSignOut={logout}
        storefront={<TravellerApp embedded />}
        scanner={<GateBoard user={user} token={token} onBack={() => undefined} onSignIn={() => undefined} embedded />}
      />
    );
  }

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
