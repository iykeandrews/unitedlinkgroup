'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface AnimatedAvatarProps {
  role: string;
  icon: any;
  color: string;
  activityIcon: any;
  seed: string;
  delay: number;
  position: string;
  className?: string;
}

export const AnimatedAvatar = ({ 
  role, 
  icon: Icon, 
  color, 
  activityIcon: ActivityIcon,
  seed,
  delay,
  position,
  className = ''
}: AnimatedAvatarProps) => (
  <motion.div 
    className={`absolute ${position} flex flex-col items-center z-20 ${className}`}
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay, duration: 0.8 }}
  >
    <motion.div 
      animate={{ y: [0, -15, 0] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: delay * 2 }}
      className="relative group"
    >
      {/* Avatar Image */}
      <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white relative z-10">
        <Image 
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`} 
          alt={role}
          fill
          className="object-cover"
        />
      </div>

      {/* Activity Icon Badge */}
      <motion.div 
        className={`absolute -right-2 -bottom-2 p-2 rounded-full shadow-lg z-20 ${color} text-white`}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2, delay: delay }}
      >
        <Icon size={20} />
      </motion.div>

      {/* Activity Animation (e.g. scanning, pulse) */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
           <ActivityIcon className={`w-full h-full opacity-50 ${color.replace('bg-', 'text-')}`} />
      </div>
      
      {/* Tooltip/Label */}
      <motion.div 
        className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white/90 px-3 py-1 rounded-full shadow-sm text-sm font-bold text-blue-900 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
      >
        {role}
      </motion.div>
    </motion.div>
  </motion.div>
);
