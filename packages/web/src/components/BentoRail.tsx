import { useState } from 'react';
import { motion } from 'motion/react';
import { Channel, CATEGORIES } from '../data/mockData';
import { X, Flame, Filter } from 'lucide-react';

type BentoRailProps = {
  channels: Channel[];
  currentChannelId: string;
  onSelectChannel: (channel: Channel) => void;
  onClose: () => void;
};

export function BentoRail({ channels, currentChannelId, onSelectChannel, onClose }: BentoRailProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = CATEGORIES.filter(c => c !== 'All');
  
  const filteredChannels = selectedCategory 
    ? channels.filter(c => c.category === selectedCategory)
    : channels;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 z-50 w-80 bg-black/90 p-4 shadow-2xl backdrop-blur-2xl border-l border-white/10"
    >
      <div className="flex items-center justify-between mb-4 pt-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Flame className="text-orange-500" />
          Trending Now
        </h2>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Categories Filter */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-white text-black'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          All
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-white text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto pb-24 h-[calc(100vh-160px)]">
        {filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="rounded-full bg-white/5 p-4 mb-4">
              <Filter size={32} className="text-white/40" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No channels found</h3>
            <p className="text-sm text-white/60">
              Try changing your category filter or follow more creators to see them here.
            </p>
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <motion.button
              key={channel.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectChannel(channel)}
              className={`relative flex flex-col overflow-hidden rounded-2xl border ${
                currentChannelId === channel.id ? 'border-indigo-500' : 'border-white/10'
              } bg-white/5 text-left transition-colors hover:bg-white/10`}
            >
              <div className="relative h-32 w-full">
                <img
                  src={channel.streamUrl}
                  alt={channel.title}
                  className="h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                
                <div className="absolute top-2 left-2 flex gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                    channel.type === 'LIVE' ? 'bg-red-600' : channel.type === 'SCHEDULED' ? 'bg-gray-600' : 'bg-indigo-600'
                  }`}>
                    {channel.type === 'SCHEDULED' ? 'UPCOMING' : channel.type}
                  </span>
                  {channel.badge && (
                    <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                      {channel.badge}
                    </span>
                  )}
                </div>
                
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={channel.merchant.avatar} alt="" className="h-6 w-6 rounded-full border border-white/20" />
                    <span className="text-xs font-medium text-white line-clamp-1">{channel.merchant.name}</span>
                  </div>
                  <span className="text-xs text-white/80">{channel.viewers.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="p-3">
                <h3 className="font-semibold text-white line-clamp-1">{channel.title}</h3>
                <p className="mt-1 text-xs text-white/60 line-clamp-1">
                  {channel.products.map(p => p.name).join(', ')}
                </p>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </motion.div>
  );
}
