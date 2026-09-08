import { useState } from 'react';
import Nav from './Nav.jsx';
import Home from './Home.jsx';
import Results from './Results.jsx';
import Checkout from './Checkout.jsx';
import Confirmation from './Confirmation.jsx';
import Ops from './Ops.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AuthModal from './AuthModal.jsx';
import { AuthProvider, useAuth } from './AuthContext.jsx';

function AppShell() {
  const [page, setPage] = useState('home');
  const [criteria, setCriteria] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [passengers, setPassengers] = useState(1);
  const [booking, setBooking] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, token } = useAuth();

  function handleSearch(c) {
    setCriteria(c);
    setPassengers(c.passengers || 1);
    setPage('results');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleSelect(offer) {
    setSelectedOffer(offer);
    setPage('checkout');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleConfirm(details) {
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

      {page !== 'ops' && page !== 'admin' && (
        <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
          Swiftpass — prototype booking console. Prices and inventory are seed data, not live.
        </footer>
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
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
