import { useReducer, useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { Splash } from './components/Splash';
import { LiveView } from './components/LiveView';
import { BentoRail } from './components/BentoRail';
import { CheckoutModal } from './components/CheckoutModal';
import { BidModal } from './components/BidModal';
import { SuccessModal } from './components/SuccessModal';
import { UserProfileModal } from './components/UserProfileModal';
import { CreatorStudio } from './components/CreatorStudio';
import { MarketStudio } from './components/MarketStudio';
import { AdminPanel } from './components/AdminPanel';
import { OnboardingOverlay, shouldSkipOnboarding } from './components/OnboardingOverlay';
import { AuthModal } from './components/AuthModal';
import { MarketplaceBrowse } from './components/MarketplaceBrowse';
import { ProductPage } from './components/ProductPage';
import { CartDrawer } from './components/CartDrawer';
import { MarketplaceCheckout } from './components/MarketplaceCheckout';
import { MOCK_CHANNELS, type Channel, type Product } from './data/mockData';
import { useChannels } from './hooks/useChannels';
import { useWebSocket } from './hooks/useWebSocket';
import { useTrackEvent } from './hooks/useTrackEvent';
import { useAuth } from './hooks/useAuth';
import { useCart } from './hooks/useCart';
import * as api from './services/api';

// ── Session State Machine ──
type SessionState =
  | 'ENTRY_LOBBY'
  | 'ONBOARDING'
  | 'WATCHING_PC'
  | 'BROWSING_RAIL'
  | 'CHECKOUT_ACTIVE'
  | 'BIDDING_ACTIVE'
  | 'PURCHASE_COMPLETE'
  | 'USER_PROFILE'
  | 'CREATOR_STUDIO'
  | 'MARKET_STUDIO'
  | 'BROWSING_MARKETPLACE'
  | 'VIEWING_PRODUCT'
  | 'MARKETPLACE_CHECKOUT'
  | 'ADMIN_PANEL';

type SessionAction =
  | { type: 'ENTER_MALL' }
  | { type: 'ENTER_CREATOR' }
  | { type: 'ENTER_MARKET_STUDIO' }
  | { type: 'ENTER_MARKETPLACE' }
  | { type: 'ENTER_ADMIN' }
  | { type: 'ONBOARDING_COMPLETE' }
  | { type: 'OPEN_RAIL' }
  | { type: 'CLOSE_RAIL' }
  | { type: 'START_CHECKOUT' }
  | { type: 'START_BID' }
  | { type: 'PURCHASE_DONE' }
  | { type: 'CLOSE_MODAL' }
  | { type: 'OPEN_PROFILE' }
  | { type: 'CLOSE_PROFILE' }
  | { type: 'VIEW_PRODUCT' }
  | { type: 'BACK_TO_MARKETPLACE' }
  | { type: 'START_MARKETPLACE_CHECKOUT' }
  | { type: 'EXIT_TO_LOBBY' };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'ENTER_MALL':
      return shouldSkipOnboarding() ? 'WATCHING_PC' : 'ONBOARDING';
    case 'ENTER_CREATOR':
      return 'CREATOR_STUDIO';
    case 'ENTER_MARKET_STUDIO':
      return 'MARKET_STUDIO';
    case 'ENTER_MARKETPLACE':
      return 'BROWSING_MARKETPLACE';
    case 'ENTER_ADMIN':
      return 'ADMIN_PANEL';
    case 'ONBOARDING_COMPLETE':
      return 'WATCHING_PC';
    case 'OPEN_RAIL':
      return 'BROWSING_RAIL';
    case 'CLOSE_RAIL':
    case 'CLOSE_MODAL':
    case 'CLOSE_PROFILE':
      return 'WATCHING_PC';
    case 'START_CHECKOUT':
      return 'CHECKOUT_ACTIVE';
    case 'START_BID':
      return 'BIDDING_ACTIVE';
    case 'PURCHASE_DONE':
      return 'PURCHASE_COMPLETE';
    case 'OPEN_PROFILE':
      return 'USER_PROFILE';
    case 'VIEW_PRODUCT':
      return 'VIEWING_PRODUCT';
    case 'BACK_TO_MARKETPLACE':
      return 'BROWSING_MARKETPLACE';
    case 'START_MARKETPLACE_CHECKOUT':
      return 'MARKETPLACE_CHECKOUT';
    case 'EXIT_TO_LOBBY':
      return 'ENTRY_LOBBY';
    default:
      return state;
  }
}

