import { motion } from 'motion/react';
import { ShoppingBag, ChevronRight, Video } from 'lucide-react';

export function Splash({ onEnter, onEnterCreator }: { onEnter: () => void, onEnterCreator?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
        className="flex flex-col items-center"
      >
        <div className="mb-6 rounded-full bg-white/10 p-6 backdrop-blur-md">
          <ShoppingBag size={48} className="text-white" />
        </div>
        <h1 className="mb-2 text-4xl font-bold tracking-tighter">Greggie™</h1>
        <p className="mb-12 text-lg text-white/60">The Live Commerce OS</p>
        
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
        </div>
      </motion.div>
    </motion.div>
  );
}
