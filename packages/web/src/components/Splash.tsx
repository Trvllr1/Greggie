import { motion } from 'motion/react';
import { ChevronRight, Video } from 'lucide-react';
import { ButterflyIcon } from './ButterflyIcon';
import { useState } from 'react';

export function Splash({ onEnter, onEnterCreator, onEnterMarketplace }: { onEnter: () => void, onEnterCreator?: () => void, onEnterMarketplace?: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Background emblem */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src="/ButterflyEmblem.png"
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover opacity-[0.1]"
        />
      </div>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
        className="flex flex-col items-center"
      >
        <motion.div
          className="mb-6"
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
        >
          <ButterflyIcon size={64} hovered={hovered} />
        </motion.div>
        <h1 className="mb-2 text-4xl font-bold tracking-tighter" style={{ color: '#F1F5F9' }}>Greggie™</h1>
        <p className="mb-12 text-lg" style={{ color: '#94A3B8' }}>The Live Commerce OS</p>
        
        <div className="flex flex-col gap-4 items-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnter}
            className="group flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-colors hover:bg-white/90"
          >
            Enter the Mall
            <ChevronRight className="transition-transform group-hover:translate-x-1" />
          </motion.button>

          {onEnterCreator && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEnterCreator}
              className="group flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-6 py-3 text-sm font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
            >
              <Video size={16} />
              Enter as Creator
            </motion.button>
          )}

          {onEnterMarketplace && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEnterMarketplace}
              className="group flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-6 py-3 text-sm font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
            >
              <ButterflyIcon size={16} />
              Browse Shop
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
