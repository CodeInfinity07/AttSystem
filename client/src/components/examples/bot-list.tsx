import { BotList } from '../bot-list';

export default function BotListExample() {
  const bots = [
    { id: '1', name: 'bot_alpha_001', status: 'member' as const },
    { id: '2', name: 'bot_beta_002', status: 'non-member' as const },
    { id: '3', name: 'bot_gamma_003', status: 'checking' as const },
    { id: '4', name: 'bot_delta_004', status: 'connected' as const },
    { id: '5', name: 'bot_epsilon_005', status: 'joining' as const },
  ];

  return (
    <div className="p-4 max-w-2xl">
      <BotList title="Eligible Bots" bots={bots} />
    </div>
  );
}
