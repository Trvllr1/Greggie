import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Splash } from './components/Splash';
import { LiveView } from './components/LiveView';
import { BentoRail } from './components/BentoRail';
import { CheckoutModal } from './components/CheckoutModal';
import { BidModal } from './components/BidModal';
import { SuccessModal } from './components/SuccessModal';
import { UserProfileModal } from './components/UserProfileModal';
import { CreatorStudio } from './components/CreatorStudio';
import { MOCK_CHANNELS, Channel, Product } from './data/mockData';

type SessionState = 'ENTRY_LOBBY' | 'WATCHING_PC' | 'BROWSING_RAIL' | 'CHECKOUT_ACTIVE' | 'BIDDING_ACTIVE' | 'PURCHASE_COMPLETE' | 'USER_PROFILE' | 'CREATOR_STUDIO';

export default function App() {
  const [sessionState, setSessionState] = useState<SessionState>('ENTRY_LOBBY');
  const [currentChannel, setCurrentChannel] = useState<Channel>(MOCK_CHANNELS[0]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [feedType, setFeedType] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');
  const [followedChannels, setFollowedChannels] = useState<Record<string, boolean>>({});

  const handleEnterMall = () => {
    setSessionState('WATCHING_PC');
  };

  const handleEnterCreator = () => {
    setSessionState('CREATOR_STUDIO');
  };

  const handleOpenRail = () => {
    setSessionState('BROWSING_RAIL');
  };

  const handleCloseRail = () => {
    setSessionState('WATCHING_PC');
  };

  const handleSelectChannel = (channel: Channel) => {
    setCurrentChannel(channel);
    setSessionState('WATCHING_PC');
  };

  const handleNextChannel = () => {
    const activeChannels = feedType === 'FOLLOWING' 
      ? MOCK_CHANNELS.filter(c => followedChannels[c.id])
      : MOCK_CHANNELS;
      
    if (activeChannels.length === 0) return;

    const currentIndex = activeChannels.findIndex(c => c.id === currentChannel.id);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % activeChannels.length;
    setCurrentChannel(activeChannels[nextIndex]);
  };

  const handlePrevChannel = () => {
    const activeChannels = feedType === 'FOLLOWING' 
      ? MOCK_CHANNELS.filter(c => followedChannels[c.id])
      : MOCK_CHANNELS;
      
    if (activeChannels.length === 0) return;

    const currentIndex = activeChannels.findIndex(c => c.id === currentChannel.id);
    const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + activeChannels.length) % activeChannels.length;
    setCurrentChannel(activeChannels[prevIndex]);
  };

  const handleToggleFollow = (channelId: string) => {
    setFollowedChannels(prev => ({ ...prev, [channelId]: !prev[channelId] }));
  };

  const handleChangeFeedType = (type: 'FOR_YOU' | 'FOLLOWING') => {
    setFeedType(type);
    if (type === 'FOLLOWING') {
      const following = MOCK_CHANNELS.filter(c => followedChannels[c.id]);
      if (following.length > 0 && !followedChannels[currentChannel.id]) {
        setCurrentChannel(following[0]);
      }
    }
  };

  const handleBuy = (product: Product) => {
    setSelectedProduct(product);
    if (product.saleType === 'auction') {
      setSessionState('BIDDING_ACTIVE');
    } else {
      setSessionState('CHECKOUT_ACTIVE');
    }
  };

  const handleCloseCheckout = () => {
    setSelectedProduct(null);
    setSessionState('WATCHING_PC');
  };

  const handleCheckoutComplete = () => {
    setSessionState('PURCHASE_COMPLETE');
  };

  const handleBidComplete = (amount: number) => {
    // In a real app, we'd update the product's currentBid here
    // For now, just show success
    setSessionState('PURCHASE_COMPLETE');
  };

  const handleCloseSuccess = () => {
    setSelectedProduct(null);
    setSessionState('WATCHING_PC');
  };

  const handleOpenProfile = () => {
    setSessionState('USER_PROFILE');
  };

  const handleCloseProfile = () => {
    setSessionState('WATCHING_PC');
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-sans selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        {sessionState === 'ENTRY_LOBBY' && (
          <Splash onEnter={handleEnterMall} onEnterCreator={handleEnterCreator} />
        )}
      </AnimatePresence>

      {sessionState === 'CREATOR_STUDIO' && (
        <CreatorStudio onExit={() => setSessionState('ENTRY_LOBBY')} />
      )}

      {sessionState !== 'ENTRY_LOBBY' && sessionState !== 'CREATOR_STUDIO' && (
        <LiveView
          channel={currentChannel}
          onBuy={handleBuy}
          onOpenRail={handleOpenRail}
          onOpenProfile={handleOpenProfile}
          onNextChannel={handleNextChannel}
          onPrevChannel={handlePrevChannel}
          isPiP={sessionState === 'CHECKOUT_ACTIVE' || sessionState === 'BIDDING_ACTIVE' || sessionState === 'PURCHASE_COMPLETE' || sessionState === 'USER_PROFILE'}
          feedType={feedType}
          onChangeFeedType={handleChangeFeedType}
          followedChannels={followedChannels}
          onToggleFollow={handleToggleFollow}
        />
      )}

      <AnimatePresence>
        {sessionState === 'BROWSING_RAIL' && (
          <BentoRail
            channels={feedType === 'FOLLOWING' ? MOCK_CHANNELS.filter(c => followedChannels[c.id]) : MOCK_CHANNELS}
            currentChannelId={currentChannel.id}
            onSelectChannel={handleSelectChannel}
            onClose={handleCloseRail}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionState === 'CHECKOUT_ACTIVE' && selectedProduct && (
          <CheckoutModal
            product={selectedProduct}
            onClose={handleCloseCheckout}
            onComplete={handleCheckoutComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionState === 'BIDDING_ACTIVE' && selectedProduct && (
          <BidModal
            product={selectedProduct}
            onClose={handleCloseCheckout}
            onBid={handleBidComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionState === 'PURCHASE_COMPLETE' && (
          <SuccessModal onClose={handleCloseSuccess} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionState === 'USER_PROFILE' && (
          <UserProfileModal 
            onClose={handleCloseProfile} 
            onOpenCreatorStudio={handleEnterCreator}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