export default function App() {
  const [sessionState, dispatch] = useReducer(sessionReducer, 'ENTRY_LOBBY');
  const { isLoggedIn, user } = useAuth();
  const [preferredCategory, setPreferredCategory] = useState<string | undefined>(undefined);
  const { channels, primary, loading, error, usingMock, refresh: refreshChannels } = useChannels(preferredCategory);
  const [currentChannel, setCurrentChannel] = useState<Channel>(MOCK_CHANNELS[0]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lastOrder, setLastOrder] = useState<{ id: string; status: string; total_cents: number } | null>(null);
  const [feedType, setFeedType] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');
  const [followedChannels, setFollowedChannels] = useState<Record<string, boolean>>({});
  const [showAuth, setShowAuth] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [marketplaceProduct, setMarketplaceProduct] = useState<Product | null>(null);
  const [productViewOrigin, setProductViewOrigin] = useState<SessionState>('BROWSING_MARKETPLACE');
  const [cartOpen, setCartOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const cart = useCart();

  // Sync current channel to primary when data loads
  useEffect(() => {
    if (primary) setCurrentChannel(primary);
  }, [primary]);

  // Hydrate followed channels from backend on login
  useEffect(() => {
    if (!isLoggedIn || usingMock) return;
    api.getFollowing()
      .then(followed => {
        const map: Record<string, boolean> = {};
        followed.forEach(ch => { map[ch.id] = true; });
        setFollowedChannels(map);
      })
      .catch(() => {});
  }, [isLoggedIn, usingMock]);

  // ── Real-time: WebSocket + analytics ──
  const { subscribe, on } = useWebSocket();
  const track = useTrackEvent();

  // Subscribe WS to the channel we're watching
  useEffect(() => {
    if (sessionState !== 'ENTRY_LOBBY' && sessionState !== 'CREATOR_STUDIO') {
      subscribe(currentChannel.id);
      track('view_start', currentChannel.id);
      return () => { track('view_end', currentChannel.id); };
    }
  }, [currentChannel.id, sessionState, subscribe, track]);

  // Listen for real-time viewer count updates
  useEffect(() => {
    return on('viewer:count', (msg) => {
      const data = msg.payload as { channel_id: string; count: number };
      setCurrentChannel(prev =>
        prev.id === data.channel_id ? { ...prev, viewers: data.count } : prev,
      );
    });
  }, [on]);

  // Listen for rail updates (channel went LIVE or OFFLINE)
  useEffect(() => {
    return on('rail:update', () => {
      refreshChannels();
    });
  }, [on, refreshChannels]);

  const handleEnterMall = () => {
    dispatch({ type: 'ENTER_MALL' });
  };

  const handleEnterCreator = () => {
    dispatch({ type: 'ENTER_CREATOR' });
  };

  const handleEnterMarketStudio = () => {
    dispatch({ type: 'ENTER_MARKET_STUDIO' });
  };

  const handleEnterAdmin = () => {
    dispatch({ type: 'ENTER_ADMIN' });
  };

  const handleOpenRail = () => {
    setRailOpen(prev => !prev);
  };

  const handleCloseRail = () => {
    setRailOpen(false);
  };

  const handleSelectChannel = (channel: Channel) => {
    track('channel_switch', channel.id);
    setCurrentChannel(channel);
    setRailOpen(false);
  };

  const handleNextChannel = () => {
    const activeChannels = feedType === 'FOLLOWING' 
      ? channels.filter(c => followedChannels[c.id])
      : channels;
      
    if (activeChannels.length === 0) return;

    const currentIndex = activeChannels.findIndex(c => c.id === currentChannel.id);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % activeChannels.length;
    setCurrentChannel(activeChannels[nextIndex]);
  };

  const handlePrevChannel = () => {
    const activeChannels = feedType === 'FOLLOWING' 
      ? channels.filter(c => followedChannels[c.id])
      : channels;
      
    if (activeChannels.length === 0) return;

    const currentIndex = activeChannels.findIndex(c => c.id === currentChannel.id);
    const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + activeChannels.length) % activeChannels.length;
    setCurrentChannel(activeChannels[prevIndex]);
  };

  const handleToggleFollow = (channelId: string) => {
    const isFollowed = !!followedChannels[channelId];
    setFollowedChannels(prev => ({ ...prev, [channelId]: !isFollowed }));
    track(isFollowed ? 'unfollow' : 'follow', channelId);
    // Fire-and-forget API call (optimistic UI)
    if (!usingMock && api.getToken()) {
      (isFollowed ? api.unfollowChannel(channelId) : api.followChannel(channelId))
        .catch(() => {
          // Revert on failure
          setFollowedChannels(prev => ({ ...prev, [channelId]: isFollowed }));
        });
    }
  };

  const handleChangeFeedType = (type: 'FOR_YOU' | 'FOLLOWING') => {
    setFeedType(type);
    if (type === 'FOLLOWING') {
      const following = channels.filter(c => followedChannels[c.id]);
      if (following.length > 0 && !followedChannels[currentChannel.id]) {
        setCurrentChannel(following[0]);
      }
    }
  };

  const handleBuy = (product: Product) => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    setSelectedProduct(product);
    track('add_to_cart', currentChannel.id, { product_id: product.id });
    if (product.saleType === 'auction') {
      dispatch({ type: 'START_BID' });
    } else {
      dispatch({ type: 'START_CHECKOUT' });
    }
  };

  const handleCloseCheckout = () => {
    setSelectedProduct(null);
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleCheckoutComplete = (order: { id: string; status: string; total_cents: number }) => {
    setLastOrder(order);
    track('checkout_complete', currentChannel.id, { product_id: selectedProduct?.id, order_id: order.id });
    dispatch({ type: 'PURCHASE_DONE' });
  };

  const handleBidComplete = async (amount: number) => {
    // Bid already placed via BidModal's api.placeBid call
    dispatch({ type: 'PURCHASE_DONE' });
  };

  const handleCloseSuccess = () => {
    setSelectedProduct(null);
    setLastOrder(null);
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleOpenProfile = () => {
    dispatch({ type: 'OPEN_PROFILE' });
  };

  const handleCloseProfile = () => {
    dispatch({ type: 'CLOSE_PROFILE' });
  };

  const handleEnterMarketplace = () => {
    dispatch({ type: 'ENTER_MARKETPLACE' });
  };

  const handleViewProduct = async (product: Product) => {
    setProductViewOrigin(sessionState);      // remember where user came from
    setMarketplaceProduct(product);          // show immediately with basic data
    dispatch({ type: 'VIEW_PRODUCT' });
    try {
      const full = await api.getProductFull(product.id);
      setMarketplaceProduct(full);           // replace with rich data once loaded
    } catch {
      // keep basic product if full fetch fails
    }
  };

  const handleBackFromProduct = () => {
    setMarketplaceProduct(null);
    // Return to the context the user came from
    if (productViewOrigin === 'WATCHING_PC' || productViewOrigin === 'BROWSING_RAIL') {
      dispatch({ type: 'CLOSE_MODAL' });    // returns to WATCHING_PC
    } else {
      dispatch({ type: 'BACK_TO_MARKETPLACE' });
    }
  };

  const handleWatchChannel = useCallback((channelId: string) => {
    api.getChannelById(channelId)
      .then(ch => {
        setCurrentChannel(ch);
        dispatch({ type: 'ENTER_MALL' });
      })
      .catch(() => {
        // Fallback: resolve from loaded channels or mock data
        const fallback = channels.find(c => c.id === channelId)
          ?? MOCK_CHANNELS.find(c => c.id === channelId);
        if (fallback) setCurrentChannel(fallback);
        dispatch({ type: 'ENTER_MALL' });
      });
  }, [channels]);



  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-sans selection:bg-indigo-500/30">
      <AnimatePresence mode="wait">
        {sessionState === 'ENTRY_LOBBY' && (
          <Splash
            onEnter={handleEnterMall}
            onEnterCreator={handleEnterCreator}
            onEnterMarketplace={handleEnterMarketplace}
            onEnterMarketStudio={handleEnterMarketStudio}
            onEnterAdmin={(user?.role === 'admin' || import.meta.env.DEV) ? handleEnterAdmin : undefined}
          />
        )}
      </AnimatePresence>

      {sessionState === 'CREATOR_STUDIO' && (
        <CreatorStudio onExit={() => dispatch({ type: 'EXIT_TO_LOBBY' })} />
      )}

      {sessionState === 'MARKET_STUDIO' && (
        <MarketStudio onExit={() => dispatch({ type: 'EXIT_TO_LOBBY' })} />
      )}

      {sessionState === 'ADMIN_PANEL' && (
        <AdminPanel onExit={() => dispatch({ type: 'EXIT_TO_LOBBY' })} />
      )}

      <AnimatePresence>
        {sessionState === 'ONBOARDING' && (
          <OnboardingOverlay
            onComplete={(cats) => {
              if (cats.length > 0) setPreferredCategory(cats[0]);
              dispatch({ type: 'ONBOARDING_COMPLETE' });
            }}
          />
        )}
      </AnimatePresence>

      {sessionState !== 'ENTRY_LOBBY' && sessionState !== 'CREATOR_STUDIO' && sessionState !== 'MARKET_STUDIO' && sessionState !== 'ADMIN_PANEL' && (
        <>
          {usingMock && !loading && (
            <div className="fixed top-0 inset-x-0 z-40 bg-amber-500/90 text-black text-center text-xs py-1 font-medium backdrop-blur-sm">
              Demo mode — backend unreachable. <button className="underline font-bold" onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}
          <LiveView
          channel={currentChannel}
          onBuy={handleBuy}
          onViewProduct={handleViewProduct}
          onOpenRail={handleOpenRail}
          onOpenProfile={handleOpenProfile}
          onNextChannel={handleNextChannel}
          onPrevChannel={handlePrevChannel}
          isPiP={sessionState === 'CHECKOUT_ACTIVE' || sessionState === 'BIDDING_ACTIVE' || sessionState === 'PURCHASE_COMPLETE' || sessionState === 'USER_PROFILE' || sessionState === 'VIEWING_PRODUCT'}
          feedType={feedType}
          onChangeFeedType={handleChangeFeedType}
          followedChannels={followedChannels}
          onToggleFollow={handleToggleFollow}
          onGoHome={() => dispatch({ type: 'EXIT_TO_LOBBY' })}
          onGoToShop={() => dispatch({ type: 'ENTER_MARKETPLACE' })}
          onOpenCart={() => setCartOpen(true)}
          cartCount={cart.count}
          onGoToSellerProgram={handleEnterMarketStudio}
          onGoToCreatorStudio={() => dispatch({ type: 'ENTER_CREATOR' })}
        />
        </>
      )}

      <AnimatePresence>
        {railOpen && sessionState !== 'ENTRY_LOBBY' && sessionState !== 'CREATOR_STUDIO' && sessionState !== 'MARKET_STUDIO' && (
          <BentoRail
            channels={channels}
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
            channelId={currentChannel.id}
            onClose={handleCloseCheckout}
            onComplete={handleCheckoutComplete}
            onAddToCart={cart.addItem}
            onOpenCart={() => setCartOpen(true)}
            cartCount={cart.count}
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
          <SuccessModal order={lastOrder} onClose={handleCloseSuccess} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionState === 'USER_PROFILE' && (
          <UserProfileModal 
            onClose={handleCloseProfile} 
            onOpenCreatorStudio={handleEnterCreator}
            onOpenAuth={() => { handleCloseProfile(); setShowAuth(true); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuth && (
          <AuthModal onClose={() => setShowAuth(false)} />
        )}
      </AnimatePresence>

      {sessionState === 'BROWSING_MARKETPLACE' && (
        <MarketplaceBrowse
          onViewProduct={handleViewProduct}
          onOpenCart={() => setCartOpen(true)}
          onGoHome={() => dispatch({ type: 'EXIT_TO_LOBBY' })}
          cartCount={cart.count}
          onWatchChannel={handleWatchChannel}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenRail={handleOpenRail}
          onGoToCreatorStudio={() => dispatch({ type: 'ENTER_CREATOR' })}
          onGoToLiveView={() => dispatch({ type: 'CLOSE_RAIL' })}
          onGoToSellerProgram={handleEnterMarketStudio}
        />
      )}

      {/* Profile modal overlay for marketplace */}
      <AnimatePresence>
        {showProfileModal && sessionState === 'BROWSING_MARKETPLACE' && (
          <UserProfileModal
            onClose={() => setShowProfileModal(false)}
            onOpenCreatorStudio={() => { setShowProfileModal(false); handleEnterCreator(); }}
            onOpenAuth={() => { setShowProfileModal(false); setShowAuth(true); }}
          />
        )}
      </AnimatePresence>

      {sessionState === 'VIEWING_PRODUCT' && marketplaceProduct && (
        <ProductPage
          product={marketplaceProduct}
          onBack={handleBackFromProduct}
          onAddToCart={cart.addItem}
          onOpenCart={() => setCartOpen(true)}
          onViewProduct={handleViewProduct}
          cartCount={cart.count}
        />
      )}

      <AnimatePresence>
        {cartOpen && (
          <CartDrawer
            items={cart.items}
            total={cart.total}
            onUpdateQuantity={cart.updateQuantity}
            onRemoveItem={cart.removeItem}
            onClose={() => setCartOpen(false)}
            onViewProduct={(product) => {
              setCartOpen(false);
              handleViewProduct(product);
            }}
            onCheckout={() => {
              setCartOpen(false);
              dispatch({ type: 'START_MARKETPLACE_CHECKOUT' });
            }}
          />
        )}
      </AnimatePresence>

      {sessionState === 'MARKETPLACE_CHECKOUT' && (
        <MarketplaceCheckout
          items={cart.items}
          total={cart.total}
          onBack={() => dispatch({ type: 'BACK_TO_MARKETPLACE' })}
          onComplete={(order) => {
            setLastOrder(order);
            dispatch({ type: 'PURCHASE_DONE' });
          }}
          onClearCart={cart.clearCart}
          userEmail={user?.email}
          isLoggedIn={isLoggedIn}
          onSignIn={() => { dispatch({ type: 'BACK_TO_MARKETPLACE' }); setShowAuth(true); }}
        />
      )}
    </div>
  );
}
