import { motion, AnimatePresence } from 'motion/react';
import { Channel, Product, MOCK_CHANNELS } from '../data/mockData';
import { Users, DollarSign, Heart, Package, X, Settings, Mic, Video, MessageCircle, Gavel, Timer } from 'lucide-react';
import { useState, useEffect } from 'react';

type CreatorStudioProps = {
  onExit: () => void;
};

export function CreatorStudio({ onExit }: CreatorStudioProps) {
  const [isLive, setIsLive] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [likes, setLikes] = useState(0);
  const [showProducts, setShowProducts] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [pinnedProduct, setPinnedProduct] = useState<Product | null>(null);
  const [pinnedQuestion, setPinnedQuestion] = useState<{user: string, text: string} | null>(null);

  const [chatMessages, setChatMessages] = useState([
    { id: '1', user: 'Alex', text: 'This looks amazing!', isQuestion: false },
    { id: '2', user: 'Sam', text: 'Is there a warranty?', isQuestion: true },
    { id: '3', user: 'Jordan', text: 'Just bought one 🚀', isQuestion: false },
    { id: '4', user: 'Taylor', text: 'Does it come in black?', isQuestion: true },
  ]);

  const channel = MOCK_CHANNELS[0]; // Using the first channel as the creator's channel

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setViewers(prev => prev + Math.floor(Math.random() * 10) - 2);
        setLikes(prev => prev + Math.floor(Math.random() * 5));
        if (Math.random() > 0.8) {
          setRevenue(prev => prev + (pinnedProduct ? pinnedProduct.price : 0));
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLive, pinnedProduct]);

  return (
    <div className="relative h-full w-full bg-black text-white overflow-hidden">
      {/* Camera View (Mocked) */}
      <img
        src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1080&h=1920"
        alt="Camera"
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex items-start justify-between z-10">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-colors shadow-lg ${
              isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-black'
            }`}
          >
            {isLive ? 'END STREAM' : 'GO LIVE'}
          </button>
          
          {isLive && (
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-3 py-1 text-xs font-medium">
                <Users size={12} /> {viewers.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-3 py-1 text-xs font-medium text-green-400">
                <DollarSign size={12} /> {revenue.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button className="p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors">
            <Mic size={20} />
          </button>
          <button className="p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors">
            <Video size={20} />
          </button>
          <button onClick={onExit} className="p-3 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-4 z-10">
        {/* Pinned Question Status */}
        {pinnedQuestion && (
          <div className="bg-orange-600/90 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-2 border border-orange-500/50 shadow-2xl mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-orange-200" />
                <p className="text-xs text-orange-200 font-bold uppercase tracking-wider">Pinned Question</p>
              </div>
              <button 
                onClick={() => setPinnedQuestion(null)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-sm font-semibold text-white">
              <span className="text-orange-300 mr-2">{pinnedQuestion.user}:</span>
              {pinnedQuestion.text}
            </p>
          </div>
        )}

        {/* Pinned Product Status */}
        {pinnedProduct && (
          <div className="bg-indigo-600/90 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-3 border border-indigo-500/50 shadow-2xl mb-2">
            <div className="flex items-center gap-3">
              <img src={pinnedProduct.mediaUrl} alt={pinnedProduct.name} className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider">Currently Pinned</p>
                <p className="text-sm font-semibold truncate">{pinnedProduct.name}</p>
              </div>
              <button 
                onClick={() => setPinnedProduct(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex gap-2 pt-2 border-t border-indigo-500/30">
              <button 
                onClick={() => alert(`Starting auction for ${pinnedProduct.name} at $${pinnedProduct.price}`)}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl font-bold text-sm transition-colors"
              >
                <Gavel size={16} /> Start Auction
              </button>
              <button 
                onClick={() => alert(`Starting 5-minute drop for ${pinnedProduct.name}`)}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-indigo-900 hover:bg-gray-100 py-2 rounded-xl font-bold text-sm transition-colors"
              >
                <Timer size={16} /> Start Drop
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-end">
          <div className="flex gap-3">
            <button 
              onClick={() => setShowProducts(true)}
              className="flex flex-col items-center gap-1"
            >
              <div className="p-4 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors border border-white/10">
                <Package size={24} />
              </div>
              <span className="text-xs font-medium">Products</span>
            </button>
            <button 
              onClick={() => setShowChat(true)}
              className="flex flex-col items-center gap-1"
            >
              <div className="p-4 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors border border-white/10 relative">
                <MessageCircle size={24} />
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black"></span>
              </div>
              <span className="text-xs font-medium">Chat</span>
            </button>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-pink-400 font-bold text-xl">
              <Heart size={20} fill="currentColor" />
              {likes.toLocaleString()}
            </div>
            <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Total Likes</span>
          </div>
        </div>
      </div>

      {/* Products Drawer */}
      <AnimatePresence>
        {showProducts && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-x-0 bottom-0 z-50 flex h-[70vh] flex-col rounded-t-[32px] bg-gray-900 shadow-2xl"
          >
            <div className="flex-shrink-0 pt-4 pb-2 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-gray-700" />
            </div>
            
            <div className="flex-shrink-0 flex items-center justify-between px-6 pb-4 border-b border-gray-800">
              <h2 className="text-xl font-bold tracking-tight text-white">Manage Products</h2>
              <button
                onClick={() => setShowProducts(false)}
                className="rounded-full bg-gray-800 p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {channel.products.map(product => (
                <div key={product.id} className="flex gap-4 bg-gray-800 rounded-2xl p-3 border border-gray-700">
                  <img src={product.mediaUrl} alt={product.name} className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-white line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-gray-400">Stock: {product.inventory}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-green-400">${product.price.toFixed(2)}</p>
                      <button
                        onClick={() => {
                          setPinnedProduct(product);
                          setShowProducts(false);
                        }}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                          pinnedProduct?.id === product.id 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-white text-black hover:bg-gray-200'
                        }`}
                      >
                        {pinnedProduct?.id === product.id ? 'Pinned' : 'Pin to Stream'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Moderation Drawer */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col rounded-t-[32px] bg-gray-900 shadow-2xl"
          >
            <div className="flex-shrink-0 pt-4 pb-2 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-gray-700" />
            </div>
            
            <div className="flex-shrink-0 flex items-center justify-between px-6 pb-4 border-b border-gray-800">
              <h2 className="text-xl font-bold tracking-tight text-white">Chat Moderation</h2>
              <button
                onClick={() => setShowChat(false)}
                className="rounded-full bg-gray-800 p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <div key={msg.id} className="flex flex-col gap-2 bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-indigo-400">{msg.user}</span>
                    {msg.isQuestion && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                        Question
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/90">{msg.text}</p>
                  
                  <div className="flex gap-2 pt-2 border-t border-gray-700/50 mt-1">
                    <button 
                      onClick={() => {
                        setPinnedQuestion({ user: msg.user, text: msg.text });
                        setShowChat(false);
                      }}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 transition-colors"
                    >
                      Pin to Stream
                    </button>
                    <button 
                      onClick={() => setChatMessages(prev => prev.filter(m => m.id !== msg.id))}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
