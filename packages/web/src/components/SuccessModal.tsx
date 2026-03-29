import { motion } from 'motion/react';
import { CheckCircle2, Package } from 'lucide-react';

export function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl bg-white p-8 text-center shadow-2xl">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
          className="mb-6 rounded-full bg-green-100 p-4"
        >
          <CheckCircle2 size={48} className="text-green-600" />
        </motion.div>
        
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Order Confirmed!</h2>
        <p className="mb-8 text-gray-500">Your receipt has been sent to your email. We'll notify you when it ships.</p>
        
        <div className="mb-8 flex w-full items-center justify-between rounded-xl bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <Package className="text-gray-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Order #GRG-8492</p>
              <p className="text-xs text-gray-500">Processing</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-black py-4 font-semibold text-white transition-transform active:scale-95"
        >
          Return to Stream
        </button>
      </div>
    </motion.div>
  );
}
