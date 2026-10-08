import GateBoard from './GateBoard';
import type { AuthUser } from '../types/auth';

interface OpsProps {
  user: AuthUser | null;
  token: string | null;
  onBack: () => void;
  onSignIn: () => void;
}

export default function Ops({ user, token, onBack, onSignIn }: OpsProps) {
  return <GateBoard user={user} token={token} onBack={onBack} onSignIn={onSignIn} />;
}
