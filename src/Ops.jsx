import GateBoard from './GateBoard.jsx';

export default function Ops({ user, token, onBack, onSignIn }) {
  return <GateBoard user={user} token={token} onBack={onBack} onSignIn={onSignIn} />;
}
